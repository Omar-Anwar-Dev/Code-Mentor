using System.Security.Claims;
using System.Web;
using CodeMentor.Api.Extensions;
using CodeMentor.Application.Auth;
using CodeMentor.Application.Auth.Contracts;
using CodeMentor.Infrastructure.Auth;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Options;

namespace CodeMentor.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _auth;

    private readonly IGitHubOAuthService _github;

    private readonly GitHubOAuthOptions _githubOptions;

    private readonly IOAuthTokenEncryptor _encryptor;

    public AuthController(
        IAuthService auth,
        IGitHubOAuthService github,
        IOptions<GitHubOAuthOptions> githubOptions,
        IOAuthTokenEncryptor encryptor)
    {
        _auth = auth;
        _github = github;
        _githubOptions = githubOptions.Value;
        _encryptor = encryptor;
    }

    [HttpPost("register")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Email) ||
            string.IsNullOrWhiteSpace(request.Password) ||
            string.IsNullOrWhiteSpace(request.FullName))
            return Problem("Email, password and full name are required.", statusCode: StatusCodes.Status400BadRequest);

        var result = await _auth.RegisterAsync(request, GetIp(), ct);
        return result.Success
            ? Ok(result.Value)
            : Problem(
                detail: result.ErrorMessage,
                statusCode: result.ErrorCode == AuthErrorCode.EmailAlreadyExists
                    ? StatusCodes.Status409Conflict
                    : StatusCodes.Status400BadRequest,
                title: result.ErrorCode.ToString());
    }

    [HttpPost("login")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitingExtensions.AuthLoginPolicy)]
    [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> Login([FromBody] LoginRequest request, CancellationToken ct)
    {
        var result = await _auth.LoginAsync(request, GetIp(), ct);
        return result.Success
            ? Ok(result.Value)
            : Problem(
                detail: result.ErrorMessage,
                statusCode: StatusCodes.Status401Unauthorized,
                title: result.ErrorCode.ToString());
    }

    [HttpPost("refresh")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Refresh([FromBody] RefreshRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.RefreshToken))
            return Problem("refreshToken is required.", statusCode: StatusCodes.Status400BadRequest);

        var result = await _auth.RefreshAsync(request.RefreshToken, GetIp(), ct);
        return result.Success
            ? Ok(result.Value)
            : Problem(detail: result.ErrorMessage, statusCode: StatusCodes.Status401Unauthorized, title: result.ErrorCode.ToString());
    }

    [HttpPost("logout")]
    [AllowAnonymous]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Logout([FromBody] RefreshRequest request, CancellationToken ct)
    {
        if (!string.IsNullOrWhiteSpace(request.RefreshToken))
            await _auth.LogoutAsync(request.RefreshToken, ct);
        return NoContent();
    }

    private const string GitHubStateCookie = "gh_oauth_state";

    // S14-T11 hotfix (2026-05-13 walkthrough, v2): mirror the cookie names from
    // ConnectedAccountsController so AuthController.GitHubCallback can dispatch
    // login-vs-link from the same endpoint (GitHub OAuth Apps only support one
    // registered callback URL per app).
    private const string LinkStateCookie = "gh_link_state";
    private const string LinkUserIdCookie = "gh_link_userid";

    [HttpGet("github/login")]
    [AllowAnonymous]
    [ProducesResponseType(StatusCodes.Status302Found)]
    public IActionResult GitHubLogin()
    {
        try
        {
            var (url, state) = _github.BuildLoginUrl();
            Response.Cookies.Append(GitHubStateCookie, state, new CookieOptions
            {
                HttpOnly = true,
                Secure = Request.IsHttps,
                SameSite = SameSiteMode.Lax,
                MaxAge = TimeSpan.FromMinutes(10),
            });
            return Redirect(url);
        }
        catch (InvalidOperationException ex)
        {
            return Problem(ex.Message, statusCode: StatusCodes.Status503ServiceUnavailable, title: "GitHubOAuthNotConfigured");
        }
    }

    // ADR-039: GitHub OAuth callback redirects to the SPA's success route with
    // tokens embedded in the URL fragment (not query) so they never appear in
    // server access logs, Referer headers, or browser history queries. The SPA
    // strips the fragment immediately after persisting tokens to Redux.
    [HttpGet("github/callback")]
    [AllowAnonymous]
    [ProducesResponseType(StatusCodes.Status302Found)]
    public async Task<IActionResult> GitHubCallback([FromQuery] string code, [FromQuery] string state, CancellationToken ct)
    {
        // S14-T11 hotfix (2026-05-13 walkthrough, v2): a single callback serves
        // both LOGIN and LINK flows because classic GitHub OAuth Apps allow only
        // ONE registered callback URL. The presence of the gh_link_userid cookie
        // (set by POST /api/user/connected-accounts/github) marks this as a LINK
        // flow for an already-authenticated user; otherwise it's the login flow.
        var linkUserIdCipher = Request.Cookies[LinkUserIdCookie];
        if (!string.IsNullOrEmpty(linkUserIdCipher))
        {
            var linkState = Request.Cookies[LinkStateCookie];
            // Single-shot: drop the link cookies whether the link succeeds or fails.
            Response.Cookies.Delete(LinkStateCookie, new CookieOptions { Path = "/" });
            Response.Cookies.Delete(LinkUserIdCookie, new CookieOptions { Path = "/" });

            string? userIdPlain;
            try { userIdPlain = _encryptor.Decrypt(linkUserIdCipher); }
            catch { userIdPlain = null; }

            if (userIdPlain is null || !Guid.TryParse(userIdPlain, out var linkingUserId))
                return RedirectToFrontendSettings(success: false, message: "link_session_invalid");

            var linkResult = await _github.HandleLinkCallbackAsync(code, state, linkState, linkingUserId, ct);
            if (!linkResult.Success)
                return RedirectToFrontendSettings(success: false, message: linkResult.ErrorMessage ?? "link_failed");

            return RedirectToFrontendSettings(success: true, message: linkResult.Value!.GitHubUsername);
        }

        // LOGIN flow (original ADR-039 behavior).
        var expected = Request.Cookies[GitHubStateCookie];
        Response.Cookies.Delete(GitHubStateCookie);

        var result = await _github.HandleCallbackAsync(code, state, expected, GetIp(), ct);

        if (!result.Success)
        {
            var errorUrl = AppendQuery(
                _githubOptions.FrontendErrorUrl,
                ("code", result.ErrorCode.ToString()),
                ("message", result.ErrorMessage ?? "GitHub sign-in failed."));
            return Redirect(errorUrl);
        }

        var auth = result.Value!;
        var fragment = string.Join('&', new[]
        {
            $"access={Uri.EscapeDataString(auth.AccessToken)}",
            $"refresh={Uri.EscapeDataString(auth.RefreshToken)}",
            $"expires={Uri.EscapeDataString(auth.AccessTokenExpiresAt.ToString("O"))}",
        });
        return Redirect($"{_githubOptions.FrontendSuccessUrl}#{fragment}");
    }

    private IActionResult RedirectToFrontendSettings(bool success, string message)
    {
        var baseUrl = string.IsNullOrWhiteSpace(_githubOptions.FrontendSettingsUrl)
            ? "http://localhost:5173/settings"
            : _githubOptions.FrontendSettingsUrl;
        var fragment = $"github-link={(success ? "ok" : "err")}&detail={Uri.EscapeDataString(message)}";
        return Redirect($"{baseUrl}#{fragment}");
    }

    private static string AppendQuery(string url, params (string Key, string Value)[] pairs)
    {
        var builder = new UriBuilder(url);
        var query = HttpUtility.ParseQueryString(builder.Query);
        foreach (var (key, value) in pairs)
            query[key] = value;
        builder.Query = query.ToString();
        return builder.Uri.ToString();
    }

    [HttpGet("me")]
    [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
    [ProducesResponseType(typeof(UserDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Me(CancellationToken ct)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized();

        var result = await _auth.GetMeAsync(userId, ct);
        return result.Success
            ? Ok(result.Value)
            : Problem(detail: result.ErrorMessage, statusCode: StatusCodes.Status404NotFound, title: result.ErrorCode.ToString());
    }

    [HttpPatch("me")]
    [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
    [ProducesResponseType(typeof(UserDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> UpdateMe([FromBody] UpdateProfileRequest request, CancellationToken ct)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized();

        var result = await _auth.UpdateProfileAsync(userId, request, ct);
        return result.Success
            ? Ok(result.Value)
            : Problem(detail: result.ErrorMessage, statusCode: StatusCodes.Status400BadRequest, title: result.ErrorCode.ToString());
    }

    private bool TryGetUserId(out Guid userId)
    {
        userId = Guid.Empty;
        var sub = User.FindFirstValue(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)
            ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        return sub is not null && Guid.TryParse(sub, out userId);
    }

    private string? GetIp() => HttpContext.Connection.RemoteIpAddress?.ToString();
}

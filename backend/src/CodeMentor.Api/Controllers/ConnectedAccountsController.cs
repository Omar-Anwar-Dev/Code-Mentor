using System.Security.Claims;
using CodeMentor.Application.Auth;
using CodeMentor.Infrastructure.Auth;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace CodeMentor.Api.Controllers;

/// <summary>
/// S14-T7 / ADR-046: connected-accounts surface. Today only GitHub; future
/// providers (GitLab, Bitbucket) plug into the same controller shape.
///
/// Endpoints:
/// <list type="bullet">
///   <item><c>POST /api/user/connected-accounts/github</c> — initiates OAuth in
///   LINK mode for the authenticated user; returns the GitHub authorize URL.
///   The FE redirects window.location to that URL; the user authorizes; GitHub
///   redirects them back to <c>/callback</c>.</item>
///   <item><c>GET /api/user/connected-accounts/github/callback</c> — anonymous
///   endpoint reached via top-level browser navigation (no Authorization
///   header). Identifies the linking user via an encrypted cookie set at
///   POST time. Redirects to the FE settings page with success/error fragment.</item>
///   <item><c>DELETE /api/user/connected-accounts/github</c> — unlinks the
///   GitHub identity. Returns 409 if the user has no password set
///   (<c>{"error":"set_password_first"}</c>) so the user isn't locked out.</item>
/// </list>
/// </summary>
[ApiController]
[Route("api/user/connected-accounts")]
public class ConnectedAccountsController : ControllerBase
{
    /// <summary>State nonce cookie for the link-mode OAuth flow (distinct from <c>gh_oauth_state</c>).</summary>
    private const string LinkStateCookie = "gh_link_state";
    /// <summary>Encrypted userId cookie — read by the callback to know who to link to.</summary>
    private const string LinkUserIdCookie = "gh_link_userid";

    private readonly IGitHubOAuthService _github;
    private readonly IOAuthTokenEncryptor _encryptor;
    private readonly GitHubOAuthOptions _githubOptions;

    public ConnectedAccountsController(
        IGitHubOAuthService github,
        IOAuthTokenEncryptor encryptor,
        IOptions<GitHubOAuthOptions> githubOptions)
    {
        _github = github;
        _encryptor = encryptor;
        _githubOptions = githubOptions.Value;
    }

    // ====================================================================
    // POST /api/user/connected-accounts/github  (auth required)
    // ====================================================================

    public sealed record InitiateLinkResponse(string AuthorizeUrl);

    [HttpPost("github")]
    [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
    [ProducesResponseType(typeof(InitiateLinkResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
    public IActionResult InitiateGitHubLink()
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();

        try
        {
            var (url, state) = _github.BuildLinkUrl();

            // 5-min HTTP-only cookies — long enough to complete the GitHub authorize redirect.
            var cookieExpires = DateTimeOffset.UtcNow.AddMinutes(5);
            Response.Cookies.Append(LinkStateCookie, state, new CookieOptions
            {
                HttpOnly = true,
                Secure = Request.IsHttps,
                SameSite = SameSiteMode.Lax, // Lax so the GitHub redirect-back carries the cookie
                Expires = cookieExpires,
                Path = "/",
            });
            Response.Cookies.Append(LinkUserIdCookie, _encryptor.Encrypt(userId.ToString()), new CookieOptions
            {
                HttpOnly = true,
                Secure = Request.IsHttps,
                SameSite = SameSiteMode.Lax,
                Expires = cookieExpires,
                Path = "/",
            });

            return Ok(new InitiateLinkResponse(url));
        }
        catch (InvalidOperationException ex)
        {
            // BuildLinkUrl throws when GitHub OAuth credentials aren't configured.
            return Problem(ex.Message, statusCode: StatusCodes.Status503ServiceUnavailable, title: "GitHubOAuthNotConfigured");
        }
    }

    // ====================================================================
    // GET /api/user/connected-accounts/github/callback  (anonymous; cookies)
    // ====================================================================

    [HttpGet("github/callback")]
    [AllowAnonymous]
    [ProducesResponseType(StatusCodes.Status302Found)]
    public async Task<IActionResult> GitHubLinkCallback(
        [FromQuery] string code,
        [FromQuery] string state,
        CancellationToken ct)
    {
        var expectedState = Request.Cookies[LinkStateCookie];
        var userIdCipher = Request.Cookies[LinkUserIdCookie];
        // Clear both cookies whether the link succeeds or fails — single-shot.
        Response.Cookies.Delete(LinkStateCookie, new CookieOptions { Path = "/" });
        Response.Cookies.Delete(LinkUserIdCookie, new CookieOptions { Path = "/" });

        if (string.IsNullOrEmpty(userIdCipher))
        {
            return RedirectToFrontendSettings(success: false, message: "link_session_expired");
        }

        string? userIdPlain;
        try { userIdPlain = _encryptor.Decrypt(userIdCipher); }
        catch { userIdPlain = null; }

        if (userIdPlain is null || !Guid.TryParse(userIdPlain, out var userId))
        {
            return RedirectToFrontendSettings(success: false, message: "link_session_invalid");
        }

        var result = await _github.HandleLinkCallbackAsync(code, state, expectedState, userId, ct);
        if (!result.Success)
        {
            return RedirectToFrontendSettings(success: false, message: result.ErrorMessage ?? "link_failed");
        }

        return RedirectToFrontendSettings(success: true, message: result.Value!.GitHubUsername);
    }

    // ====================================================================
    // DELETE /api/user/connected-accounts/github  (auth required)
    // ====================================================================

    [HttpDelete("github")]
    [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> UnlinkGitHub(CancellationToken ct)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();

        var outcome = await _github.UnlinkAsync(userId, ct);
        return outcome switch
        {
            UnlinkOutcome.Unlinked => Ok(new { unlinked = true }),
            UnlinkOutcome.NoLink => Ok(new { unlinked = false, alreadyDisconnected = true }),
            UnlinkOutcome.BlockedNoPassword => Conflict(new
            {
                error = "set_password_first",
                message = "Set a password on your account before disconnecting GitHub — otherwise you won't be able to log back in.",
            }),
            UnlinkOutcome.UserNotFound => Unauthorized(),
            _ => StatusCode(StatusCodes.Status500InternalServerError),
        };
    }

    // ====================================================================
    // helpers
    // ====================================================================

    private bool TryGetUserId(out Guid userId)
    {
        userId = Guid.Empty;
        var sub = User.FindFirstValue(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)
            ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        return sub is not null && Guid.TryParse(sub, out userId);
    }

    private IActionResult RedirectToFrontendSettings(bool success, string message)
    {
        // S14-T7 hotfix (2026-05-13 walkthrough): use the explicit FrontendSettingsUrl
        // config key. The previous .Replace("/auth/github-success", "/settings") never
        // matched the actual default path ("/auth/github/success") so the redirect
        // landed on the LOGIN success page instead of /settings.
        var baseUrl = string.IsNullOrWhiteSpace(_githubOptions.FrontendSettingsUrl)
            ? "http://localhost:5173/settings"
            : _githubOptions.FrontendSettingsUrl;
        var fragment = $"github-link={(success ? "ok" : "err")}&detail={Uri.EscapeDataString(message)}";
        return Redirect($"{baseUrl}#{fragment}");
    }
}

using System.Security.Claims;
using CodeMentor.Api.Extensions;
using CodeMentor.Application.Auth;
using CodeMentor.Application.Auth.Contracts;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace CodeMentor.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _auth;

    private readonly IGitHubOAuthService _github;

    public AuthController(IAuthService auth, IGitHubOAuthService github)
    {
        _auth = auth;
        _github = github;
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

    [HttpGet("github/callback")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GitHubCallback([FromQuery] string code, [FromQuery] string state, CancellationToken ct)
    {
        var expected = Request.Cookies[GitHubStateCookie];
        Response.Cookies.Delete(GitHubStateCookie);

        var result = await _github.HandleCallbackAsync(code, state, expected, GetIp(), ct);
        if (result.Success)
            return Ok(result.Value);

        return Problem(
            detail: result.ErrorMessage,
            statusCode: StatusCodes.Status400BadRequest,
            title: result.ErrorCode.ToString());
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

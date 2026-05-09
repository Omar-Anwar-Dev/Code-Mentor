using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text.Json.Serialization;
using System.Web;
using CodeMentor.Application.Auth;
using CodeMentor.Application.Auth.Contracts;
using CodeMentor.Infrastructure.Identity;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace CodeMentor.Infrastructure.Auth;

public sealed class GitHubOAuthService : IGitHubOAuthService
{
    private readonly GitHubOAuthOptions _options;
    private readonly JwtOptions _jwt;
    private readonly IHttpClientFactory _httpFactory;
    private readonly UserManager<ApplicationUser> _users;
    private readonly ApplicationDbContext _db;
    private readonly IJwtTokenService _jwtSvc;
    private readonly IOAuthTokenEncryptor _encryptor;
    private readonly ILogger<GitHubOAuthService> _logger;

    public const string GitHubClientName = "github";

    public GitHubOAuthService(
        IOptions<GitHubOAuthOptions> options,
        IOptions<JwtOptions> jwt,
        IHttpClientFactory httpFactory,
        UserManager<ApplicationUser> users,
        ApplicationDbContext db,
        IJwtTokenService jwtSvc,
        IOAuthTokenEncryptor encryptor,
        ILogger<GitHubOAuthService> logger)
    {
        _options = options.Value;
        _jwt = jwt.Value;
        _httpFactory = httpFactory;
        _users = users;
        _db = db;
        _jwtSvc = jwtSvc;
        _encryptor = encryptor;
        _logger = logger;
    }

    public (string authorizeUrl, string state) BuildLoginUrl()
    {
        if (!_options.IsConfigured)
            throw new InvalidOperationException("GitHubOAuth is not configured. Set GITHUB_OAUTH_CLIENT_ID/SECRET + OAUTH_TOKEN_ENCRYPTION_KEY in .env.");

        var state = GenerateState();
        var qs = HttpUtility.ParseQueryString(string.Empty);
        qs["client_id"] = _options.ClientId;
        qs["redirect_uri"] = _options.RedirectUri;
        qs["scope"] = _options.Scopes;
        qs["state"] = state;
        qs["allow_signup"] = "true";

        return ($"https://github.com/login/oauth/authorize?{qs}", state);
    }

    public async Task<AuthResult<AuthResponse>> HandleCallbackAsync(
        string code, string state, string? expectedState, string? ip, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(code))
            return AuthResult<AuthResponse>.Fail(AuthErrorCode.ValidationError, "OAuth code is required.");

        if (!string.Equals(state, expectedState, StringComparison.Ordinal))
            return AuthResult<AuthResponse>.Fail(AuthErrorCode.ValidationError, "OAuth state mismatch (possible CSRF).");

        var client = _httpFactory.CreateClient(GitHubClientName);

        // 1. Exchange code for token.
        var tokenReq = new HttpRequestMessage(HttpMethod.Post, "https://github.com/login/oauth/access_token")
        {
            Content = JsonContent.Create(new
            {
                client_id = _options.ClientId,
                client_secret = _options.ClientSecret,
                code,
                redirect_uri = _options.RedirectUri,
            }),
        };
        tokenReq.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

        var tokenRes = await client.SendAsync(tokenReq, ct);
        if (!tokenRes.IsSuccessStatusCode)
        {
            _logger.LogWarning("GitHub token exchange failed: {Status}", tokenRes.StatusCode);
            return AuthResult<AuthResponse>.Fail(AuthErrorCode.ValidationError, "GitHub authentication failed.");
        }

        var tokenBody = await tokenRes.Content.ReadFromJsonAsync<GitHubTokenResponse>(ct);
        if (tokenBody?.AccessToken is null)
            return AuthResult<AuthResponse>.Fail(AuthErrorCode.ValidationError, "GitHub did not return an access token.");

        // 2. Fetch GitHub profile + primary email.
        var profile = await FetchProfileAsync(client, tokenBody.AccessToken, ct);
        if (profile is null || string.IsNullOrWhiteSpace(profile.Email))
            return AuthResult<AuthResponse>.Fail(AuthErrorCode.ValidationError, "Could not read GitHub profile or email.");

        // 3. Find or create the user.
        var user = await _users.FindByEmailAsync(profile.Email);
        if (user is null)
        {
            user = new ApplicationUser
            {
                Id = Guid.NewGuid(),
                UserName = profile.Email,
                Email = profile.Email,
                EmailConfirmed = true,
                FullName = profile.Name ?? profile.Login,
                GitHubUsername = profile.Login,
                ProfilePictureUrl = profile.AvatarUrl,
            };

            var create = await _users.CreateAsync(user);
            if (!create.Succeeded)
            {
                var msg = string.Join("; ", create.Errors.Select(e => e.Description));
                return AuthResult<AuthResponse>.Fail(AuthErrorCode.ValidationError, msg);
            }

            await _users.AddToRoleAsync(user, ApplicationRoles.Learner);
        }
        else if (string.IsNullOrEmpty(user.GitHubUsername))
        {
            user.GitHubUsername = profile.Login;
            user.UpdatedAt = DateTime.UtcNow;
            await _users.UpdateAsync(user);
        }

        // 4. Store encrypted OAuth token (upsert).
        var existing = await _db.Set<OAuthToken>().FirstOrDefaultAsync(t => t.UserId == user.Id && t.Provider == "GitHub", ct);
        var cipher = _encryptor.Encrypt(tokenBody.AccessToken);
        if (existing is null)
        {
            _db.Set<OAuthToken>().Add(new OAuthToken
            {
                UserId = user.Id,
                Provider = "GitHub",
                AccessTokenCipher = cipher,
                Scopes = tokenBody.Scope,
            });
        }
        else
        {
            existing.AccessTokenCipher = cipher;
            existing.Scopes = tokenBody.Scope;
            existing.UpdatedAt = DateTime.UtcNow;
        }
        await _db.SaveChangesAsync(ct);

        // 5. Issue our JWT + refresh pair.
        var roles = await _users.GetRolesAsync(user);
        var (access, accessExpires) = _jwtSvc.IssueAccessToken(user.Id, user.Email!, roles);
        var (refreshPlain, refreshHash) = _jwtSvc.IssueRefreshToken();

        _db.RefreshTokens.Add(new RefreshToken
        {
            UserId = user.Id,
            TokenHash = refreshHash,
            ExpiresAt = DateTime.UtcNow.AddDays(_jwt.RefreshTokenDays),
            CreatedByIp = ip,
        });
        await _db.SaveChangesAsync(ct);

        var userDto = new UserDto(
            user.Id, user.Email!, user.FullName, user.GitHubUsername,
            user.ProfilePictureUrl, roles.ToList().AsReadOnly(),
            user.EmailConfirmed, user.CreatedAt);

        return AuthResult<AuthResponse>.Ok(new AuthResponse(access, refreshPlain, accessExpires, userDto));
    }

    private static string GenerateState()
    {
        var bytes = new byte[32];
        RandomNumberGenerator.Fill(bytes);
        return Convert.ToHexString(bytes);
    }

    private async Task<GitHubProfile?> FetchProfileAsync(HttpClient client, string token, CancellationToken ct)
    {
        var profileReq = new HttpRequestMessage(HttpMethod.Get, "https://api.github.com/user");
        profileReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        profileReq.Headers.UserAgent.ParseAdd("CodeMentor");
        profileReq.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

        var profileRes = await client.SendAsync(profileReq, ct);
        if (!profileRes.IsSuccessStatusCode) return null;

        var profile = await profileRes.Content.ReadFromJsonAsync<GitHubProfile>(ct);
        if (profile is null) return null;

        // Primary email may not be on /user if the account keeps it private.
        if (string.IsNullOrWhiteSpace(profile.Email))
        {
            var emailReq = new HttpRequestMessage(HttpMethod.Get, "https://api.github.com/user/emails");
            emailReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
            emailReq.Headers.UserAgent.ParseAdd("CodeMentor");
            emailReq.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            var emailRes = await client.SendAsync(emailReq, ct);
            if (emailRes.IsSuccessStatusCode)
            {
                var emails = await emailRes.Content.ReadFromJsonAsync<List<GitHubEmail>>(ct);
                var primary = emails?.FirstOrDefault(e => e.Primary && e.Verified);
                if (primary is not null) profile.Email = primary.Email;
            }
        }

        return profile;
    }

    private sealed class GitHubTokenResponse
    {
        [JsonPropertyName("access_token")] public string? AccessToken { get; set; }
        [JsonPropertyName("token_type")] public string? TokenType { get; set; }
        [JsonPropertyName("scope")] public string? Scope { get; set; }
    }

    private sealed class GitHubProfile
    {
        [JsonPropertyName("login")] public string Login { get; set; } = string.Empty;
        [JsonPropertyName("name")] public string? Name { get; set; }
        [JsonPropertyName("email")] public string? Email { get; set; }
        [JsonPropertyName("avatar_url")] public string? AvatarUrl { get; set; }
    }

    private sealed class GitHubEmail
    {
        [JsonPropertyName("email")] public string Email { get; set; } = string.Empty;
        [JsonPropertyName("primary")] public bool Primary { get; set; }
        [JsonPropertyName("verified")] public bool Verified { get; set; }
    }
}

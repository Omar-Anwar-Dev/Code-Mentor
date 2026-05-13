using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text.Json.Serialization;
using System.Web;
using CodeMentor.Application.Auth;
using CodeMentor.Application.Auth.Contracts;
using CodeMentor.Application.Notifications;
using CodeMentor.Application.UserAccountDeletion;
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
    private readonly INotificationService _notifications;
    private readonly IUserAccountDeletionService _accountDeletion;
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
        INotificationService notifications,
        IUserAccountDeletionService accountDeletion,
        ILogger<GitHubOAuthService> logger)
    {
        _options = options.Value;
        _jwt = jwt.Value;
        _httpFactory = httpFactory;
        _users = users;
        _db = db;
        _jwtSvc = jwtSvc;
        _encryptor = encryptor;
        _notifications = notifications;
        _accountDeletion = accountDeletion;
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

        // S14-T9 / ADR-046: Spotify-model auto-cancel hook (mirrors AuthService.LoginAsync).
        // If the user has an active deletion request in 30-day cooling-off, logging in via
        // GitHub OAuth cancels it.
        await _accountDeletion.AutoCancelOnLoginAsync(user.Id, ct);

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

    // ====================================================================
    // S14-T7 / ADR-046: link-mode OAuth for already-authenticated users.
    // ====================================================================

    public (string authorizeUrl, string state) BuildLinkUrl()
    {
        if (!_options.IsConfigured)
            throw new InvalidOperationException("GitHubOAuth is not configured. Set GITHUB_OAUTH_CLIENT_ID/SECRET + OAUTH_TOKEN_ENCRYPTION_KEY in .env.");

        // S14-T7 hotfix (2026-05-13 walkthrough): use the LINK redirect_uri so
        // GitHub redirects back to the connected-accounts callback (which links
        // to the authenticated user), NOT the login callback (which would issue
        // a fresh JWT and bounce the user to /dashboard).
        var state = GenerateState();
        var qs = HttpUtility.ParseQueryString(string.Empty);
        qs["client_id"] = _options.ClientId;
        qs["redirect_uri"] = _options.LinkRedirectUri;
        qs["scope"] = _options.Scopes;
        qs["state"] = state;
        qs["allow_signup"] = "false"; // LINK only — no fresh-account creation on this leg

        return ($"https://github.com/login/oauth/authorize?{qs}", state);
    }

    public async Task<AuthResult<LinkGitHubResult>> HandleLinkCallbackAsync(
        string code, string state, string? expectedState, Guid linkingUserId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(code))
            return AuthResult<LinkGitHubResult>.Fail(AuthErrorCode.ValidationError, "OAuth code is required.");

        if (!string.Equals(state, expectedState, StringComparison.Ordinal))
            return AuthResult<LinkGitHubResult>.Fail(AuthErrorCode.ValidationError, "OAuth state mismatch (possible CSRF).");

        var user = await _users.FindByIdAsync(linkingUserId.ToString());
        if (user is null)
            return AuthResult<LinkGitHubResult>.Fail(AuthErrorCode.ValidationError, "Linking user not found.");

        var client = _httpFactory.CreateClient(GitHubClientName);

        // 1. Exchange code for token. OAuth2 requires redirect_uri here to MATCH
        // the one we sent at /authorize — which is LinkRedirectUri per BuildLinkUrl,
        // NOT the login-flow RedirectUri.
        var tokenReq = new HttpRequestMessage(HttpMethod.Post, "https://github.com/login/oauth/access_token")
        {
            Content = JsonContent.Create(new
            {
                client_id = _options.ClientId,
                client_secret = _options.ClientSecret,
                code,
                redirect_uri = _options.LinkRedirectUri,
            }),
        };
        tokenReq.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

        var tokenRes = await client.SendAsync(tokenReq, ct);
        if (!tokenRes.IsSuccessStatusCode)
        {
            _logger.LogWarning("GitHub token exchange failed (link mode): {Status}", tokenRes.StatusCode);
            return AuthResult<LinkGitHubResult>.Fail(AuthErrorCode.ValidationError, "GitHub authentication failed.");
        }

        var tokenBody = await tokenRes.Content.ReadFromJsonAsync<GitHubTokenResponse>(ct);
        if (tokenBody?.AccessToken is null)
            return AuthResult<LinkGitHubResult>.Fail(AuthErrorCode.ValidationError, "GitHub did not return an access token.");

        // 2. Fetch profile.
        var profile = await FetchProfileAsync(client, tokenBody.AccessToken, ct);
        if (profile is null || string.IsNullOrWhiteSpace(profile.Login))
            return AuthResult<LinkGitHubResult>.Fail(AuthErrorCode.ValidationError, "Could not read GitHub profile.");

        // 3. Block if the returned GitHub identity is already linked to a DIFFERENT user.
        var collision = await _db.Users.AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id != linkingUserId && u.GitHubUsername == profile.Login, ct);
        if (collision is not null)
        {
            return AuthResult<LinkGitHubResult>.Fail(
                AuthErrorCode.ValidationError,
                $"GitHub account @{profile.Login} is already linked to another Code Mentor account.");
        }

        // 4. Apply the link to the authenticated user.
        user.GitHubUsername = profile.Login;
        if (string.IsNullOrEmpty(user.ProfilePictureUrl) && !string.IsNullOrEmpty(profile.AvatarUrl))
            user.ProfilePictureUrl = profile.AvatarUrl;
        user.UpdatedAt = DateTime.UtcNow;
        await _users.UpdateAsync(user);

        // 5. Upsert encrypted OAuth token.
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

        // 6. Account-security notification — always-on (NotificationService bypasses prefs).
        await _notifications.RaiseSecurityAlertAsync(user.Id, new SecurityAlertEvent(
            EventName: "GitHub account linked",
            EventDetail: $"Linked to GitHub user @{profile.Login}.",
            EventTimeUtc: DateTime.UtcNow,
            SettingsRelativePath: "/settings"), ct);

        return AuthResult<LinkGitHubResult>.Ok(new LinkGitHubResult(profile.Login));
    }

    public async Task<UnlinkOutcome> UnlinkAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await _users.FindByIdAsync(userId.ToString());
        if (user is null) return UnlinkOutcome.UserNotFound;

        // Idempotent no-op if not currently linked.
        if (string.IsNullOrEmpty(user.GitHubUsername))
            return UnlinkOutcome.NoLink;

        // Safety guard: if user has no password set AND GitHub is the only login path,
        // unlinking would lock them out. Force them to set a password first.
        var hasPassword = await _users.HasPasswordAsync(user);
        if (!hasPassword)
            return UnlinkOutcome.BlockedNoPassword;

        var previousLogin = user.GitHubUsername;
        user.GitHubUsername = null;
        user.UpdatedAt = DateTime.UtcNow;
        await _users.UpdateAsync(user);

        // Drop the cached OAuth token — any future repo fetches must re-auth.
        var token = await _db.Set<OAuthToken>().FirstOrDefaultAsync(t => t.UserId == user.Id && t.Provider == "GitHub", ct);
        if (token is not null)
        {
            _db.Set<OAuthToken>().Remove(token);
            await _db.SaveChangesAsync(ct);
        }

        // Account-security notification.
        await _notifications.RaiseSecurityAlertAsync(user.Id, new SecurityAlertEvent(
            EventName: "GitHub account disconnected",
            EventDetail: $"Unlinked from GitHub user @{previousLogin}.",
            EventTimeUtc: DateTime.UtcNow,
            SettingsRelativePath: "/settings"), ct);

        return UnlinkOutcome.Unlinked;
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

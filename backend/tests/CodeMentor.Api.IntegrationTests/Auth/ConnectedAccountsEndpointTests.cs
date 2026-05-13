using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using CodeMentor.Api.IntegrationTests.TestHost;
using CodeMentor.Application.Auth;
using CodeMentor.Application.Auth.Contracts;
using CodeMentor.Domain.Notifications;
using CodeMentor.Infrastructure.Identity;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace CodeMentor.Api.IntegrationTests.Auth;

/// <summary>
/// S14-T7 / ADR-046 acceptance — GitHub link/unlink + safety guard.
/// <para>
/// Full OAuth link flow (POST → GitHub authorize → callback) involves real
/// HTTP calls to GitHub and is NOT exercised here; the live walkthrough at
/// S14-T11 covers it. These tests focus on the auth + safety + idempotency
/// paths that don't require GitHub network round-trips:
/// </para>
/// <list type="bullet">
///   <item>POST without auth → 401</item>
///   <item>POST with auth → 200 + cookies set + authorize URL returned (or 503 if GitHub OAuth unconfigured — test factory case)</item>
///   <item>DELETE without auth → 401</item>
///   <item>DELETE with auth, user has password + GitHub linked → 200, GitHubUsername cleared, security notification raised</item>
///   <item>DELETE with auth, user has password + NO GitHub linked → 200 idempotent (alreadyDisconnected)</item>
///   <item>DELETE with auth, user has NO password + GitHub linked → 409 set_password_first, GitHubUsername preserved</item>
/// </list>
/// </summary>
public class ConnectedAccountsEndpointTests : IClassFixture<CodeMentorWebApplicationFactory>
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    private readonly CodeMentorWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public ConnectedAccountsEndpointTests(CodeMentorWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    private void Bearer(string token) =>
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

    private async Task<(string token, Guid userId)> RegisterPasswordUserAsync(string email)
    {
        var req = new RegisterRequest(email, "Strong_Pass_123!", "Linker Tester", null);
        var res = await _client.PostAsJsonAsync("/api/auth/register", req);
        res.EnsureSuccessStatusCode();
        var body = (await res.Content.ReadFromJsonAsync<AuthResponse>(Json))!;
        return (body.AccessToken, body.User.Id);
    }

    /// <summary>Seed a user with NO PasswordHash (mimics the OAuth-only login path) + an issued JWT.</summary>
    private async Task<(string token, Guid userId)> SeedOAuthOnlyUserAsync(string email, string? githubUsername)
    {
        using var scope = _factory.Services.CreateScope();
        var users = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var jwtSvc = scope.ServiceProvider.GetRequiredService<IJwtTokenService>();

        var user = new ApplicationUser
        {
            UserName = email,
            Email = email,
            FullName = "OAuth Only",
            GitHubUsername = githubUsername,
            EmailConfirmed = true,
        };
        var createResult = await users.CreateAsync(user); // NO password — leaves PasswordHash null
        Assert.True(createResult.Succeeded, string.Join("; ", createResult.Errors.Select(e => e.Description)));
        await users.AddToRoleAsync(user, ApplicationRoles.Learner);

        var roles = await users.GetRolesAsync(user);
        var (access, _) = jwtSvc.IssueAccessToken(user.Id, user.Email!, roles);
        return (access, user.Id);
    }

    private async Task SetGitHubLinkAsync(Guid userId, string githubUsername)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var user = await db.Users.SingleAsync(u => u.Id == userId);
        user.GitHubUsername = githubUsername;
        await db.SaveChangesAsync();
    }

    // ====== POST /github (initiate link) ======

    [Fact]
    public async Task PostGitHub_WithoutAuth_Returns401()
    {
        var res = await _client.PostAsync("/api/user/connected-accounts/github", content: null);
        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    [Fact]
    public async Task PostGitHub_WithAuth_ReturnsAuthorizeUrlOr503()
    {
        var (token, _) = await RegisterPasswordUserAsync($"post-link-{Guid.NewGuid():N}@test.local");
        Bearer(token);

        var res = await _client.PostAsync("/api/user/connected-accounts/github", content: null);

        // The test factory may or may not have GitHub OAuth configured. Either response is
        // valid: 200 + authorize URL when configured, 503 with title=GitHubOAuthNotConfigured
        // when not. Both prove the controller is wired correctly (and not 401 — auth is fine).
        Assert.True(
            res.StatusCode is HttpStatusCode.OK or HttpStatusCode.ServiceUnavailable,
            $"Expected 200 or 503; got {(int)res.StatusCode} {res.StatusCode}.");

        if (res.StatusCode == HttpStatusCode.OK)
        {
            var body = await res.Content.ReadFromJsonAsync<JsonElement>(Json);
            Assert.True(body.TryGetProperty("authorizeUrl", out var urlProp));
            var url = urlProp.GetString()!;
            Assert.Contains("github.com/login/oauth/authorize", url);
            // Cookies should be set for the callback.
            Assert.Contains("gh_link_state", string.Join(";", res.Headers.GetValues("Set-Cookie")));
            Assert.Contains("gh_link_userid", string.Join(";", res.Headers.GetValues("Set-Cookie")));
        }
    }

    // ====== DELETE /github (unlink) ======

    [Fact]
    public async Task DeleteGitHub_WithoutAuth_Returns401()
    {
        var res = await _client.DeleteAsync("/api/user/connected-accounts/github");
        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    [Fact]
    public async Task DeleteGitHub_PasswordUser_WithGitHubLinked_UnlinksSuccessfully()
    {
        var (token, userId) = await RegisterPasswordUserAsync($"delete-linked-{Guid.NewGuid():N}@test.local");
        await SetGitHubLinkAsync(userId, "github-login-1");
        Bearer(token);

        var res = await _client.DeleteAsync("/api/user/connected-accounts/github");

        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var body = await res.Content.ReadFromJsonAsync<JsonElement>(Json);
        Assert.True(body.GetProperty("unlinked").GetBoolean());

        // GitHubUsername cleared on the user row.
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var user = await db.Users.AsNoTracking().SingleAsync(u => u.Id == userId);
        Assert.Null(user.GitHubUsername);

        // Account-security notification raised (NotificationService bypasses prefs for security).
        var notif = await db.Notifications.AsNoTracking()
            .Where(n => n.UserId == userId && n.Type == NotificationType.SecurityAlert)
            .SingleAsync();
        Assert.Contains("GitHub account disconnected", notif.Message);
        Assert.Contains("@github-login-1", notif.Message);
    }

    [Fact]
    public async Task DeleteGitHub_PasswordUser_WithoutGitHubLinked_IsIdempotent()
    {
        var (token, _) = await RegisterPasswordUserAsync($"delete-nolink-{Guid.NewGuid():N}@test.local");
        Bearer(token);

        var res = await _client.DeleteAsync("/api/user/connected-accounts/github");

        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var body = await res.Content.ReadFromJsonAsync<JsonElement>(Json);
        Assert.False(body.GetProperty("unlinked").GetBoolean());
        Assert.True(body.GetProperty("alreadyDisconnected").GetBoolean());
    }

    [Fact]
    public async Task DeleteGitHub_OAuthOnlyUser_Returns409SetPasswordFirst_PreservesLink()
    {
        // OAuth-only user (no password) with GitHub linked — unlinking would lock them out.
        // Safety guard must return 409 with the documented error code; the link must remain.
        var (token, userId) = await SeedOAuthOnlyUserAsync(
            $"delete-nopass-{Guid.NewGuid():N}@test.local",
            githubUsername: "locked-out-candidate");
        Bearer(token);

        var res = await _client.DeleteAsync("/api/user/connected-accounts/github");

        Assert.Equal(HttpStatusCode.Conflict, res.StatusCode);
        var body = await res.Content.ReadFromJsonAsync<JsonElement>(Json);
        Assert.Equal("set_password_first", body.GetProperty("error").GetString());
        Assert.Contains("password", body.GetProperty("message").GetString()!, StringComparison.OrdinalIgnoreCase);

        // GitHubUsername stays intact.
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var user = await db.Users.AsNoTracking().SingleAsync(u => u.Id == userId);
        Assert.Equal("locked-out-candidate", user.GitHubUsername);

        // No security alert raised — unlink didn't happen.
        var notifCount = await db.Notifications.AsNoTracking()
            .CountAsync(n => n.UserId == userId && n.Type == NotificationType.SecurityAlert);
        Assert.Equal(0, notifCount);
    }
}

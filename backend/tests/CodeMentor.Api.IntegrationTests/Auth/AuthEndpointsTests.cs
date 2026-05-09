using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using CodeMentor.Api.IntegrationTests.TestHost;
using CodeMentor.Application.Auth.Contracts;

namespace CodeMentor.Api.IntegrationTests.Auth;

public class AuthEndpointsTests : IClassFixture<CodeMentorWebApplicationFactory>
{
    private readonly CodeMentorWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public AuthEndpointsTests(CodeMentorWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient(new Microsoft.AspNetCore.Mvc.Testing.WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false,
        });
    }

    private static RegisterRequest NewUser(string email = "layla@example.com")
        => new(email, "Strong_Pass_123!", "Layla Test", GitHubUsername: "laylahub");

    // ---- Register ----

    [Fact]
    public async Task Register_HappyPath_Returns200_WithTokensAndUser()
    {
        var req = NewUser();
        var res = await _client.PostAsJsonAsync("/api/auth/register", req);

        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var body = await res.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(body);
        Assert.False(string.IsNullOrEmpty(body!.AccessToken));
        Assert.False(string.IsNullOrEmpty(body.RefreshToken));
        Assert.Equal(req.Email, body.User.Email);
        Assert.Equal(req.FullName, body.User.FullName);
        Assert.Contains("Learner", body.User.Roles);
    }

    [Fact]
    public async Task Register_DuplicateEmail_Returns409()
    {
        var req = NewUser("dup@example.com");
        (await _client.PostAsJsonAsync("/api/auth/register", req)).EnsureSuccessStatusCode();

        var again = await _client.PostAsJsonAsync("/api/auth/register", req);
        Assert.Equal(HttpStatusCode.Conflict, again.StatusCode);
    }

    [Fact]
    public async Task Register_WeakPassword_Returns400()
    {
        var req = new RegisterRequest("weak@example.com", "abc", "Weak User", null);
        var res = await _client.PostAsJsonAsync("/api/auth/register", req);
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }

    [Fact]
    public async Task Register_MissingFields_Returns400()
    {
        var req = new RegisterRequest("", "Strong_Pass_123!", "", null);
        var res = await _client.PostAsJsonAsync("/api/auth/register", req);
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }

    // ---- Login ----

    [Fact]
    public async Task Login_HappyPath_Returns200()
    {
        var reg = NewUser("login@example.com");
        (await _client.PostAsJsonAsync("/api/auth/register", reg)).EnsureSuccessStatusCode();

        var res = await _client.PostAsJsonAsync("/api/auth/login",
            new LoginRequest(reg.Email, reg.Password));

        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var body = await res.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(body);
        Assert.False(string.IsNullOrEmpty(body!.AccessToken));
    }

    [Fact]
    public async Task Login_WrongPassword_Returns401()
    {
        var reg = NewUser("wrongpw@example.com");
        (await _client.PostAsJsonAsync("/api/auth/register", reg)).EnsureSuccessStatusCode();

        var res = await _client.PostAsJsonAsync("/api/auth/login",
            new LoginRequest(reg.Email, "Not_The_Password_1!"));

        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    [Fact]
    public async Task Login_NonexistentUser_Returns401()
    {
        var res = await _client.PostAsJsonAsync("/api/auth/login",
            new LoginRequest("ghost@example.com", "Strong_Pass_123!"));
        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    // ---- Refresh ----

    [Fact]
    public async Task Refresh_HappyPath_ReturnsNewTokenPair_AndRotatesOldToken()
    {
        var reg = NewUser("refresh@example.com");
        var regRes = await _client.PostAsJsonAsync("/api/auth/register", reg);
        var tokens = await regRes.Content.ReadFromJsonAsync<AuthResponse>();

        var refreshRes = await _client.PostAsJsonAsync("/api/auth/refresh",
            new RefreshRequest(tokens!.RefreshToken));

        Assert.Equal(HttpStatusCode.OK, refreshRes.StatusCode);
        var body = await refreshRes.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(body);
        Assert.NotEqual(tokens.RefreshToken, body!.RefreshToken); // rotated

        // Old token should now fail on reuse (revoked).
        var reuse = await _client.PostAsJsonAsync("/api/auth/refresh",
            new RefreshRequest(tokens.RefreshToken));
        Assert.Equal(HttpStatusCode.Unauthorized, reuse.StatusCode);
    }

    [Fact]
    public async Task Refresh_InvalidToken_Returns401()
    {
        var res = await _client.PostAsJsonAsync("/api/auth/refresh",
            new RefreshRequest("definitely-not-a-real-refresh-token"));
        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    // ---- Logout ----

    [Fact]
    public async Task Logout_RevokesRefreshToken_Returns204_ThenRefreshFails()
    {
        var reg = NewUser("logout@example.com");
        var regRes = await _client.PostAsJsonAsync("/api/auth/register", reg);
        var tokens = await regRes.Content.ReadFromJsonAsync<AuthResponse>();

        var logout = await _client.PostAsJsonAsync("/api/auth/logout",
            new RefreshRequest(tokens!.RefreshToken));
        Assert.Equal(HttpStatusCode.NoContent, logout.StatusCode);

        var refresh = await _client.PostAsJsonAsync("/api/auth/refresh",
            new RefreshRequest(tokens.RefreshToken));
        Assert.Equal(HttpStatusCode.Unauthorized, refresh.StatusCode);
    }

    // ---- Me (GET) ----

    [Fact]
    public async Task Me_WithValidToken_Returns200_WithUser()
    {
        var reg = NewUser("me@example.com");
        var regRes = await _client.PostAsJsonAsync("/api/auth/register", reg);
        var tokens = await regRes.Content.ReadFromJsonAsync<AuthResponse>();

        var request = new HttpRequestMessage(HttpMethod.Get, "/api/auth/me");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", tokens!.AccessToken);
        var res = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var user = await res.Content.ReadFromJsonAsync<UserDto>();
        Assert.Equal(reg.Email, user!.Email);
    }

    [Fact]
    public async Task Me_WithoutAuth_Returns401()
    {
        var res = await _client.GetAsync("/api/auth/me");
        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    // ---- Me (PATCH) ----

    [Fact]
    public async Task PatchMe_DoesNotAllowChangingEmail_EmailStaysTheSame()
    {
        var reg = NewUser("emailimmut@example.com");
        var regRes = await _client.PostAsJsonAsync("/api/auth/register", reg);
        var tokens = await regRes.Content.ReadFromJsonAsync<AuthResponse>();

        // Attempt to sneak in an `email` field — PATCH endpoint only binds fullName/gitHubUsername/profilePictureUrl.
        var request = new HttpRequestMessage(HttpMethod.Patch, "/api/auth/me")
        {
            Content = JsonContent.Create(new
            {
                email = "attacker@evil.local",
                fullName = "Renamed",
            }),
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", tokens!.AccessToken);
        var res = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);

        var user = await res.Content.ReadFromJsonAsync<UserDto>();
        Assert.Equal(reg.Email, user!.Email);   // Email immutable.
        Assert.Equal("Renamed", user.FullName); // FullName updated.
    }

    [Fact]
    public async Task PatchMe_UpdatesProfile_Returns200()
    {
        var reg = NewUser("patchme@example.com");
        var regRes = await _client.PostAsJsonAsync("/api/auth/register", reg);
        var tokens = await regRes.Content.ReadFromJsonAsync<AuthResponse>();

        var request = new HttpRequestMessage(HttpMethod.Patch, "/api/auth/me")
        {
            Content = JsonContent.Create(new UpdateProfileRequest("Updated Name", "updated-gh", null)),
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", tokens!.AccessToken);
        var res = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var user = await res.Content.ReadFromJsonAsync<UserDto>();
        Assert.Equal("Updated Name", user!.FullName);
        Assert.Equal("updated-gh", user.GitHubUsername);
    }
}

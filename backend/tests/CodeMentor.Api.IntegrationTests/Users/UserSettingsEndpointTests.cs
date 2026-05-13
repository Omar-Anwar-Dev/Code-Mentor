using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using CodeMentor.Api.IntegrationTests.TestHost;
using CodeMentor.Application.Auth.Contracts;
using CodeMentor.Application.UserSettings;

namespace CodeMentor.Api.IntegrationTests.Users;

/// <summary>
/// S14-T2 / ADR-046 acceptance — GET + PATCH /api/user/settings with lazy-init,
/// partial-update semantics, and 401 on missing auth.
/// </summary>
public class UserSettingsEndpointTests : IClassFixture<CodeMentorWebApplicationFactory>
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    private readonly CodeMentorWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public UserSettingsEndpointTests(CodeMentorWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    private void Bearer(string token) =>
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

    private async Task<string> RegisterAndLoginAsync(string email)
    {
        var req = new RegisterRequest(email, "Strong_Pass_123!", "Settings Tester", null);
        var res = await _client.PostAsJsonAsync("/api/auth/register", req);
        res.EnsureSuccessStatusCode();
        var body = (await res.Content.ReadFromJsonAsync<AuthResponse>(Json))!;
        return body.AccessToken;
    }

    [Fact]
    public async Task Get_WithoutAuth_Returns401()
    {
        var res = await _client.GetAsync("/api/user/settings");
        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    [Fact]
    public async Task Patch_WithoutAuth_Returns401()
    {
        var res = await _client.PatchAsJsonAsync(
            "/api/user/settings",
            new UserSettingsPatchRequest(NotifSubmissionEmail: false));
        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    [Fact]
    public async Task Get_NewUser_LazyInitsAndReturnsDefaults()
    {
        var token = await RegisterAndLoginAsync($"settings-get-{Guid.NewGuid():N}@test.local");
        Bearer(token);

        var dto = await _client.GetFromJsonAsync<UserSettingsDto>("/api/user/settings", Json);

        Assert.NotNull(dto);
        // All 5 notification prefs across both channels default to ON.
        Assert.True(dto!.NotifSubmissionEmail);
        Assert.True(dto.NotifSubmissionInApp);
        Assert.True(dto.NotifAuditEmail);
        Assert.True(dto.NotifAuditInApp);
        Assert.True(dto.NotifWeaknessEmail);
        Assert.True(dto.NotifWeaknessInApp);
        Assert.True(dto.NotifBadgeEmail);
        Assert.True(dto.NotifBadgeInApp);
        Assert.True(dto.NotifSecurityEmail);
        Assert.True(dto.NotifSecurityInApp);
        // Privacy defaults: discoverable + leaderboard ON, but PublicCV default OFF.
        Assert.True(dto.ProfileDiscoverable);
        Assert.False(dto.PublicCvDefault);
        Assert.True(dto.ShowInLeaderboard);
        Assert.True((DateTime.UtcNow - dto.CreatedAt).TotalMinutes < 5);
    }

    [Fact]
    public async Task Get_TwoCallsForSameUser_IdempotentLazyInit()
    {
        // Verifies the second GET doesn't try to re-insert. Both calls return the same
        // CreatedAt timestamp from the row inserted on the first call.
        var token = await RegisterAndLoginAsync($"settings-idemp-{Guid.NewGuid():N}@test.local");
        Bearer(token);

        var first = await _client.GetFromJsonAsync<UserSettingsDto>("/api/user/settings", Json);
        var second = await _client.GetFromJsonAsync<UserSettingsDto>("/api/user/settings", Json);

        Assert.Equal(first!.CreatedAt, second!.CreatedAt);
    }

    [Fact]
    public async Task Patch_PartialUpdate_TouchesOnlyProvidedFields()
    {
        var token = await RegisterAndLoginAsync($"settings-patch-partial-{Guid.NewGuid():N}@test.local");
        Bearer(token);

        // Read defaults first so we have an updatedAt to compare against.
        var before = (await _client.GetFromJsonAsync<UserSettingsDto>("/api/user/settings", Json))!;

        // Patch ONLY two fields. Everything else should remain at default.
        var patch = new UserSettingsPatchRequest(
            NotifBadgeEmail: false,
            PublicCvDefault: true);
        var res = await _client.PatchAsJsonAsync("/api/user/settings", patch);
        res.EnsureSuccessStatusCode();
        var after = (await res.Content.ReadFromJsonAsync<UserSettingsDto>(Json))!;

        // Patched:
        Assert.False(after.NotifBadgeEmail);
        Assert.True(after.PublicCvDefault);
        // Untouched (still defaults):
        Assert.True(after.NotifSubmissionEmail);
        Assert.True(after.NotifSubmissionInApp);
        Assert.True(after.NotifAuditEmail);
        Assert.True(after.NotifBadgeInApp);
        Assert.True(after.NotifSecurityEmail);
        Assert.True(after.ProfileDiscoverable);
        Assert.True(after.ShowInLeaderboard);
        // UpdatedAt should advance; CreatedAt should not.
        Assert.Equal(before.CreatedAt, after.CreatedAt);
        Assert.True(after.UpdatedAt >= before.UpdatedAt);
    }

    [Fact]
    public async Task Patch_AllFields_Persist()
    {
        var token = await RegisterAndLoginAsync($"settings-patch-all-{Guid.NewGuid():N}@test.local");
        Bearer(token);

        // Flip every togglable field to its non-default value.
        var patch = new UserSettingsPatchRequest(
            NotifSubmissionEmail: false,
            NotifSubmissionInApp: false,
            NotifAuditEmail: false,
            NotifAuditInApp: false,
            NotifWeaknessEmail: false,
            NotifWeaknessInApp: false,
            NotifBadgeEmail: false,
            NotifBadgeInApp: false,
            NotifSecurityEmail: false,
            NotifSecurityInApp: false,
            ProfileDiscoverable: false,
            PublicCvDefault: true,
            ShowInLeaderboard: false);
        var res = await _client.PatchAsJsonAsync("/api/user/settings", patch);
        res.EnsureSuccessStatusCode();

        // Re-read to confirm persistence across requests (fresh DbContext scope per request).
        var dto = (await _client.GetFromJsonAsync<UserSettingsDto>("/api/user/settings", Json))!;
        Assert.False(dto.NotifSubmissionEmail);
        Assert.False(dto.NotifSubmissionInApp);
        Assert.False(dto.NotifAuditEmail);
        Assert.False(dto.NotifAuditInApp);
        Assert.False(dto.NotifWeaknessEmail);
        Assert.False(dto.NotifWeaknessInApp);
        Assert.False(dto.NotifBadgeEmail);
        Assert.False(dto.NotifBadgeInApp);
        // Security prefs CAN be persisted as false (FE display consistency); the dispatch
        // bypass that ignores them at send time lives in NotificationService (S14-T5).
        Assert.False(dto.NotifSecurityEmail);
        Assert.False(dto.NotifSecurityInApp);
        Assert.False(dto.ProfileDiscoverable);
        Assert.True(dto.PublicCvDefault);
        Assert.False(dto.ShowInLeaderboard);
    }

    [Fact]
    public async Task EachUsersSettings_IsolatedFromOthers()
    {
        // Implicit cross-user isolation: the endpoint scopes to the caller's identity,
        // not a path-param userId. Two users → two independent settings rows.
        var aliceToken = await RegisterAndLoginAsync($"settings-alice-{Guid.NewGuid():N}@test.local");
        var bobToken = await RegisterAndLoginAsync($"settings-bob-{Guid.NewGuid():N}@test.local");

        Bearer(aliceToken);
        await _client.PatchAsJsonAsync(
            "/api/user/settings",
            new UserSettingsPatchRequest(NotifSubmissionEmail: false));
        var alice = (await _client.GetFromJsonAsync<UserSettingsDto>("/api/user/settings", Json))!;

        Bearer(bobToken);
        var bob = (await _client.GetFromJsonAsync<UserSettingsDto>("/api/user/settings", Json))!;

        // Alice flipped her flag; Bob's defaults are unchanged.
        Assert.False(alice.NotifSubmissionEmail);
        Assert.True(bob.NotifSubmissionEmail);
    }
}

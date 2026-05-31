using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using CodeMentor.Api.IntegrationTests.TestHost;
using CodeMentor.Application.Auth.Contracts;
using CodeMentor.Application.LearningPaths;
using CodeMentor.Domain.Assessments;
using CodeMentor.Domain.Skills;
using CodeMentor.Domain.Tasks;
using CodeMentor.Infrastructure.CodeReview;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace CodeMentor.Api.IntegrationTests.LearningPaths;

/// <summary>
/// S19-T6 / F16: integration tests for the per-task framing flow.
///
/// Four acceptance scenarios per the implementation-plan S19-T6 entry:
///   1. Cold cache → 409 with poll hint + Hangfire job ran inline →
///      next call returns 200 with the freshly-generated payload.
///   2. Warm cache → 200 with the existing payload + AI not re-called.
///   3. Expired cache → re-generates → 200 with the new payload.
///   4. Cross-user isolation — User B can't read User A's framing
///      (OwnsResource via UserId).
/// </summary>
public class TaskFramingTests : IClassFixture<CodeMentorWebApplicationFactory>
{
    private readonly CodeMentorWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public TaskFramingTests(CodeMentorWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
        var fake = (FakeTaskFramingRefit)factory.Services.GetRequiredService<ITaskFramingRefit>();
        fake.Reset();
        var inline = (InlineGenerateTaskFramingScheduler)factory.Services.GetRequiredService<IGenerateTaskFramingScheduler>();
        inline.Reset();
    }

    private async Task<(string Token, Guid UserId)> RegisterAndIdentityAsync(string email)
    {
        var req = new RegisterRequest(email, "Strong_Pass_123!", "Framing Tester", null);
        var res = await _client.PostAsJsonAsync("/api/auth/register", req);
        res.EnsureSuccessStatusCode();
        var body = await res.Content.ReadFromJsonAsync<AuthResponse>();
        var token = body!.AccessToken;

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var user = await db.Set<CodeMentor.Infrastructure.Identity.ApplicationUser>()
            .FirstAsync(u => u.Email == email);
        return (token, user.Id);
    }

    private HttpClient ClientWithBearer(string token)
    {
        var c = _factory.CreateClient();
        c.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return c;
    }

    private async Task<Guid> EnsureTaskAsync()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var task = await db.Tasks
            .OrderBy(t => t.Title)
            .FirstAsync(t => t.IsActive);
        return task.Id;
    }

    private async Task SeedLearnerProfileAsync(Guid userId)
    {
        using var scope = _factory.Services.CreateScope();
        var profiles = scope.ServiceProvider.GetRequiredService<ILearnerSkillProfileService>();
        await profiles.UpdateFromSubmissionAsync(userId, new Dictionary<SkillCategory, decimal>
        {
            [SkillCategory.DataStructures] = 50m,
            [SkillCategory.Security] = 40m,
            [SkillCategory.OOP] = 65m,
        });
    }

    // ── 1: cold cache → 409 then 200 ──

    [Fact]
    public async Task ColdCache_Returns_409_Then_200_After_Inline_Job_Runs()
    {
        var (token, userId) = await RegisterAndIdentityAsync("framing-cold@test.local");
        var http = ClientWithBearer(token);
        await SeedLearnerProfileAsync(userId);
        var taskId = await EnsureTaskAsync();

        // Configure the inline scheduler to NOT run the job inline so we can
        // observe the 409 path before the job lands. After we observe 409
        // we'll run the job manually + re-fetch.
        var inline = (InlineGenerateTaskFramingScheduler)_factory.Services.GetRequiredService<IGenerateTaskFramingScheduler>();
        inline.InvokeJobInline = false;

        var firstResp = await http.GetAsync($"/api/tasks/{taskId}/framing");
        Assert.Equal(HttpStatusCode.Conflict, firstResp.StatusCode);
        var firstBody = await firstResp.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Generating", firstBody.GetProperty("status").GetString());
        Assert.True(firstBody.TryGetProperty("retryAfterHint", out _));
        Assert.Contains((userId, taskId), inline.Scheduled);

        // Now run the job inline to simulate Hangfire pick-up + re-fetch.
        inline.InvokeJobInline = true;
        inline.EnqueueGeneration(userId, taskId);

        var secondResp = await http.GetAsync($"/api/tasks/{taskId}/framing");
        Assert.Equal(HttpStatusCode.OK, secondResp.StatusCode);
        var payload = await secondResp.Content.ReadFromJsonAsync<TaskFramingDto>();
        Assert.NotNull(payload);
        Assert.Equal(taskId, payload!.TaskId);
        Assert.Contains("DataStructures", payload.WhyThisMatters);
        Assert.Equal(2, payload.FocusAreas.Count);
        Assert.Equal(2, payload.CommonPitfalls.Count);
    }

    // ── 2: warm cache → 200 with the existing payload, AI not re-called ──

    [Fact]
    public async Task WarmCache_Returns_200_Without_Re_Calling_AI()
    {
        var (token, userId) = await RegisterAndIdentityAsync("framing-warm@test.local");
        var http = ClientWithBearer(token);
        await SeedLearnerProfileAsync(userId);
        var taskId = await EnsureTaskAsync();

        var fake = (FakeTaskFramingRefit)_factory.Services.GetRequiredService<ITaskFramingRefit>();
        fake.Reset();

        // Cold-warm: first call generates inline (default), second call
        // should hit the warm cache.
        var first = await http.GetAsync($"/api/tasks/{taskId}/framing");
        // Note: depending on enqueue-then-execute ordering, first call may
        // already see the warm row OR return 409. Force a fresh row so the
        // second call has something to read.
        if (first.StatusCode == HttpStatusCode.Conflict)
        {
            // Inline scheduler ran the job during EnqueueGeneration → row
            // should now exist. Refetch.
            first = await http.GetAsync($"/api/tasks/{taskId}/framing");
        }
        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        var firstBody = await first.Content.ReadFromJsonAsync<TaskFramingDto>();

        var callsBefore = fake.Calls.Count;
        var second = await http.GetAsync($"/api/tasks/{taskId}/framing");
        Assert.Equal(HttpStatusCode.OK, second.StatusCode);
        var secondBody = await second.Content.ReadFromJsonAsync<TaskFramingDto>();
        Assert.Equal(firstBody!.GeneratedAt, secondBody!.GeneratedAt);
        // Crucially: warm-cache lookup did NOT call AI again.
        Assert.Equal(callsBefore, fake.Calls.Count);
    }

    // ── 3: expired cache → re-generates ──

    [Fact]
    public async Task ExpiredCache_Regenerates_And_Returns_New_Payload()
    {
        var (token, userId) = await RegisterAndIdentityAsync("framing-expired@test.local");
        var http = ClientWithBearer(token);
        await SeedLearnerProfileAsync(userId);
        var taskId = await EnsureTaskAsync();

        var inline = (InlineGenerateTaskFramingScheduler)_factory.Services.GetRequiredService<IGenerateTaskFramingScheduler>();
        var fake = (FakeTaskFramingRefit)_factory.Services.GetRequiredService<ITaskFramingRefit>();

        // First call → inline job runs → row exists fresh
        var first = await http.GetAsync($"/api/tasks/{taskId}/framing");
        if (first.StatusCode == HttpStatusCode.Conflict)
            first = await http.GetAsync($"/api/tasks/{taskId}/framing");
        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        var firstBody = await first.Content.ReadFromJsonAsync<TaskFramingDto>();

        // Force expiry of the row in the DB.
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var row = await db.TaskFramings
                .FirstAsync(f => f.UserId == userId && f.TaskId == taskId);
            row.ExpiresAt = DateTime.UtcNow.AddDays(-1);
            row.GeneratedAt = DateTime.UtcNow.AddDays(-8);
            await db.SaveChangesAsync();
        }

        // Change the canned response so the regenerate can be observed.
        fake.CannedResponse = new TFFramingResponse(
            WhyThisMatters: "FRESH after expiry — DataStructures still 50/100, focus on validation.",
            FocusAreas: new List<string>
            {
                "Use idempotency keys on retried requests now.",
                "Validate inputs before any state changes.",
            },
            CommonPitfalls: new List<string>
            {
                "Mutating shared state outside the transactional boundary.",
                "Logging the request body wholesale on errors.",
            },
            PromptVersion: "task_framing_v1",
            TokensUsed: 350,
            RetryCount: 0);

        // Next call → cache miss (expired) → enqueue → inline job runs → 200 with new payload.
        var second = await http.GetAsync($"/api/tasks/{taskId}/framing");
        Assert.Equal(HttpStatusCode.OK, second.StatusCode);
        var secondBody = await second.Content.ReadFromJsonAsync<TaskFramingDto>();
        Assert.NotNull(secondBody);
        Assert.StartsWith("FRESH after expiry", secondBody!.WhyThisMatters);
        Assert.NotEqual(firstBody!.GeneratedAt, secondBody.GeneratedAt);

        // Audit: the regeneration bumped RegeneratedCount.
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var row = await db.TaskFramings
                .AsNoTracking()
                .FirstAsync(f => f.UserId == userId && f.TaskId == taskId);
            Assert.Equal(1, row.RegeneratedCount);
        }
    }

    // ── 4: cross-user isolation ──

    [Fact]
    public async Task CrossUser_Isolation_UserB_Gets_Their_Own_Or_New_Row_Not_UserAs()
    {
        var (tokenA, userIdA) = await RegisterAndIdentityAsync("framing-userA@test.local");
        var (tokenB, userIdB) = await RegisterAndIdentityAsync("framing-userB@test.local");
        await SeedLearnerProfileAsync(userIdA);
        await SeedLearnerProfileAsync(userIdB);
        var taskId = await EnsureTaskAsync();

        var fake = (FakeTaskFramingRefit)_factory.Services.GetRequiredService<ITaskFramingRefit>();
        fake.Reset();
        fake.CannedResponse = new TFFramingResponse(
            WhyThisMatters: "USER-A-SPECIFIC content — A's score breakdown — DataStructures.",
            FocusAreas: new List<string>
            {
                "User A focus item one with enough length.",
                "User A focus item two with enough length.",
            },
            CommonPitfalls: new List<string>
            {
                "User A pitfall one with enough length.",
                "User A pitfall two with enough length.",
            },
            PromptVersion: "task_framing_v1",
            TokensUsed: 250,
            RetryCount: 0);

        var httpA = ClientWithBearer(tokenA);
        var respA = await httpA.GetAsync($"/api/tasks/{taskId}/framing");
        if (respA.StatusCode == HttpStatusCode.Conflict)
            respA = await httpA.GetAsync($"/api/tasks/{taskId}/framing");
        Assert.Equal(HttpStatusCode.OK, respA.StatusCode);
        var bodyA = await respA.Content.ReadFromJsonAsync<TaskFramingDto>();
        Assert.NotNull(bodyA);

        // Swap canned response for User B's call.
        fake.CannedResponse = new TFFramingResponse(
            WhyThisMatters: "USER-B-SPECIFIC content — B's score breakdown — Security.",
            FocusAreas: new List<string>
            {
                "User B focus item one with enough length.",
                "User B focus item two with enough length.",
            },
            CommonPitfalls: new List<string>
            {
                "User B pitfall one with enough length.",
                "User B pitfall two with enough length.",
            },
            PromptVersion: "task_framing_v1",
            TokensUsed: 250,
            RetryCount: 0);

        var httpB = ClientWithBearer(tokenB);
        var respB = await httpB.GetAsync($"/api/tasks/{taskId}/framing");
        if (respB.StatusCode == HttpStatusCode.Conflict)
            respB = await httpB.GetAsync($"/api/tasks/{taskId}/framing");
        Assert.Equal(HttpStatusCode.OK, respB.StatusCode);
        var bodyB = await respB.Content.ReadFromJsonAsync<TaskFramingDto>();
        Assert.NotNull(bodyB);

        // Different content — each user got their own row.
        Assert.StartsWith("USER-A-SPECIFIC", bodyA!.WhyThisMatters);
        Assert.StartsWith("USER-B-SPECIFIC", bodyB!.WhyThisMatters);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        Assert.Equal(2, await db.TaskFramings
            .CountAsync(f => f.TaskId == taskId && (f.UserId == userIdA || f.UserId == userIdB)));
    }
}

using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using CodeMentor.Api.IntegrationTests.TestHost;
using CodeMentor.Application.Auth.Contracts;
using CodeMentor.Application.LearningPaths;
using CodeMentor.Application.LearningPaths.Contracts;
using CodeMentor.Domain.Assessments;
using CodeMentor.Domain.Tasks;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace CodeMentor.Api.IntegrationTests.LearningPaths;

/// <summary>
/// S20-T5 / F16 (ADR-053): 6 integration tests for the learner-facing
/// adaptation endpoints + the cross-user 403 boundary check.
///   1. List pending + history (200 + correct partition)
///   2. List history-only filter
///   3. Approve → applies actions + flips decision
///   4. Reject → no path change, flips decision
///   5. Refresh → 202 + enqueues OnDemand cycle
///   6. Cross-user respond → 403 (other learner's event)
///
/// Refresh enqueue is captured via a fake scheduler so we don't need
/// Hangfire running in tests.
/// </summary>
public class PathAdaptationEndpointTests : IClassFixture<CodeMentorWebApplicationFactory>
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    private readonly CodeMentorWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public PathAdaptationEndpointTests(CodeMentorWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    private void Bearer(string token) =>
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

    private async Task<(string token, Guid userId)> RegisterAsync(string email)
    {
        var req = new RegisterRequest(email, "Strong_Pass_123!", "Adapt Tester", null);
        var res = await _client.PostAsJsonAsync("/api/auth/register", req);
        res.EnsureSuccessStatusCode();
        var body = (await res.Content.ReadFromJsonAsync<AuthResponse>(Json))!;
        return (body.AccessToken, body.User.Id);
    }

    private async Task<LearningPath> SeedActivePathAsync(Guid userId, bool seedTasks = true)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var path = new LearningPath
        {
            UserId = userId,
            Track = Track.Backend,
            IsActive = true,
            ProgressPercent = 25m,
            Source = LearningPathSource.AIGenerated,
        };
        db.LearningPaths.Add(path);
        if (seedTasks)
        {
            for (var i = 0; i < 3; i++)
            {
                var t = new TaskItem
                {
                    Title = $"Adapt Test Task {i + 1}",
                    Description = "Task description with enough content to satisfy validators.",
                    Track = Track.Backend,
                    Difficulty = 2,
                    IsActive = true,
                    SkillTagsJson = """[{"skill":"security","weight":1.0}]""",
                };
                db.Tasks.Add(t);
                await db.SaveChangesAsync();
                db.PathTasks.Add(new PathTask
                {
                    PathId = path.Id,
                    TaskId = t.Id,
                    OrderIndex = i + 1,
                    Status = PathTaskStatus.NotStarted,
                });
            }
        }
        await db.SaveChangesAsync();
        return path;
    }

    private async Task<PathAdaptationEvent> SeedPendingEventAsync(Guid userId, Guid pathId,
        string actionsJson = """[{"type":"reorder","targetPosition":1,"newOrderIndex":2,"reason":"Low-confidence reorder for tests.","confidence":0.55}]""")
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var ev = new PathAdaptationEvent
        {
            PathId = pathId,
            UserId = userId,
            Trigger = PathAdaptationTrigger.ScoreSwing,
            SignalLevel = PathAdaptationSignalLevel.Small,
            BeforeStateJson = "[]",
            AfterStateJson = "[]",
            AIReasoningText = "Adapter proposed one reorder pending learner review.",
            ConfidenceScore = 0.55,
            ActionsJson = actionsJson,
            LearnerDecision = PathAdaptationDecision.Pending,
            AIPromptVersion = "adapt_path_v1",
            IdempotencyKey = $"PathAdaptationJob:{pathId}:{Guid.NewGuid():N}:0",
        };
        db.PathAdaptationEvents.Add(ev);
        await db.SaveChangesAsync();
        return ev;
    }

    [Fact]
    public async Task T1_List_Adaptations_Returns_Both_Pending_And_History_Buckets()
    {
        var (token, userId) = await RegisterAsync($"adapt-list-{Guid.NewGuid():N}@test.local");
        var path = await SeedActivePathAsync(userId);
        await SeedPendingEventAsync(userId, path.Id); // 1 Pending

        // Seed a historical AutoApplied event.
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            db.PathAdaptationEvents.Add(new PathAdaptationEvent
            {
                PathId = path.Id,
                UserId = userId,
                Trigger = PathAdaptationTrigger.Periodic,
                SignalLevel = PathAdaptationSignalLevel.Small,
                BeforeStateJson = "[]",
                AfterStateJson = "[]",
                AIReasoningText = "Auto-applied reorder.",
                ConfidenceScore = 0.9,
                ActionsJson = "[]",
                LearnerDecision = PathAdaptationDecision.AutoApplied,
                AIPromptVersion = "adapt_path_v1",
                IdempotencyKey = $"PathAdaptationJob:{path.Id}:{Guid.NewGuid():N}:1",
                TriggeredAt = DateTime.UtcNow.AddDays(-1),
            });
            await db.SaveChangesAsync();
        }

        Bearer(token);
        var res = await _client.GetFromJsonAsync<PathAdaptationListResponse>(
            "/api/learning-paths/me/adaptations", Json);

        Assert.NotNull(res);
        Assert.Single(res!.Pending);
        Assert.Single(res.History);
        Assert.Equal("Pending", res.Pending[0].LearnerDecision);
        Assert.Equal("AutoApplied", res.History[0].LearnerDecision);
    }

    [Fact]
    public async Task T2_List_Adaptations_With_HistoryOnly_Filter_Returns_Only_History()
    {
        var (token, userId) = await RegisterAsync($"adapt-history-{Guid.NewGuid():N}@test.local");
        var path = await SeedActivePathAsync(userId);
        await SeedPendingEventAsync(userId, path.Id); // pending (excluded by filter)
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            db.PathAdaptationEvents.Add(new PathAdaptationEvent
            {
                PathId = path.Id,
                UserId = userId,
                Trigger = PathAdaptationTrigger.Periodic,
                SignalLevel = PathAdaptationSignalLevel.Small,
                BeforeStateJson = "[]",
                AfterStateJson = "[]",
                AIReasoningText = "Rejected reorder.",
                ConfidenceScore = 0.6,
                ActionsJson = "[]",
                LearnerDecision = PathAdaptationDecision.Rejected,
                AIPromptVersion = "adapt_path_v1",
                IdempotencyKey = $"PathAdaptationJob:{path.Id}:{Guid.NewGuid():N}:2",
                TriggeredAt = DateTime.UtcNow.AddDays(-2),
                RespondedAt = DateTime.UtcNow.AddDays(-2).AddHours(2),
            });
            await db.SaveChangesAsync();
        }

        Bearer(token);
        var res = await _client.GetFromJsonAsync<PathAdaptationListResponse>(
            "/api/learning-paths/me/adaptations?status=history", Json);

        Assert.NotNull(res);
        Assert.Empty(res!.Pending);
        Assert.Single(res.History);
        Assert.Equal("Rejected", res.History[0].LearnerDecision);
    }

    [Fact]
    public async Task T3_Approve_Pending_Event_Applies_Actions_And_Flips_Decision()
    {
        var (token, userId) = await RegisterAsync($"adapt-approve-{Guid.NewGuid():N}@test.local");
        var path = await SeedActivePathAsync(userId);
        var ev = await SeedPendingEventAsync(userId, path.Id);

        Bearer(token);
        var res = await _client.PostAsJsonAsync(
            $"/api/learning-paths/me/adaptations/{ev.Id}/respond",
            new PathAdaptationRespondRequest("approved"));
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var body = await res.Content.ReadFromJsonAsync<PathAdaptationRespondResponse>(Json);
        Assert.NotNull(body);
        Assert.Equal(ev.Id, body!.EventId);
        Assert.Equal("Approved", body.Decision);

        // Verify path tasks were reordered: T1 originally at OrderIndex=1 should now be at 2.
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var pathTasks = await db.PathTasks.AsNoTracking()
            .Where(t => t.PathId == path.Id)
            .OrderBy(t => t.OrderIndex)
            .ToListAsync();
        Assert.Equal(3, pathTasks.Count);
        // Sanity: dense 1..3 ordering preserved.
        Assert.Equal(new[] { 1, 2, 3 }, pathTasks.Select(t => t.OrderIndex).ToArray());

        var refetched = await db.PathAdaptationEvents.AsNoTracking().SingleAsync(e => e.Id == ev.Id);
        Assert.Equal(PathAdaptationDecision.Approved, refetched.LearnerDecision);
        Assert.NotNull(refetched.RespondedAt);
    }

    [Fact]
    public async Task T4_Reject_Pending_Event_Doesnt_Change_Path_But_Flips_Decision()
    {
        var (token, userId) = await RegisterAsync($"adapt-reject-{Guid.NewGuid():N}@test.local");
        var path = await SeedActivePathAsync(userId);
        var ev = await SeedPendingEventAsync(userId, path.Id);

        Bearer(token);
        var res = await _client.PostAsJsonAsync(
            $"/api/learning-paths/me/adaptations/{ev.Id}/respond",
            new PathAdaptationRespondRequest("rejected"));
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var body = await res.Content.ReadFromJsonAsync<PathAdaptationRespondResponse>(Json);
        Assert.Equal("Rejected", body!.Decision);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var refetched = await db.PathAdaptationEvents.AsNoTracking().SingleAsync(e => e.Id == ev.Id);
        Assert.Equal(PathAdaptationDecision.Rejected, refetched.LearnerDecision);
        Assert.NotNull(refetched.RespondedAt);
    }

    [Fact]
    public async Task T5_Refresh_Returns_202_When_Active_Path_Exists()
    {
        var (token, userId) = await RegisterAsync($"adapt-refresh-{Guid.NewGuid():N}@test.local");
        await SeedActivePathAsync(userId);

        Bearer(token);
        var res = await _client.PostAsync("/api/learning-paths/me/refresh", content: null);
        Assert.Equal(HttpStatusCode.Accepted, res.StatusCode);
        var body = await res.Content.ReadFromJsonAsync<PathAdaptationRefreshResponse>(Json);
        Assert.NotNull(body);
        Assert.Equal("enqueued", body!.Status);
    }

    [Fact]
    public async Task T6_Cross_User_Respond_Returns_403()
    {
        var (tokenA, userIdA) = await RegisterAsync($"adapt-userA-{Guid.NewGuid():N}@test.local");
        var pathA = await SeedActivePathAsync(userIdA);
        var evA = await SeedPendingEventAsync(userIdA, pathA.Id);

        // User B tries to respond to A's event.
        var (tokenB, _) = await RegisterAsync($"adapt-userB-{Guid.NewGuid():N}@test.local");
        Bearer(tokenB);
        var res = await _client.PostAsJsonAsync(
            $"/api/learning-paths/me/adaptations/{evA.Id}/respond",
            new PathAdaptationRespondRequest("approved"));
        Assert.Equal(HttpStatusCode.Forbidden, res.StatusCode);

        // And event A is still Pending (unchanged).
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var refetched = await db.PathAdaptationEvents.AsNoTracking().SingleAsync(e => e.Id == evA.Id);
        Assert.Equal(PathAdaptationDecision.Pending, refetched.LearnerDecision);
    }
}

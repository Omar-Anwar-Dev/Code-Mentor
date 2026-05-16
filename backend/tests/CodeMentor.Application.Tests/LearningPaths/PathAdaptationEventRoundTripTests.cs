using CodeMentor.Domain.Assessments;
using CodeMentor.Domain.Tasks;
using CodeMentor.Infrastructure.LearningPaths;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CodeMentor.Application.Tests.LearningPaths;

/// <summary>
/// S20-T3 / F16 (ADR-053): round-trip the new PathAdaptationEvent entity added
/// by the AddPathAdaptationEvents migration + smoke-test the repository
/// read paths (pending, timeline, recent, by-id, idempotency-key lookup).
/// Also covers the LearningPath.LastAdaptedAt column added by the same
/// migration.
/// </summary>
public class PathAdaptationEventRoundTripTests
{
    private static ApplicationDbContext NewDb()
    {
        var opts = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase($"PathAdapt_{Guid.NewGuid():N}")
            .Options;
        return new ApplicationDbContext(opts);
    }

    private static async Task<LearningPath> SeedPathAsync(ApplicationDbContext db, Guid userId)
    {
        var path = new LearningPath
        {
            UserId = userId,
            Track = Track.Backend,
            IsActive = true,
            ProgressPercent = 25.0m,
            Source = LearningPathSource.AIGenerated,
        };
        db.LearningPaths.Add(path);
        await db.SaveChangesAsync();
        return path;
    }

    [Fact]
    public async Task Insert_RoundTrip_AutoApplied_Event_Preserves_All_Columns()
    {
        using var db = NewDb();
        var userId = Guid.NewGuid();
        var path = await SeedPathAsync(db, userId);
        var triggered = DateTime.UtcNow.AddMinutes(-1);

        var ev = new PathAdaptationEvent
        {
            PathId = path.Id,
            UserId = userId,
            TriggeredAt = triggered,
            Trigger = PathAdaptationTrigger.Periodic,
            SignalLevel = PathAdaptationSignalLevel.Small,
            BeforeStateJson = """[{"pathTaskId":"PT-1","taskId":"T-1","orderIndex":1,"status":"InProgress"}]""",
            AfterStateJson = """[{"pathTaskId":"PT-1","taskId":"T-1","orderIndex":2,"status":"InProgress"}]""",
            AIReasoningText = "Reordered the security drill to address weak security score.",
            ConfidenceScore = 0.91,
            ActionsJson = """[{"type":"reorder","targetPosition":1,"newOrderIndex":2,"reason":"Security 45/100 weakness","confidence":0.91}]""",
            LearnerDecision = PathAdaptationDecision.AutoApplied,
            RespondedAt = null,
            AIPromptVersion = "adapt_path_v1",
            TokensInput = 1500,
            TokensOutput = 350,
            IdempotencyKey = $"PathAdaptationJob:{path.Id}:abcd1234:482000",
        };
        db.PathAdaptationEvents.Add(ev);
        await db.SaveChangesAsync();

        var fetched = await db.PathAdaptationEvents.AsNoTracking().SingleAsync(e => e.Id == ev.Id);
        Assert.Equal(path.Id, fetched.PathId);
        Assert.Equal(userId, fetched.UserId);
        Assert.Equal(triggered, fetched.TriggeredAt);
        Assert.Equal(PathAdaptationTrigger.Periodic, fetched.Trigger);
        Assert.Equal(PathAdaptationSignalLevel.Small, fetched.SignalLevel);
        Assert.Equal(PathAdaptationDecision.AutoApplied, fetched.LearnerDecision);
        Assert.Equal(0.91, fetched.ConfidenceScore, 6);
        Assert.Equal(1500, fetched.TokensInput);
        Assert.Equal(350, fetched.TokensOutput);
        Assert.Contains("security", fetched.AIReasoningText);
        Assert.Contains("\"reorder\"", fetched.ActionsJson);
        Assert.StartsWith($"PathAdaptationJob:{path.Id}:", fetched.IdempotencyKey);
    }

    [Fact]
    public async Task Insert_RoundTrip_Pending_Event_Then_Approve_Updates_Decision_And_RespondedAt()
    {
        using var db = NewDb();
        var userId = Guid.NewGuid();
        var path = await SeedPathAsync(db, userId);

        var ev = new PathAdaptationEvent
        {
            PathId = path.Id,
            UserId = userId,
            Trigger = PathAdaptationTrigger.ScoreSwing,
            SignalLevel = PathAdaptationSignalLevel.Medium,
            BeforeStateJson = "[]",
            AfterStateJson = "[]",
            AIReasoningText = "Two-action plan: reorder + swap to address swung score.",
            ConfidenceScore = 0.85,
            ActionsJson = """[{"type":"swap","targetPosition":3,"newTaskId":"C-1","reason":"X","confidence":0.85}]""",
            LearnerDecision = PathAdaptationDecision.Pending,
            AIPromptVersion = "adapt_path_v1",
            TokensInput = 1800,
            TokensOutput = 420,
            IdempotencyKey = $"PathAdaptationJob:{path.Id}:def09876:482000",
        };
        db.PathAdaptationEvents.Add(ev);
        await db.SaveChangesAsync();

        // Simulate learner approve at the respond endpoint.
        ev.LearnerDecision = PathAdaptationDecision.Approved;
        ev.RespondedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        var fetched = await db.PathAdaptationEvents.AsNoTracking().SingleAsync(e => e.Id == ev.Id);
        Assert.Equal(PathAdaptationDecision.Approved, fetched.LearnerDecision);
        Assert.NotNull(fetched.RespondedAt);
    }

    [Fact]
    public async Task LearningPath_LastAdaptedAt_RoundTrip_PersistsAndUpdates()
    {
        using var db = NewDb();
        var userId = Guid.NewGuid();
        var path = await SeedPathAsync(db, userId);

        // Initial: LastAdaptedAt is null on a freshly seeded path.
        Assert.Null(path.LastAdaptedAt);

        var adaptedAt = DateTime.UtcNow.AddMinutes(-30);
        path.LastAdaptedAt = adaptedAt;
        await db.SaveChangesAsync();

        var fetched = await db.LearningPaths.AsNoTracking().SingleAsync(p => p.Id == path.Id);
        Assert.NotNull(fetched.LastAdaptedAt);
        Assert.Equal(adaptedAt, fetched.LastAdaptedAt!.Value);
    }

    [Fact]
    public async Task Repository_GetPendingForUser_FiltersToPendingOnlyAndNewestFirst()
    {
        using var db = NewDb();
        var userId = Guid.NewGuid();
        var otherUserId = Guid.NewGuid();
        var path = await SeedPathAsync(db, userId);
        var otherPath = await SeedPathAsync(db, otherUserId);
        var now = DateTime.UtcNow;

        db.PathAdaptationEvents.AddRange(
            EventStub(path.Id, userId, now.AddDays(-2), PathAdaptationDecision.Pending, key: "k1"),
            EventStub(path.Id, userId, now.AddDays(-1), PathAdaptationDecision.AutoApplied, key: "k2"),
            EventStub(path.Id, userId, now, PathAdaptationDecision.Pending, key: "k3"),
            EventStub(otherPath.Id, otherUserId, now, PathAdaptationDecision.Pending, key: "k4"));
        await db.SaveChangesAsync();

        var repo = new PathAdaptationEventRepository(db);
        var pending = await repo.GetPendingForUserAsync(userId);
        Assert.Equal(2, pending.Count);
        Assert.All(pending, e => Assert.Equal(PathAdaptationDecision.Pending, e.LearnerDecision));
        Assert.All(pending, e => Assert.Equal(userId, e.UserId));
        Assert.True(pending[0].TriggeredAt > pending[1].TriggeredAt);
    }

    [Fact]
    public async Task Repository_GetTimelineForPath_ReturnsAllRowsNewestFirst()
    {
        using var db = NewDb();
        var userId = Guid.NewGuid();
        var path = await SeedPathAsync(db, userId);
        var otherPath = await SeedPathAsync(db, userId);
        var now = DateTime.UtcNow;

        db.PathAdaptationEvents.AddRange(
            EventStub(path.Id, userId, now.AddDays(-3), PathAdaptationDecision.AutoApplied, key: "t1"),
            EventStub(path.Id, userId, now.AddDays(-1), PathAdaptationDecision.Approved, key: "t2"),
            EventStub(path.Id, userId, now, PathAdaptationDecision.Pending, key: "t3"),
            EventStub(otherPath.Id, userId, now, PathAdaptationDecision.Pending, key: "t4"));
        await db.SaveChangesAsync();

        var repo = new PathAdaptationEventRepository(db);
        var timeline = await repo.GetTimelineForPathAsync(path.Id);
        Assert.Equal(3, timeline.Count);
        Assert.All(timeline, e => Assert.Equal(path.Id, e.PathId));
        Assert.True(timeline[0].TriggeredAt > timeline[1].TriggeredAt);
    }

    [Fact]
    public async Task Repository_GetByIdempotencyKey_RoundTrips_And_Returns_Null_When_Missing()
    {
        using var db = NewDb();
        var userId = Guid.NewGuid();
        var path = await SeedPathAsync(db, userId);

        var ev = EventStub(path.Id, userId, DateTime.UtcNow, PathAdaptationDecision.AutoApplied, key: "unique-key-1");
        db.PathAdaptationEvents.Add(ev);
        await db.SaveChangesAsync();

        var repo = new PathAdaptationEventRepository(db);
        var hit = await repo.GetByIdempotencyKeyAsync("unique-key-1");
        var miss = await repo.GetByIdempotencyKeyAsync("nonexistent-key");

        Assert.NotNull(hit);
        Assert.Equal(ev.Id, hit!.Id);
        Assert.Null(miss);
    }

    [Fact]
    public async Task Repository_GetByIdForUser_FailsCrossUserLookup()
    {
        using var db = NewDb();
        var userId = Guid.NewGuid();
        var otherUserId = Guid.NewGuid();
        var path = await SeedPathAsync(db, userId);

        var ev = EventStub(path.Id, userId, DateTime.UtcNow, PathAdaptationDecision.Pending, key: "scoped");
        db.PathAdaptationEvents.Add(ev);
        await db.SaveChangesAsync();

        var repo = new PathAdaptationEventRepository(db);
        var asOwner = await repo.GetByIdForUserAsync(ev.Id, userId);
        var asStranger = await repo.GetByIdForUserAsync(ev.Id, otherUserId);

        Assert.NotNull(asOwner);
        Assert.Null(asStranger);
    }

    private static PathAdaptationEvent EventStub(
        Guid pathId, Guid userId, DateTime triggeredAt,
        PathAdaptationDecision decision, string key)
    {
        return new PathAdaptationEvent
        {
            PathId = pathId,
            UserId = userId,
            TriggeredAt = triggeredAt,
            Trigger = PathAdaptationTrigger.Periodic,
            SignalLevel = PathAdaptationSignalLevel.Small,
            BeforeStateJson = "[]",
            AfterStateJson = "[]",
            AIReasoningText = "stub reasoning",
            ConfidenceScore = 0.5,
            ActionsJson = "[]",
            LearnerDecision = decision,
            AIPromptVersion = "adapt_path_v1",
            IdempotencyKey = key,
        };
    }
}

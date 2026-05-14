using System.Text.Json;
using CodeMentor.Application.CodeReview;
using CodeMentor.Application.Gamification;
using CodeMentor.Application.MentorChat;
using CodeMentor.Application.Skills;
using CodeMentor.Application.Submissions;
using CodeMentor.Application.Tests.MentorChat;
using CodeMentor.Domain.Gamification;
using CodeMentor.Domain.Skills;
using CodeMentor.Domain.Submissions;
using CodeMentor.Domain.Tasks;
using CodeMentor.Infrastructure.CodeReview;
using CodeMentor.Infrastructure.Persistence;
using CodeMentor.Infrastructure.Submissions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace CodeMentor.Application.Tests.Submissions;

/// <summary>
/// S12-T8 / F14 (ADR-040): integration-level tests for the SubmissionAnalysisJob
/// pipeline's new "profile" phase. Verifies:
///   - snapshot built before the AI call when service is registered
///   - snapshot forwarded to <c>IAiReviewClient.AnalyzeZipAsync</c>
///   - cold-start path: first-time user → snapshot.IsFirstReview=true
///   - history path: 3 prior completed submissions → snapshot populated +
///     forwarded
///   - back-compat: snapshot service unregistered → pipeline behaves like
///     pre-F14 (snapshot=null forwarded, no exception)
///   - profile build failure does NOT take down the pipeline (snapshot=null
///     fallback)
/// </summary>
public class SubmissionAnalysisJobF14PipelineTests
{
    private static ApplicationDbContext NewDb() => new(
        new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase($"f14_pipeline_{Guid.NewGuid():N}")
            .Options);

    private sealed class CapturingAiClient : IAiReviewClient
    {
        public LearnerSnapshot? LastSnapshot { get; private set; }
        public int CallCount { get; private set; }

        public Task<AiCombinedResponse> AnalyzeZipAsync(
            Stream zipStream, string zipFileName, string correlationId,
            LearnerSnapshot? snapshot = null, TaskBrief? taskBrief = null, CancellationToken ct = default)
        {
            CallCount++;
            LastSnapshot = snapshot;
            zipStream.ReadByte();
            return Task.FromResult(_response);
        }

        public Task<AiCombinedResponse> AnalyzeZipMultiAsync(
            Stream zipStream, string zipFileName, string correlationId,
            LearnerSnapshot? snapshot = null, TaskBrief? taskBrief = null, CancellationToken ct = default)
            => AnalyzeZipAsync(zipStream, zipFileName, correlationId, snapshot, taskBrief, ct);

        public Task<bool> IsHealthyAsync(CancellationToken ct = default) => Task.FromResult(true);

        private static readonly AiCombinedResponse _response = new(
            SubmissionId: "test",
            AnalysisType: "combined",
            OverallScore: 75,
            StaticAnalysis: new AiStaticAnalysis(
                Score: 80, Issues: Array.Empty<AiIssue>(),
                Summary: new AiAnalysisSummary(0, 0, 0, 0),
                ToolsUsed: Array.Empty<string>(),
                PerTool: Array.Empty<AiPerToolResult>()),
            AiReview: new AiReviewResponse(
                OverallScore: 75,
                Scores: new AiReviewScores(70, 75, 70, 80, 75),
                Strengths: new[] { "Clean code" },
                Weaknesses: new[] { "Missing tests" },
                Recommendations: Array.Empty<AiRecommendation>(),
                Summary: "ok",
                ModelUsed: "test",
                TokensUsed: 100,
                PromptVersion: "v1.0.0",
                Available: true,
                Error: null,
                DetailedIssues: null,
                LearningResources: null),
            Metadata: new AiAnalysisMetadata("t", new[] { "py" }, 1, 100, true, true));
    }

    private sealed class TinyZipLoader : ISubmissionCodeLoader
    {
        public Task<SubmissionCodeLoadResult> LoadAsZipStreamAsync(
            Submission submission, CancellationToken ct = default) =>
            Task.FromResult(SubmissionCodeLoadResult.Ok(
                new MemoryStream(new byte[] { 0x50, 0x4B, 0x03, 0x04 }), "submission.zip"));
    }

    private sealed class SingleModeProvider : IAiReviewModeProvider
    {
        public AiReviewMode Current => AiReviewMode.Single;
    }

    private sealed class NoOpStaticToolSelector : IStaticToolSelector
    {
        public IReadOnlyList<Domain.Submissions.StaticAnalysisTool> ToolsFor(ProgrammingLanguage language)
            => Array.Empty<Domain.Submissions.StaticAnalysisTool>();
    }

    private sealed class InlineScheduler : ISubmissionAnalysisScheduler
    {
        public List<Guid> Enqueues { get; } = new();
        public List<(Guid Id, TimeSpan Delay)> ScheduledAfter { get; } = new();

        public void Schedule(Guid submissionId) => Enqueues.Add(submissionId);
        public void ScheduleAfter(Guid submissionId, TimeSpan delay) =>
            ScheduledAfter.Add((submissionId, delay));
    }

    private sealed class NoOpFeedbackAggregator : IFeedbackAggregator
    {
        public Task AggregateAsync(Submission submission, AiCombinedResponse response, CancellationToken ct = default)
            => Task.CompletedTask;
    }

    private sealed class NoOpCodeQualityUpdater : ICodeQualityScoreUpdater
    {
        public Task RecordAiReviewAsync(Guid userId, AiReviewScores scores, CancellationToken ct = default)
            => Task.CompletedTask;
    }

    private sealed class NoOpXpService : IXpService
    {
        public Task<int> AwardAsync(Guid userId, int amount, string reason, Guid? relatedEntityId = null, CancellationToken ct = default)
            => Task.FromResult(0);
        public Task<int> GetTotalAsync(Guid userId, CancellationToken ct = default) => Task.FromResult(0);
    }

    private sealed class NoOpBadgeService : IBadgeService
    {
        public Task<bool> AwardIfEligibleAsync(Guid userId, string badgeKey, CancellationToken ct = default)
            => Task.FromResult(false);
    }

    private static SubmissionAnalysisJob NewJob(
        ApplicationDbContext db,
        CapturingAiClient ai,
        ILearnerSnapshotService? snapshotService) =>
        new(
            db,
            new TinyZipLoader(),
            ai,
            new SingleModeProvider(),
            new NoOpStaticToolSelector(),
            new InlineScheduler(),
            new NoOpFeedbackAggregator(),
            new NoOpCodeQualityUpdater(),
            new NoOpXpService(),
            new NoOpBadgeService(),
            new FakeMentorChatIndexScheduler(),
            NullLogger<SubmissionAnalysisJob>.Instance,
            snapshotService);

    private static (Guid userId, Guid taskId, Guid submissionId) SeedPendingSubmission(
        ApplicationDbContext db,
        DateTime? createdAt = null)
    {
        var userId = Guid.NewGuid();
        var taskId = Guid.NewGuid();
        var submissionId = Guid.NewGuid();

        db.Tasks.Add(new TaskItem
        {
            Id = taskId,
            Title = "Current Task",
            Description = "stub",
            Difficulty = 2,
            ExpectedLanguage = ProgrammingLanguage.Python,
            EstimatedHours = 4,
        });
        db.Submissions.Add(new Submission
        {
            Id = submissionId,
            UserId = userId,
            TaskId = taskId,
            Status = SubmissionStatus.Pending,
            SubmissionType = SubmissionType.Upload,
            BlobPath = "x/y.zip",
            CreatedAt = createdAt ?? DateTime.UtcNow,
        });
        db.SaveChanges();
        return (userId, taskId, submissionId);
    }

    // ────────────────────────────────────────────────────────────────────
    // Cases
    // ────────────────────────────────────────────────────────────────────
    [Fact]
    public async Task Pipeline_With_SnapshotService_ColdStart_ForwardsSnapshotToAiClient()
    {
        using var db = NewDb();
        var (userId, taskId, submissionId) = SeedPendingSubmission(db);
        var ai = new CapturingAiClient();
        var snapshotService = new LearnerSnapshotService(
            db,
            new EmptyRetriever(),
            Options.Create(new LearnerSnapshotOptions()),
            NullLogger<LearnerSnapshotService>.Instance);
        var job = NewJob(db, ai, snapshotService);

        await job.RunAsync(submissionId);

        Assert.Equal(1, ai.CallCount);
        Assert.NotNull(ai.LastSnapshot);
        Assert.Equal(userId, ai.LastSnapshot!.UserId);
        Assert.True(ai.LastSnapshot.IsFirstReview);
        Assert.Equal(0, ai.LastSnapshot.CompletedSubmissionsCount);
        Assert.Equal("Intermediate", ai.LastSnapshot.SkillLevel);  // default fallback
    }

    [Fact]
    public async Task Pipeline_With_SnapshotService_AfterPriorSubmissions_ForwardsPopulatedSnapshot()
    {
        using var db = NewDb();
        var (userId, taskId, submissionId) = SeedPendingSubmission(db);

        // Seed 3 prior completed submissions on different tasks.
        for (var i = 0; i < 3; i++)
        {
            var priorSubId = Guid.NewGuid();
            db.Submissions.Add(new Submission
            {
                Id = priorSubId,
                UserId = userId,
                TaskId = Guid.NewGuid(),
                Status = SubmissionStatus.Completed,
                AiAnalysisStatus = AiAnalysisStatus.Available,
                SubmissionType = SubmissionType.Upload,
                BlobPath = "p/x.zip",
                CompletedAt = DateTime.UtcNow.AddDays(-(i + 1)),
            });
            db.AIAnalysisResults.Add(new Domain.Submissions.AIAnalysisResult
            {
                SubmissionId = priorSubId,
                OverallScore = 70 + i * 2,
                FeedbackJson = "{}",
                StrengthsJson = "[]",
                WeaknessesJson = JsonSerializer.Serialize(new[] { "input validation missing" }),
                ModelUsed = "test",
                TokensUsed = 100,
                PromptVersion = "v1.0.0",
                ProcessedAt = DateTime.UtcNow.AddDays(-(i + 1)),
            });
        }
        // Seed a CodeQualityScore so weakAreas computes.
        db.CodeQualityScores.Add(new CodeQualityScore
        {
            UserId = userId,
            Category = CodeQualityCategory.Security,
            Score = 45m,
            SampleCount = 3,
        });
        await db.SaveChangesAsync();

        var ai = new CapturingAiClient();
        var snapshotService = new LearnerSnapshotService(
            db,
            new EmptyRetriever(),
            Options.Create(new LearnerSnapshotOptions()),
            NullLogger<LearnerSnapshotService>.Instance);
        var job = NewJob(db, ai, snapshotService);

        await job.RunAsync(submissionId);

        Assert.NotNull(ai.LastSnapshot);
        Assert.False(ai.LastSnapshot!.IsFirstReview);
        Assert.Equal(3, ai.LastSnapshot.CompletedSubmissionsCount);
        Assert.Contains("Security", ai.LastSnapshot.WeakAreas);
        Assert.NotEmpty(ai.LastSnapshot.CommonMistakes);
    }

    [Fact]
    public async Task Pipeline_Without_SnapshotService_PassesNullSnapshot_BackCompat()
    {
        using var db = NewDb();
        var (_, _, submissionId) = SeedPendingSubmission(db);
        var ai = new CapturingAiClient();
        var job = NewJob(db, ai, snapshotService: null); // <-- legacy DI

        await job.RunAsync(submissionId);

        Assert.Equal(1, ai.CallCount);
        Assert.Null(ai.LastSnapshot); // pre-F14 wire-shape preserved
    }

    [Fact]
    public async Task Pipeline_When_SnapshotServiceThrows_FallsBack_NullSnapshot()
    {
        using var db = NewDb();
        var (_, _, submissionId) = SeedPendingSubmission(db);
        var ai = new CapturingAiClient();
        var snapshotService = new ThrowingSnapshotService();
        var job = NewJob(db, ai, snapshotService);

        // Should NOT throw — failure is caught and pipeline continues.
        await job.RunAsync(submissionId);

        Assert.Equal(1, ai.CallCount);
        Assert.Null(ai.LastSnapshot);

        var sub = await db.Submissions.AsNoTracking().FirstAsync(s => s.Id == submissionId);
        Assert.Equal(SubmissionStatus.Completed, sub.Status); // pipeline completed despite snapshot failure
    }

    private sealed class EmptyRetriever : IFeedbackHistoryRetriever
    {
        public Task<FeedbackHistoryRetrievalResult> RetrieveAsync(
            Guid userId, string anchorText, int topK, CancellationToken ct = default) =>
            Task.FromResult(FeedbackHistoryRetrievalResult.Completed(
                Array.Empty<PriorFeedbackChunk>()));
    }

    private sealed class ThrowingSnapshotService : ILearnerSnapshotService
    {
        public Task<LearnerSnapshot> BuildAsync(
            Guid userId, Guid currentSubmissionId, Guid currentTaskId,
            string? currentStaticFindingsJson, CancellationToken ct = default) =>
            throw new InvalidOperationException("simulated F14 build failure");
    }
}

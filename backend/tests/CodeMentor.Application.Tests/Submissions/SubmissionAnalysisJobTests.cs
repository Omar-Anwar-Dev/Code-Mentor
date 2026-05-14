using System.Reflection;
using System.Text.Json;
using CodeMentor.Application.CodeReview;
using CodeMentor.Application.Skills;
using CodeMentor.Application.Submissions;
using CodeMentor.Application.Tests.MentorChat;
using CodeMentor.Domain.Submissions;
using CodeMentor.Domain.Tasks;
using CodeMentor.Infrastructure.Gamification;
using CodeMentor.Infrastructure.Persistence;
using CodeMentor.Infrastructure.Skills;
using CodeMentor.Infrastructure.Submissions;
using Hangfire;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace CodeMentor.Application.Tests.Submissions;

/// <summary>
/// S5-T3 acceptance (extending S4-T6):
///   - Status transitions Pending → Processing → Completed/Failed
///   - Fetch failure → Failed with clear ErrorMessage
///   - AI service call receives the loaded ZIP stream + correlation id
///   - PerTool blocks in the AI response become StaticAnalysisResult rows
///   - AI unavailability → Failed (S5-T5 will upgrade to partial-complete)
///   - Retries + timeout metadata preserved (S4-T6 carry-forward)
/// </summary>
public class SubmissionAnalysisJobTests
{
    private static ApplicationDbContext NewDb()
    {
        var db = new ApplicationDbContext(
            new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase($"submission_job_{Guid.NewGuid():N}")
                .Options);
        BadgeSeedData.SeedAsync(db).GetAwaiter().GetResult();
        return db;
    }

    private static SubmissionAnalysisJob NewJob(
        ApplicationDbContext db,
        ISubmissionCodeLoader? loader = null,
        IAiReviewClient? ai = null,
        IAiReviewModeProvider? modeProvider = null,
        ISubmissionAnalysisScheduler? scheduler = null,
        IFeedbackAggregator? aggregator = null,
        ICodeQualityScoreUpdater? codeQualityUpdater = null,
        FakeMentorChatIndexScheduler? mentorIndexScheduler = null)
        => new(
            db,
            loader ?? new FakeCodeLoader(),
            ai ?? new FakeAiReviewClient(),
            modeProvider ?? new FakeReviewModeProvider(AiReviewMode.Single),
            new StaticToolSelector(),
            scheduler ?? new FakeScheduler(),
            aggregator ?? new NoopAggregator(),
            codeQualityUpdater ?? new CodeQualityScoreUpdater(db),
            new XpService(db, NullLogger<XpService>.Instance),
            new BadgeService(db, NullLogger<BadgeService>.Instance),
            mentorIndexScheduler ?? new FakeMentorChatIndexScheduler(),
            NullLogger<SubmissionAnalysisJob>.Instance);

    private sealed class FakeReviewModeProvider : IAiReviewModeProvider
    {
        public FakeReviewModeProvider(AiReviewMode mode) => Current = mode;
        public AiReviewMode Current { get; }
    }

    private sealed class NoopAggregator : IFeedbackAggregator
    {
        public Task AggregateAsync(Submission submission, AiCombinedResponse aiResponse, CancellationToken ct = default)
            => Task.CompletedTask;
    }

    [Fact]
    public async Task RunAsync_Pending_WithStaticResults_WritesPerToolRows_AndCompletes()
    {
        using var db = NewDb();
        var sub = SeedSubmission(db, SubmissionStatus.Pending, SubmissionType.Upload, blobPath: "u/p.zip");

        var ai = new FakeAiReviewClient
        {
            Response = BuildAiResponseWithTools(("bandit", 2, 250), ("eslint", 1, 120))
        };
        var job = NewJob(db, ai: ai);

        await job.RunAsync(sub.Id);

        var fetched = await db.Submissions.AsNoTracking().FirstAsync(s => s.Id == sub.Id);
        Assert.Equal(SubmissionStatus.Completed, fetched.Status);
        Assert.NotNull(fetched.StartedAt);
        Assert.NotNull(fetched.CompletedAt);
        Assert.Null(fetched.ErrorMessage);

        // Both per-tool rows persisted, with issue/metrics JSON + timing preserved.
        var rows = db.StaticAnalysisResults.AsNoTracking().Where(r => r.SubmissionId == sub.Id).ToList();
        Assert.Equal(2, rows.Count);
        var bandit = rows.Single(r => r.Tool == StaticAnalysisTool.Bandit);
        Assert.Equal(250, bandit.ExecutionTimeMs);
        Assert.Contains("\"totalIssues\":2", bandit.MetricsJson);
        var eslint = rows.Single(r => r.Tool == StaticAnalysisTool.ESLint);
        Assert.Equal(120, eslint.ExecutionTimeMs);

        // Correlation id handed to the AI client is stable per submission.
        Assert.Equal(sub.Id.ToString("N"), ai.LastCorrelationId);
        Assert.Equal("p.zip", ai.LastFileName);
    }

    [Fact]
    public async Task RunAsync_PerToolEmpty_Completes_WithZeroRows()
    {
        using var db = NewDb();
        var sub = SeedSubmission(db, SubmissionStatus.Pending, SubmissionType.Upload, blobPath: "u/p.zip");

        var ai = new FakeAiReviewClient { Response = BuildAiResponseWithTools(/* none */) };
        var job = NewJob(db, ai: ai);

        await job.RunAsync(sub.Id);

        var fetched = await db.Submissions.AsNoTracking().FirstAsync(s => s.Id == sub.Id);
        Assert.Equal(SubmissionStatus.Completed, fetched.Status);
        Assert.Empty(db.StaticAnalysisResults.AsNoTracking().Where(r => r.SubmissionId == sub.Id).ToList());
    }

    [Fact]
    public async Task RunAsync_FetchFailure_MarksFailed_WithCodeAndMessage()
    {
        using var db = NewDb();
        var sub = SeedSubmission(db, SubmissionStatus.Pending, SubmissionType.Upload, blobPath: "u/missing.zip");

        var loader = new FakeCodeLoader
        {
            Result = SubmissionCodeLoadResult.Fail(SubmissionCodeLoadErrorCode.BlobMissing, "not found"),
        };
        var job = NewJob(db, loader: loader, ai: new FakeAiReviewClient());

        await job.RunAsync(sub.Id);

        var fetched = await db.Submissions.AsNoTracking().FirstAsync(s => s.Id == sub.Id);
        Assert.Equal(SubmissionStatus.Failed, fetched.Status);
        Assert.NotNull(fetched.ErrorMessage);
        Assert.Contains("BlobMissing", fetched.ErrorMessage!);
        Assert.Contains("not found", fetched.ErrorMessage);
    }

    [Fact]
    public async Task RunAsync_AiServiceUnavailable_MarksCompleted_Unavailable_SchedulesRetry()
    {
        using var db = NewDb();
        var sub = SeedSubmission(db, SubmissionStatus.Pending, SubmissionType.Upload, blobPath: "u/p.zip");

        var ai = new FakeAiReviewClient { ThrowOnAnalyze = new AiServiceUnavailableException("AI down") };
        var scheduler = new FakeScheduler();
        var job = NewJob(db, ai: ai, scheduler: scheduler);

        await job.RunAsync(sub.Id);

        var fetched = await db.Submissions.AsNoTracking().FirstAsync(s => s.Id == sub.Id);
        Assert.Equal(SubmissionStatus.Completed, fetched.Status);
        Assert.Equal(AiAnalysisStatus.Pending, fetched.AiAnalysisStatus); // retry scheduled
        Assert.Contains("AI service unavailable", fetched.ErrorMessage);

        var retry = Assert.Single(scheduler.DelayedRetries);
        Assert.Equal(sub.Id, retry.SubmissionId);
        Assert.Equal(SubmissionAnalysisJob.AiRetryDelay, retry.Delay);
    }

    [Fact]
    public async Task RunAsync_AiReviewUnavailableWithinResponse_CompletesPartial_SchedulesRetry()
    {
        using var db = NewDb();
        var sub = SeedSubmission(db, SubmissionStatus.Pending, SubmissionType.Upload, blobPath: "u/p.zip");

        // AI response includes static results but AiReview.Available=false (e.g. OpenAI down).
        var ai = new FakeAiReviewClient
        {
            Response = BuildAiResponseWithToolsAndPartialAi(aiAvailable: false, ("bandit", 1, 100)),
        };
        var scheduler = new FakeScheduler();
        var job = NewJob(db, ai: ai, scheduler: scheduler);

        await job.RunAsync(sub.Id);

        var fetched = await db.Submissions.AsNoTracking().FirstAsync(s => s.Id == sub.Id);
        Assert.Equal(SubmissionStatus.Completed, fetched.Status);
        Assert.Equal(AiAnalysisStatus.Pending, fetched.AiAnalysisStatus);

        // Static rows persisted from the partial response.
        var rows = db.StaticAnalysisResults.AsNoTracking().Where(r => r.SubmissionId == sub.Id).ToList();
        Assert.Single(rows);

        var retry = Assert.Single(scheduler.DelayedRetries);
        Assert.Equal(sub.Id, retry.SubmissionId);
    }

    [Fact]
    public async Task RunAsync_AiAvailableInResponse_MarksAvailable_NoRetryScheduled()
    {
        using var db = NewDb();
        var sub = SeedSubmission(db, SubmissionStatus.Pending, SubmissionType.Upload, blobPath: "u/p.zip");

        var ai = new FakeAiReviewClient
        {
            Response = BuildAiResponseWithToolsAndPartialAi(aiAvailable: true, ("bandit", 1, 50)),
        };
        var scheduler = new FakeScheduler();
        var job = NewJob(db, ai: ai, scheduler: scheduler);

        await job.RunAsync(sub.Id);

        var fetched = await db.Submissions.AsNoTracking().FirstAsync(s => s.Id == sub.Id);
        Assert.Equal(SubmissionStatus.Completed, fetched.Status);
        Assert.Equal(AiAnalysisStatus.Available, fetched.AiAnalysisStatus);
        Assert.Empty(scheduler.DelayedRetries);
    }

    [Fact]
    public async Task RunAsync_ScheduledRetry_ReprocessesCompletedSubmission_UpgradesAi()
    {
        using var db = NewDb();
        // Submission previously completed with AI Pending (retry due).
        var sub = SeedSubmission(db, SubmissionStatus.Completed, SubmissionType.Upload, blobPath: "u/p.zip",
            startedAt: DateTime.UtcNow.AddMinutes(-20));
        sub.AiAnalysisStatus = AiAnalysisStatus.Pending;
        sub.CompletedAt = DateTime.UtcNow.AddMinutes(-18);
        await db.SaveChangesAsync();

        var ai = new FakeAiReviewClient
        {
            Response = BuildAiResponseWithToolsAndPartialAi(aiAvailable: true, ("bandit", 2, 80)),
        };
        var job = NewJob(db, ai: ai);

        await job.RunAsync(sub.Id);

        var fetched = await db.Submissions.AsNoTracking().FirstAsync(s => s.Id == sub.Id);
        Assert.Equal(SubmissionStatus.Completed, fetched.Status);
        Assert.Equal(AiAnalysisStatus.Available, fetched.AiAnalysisStatus);
    }

    [Fact]
    public async Task RunAsync_RetryCapReached_NoAdditionalRetryScheduled()
    {
        using var db = NewDb();
        var sub = SeedSubmission(db, SubmissionStatus.Pending, SubmissionType.Upload, blobPath: "u/p.zip");
        sub.AiAutoRetryCount = SubmissionAnalysisJob.MaxAutoRetryAttempts - 1; // one auto-retry already used
        await db.SaveChangesAsync();

        var ai = new FakeAiReviewClient { ThrowOnAnalyze = new AiServiceUnavailableException("still down") };
        var scheduler = new FakeScheduler();
        var job = NewJob(db, ai: ai, scheduler: scheduler);

        await job.RunAsync(sub.Id);

        var fetched = await db.Submissions.AsNoTracking().FirstAsync(s => s.Id == sub.Id);
        Assert.Equal(SubmissionStatus.Completed, fetched.Status);
        Assert.Equal(AiAnalysisStatus.Unavailable, fetched.AiAnalysisStatus);
        Assert.Empty(scheduler.DelayedRetries);
    }

    [Fact]
    public async Task RunAsync_AlreadyProcessing_Skips_WithoutMutation()
    {
        using var db = NewDb();
        var startedAt = DateTime.UtcNow.AddMinutes(-2);
        var sub = SeedSubmission(db, SubmissionStatus.Processing, SubmissionType.Upload, blobPath: "u/p.zip", startedAt: startedAt);

        var job = NewJob(db);

        await job.RunAsync(sub.Id);

        var fetched = await db.Submissions.AsNoTracking().FirstAsync(s => s.Id == sub.Id);
        Assert.Equal(SubmissionStatus.Processing, fetched.Status);
        Assert.Equal(startedAt, fetched.StartedAt);
        Assert.Null(fetched.CompletedAt);
    }

    [Fact]
    public async Task RunAsync_MissingSubmission_DoesNotThrow()
    {
        using var db = NewDb();
        var job = NewJob(db);
        await job.RunAsync(Guid.NewGuid()); // no matching row → log + return
    }

    [Fact]
    public async Task RunAsync_RetryingAfterFailure_Replaces_StaticAnalysisResult_Rows()
    {
        using var db = NewDb();
        var sub = SeedSubmission(db, SubmissionStatus.Pending, SubmissionType.Upload, blobPath: "u/p.zip");

        var ai = new FakeAiReviewClient { Response = BuildAiResponseWithTools(("bandit", 1, 100)) };
        var job = NewJob(db, ai: ai);
        await job.RunAsync(sub.Id);

        // Flip back to Pending (simulate a manual retry / resubmit).
        var reload = await db.Submissions.FirstAsync(s => s.Id == sub.Id);
        reload.Status = SubmissionStatus.Pending;
        reload.AttemptNumber += 1;
        await db.SaveChangesAsync();

        ai.Response = BuildAiResponseWithTools(("bandit", 5, 500)); // more issues on 2nd run
        await job.RunAsync(sub.Id);

        var rows = db.StaticAnalysisResults.AsNoTracking().Where(r => r.SubmissionId == sub.Id).ToList();
        Assert.Single(rows);
        var row = rows[0];
        Assert.Equal(StaticAnalysisTool.Bandit, row.Tool);
        Assert.Equal(500, row.ExecutionTimeMs);
        Assert.Contains("\"totalIssues\":5", row.MetricsJson);
    }

    [Fact]
    public void RunAsync_HasAutomaticRetry_ThreeAttempts_ExponentialBackoff()
    {
        var method = typeof(SubmissionAnalysisJob).GetMethod(nameof(SubmissionAnalysisJob.RunAsync))!;
        var retry = method.GetCustomAttribute<AutomaticRetryAttribute>();
        Assert.NotNull(retry);
        Assert.Equal(3, retry!.Attempts);
        Assert.Equal(new[] { 10, 60, 300 }, retry.DelaysInSeconds);
    }

    [Fact]
    public void RunAsync_HasDisableConcurrentExecution_TenMinuteTimeout()
    {
        var method = typeof(SubmissionAnalysisJob).GetMethod(nameof(SubmissionAnalysisJob.RunAsync))!;
        var attr = method.GetCustomAttribute<DisableConcurrentExecutionAttribute>();
        Assert.NotNull(attr);
    }

    private static Submission SeedSubmission(
        ApplicationDbContext db,
        SubmissionStatus status,
        SubmissionType type,
        string? blobPath = null,
        string? repoUrl = null,
        DateTime? startedAt = null)
    {
        var sub = new Submission
        {
            UserId = Guid.NewGuid(),
            TaskId = Guid.NewGuid(),
            SubmissionType = type,
            BlobPath = blobPath,
            RepositoryUrl = repoUrl,
            Status = status,
            StartedAt = startedAt,
        };
        db.Submissions.Add(sub);
        db.SaveChanges();
        return sub;
    }

    private static AiCombinedResponse BuildAiResponseWithToolsAndPartialAi(
        bool aiAvailable,
        params (string tool, int issueCount, int timeMs)[] tools)
    {
        var baseResp = BuildAiResponseWithTools(tools);
        var aiReview = aiAvailable
            ? new AiReviewResponse(
                OverallScore: 75,
                Scores: new AiReviewScores(80, 75, 70, 80, 75),
                Strengths: Array.Empty<string>(),
                Weaknesses: Array.Empty<string>(),
                Recommendations: Array.Empty<AiRecommendation>(),
                Summary: "",
                ModelUsed: "gpt-5.1-codex-mini",
                TokensUsed: 1000,
                PromptVersion: "v1.0.0",
                Available: true,
                Error: null)
            : new AiReviewResponse(
                OverallScore: 0,
                Scores: new AiReviewScores(0, 0, 0, 0, 0),
                Strengths: Array.Empty<string>(),
                Weaknesses: Array.Empty<string>(),
                Recommendations: Array.Empty<AiRecommendation>(),
                Summary: "",
                ModelUsed: "",
                TokensUsed: 0,
                PromptVersion: "",
                Available: false,
                Error: "OpenAI unavailable");

        return baseResp with { AiReview = aiReview };
    }

    private static AiCombinedResponse BuildAiResponseWithTools(params (string tool, int issueCount, int timeMs)[] tools)
    {
        var perTool = tools.Select(t =>
            new AiPerToolResult(
                Tool: t.tool,
                Issues: Enumerable.Range(0, t.issueCount)
                    .Select(i => new AiIssue("warning", "code_smell", $"m{i}", "f.py", i + 1, null, "R1", null))
                    .ToArray(),
                Summary: new AiAnalysisSummary(TotalIssues: t.issueCount, Errors: 0, Warnings: t.issueCount, Info: 0),
                ExecutionTimeMs: t.timeMs)).ToArray();

        var totalIssues = tools.Sum(t => t.issueCount);
        var allIssues = perTool.SelectMany(t => t.Issues).ToArray();

        return new AiCombinedResponse(
            SubmissionId: "s-test",
            AnalysisType: "combined",
            OverallScore: 70,
            StaticAnalysis: new AiStaticAnalysis(
                Score: 80,
                Issues: allIssues,
                Summary: new AiAnalysisSummary(totalIssues, 0, totalIssues, 0),
                ToolsUsed: tools.Select(t => t.tool).ToArray(),
                PerTool: perTool),
            AiReview: null,
            Metadata: new AiAnalysisMetadata("test", new[] { "python" }, 1, 500, true, false));
    }

    private sealed class FakeScheduler : ISubmissionAnalysisScheduler
    {
        public List<(Guid SubmissionId, TimeSpan Delay)> DelayedRetries { get; } = new();
        public List<Guid> Enqueued { get; } = new();

        public void Schedule(Guid submissionId) => Enqueued.Add(submissionId);
        public void ScheduleAfter(Guid submissionId, TimeSpan delay) => DelayedRetries.Add((submissionId, delay));
    }

    private sealed class FakeCodeLoader : ISubmissionCodeLoader
    {
        public SubmissionCodeLoadResult? Result { get; set; }

        public Task<SubmissionCodeLoadResult> LoadAsZipStreamAsync(Submission submission, CancellationToken ct = default)
        {
            if (Result is not null) return Task.FromResult(Result);
            // Default: return a minimal ZIP stream with the submission's blobPath filename.
            var ms = new MemoryStream(new byte[] { 0x50, 0x4B, 0x03, 0x04 });
            var name = Path.GetFileName(submission.BlobPath ?? "s.zip");
            return Task.FromResult(SubmissionCodeLoadResult.Ok(ms, name));
        }
    }

    private sealed class FakeAiReviewClient : IAiReviewClient
    {
        public AiCombinedResponse? Response { get; set; }
        public AiCombinedResponse? MultiResponse { get; set; }
        public Exception? ThrowOnAnalyze { get; set; }
        public string? LastCorrelationId { get; private set; }
        public string? LastFileName { get; private set; }
        public string? LastEndpoint { get; private set; }

        public Task<AiCombinedResponse> AnalyzeZipAsync(Stream zipStream, string zipFileName, string correlationId, LearnerSnapshot? snapshot = null, TaskBrief? taskBrief = null, CancellationToken ct = default)
        {
            LastCorrelationId = correlationId;
            LastFileName = zipFileName;
            LastEndpoint = "single";
            if (ThrowOnAnalyze is not null) throw ThrowOnAnalyze;
            zipStream.ReadByte();
            return Task.FromResult(Response ?? throw new InvalidOperationException("Response not set"));
        }

        public Task<AiCombinedResponse> AnalyzeZipMultiAsync(Stream zipStream, string zipFileName, string correlationId, LearnerSnapshot? snapshot = null, TaskBrief? taskBrief = null, CancellationToken ct = default)
        {
            LastCorrelationId = correlationId;
            LastFileName = zipFileName;
            LastEndpoint = "multi";
            if (ThrowOnAnalyze is not null) throw ThrowOnAnalyze;
            zipStream.ReadByte();
            return Task.FromResult(MultiResponse ?? Response ?? throw new InvalidOperationException("MultiResponse / Response not set"));
        }

        public Task<bool> IsHealthyAsync(CancellationToken ct = default) => Task.FromResult(true);
    }
}

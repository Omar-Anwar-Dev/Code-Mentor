using CodeMentor.Application.CodeReview;
using CodeMentor.Application.Submissions;
using CodeMentor.Application.Tests.MentorChat;
using CodeMentor.Domain.Submissions;
using CodeMentor.Domain.Tasks;
using CodeMentor.Infrastructure.Gamification;
using CodeMentor.Infrastructure.Persistence;
using CodeMentor.Infrastructure.Skills;
using CodeMentor.Infrastructure.Submissions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace CodeMentor.Application.Tests.Submissions;

/// <summary>
/// S11-T4 / F13 (ADR-037): SubmissionAnalysisJob dispatches between
/// `/api/analyze-zip` (single mode, default) and `/api/analyze-zip-multi`
/// (multi mode) based on <see cref="IAiReviewModeProvider"/>.
///
/// Acceptance:
///  - Single mode (default) hits AnalyzeZipAsync. Existing F6 behavior preserved.
///  - Multi mode hits AnalyzeZipMultiAsync. PromptVersion = "multi-agent.v1"
///    (or ".partial") flows through to AIAnalysisResults.PromptVersion.
///  - Switching mode requires only a config/env change — no migration.
/// </summary>
public class SubmissionAnalysisJobMultiModeTests
{
    private static ApplicationDbContext NewDb()
    {
        var db = new ApplicationDbContext(
            new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase($"submission_multi_{Guid.NewGuid():N}")
                .Options);
        BadgeSeedData.SeedAsync(db).GetAwaiter().GetResult();
        return db;
    }

    private static SubmissionAnalysisJob NewJob(
        ApplicationDbContext db,
        IAiReviewClient ai,
        IAiReviewModeProvider modeProvider)
        => new(
            db,
            new FakeCodeLoader(),
            ai,
            modeProvider,
            new StaticToolSelector(),
            new FakeScheduler(),
            new NoopAggregator(),
            new CodeQualityScoreUpdater(db),
            new XpService(db, NullLogger<XpService>.Instance),
            new BadgeService(db, NullLogger<BadgeService>.Instance),
            new FakeMentorChatIndexScheduler(),
            NullLogger<SubmissionAnalysisJob>.Instance);

    private static Submission SeedPendingSubmission(ApplicationDbContext db)
    {
        var sub = new Submission
        {
            UserId = Guid.NewGuid(),
            TaskId = Guid.NewGuid(),
            SubmissionType = SubmissionType.Upload,
            BlobPath = "u/p.zip",
            Status = SubmissionStatus.Pending,
        };
        db.Submissions.Add(sub);
        db.SaveChanges();
        return sub;
    }

    [Fact]
    public async Task SingleMode_DispatchesTo_AnalyzeZipAsync()
    {
        using var db = NewDb();
        var sub = SeedPendingSubmission(db);

        var ai = new RecordingAiClient
        {
            Response = BuildAiResponse(promptVersion: "v1.0.0", overallScore: 80),
        };

        var job = NewJob(db, ai, new FixedModeProvider(AiReviewMode.Single));
        await job.RunAsync(sub.Id);

        Assert.Equal("single", ai.LastEndpoint);
        var fetched = await db.Submissions.AsNoTracking().FirstAsync(s => s.Id == sub.Id);
        Assert.Equal(SubmissionStatus.Completed, fetched.Status);

        var aiRow = await db.AIAnalysisResults.AsNoTracking().FirstAsync(r => r.SubmissionId == sub.Id);
        Assert.Equal("v1.0.0", aiRow.PromptVersion);
    }

    [Fact]
    public async Task MultiMode_DispatchesTo_AnalyzeZipMultiAsync()
    {
        using var db = NewDb();
        var sub = SeedPendingSubmission(db);

        var ai = new RecordingAiClient
        {
            // Single response shouldn't be hit; populate so the unit catches accidental fallthrough.
            Response = BuildAiResponse(promptVersion: "v1.0.0", overallScore: 60),
            MultiResponse = BuildAiResponse(promptVersion: "multi-agent.v1", overallScore: 85),
        };

        var job = NewJob(db, ai, new FixedModeProvider(AiReviewMode.Multi));
        await job.RunAsync(sub.Id);

        Assert.Equal("multi", ai.LastEndpoint);
        var fetched = await db.Submissions.AsNoTracking().FirstAsync(s => s.Id == sub.Id);
        Assert.Equal(SubmissionStatus.Completed, fetched.Status);

        // PromptVersion = "multi-agent.v1" is the source-of-truth signal for thesis A/B.
        var aiRow = await db.AIAnalysisResults.AsNoTracking().FirstAsync(r => r.SubmissionId == sub.Id);
        Assert.Equal("multi-agent.v1", aiRow.PromptVersion);
        Assert.Equal(85, aiRow.OverallScore);
    }

    [Fact]
    public async Task MultiMode_WithPartialAgentFailure_PersistsPartialPromptVersion()
    {
        using var db = NewDb();
        var sub = SeedPendingSubmission(db);

        // Simulate the orchestrator returning a partial-failure response: still
        // available, but PromptVersion stamped with `.partial`.
        var ai = new RecordingAiClient
        {
            MultiResponse = BuildAiResponse(promptVersion: "multi-agent.v1.partial", overallScore: 70),
        };

        var job = NewJob(db, ai, new FixedModeProvider(AiReviewMode.Multi));
        await job.RunAsync(sub.Id);

        Assert.Equal("multi", ai.LastEndpoint);
        var aiRow = await db.AIAnalysisResults.AsNoTracking().FirstAsync(r => r.SubmissionId == sub.Id);
        // The partial signal is what downstream thesis-eval scripts read.
        Assert.Equal("multi-agent.v1.partial", aiRow.PromptVersion);
    }

    [Fact]
    public async Task SwitchingMode_RequiresOnlyProviderChange_NoDataMigration()
    {
        // Run the same submission through single mode, then a fresh one through multi.
        // Both rows write to the same table; only PromptVersion differs.
        using var db = NewDb();

        var subSingle = SeedPendingSubmission(db);
        var aiSingle = new RecordingAiClient { Response = BuildAiResponse(promptVersion: "v1.0.0", overallScore: 80) };
        await NewJob(db, aiSingle, new FixedModeProvider(AiReviewMode.Single))
            .RunAsync(subSingle.Id);

        var subMulti = SeedPendingSubmission(db);
        var aiMulti = new RecordingAiClient { MultiResponse = BuildAiResponse(promptVersion: "multi-agent.v1", overallScore: 85) };
        await NewJob(db, aiMulti, new FixedModeProvider(AiReviewMode.Multi))
            .RunAsync(subMulti.Id);

        var rows = await db.AIAnalysisResults.AsNoTracking()
            .OrderBy(r => r.OverallScore)
            .ToListAsync();
        Assert.Equal(2, rows.Count);
        Assert.Equal("v1.0.0", rows[0].PromptVersion);
        Assert.Equal("multi-agent.v1", rows[1].PromptVersion);
    }

    // ───────── helpers ─────────

    private static AiCombinedResponse BuildAiResponse(string promptVersion, int overallScore) => new(
        SubmissionId: Guid.NewGuid().ToString(),
        AnalysisType: "combined",
        OverallScore: overallScore,
        StaticAnalysis: new AiStaticAnalysis(
            Score: 90, Issues: Array.Empty<AiIssue>(),
            Summary: new AiAnalysisSummary(0, 0, 0, 0),
            ToolsUsed: Array.Empty<string>(),
            PerTool: Array.Empty<AiPerToolResult>()),
        AiReview: new AiReviewResponse(
            OverallScore: overallScore,
            Scores: new AiReviewScores(80, 80, 80, 80, 80),
            Strengths: new[] { "well-structured" },
            Weaknesses: new[] { "missing tests" },
            Recommendations: Array.Empty<AiRecommendation>(),
            Summary: "ok",
            ModelUsed: "gpt-5.1-codex-mini",
            TokensUsed: 1500,
            PromptVersion: promptVersion,
            Available: true,
            Error: null),
        Metadata: new AiAnalysisMetadata("test", new[] { "python" }, 1, 500, true, true));

    private sealed class FixedModeProvider : IAiReviewModeProvider
    {
        public FixedModeProvider(AiReviewMode mode) => Current = mode;
        public AiReviewMode Current { get; }
    }

    private sealed class RecordingAiClient : IAiReviewClient
    {
        public AiCombinedResponse? Response { get; set; }
        public AiCombinedResponse? MultiResponse { get; set; }
        public string? LastEndpoint { get; private set; }

        public Task<AiCombinedResponse> AnalyzeZipAsync(Stream zipStream, string zipFileName, string correlationId, LearnerSnapshot? snapshot = null, CancellationToken ct = default)
        {
            LastEndpoint = "single";
            zipStream.ReadByte();
            return Task.FromResult(Response ?? throw new InvalidOperationException("Response not set"));
        }

        public Task<AiCombinedResponse> AnalyzeZipMultiAsync(Stream zipStream, string zipFileName, string correlationId, LearnerSnapshot? snapshot = null, CancellationToken ct = default)
        {
            LastEndpoint = "multi";
            zipStream.ReadByte();
            return Task.FromResult(MultiResponse ?? throw new InvalidOperationException("MultiResponse not set"));
        }

        public Task<bool> IsHealthyAsync(CancellationToken ct = default) => Task.FromResult(true);
    }

    private sealed class FakeCodeLoader : ISubmissionCodeLoader
    {
        public Task<SubmissionCodeLoadResult> LoadAsZipStreamAsync(Submission submission, CancellationToken ct = default)
        {
            var ms = new MemoryStream(new byte[] { 0x50, 0x4B, 0x03, 0x04 });
            return Task.FromResult(SubmissionCodeLoadResult.Ok(ms, "p.zip"));
        }
    }

    private sealed class FakeScheduler : ISubmissionAnalysisScheduler
    {
        public void Schedule(Guid submissionId) { }
        public void ScheduleAfter(Guid submissionId, TimeSpan delay) { }
    }

    private sealed class NoopAggregator : IFeedbackAggregator
    {
        public Task AggregateAsync(Submission submission, AiCombinedResponse aiResponse, CancellationToken ct = default)
            => Task.CompletedTask;
    }
}

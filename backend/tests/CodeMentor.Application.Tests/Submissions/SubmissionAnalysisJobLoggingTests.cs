using CodeMentor.Application.CodeReview;
using CodeMentor.Application.Submissions;
using CodeMentor.Domain.Submissions;
using CodeMentor.Infrastructure.Gamification;
using CodeMentor.Infrastructure.Persistence;
using CodeMentor.Infrastructure.Skills;
using CodeMentor.Infrastructure.Submissions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;

namespace CodeMentor.Application.Tests.Submissions;

/// <summary>
/// S5-T11 acceptance: each pipeline phase logged with DurationMs + Phase
/// properties so Seq / Application Insights can filter + chart them.
///
/// Uses a custom capturing ILogger that inspects the state KV pairs Serilog
/// would flatten into enrichers — same shape Seq sees.
/// </summary>
public class SubmissionAnalysisJobLoggingTests
{
    private static ApplicationDbContext NewDb()
    {
        var db = new ApplicationDbContext(
            new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase($"jog_log_{Guid.NewGuid():N}")
                .Options);
        BadgeSeedData.SeedAsync(db).GetAwaiter().GetResult();
        return db;
    }

    [Fact]
    public async Task RunAsync_HappyPath_Emits_AllFour_Phase_LogEntries_WithDurationMs()
    {
        using var db = NewDb();
        var sub = new Submission
        {
            UserId = Guid.NewGuid(),
            TaskId = Guid.NewGuid(),
            SubmissionType = SubmissionType.Upload,
            BlobPath = "u/p.zip",
            Status = SubmissionStatus.Pending,
        };
        db.Submissions.Add(sub);
        await db.SaveChangesAsync();

        var capture = new CapturingLogger<SubmissionAnalysisJob>();
        var loader = new NoopCodeLoader();
        var ai = new StubAiClient();

        var job = new SubmissionAnalysisJob(
            db, loader, ai, new SingleModeProvider(), new StaticToolSelector(), new NoopScheduler(),
            new NoopFeedbackAggregator(), new CodeQualityScoreUpdater(db),
            new XpService(db, NullLogger<XpService>.Instance),
            new BadgeService(db, NullLogger<BadgeService>.Instance),
            new CodeMentor.Application.Tests.MentorChat.FakeMentorChatIndexScheduler(),
            capture);
        await job.RunAsync(sub.Id);

        var phaseEntries = capture.Entries
            .Where(e => e.Properties.ContainsKey("Phase"))
            .ToList();

        // Expect fetch, ai, persist, total — exactly four phase rows.
        var phases = phaseEntries.Select(e => e.Properties["Phase"]?.ToString()).ToList();
        Assert.Contains("fetch", phases);
        Assert.Contains("ai", phases);
        Assert.Contains("persist", phases);
        Assert.Contains("total", phases);

        // Every phase entry carries a non-negative DurationMs.
        foreach (var entry in phaseEntries)
        {
            Assert.True(entry.Properties.ContainsKey("DurationMs"));
            var d = Convert.ToInt64(entry.Properties["DurationMs"]);
            Assert.True(d >= 0, $"DurationMs should be non-negative for phase {entry.Properties["Phase"]}");
        }
    }

    // ───────────────────────────────────────────────────────────────────
    // S11-T5: cost-monitoring discriminator. Each AI-cost log line carries
    // a `LlmCostSeries` field so a single Seq query can group on three
    // series side-by-side: ai-review (single mode), ai-review-multi
    // (multi mode), and project-audit. `ReviewMode` is also enriched on
    // the submission-analysis path for finer slicing.
    // ───────────────────────────────────────────────────────────────────

    [Fact]
    public async Task RunAsync_SingleMode_Persisted_Log_Carries_LlmCostSeries_AiReview_AndReviewMode_Single()
    {
        using var db = NewDb();
        var sub = new Submission
        {
            UserId = Guid.NewGuid(),
            TaskId = Guid.NewGuid(),
            SubmissionType = SubmissionType.Upload,
            BlobPath = "u/p.zip",
            Status = SubmissionStatus.Pending,
        };
        db.Submissions.Add(sub);
        await db.SaveChangesAsync();

        var capture = new CapturingLogger<SubmissionAnalysisJob>();
        var ai = new StubAiClientWithReview(promptVersion: "v1.0.0");

        var job = new SubmissionAnalysisJob(
            db, new NoopCodeLoader(), ai, new SingleModeProvider(),
            new StaticToolSelector(), new NoopScheduler(),
            new NoopFeedbackAggregator(), new CodeQualityScoreUpdater(db),
            new XpService(db, NullLogger<XpService>.Instance),
            new BadgeService(db, NullLogger<BadgeService>.Instance),
            new CodeMentor.Application.Tests.MentorChat.FakeMentorChatIndexScheduler(),
            capture);
        await job.RunAsync(sub.Id);

        var persisted = capture.Entries
            .First(e => e.Properties.ContainsKey("LlmCostSeries"));
        Assert.Equal("ai-review", persisted.Properties["LlmCostSeries"]?.ToString());
        Assert.Equal("single", persisted.Properties["ReviewMode"]?.ToString());
        Assert.Equal("v1.0.0", persisted.Properties["PromptVersion"]?.ToString());
    }

    [Fact]
    public async Task RunAsync_MultiMode_Persisted_Log_Carries_LlmCostSeries_AiReviewMulti_AndReviewMode_Multi()
    {
        using var db = NewDb();
        var sub = new Submission
        {
            UserId = Guid.NewGuid(),
            TaskId = Guid.NewGuid(),
            SubmissionType = SubmissionType.Upload,
            BlobPath = "u/p.zip",
            Status = SubmissionStatus.Pending,
        };
        db.Submissions.Add(sub);
        await db.SaveChangesAsync();

        var capture = new CapturingLogger<SubmissionAnalysisJob>();
        var ai = new StubAiClientWithReview(promptVersion: "multi-agent.v1");

        var job = new SubmissionAnalysisJob(
            db, new NoopCodeLoader(), ai, new MultiModeProvider(),
            new StaticToolSelector(), new NoopScheduler(),
            new NoopFeedbackAggregator(), new CodeQualityScoreUpdater(db),
            new XpService(db, NullLogger<XpService>.Instance),
            new BadgeService(db, NullLogger<BadgeService>.Instance),
            new CodeMentor.Application.Tests.MentorChat.FakeMentorChatIndexScheduler(),
            capture);
        await job.RunAsync(sub.Id);

        var persisted = capture.Entries
            .First(e => e.Properties.ContainsKey("LlmCostSeries"));
        Assert.Equal("ai-review-multi", persisted.Properties["LlmCostSeries"]?.ToString());
        Assert.Equal("multi", persisted.Properties["ReviewMode"]?.ToString());
        Assert.Equal("multi-agent.v1", persisted.Properties["PromptVersion"]?.ToString());
    }

    // ---- minimal test doubles ----

    private sealed class NoopCodeLoader : ISubmissionCodeLoader
    {
        public Task<SubmissionCodeLoadResult> LoadAsZipStreamAsync(Submission submission, CancellationToken ct = default)
        {
            var ms = new MemoryStream(new byte[] { 0x50, 0x4B, 0x03, 0x04 });
            return Task.FromResult(SubmissionCodeLoadResult.Ok(ms, "s.zip"));
        }
    }

    private sealed class NoopScheduler : ISubmissionAnalysisScheduler
    {
        public void Schedule(Guid submissionId) { }
        public void ScheduleAfter(Guid submissionId, TimeSpan delay) { }
    }

    private sealed class NoopFeedbackAggregator : IFeedbackAggregator
    {
        public Task AggregateAsync(Submission submission, AiCombinedResponse aiResponse, CancellationToken ct = default)
            => Task.CompletedTask;
    }

    private sealed class StubAiClient : IAiReviewClient
    {
        public Task<AiCombinedResponse> AnalyzeZipAsync(Stream zipStream, string zipFileName, string correlationId, LearnerSnapshot? snapshot = null, TaskBrief? taskBrief = null, CancellationToken ct = default)
            => Task.FromResult(new AiCombinedResponse(
                SubmissionId: "x",
                AnalysisType: "combined",
                OverallScore: 50,
                StaticAnalysis: new AiStaticAnalysis(
                    Score: 50,
                    Issues: Array.Empty<AiIssue>(),
                    Summary: new AiAnalysisSummary(0, 0, 0, 0),
                    ToolsUsed: new[] { "bandit" },
                    PerTool: new[]
                    {
                        new AiPerToolResult("bandit", Array.Empty<AiIssue>(), new AiAnalysisSummary(0, 0, 0, 0), 7),
                    }),
                AiReview: null,
                Metadata: new AiAnalysisMetadata("t", Array.Empty<string>(), 0, 0, true, false)));

        public Task<AiCombinedResponse> AnalyzeZipMultiAsync(Stream zipStream, string zipFileName, string correlationId, LearnerSnapshot? snapshot = null, TaskBrief? taskBrief = null, CancellationToken ct = default)
            => AnalyzeZipAsync(zipStream, zipFileName, correlationId, snapshot, taskBrief, ct);

        public Task<bool> IsHealthyAsync(CancellationToken ct = default) => Task.FromResult(true);
    }

    private sealed class SingleModeProvider : IAiReviewModeProvider
    {
        public AiReviewMode Current => AiReviewMode.Single;
    }

    private sealed class MultiModeProvider : IAiReviewModeProvider
    {
        public AiReviewMode Current => AiReviewMode.Multi;
    }

    /// <summary>
    /// Variant of StubAiClient that returns an AiReview payload (with the
    /// supplied PromptVersion) so the submission-analysis path persists the
    /// AIAnalysisResult row + emits the cost-discriminator log line tested
    /// in S11-T5.
    /// </summary>
    private sealed class StubAiClientWithReview : IAiReviewClient
    {
        private readonly string _promptVersion;
        public StubAiClientWithReview(string promptVersion) => _promptVersion = promptVersion;

        private AiCombinedResponse Build() => new(
            SubmissionId: "x",
            AnalysisType: "combined",
            OverallScore: 80,
            StaticAnalysis: new AiStaticAnalysis(
                Score: 90,
                Issues: Array.Empty<AiIssue>(),
                Summary: new AiAnalysisSummary(0, 0, 0, 0),
                ToolsUsed: Array.Empty<string>(),
                PerTool: Array.Empty<AiPerToolResult>()),
            AiReview: new AiReviewResponse(
                OverallScore: 80,
                Scores: new AiReviewScores(80, 80, 80, 80, 80),
                Strengths: Array.Empty<string>(),
                Weaknesses: Array.Empty<string>(),
                Recommendations: Array.Empty<AiRecommendation>(),
                Summary: "ok",
                ModelUsed: "gpt-5.1-codex-mini",
                TokensUsed: 1500,
                PromptVersion: _promptVersion,
                Available: true,
                Error: null),
            Metadata: new AiAnalysisMetadata("t", Array.Empty<string>(), 0, 0, true, true));

        public Task<AiCombinedResponse> AnalyzeZipAsync(Stream zipStream, string zipFileName, string correlationId, LearnerSnapshot? snapshot = null, TaskBrief? taskBrief = null, CancellationToken ct = default)
            => Task.FromResult(Build());

        public Task<AiCombinedResponse> AnalyzeZipMultiAsync(Stream zipStream, string zipFileName, string correlationId, LearnerSnapshot? snapshot = null, TaskBrief? taskBrief = null, CancellationToken ct = default)
            => Task.FromResult(Build());

        public Task<bool> IsHealthyAsync(CancellationToken ct = default) => Task.FromResult(true);
    }

    private sealed record LogEntry(LogLevel Level, string Message, IReadOnlyDictionary<string, object?> Properties);

    private sealed class CapturingLogger<T> : ILogger<T>
    {
        public List<LogEntry> Entries { get; } = new();

        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;
        public bool IsEnabled(LogLevel logLevel) => true;

        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter)
        {
            var message = formatter(state, exception);
            var props = new Dictionary<string, object?>();
            if (state is IReadOnlyList<KeyValuePair<string, object?>> kv)
            {
                foreach (var pair in kv) props[pair.Key] = pair.Value;
            }
            Entries.Add(new LogEntry(logLevel, message, props));
        }
    }
}

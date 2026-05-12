using CodeMentor.Application.CodeReview;
using CodeMentor.Application.Skills;
using CodeMentor.Application.Submissions;
using CodeMentor.Domain.Assessments;
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
/// S6-T4 acceptance:
///  - When AI portion is Available, the job writes (or upserts) one AIAnalysisResult row
///    for the submission, capturing OverallScore + tokens + ModelUsed + PromptVersion.
///  - When the AI score is at/above the passing threshold AND the submission's task
///    sits on the user's active path, the matching PathTask is auto-Completed and the
///    LearningPath's ProgressPercent is recomputed (ADR-026).
///  - Off-path submissions never touch path state, even with high scores.
///  - Below-threshold scores never auto-complete, even on-path.
///  - AI Unavailable runs do NOT write an AIAnalysisResult row.
/// </summary>
public class AIAnalysisJobPersistenceTests
{
    private static ApplicationDbContext NewDb()
    {
        var db = new ApplicationDbContext(
            new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase($"ai_persist_{Guid.NewGuid():N}")
                .Options);
        BadgeSeedData.SeedAsync(db).GetAwaiter().GetResult();
        return db;
    }

    private static SubmissionAnalysisJob NewJob(
        ApplicationDbContext db,
        IAiReviewClient ai,
        IFeedbackAggregator? aggregator = null,
        ICodeQualityScoreUpdater? codeQualityUpdater = null,
        IAiReviewModeProvider? modeProvider = null)
        => new(
            db,
            new FakeCodeLoader(),
            ai,
            modeProvider ?? new SingleModeProvider(),
            new StaticToolSelector(),
            new FakeScheduler(),
            aggregator ?? new NoopAggregator(),
            codeQualityUpdater ?? new CodeQualityScoreUpdater(db),
            new XpService(db, NullLogger<XpService>.Instance),
            new BadgeService(db, NullLogger<BadgeService>.Instance),
            new CodeMentor.Application.Tests.MentorChat.FakeMentorChatIndexScheduler(),
            NullLogger<SubmissionAnalysisJob>.Instance);

    private sealed class SingleModeProvider : IAiReviewModeProvider
    {
        public AiReviewMode Current => AiReviewMode.Single;
    }

    private sealed class NoopAggregator : IFeedbackAggregator
    {
        public Task AggregateAsync(Submission submission, AiCombinedResponse aiResponse, CancellationToken ct = default)
            => Task.CompletedTask;
    }

    [Fact]
    public async Task RunAsync_AiAvailable_PersistsAIAnalysisResult_WithAllMetadata()
    {
        using var db = NewDb();
        var sub = SeedSubmission(db);

        var ai = new FakeAiReviewClient
        {
            Response = BuildResponse(aiAvailable: true, overallScore: 84, tokens: 2750, prompt: "v1.0.0",
                strengths: new[] { "good naming", "clean structure" },
                weaknesses: new[] { "missing tests" }),
        };
        var job = NewJob(db, ai);

        await job.RunAsync(sub.Id);

        var row = await db.AIAnalysisResults.AsNoTracking().SingleAsync(r => r.SubmissionId == sub.Id);
        Assert.Equal(84, row.OverallScore);
        Assert.Equal(2750, row.TokensUsed);
        Assert.Equal("gpt-5.1-codex-mini", row.ModelUsed);
        Assert.Equal("v1.0.0", row.PromptVersion);
        Assert.Contains("good naming", row.StrengthsJson);
        Assert.Contains("missing tests", row.WeaknessesJson);
        Assert.Contains("\"overallScore\":84", row.FeedbackJson);
        Assert.True(row.ProcessedAt > DateTime.UtcNow.AddMinutes(-1));
    }

    [Fact]
    public async Task RunAsync_AiUnavailable_DoesNotWriteAIAnalysisResult()
    {
        using var db = NewDb();
        var sub = SeedSubmission(db);

        var ai = new FakeAiReviewClient
        {
            Response = BuildResponse(aiAvailable: false, overallScore: 0, tokens: 0, prompt: ""),
        };
        var job = NewJob(db, ai);

        await job.RunAsync(sub.Id);

        Assert.Empty(db.AIAnalysisResults.AsNoTracking().Where(r => r.SubmissionId == sub.Id).ToList());
    }

    [Fact]
    public async Task RunAsync_RetryReplacesAIAnalysisResult_OnlyOneRowExists()
    {
        using var db = NewDb();
        var sub = SeedSubmission(db);

        var ai = new FakeAiReviewClient
        {
            Response = BuildResponse(aiAvailable: true, overallScore: 60, tokens: 1500, prompt: "v1.0.0"),
        };
        var job = NewJob(db, ai);
        await job.RunAsync(sub.Id);

        // Simulate manual retry: flip back to Pending + bump AttemptNumber.
        var reloaded = await db.Submissions.FirstAsync(s => s.Id == sub.Id);
        reloaded.Status = SubmissionStatus.Pending;
        reloaded.AttemptNumber++;
        await db.SaveChangesAsync();

        ai.Response = BuildResponse(aiAvailable: true, overallScore: 88, tokens: 3200, prompt: "v1.0.0");
        await job.RunAsync(sub.Id);

        var rows = db.AIAnalysisResults.AsNoTracking().Where(r => r.SubmissionId == sub.Id).ToList();
        Assert.Single(rows);
        Assert.Equal(88, rows[0].OverallScore);
        Assert.Equal(3200, rows[0].TokensUsed);
    }

    [Fact]
    public async Task RunAsync_AiScoreAtOrAboveThreshold_OnActivePath_AutoCompletesPathTask()
    {
        using var db = NewDb();
        var (sub, pathTask, path) = SeedSubmissionWithActivePath(db, otherTaskCount: 2);

        var ai = new FakeAiReviewClient
        {
            Response = BuildResponse(aiAvailable: true, overallScore: SubmissionAnalysisJob.PassingScoreThreshold, tokens: 1500, prompt: "v1.0.0"),
        };
        var job = NewJob(db, ai);

        await job.RunAsync(sub.Id);

        var ptReloaded = await db.PathTasks.AsNoTracking().FirstAsync(pt => pt.Id == pathTask.Id);
        Assert.Equal(PathTaskStatus.Completed, ptReloaded.Status);
        Assert.NotNull(ptReloaded.CompletedAt);

        var pathReloaded = await db.LearningPaths.AsNoTracking().FirstAsync(p => p.Id == path.Id);
        // 1 of 3 tasks complete = 33.33%
        Assert.Equal(33.33m, pathReloaded.ProgressPercent);
    }

    [Fact]
    public async Task RunAsync_AiScoreBelowThreshold_OnActivePath_DoesNotCompletePathTask()
    {
        using var db = NewDb();
        var (sub, pathTask, path) = SeedSubmissionWithActivePath(db);

        var ai = new FakeAiReviewClient
        {
            Response = BuildResponse(aiAvailable: true, overallScore: SubmissionAnalysisJob.PassingScoreThreshold - 1, tokens: 800, prompt: "v1.0.0"),
        };
        var job = NewJob(db, ai);

        await job.RunAsync(sub.Id);

        var ptReloaded = await db.PathTasks.AsNoTracking().FirstAsync(pt => pt.Id == pathTask.Id);
        Assert.NotEqual(PathTaskStatus.Completed, ptReloaded.Status);
        Assert.Null(ptReloaded.CompletedAt);
        Assert.Equal(0m, (await db.LearningPaths.AsNoTracking().FirstAsync(p => p.Id == path.Id)).ProgressPercent);
    }

    [Fact]
    public async Task RunAsync_AiScorePassing_OffPath_DoesNotMutatePathState()
    {
        using var db = NewDb();
        var (sub, pathTask, path) = SeedSubmissionWithActivePath(db);
        // Make this submission an off-path one — its TaskId is unrelated to anything in the path.
        sub.TaskId = Guid.NewGuid();
        await db.SaveChangesAsync();

        var ai = new FakeAiReviewClient
        {
            Response = BuildResponse(aiAvailable: true, overallScore: 95, tokens: 1500, prompt: "v1.0.0"),
        };
        var job = NewJob(db, ai);

        await job.RunAsync(sub.Id);

        var ptReloaded = await db.PathTasks.AsNoTracking().FirstAsync(pt => pt.Id == pathTask.Id);
        Assert.Equal(PathTaskStatus.NotStarted, ptReloaded.Status);
        Assert.Equal(0m, (await db.LearningPaths.AsNoTracking().FirstAsync(p => p.Id == path.Id)).ProgressPercent);
    }

    [Fact]
    public async Task RunAsync_FirstAiPersistence_FeedsCodeQualityScore_RunningAverage()
    {
        // S7-T1 / ADR-028: a successful AI review's per-category scores roll
        // into CodeQualityScore (5 rows, SampleCount=1) on first persistence.
        using var db = NewDb();
        var sub = SeedSubmission(db);

        var ai = new FakeAiReviewClient
        {
            Response = BuildResponse(aiAvailable: true, overallScore: 80, tokens: 1500, prompt: "v1.0.0"),
        };
        var job = NewJob(db, ai);

        await job.RunAsync(sub.Id);

        var rows = db.CodeQualityScores.AsNoTracking()
            .Where(s => s.UserId == sub.UserId)
            .ToList();
        Assert.Equal(5, rows.Count);
        Assert.All(rows, r => Assert.Equal(1, r.SampleCount));
        // Each category equals the AI overallScore in BuildResponse (uniform).
        Assert.All(rows, r => Assert.Equal(80m, r.Score));
    }

    [Fact]
    public async Task RunAsync_AiRetry_DoesNotDoubleCount_CodeQualityScore()
    {
        // S7-T1 / ADR-028: replacing an AIAnalysisResult on retry must NOT
        // re-contribute to the running average. SampleCount stays 1.
        using var db = NewDb();
        var sub = SeedSubmission(db);

        var ai = new FakeAiReviewClient
        {
            Response = BuildResponse(aiAvailable: true, overallScore: 60, tokens: 1500, prompt: "v1.0.0"),
        };
        var job = NewJob(db, ai);
        await job.RunAsync(sub.Id);

        // Simulate manual retry: flip back to Pending + bump AttemptNumber.
        var reloaded = await db.Submissions.FirstAsync(s => s.Id == sub.Id);
        reloaded.Status = SubmissionStatus.Pending;
        reloaded.AttemptNumber++;
        await db.SaveChangesAsync();

        ai.Response = BuildResponse(aiAvailable: true, overallScore: 90, tokens: 3200, prompt: "v1.0.0");
        await job.RunAsync(sub.Id);

        var rows = db.CodeQualityScores.AsNoTracking()
            .Where(s => s.UserId == sub.UserId)
            .ToList();
        Assert.Equal(5, rows.Count);
        // SampleCount remains 1 because the second run was a replacement, not a fresh contribution.
        Assert.All(rows, r => Assert.Equal(1, r.SampleCount));
        // Score reflects the FIRST run's value (60), not the second (90).
        Assert.All(rows, r => Assert.Equal(60m, r.Score));
    }

    [Fact]
    public async Task RunAsync_TwoSubmissions_SameUser_RunningAverage_Across_Both()
    {
        // S7-T1 / ADR-028: two separate submissions both complete with AI;
        // CodeQualityScore reflects the mean of the two contributions.
        using var db = NewDb();
        var userId = Guid.NewGuid();
        var sub1 = SeedSubmission(db, userId: userId, taskId: Guid.NewGuid());
        var sub2 = SeedSubmission(db, userId: userId, taskId: Guid.NewGuid());

        var ai = new FakeAiReviewClient
        {
            Response = BuildResponse(aiAvailable: true, overallScore: 60, tokens: 1500, prompt: "v1.0.0"),
        };
        var job = NewJob(db, ai);
        await job.RunAsync(sub1.Id);

        ai.Response = BuildResponse(aiAvailable: true, overallScore: 80, tokens: 1500, prompt: "v1.0.0");
        await job.RunAsync(sub2.Id);

        var rows = db.CodeQualityScores.AsNoTracking().Where(s => s.UserId == userId).ToList();
        Assert.Equal(5, rows.Count);
        Assert.All(rows, r => Assert.Equal(2, r.SampleCount));
        Assert.All(rows, r => Assert.Equal(70m, r.Score)); // (60+80)/2
    }

    [Fact]
    public async Task RunAsync_AiUnavailable_DoesNotTouchCodeQualityScore()
    {
        // S7-T1 / ADR-028: AI-unavailable runs do NOT write any CodeQualityScore rows.
        using var db = NewDb();
        var sub = SeedSubmission(db);

        var ai = new FakeAiReviewClient
        {
            Response = BuildResponse(aiAvailable: false, overallScore: 0, tokens: 0, prompt: ""),
        };
        var job = NewJob(db, ai);

        await job.RunAsync(sub.Id);

        Assert.Empty(db.CodeQualityScores.AsNoTracking().Where(s => s.UserId == sub.UserId).ToList());
    }

    [Fact]
    public async Task RunAsync_AiScorePassing_PathTaskAlreadyCompleted_NoOp()
    {
        using var db = NewDb();
        var (sub, pathTask, path) = SeedSubmissionWithActivePath(db);
        var firstCompletedAt = DateTime.UtcNow.AddDays(-1);
        pathTask.Status = PathTaskStatus.Completed;
        pathTask.CompletedAt = firstCompletedAt;
        path.RecomputeProgress();
        await db.SaveChangesAsync();

        var ai = new FakeAiReviewClient
        {
            Response = BuildResponse(aiAvailable: true, overallScore: 99, tokens: 2000, prompt: "v1.0.0"),
        };
        var job = NewJob(db, ai);

        await job.RunAsync(sub.Id);

        var ptReloaded = await db.PathTasks.AsNoTracking().FirstAsync(pt => pt.Id == pathTask.Id);
        Assert.Equal(PathTaskStatus.Completed, ptReloaded.Status);
        // CompletedAt must not be overwritten on a re-pass.
        Assert.Equal(firstCompletedAt, ptReloaded.CompletedAt);
    }

    // ----- helpers --------------------------------------------------------

    private static Submission SeedSubmission(ApplicationDbContext db, Guid? userId = null, Guid? taskId = null)
    {
        var sub = new Submission
        {
            UserId = userId ?? Guid.NewGuid(),
            TaskId = taskId ?? Guid.NewGuid(),
            SubmissionType = SubmissionType.Upload,
            BlobPath = "u/p.zip",
            Status = SubmissionStatus.Pending,
        };
        db.Submissions.Add(sub);
        db.SaveChanges();
        return sub;
    }

    /// <summary>Seeds a submission whose TaskId is the first task on the user's active learning path.</summary>
    private static (Submission, PathTask, LearningPath) SeedSubmissionWithActivePath(ApplicationDbContext db, int otherTaskCount = 2)
    {
        var userId = Guid.NewGuid();
        var taskId = Guid.NewGuid();

        // Create the canonical TaskItem rows the path will reference (FK Restrict).
        var taskItems = new List<TaskItem> { MakeTaskItem(taskId) };
        for (var i = 0; i < otherTaskCount; i++)
        {
            taskItems.Add(MakeTaskItem(Guid.NewGuid()));
        }
        db.Tasks.AddRange(taskItems);
        db.SaveChanges();

        var path = new LearningPath
        {
            UserId = userId,
            Track = Track.FullStack,
            IsActive = true,
        };
        db.LearningPaths.Add(path);
        db.SaveChanges();

        var pathTasks = taskItems.Select((t, idx) => new PathTask
        {
            PathId = path.Id,
            TaskId = t.Id,
            OrderIndex = idx,
            Status = PathTaskStatus.NotStarted,
        }).ToList();
        db.PathTasks.AddRange(pathTasks);
        db.SaveChanges();

        var sub = SeedSubmission(db, userId, taskId);
        return (sub, pathTasks[0], path);
    }

    private static TaskItem MakeTaskItem(Guid id) => new()
    {
        Id = id,
        Title = $"Task {id:N}".Substring(0, 30),
        Description = "Placeholder",
        Track = Track.FullStack,
        Difficulty = 2,
        Category = SkillCategory.Algorithms,
        ExpectedLanguage = ProgrammingLanguage.Python,
        EstimatedHours = 3,
        IsActive = true,
    };

    private static AiCombinedResponse BuildResponse(
        bool aiAvailable,
        int overallScore,
        int tokens,
        string prompt,
        string[]? strengths = null,
        string[]? weaknesses = null)
    {
        var aiReview = aiAvailable
            ? new AiReviewResponse(
                OverallScore: overallScore,
                Scores: new AiReviewScores(overallScore, overallScore, overallScore, overallScore, overallScore),
                Strengths: strengths ?? Array.Empty<string>(),
                Weaknesses: weaknesses ?? Array.Empty<string>(),
                Recommendations: Array.Empty<AiRecommendation>(),
                Summary: "ok",
                ModelUsed: "gpt-5.1-codex-mini",
                TokensUsed: tokens,
                PromptVersion: prompt,
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

        return new AiCombinedResponse(
            SubmissionId: "s",
            AnalysisType: "combined",
            OverallScore: overallScore,
            StaticAnalysis: new AiStaticAnalysis(
                Score: 80,
                Issues: Array.Empty<AiIssue>(),
                Summary: new AiAnalysisSummary(0, 0, 0, 0),
                ToolsUsed: Array.Empty<string>(),
                PerTool: Array.Empty<AiPerToolResult>()),
            AiReview: aiReview,
            Metadata: new AiAnalysisMetadata("test", new[] { "python" }, 1, 100, true, aiAvailable));
    }

    private sealed class FakeScheduler : ISubmissionAnalysisScheduler
    {
        public void Schedule(Guid submissionId) { }
        public void ScheduleAfter(Guid submissionId, TimeSpan delay) { }
    }

    private sealed class FakeCodeLoader : ISubmissionCodeLoader
    {
        public Task<SubmissionCodeLoadResult> LoadAsZipStreamAsync(Submission submission, CancellationToken ct = default)
        {
            var ms = new MemoryStream(new byte[] { 0x50, 0x4B, 0x03, 0x04 });
            return Task.FromResult(SubmissionCodeLoadResult.Ok(ms, "p.zip"));
        }
    }

    private sealed class FakeAiReviewClient : IAiReviewClient
    {
        public AiCombinedResponse? Response { get; set; }

        public Task<AiCombinedResponse> AnalyzeZipAsync(Stream zipStream, string zipFileName, string correlationId, LearnerSnapshot? snapshot = null, CancellationToken ct = default)
        {
            zipStream.ReadByte();
            return Task.FromResult(Response ?? throw new InvalidOperationException("Response not set"));
        }

        public Task<AiCombinedResponse> AnalyzeZipMultiAsync(Stream zipStream, string zipFileName, string correlationId, LearnerSnapshot? snapshot = null, CancellationToken ct = default)
            => AnalyzeZipAsync(zipStream, zipFileName, correlationId, snapshot, ct);

        public Task<bool> IsHealthyAsync(CancellationToken ct = default) => Task.FromResult(true);
    }
}

using System.Text.Json;
using CodeMentor.Application.CodeReview;
using CodeMentor.Domain.Assessments;
using CodeMentor.Domain.Skills;
using CodeMentor.Domain.Submissions;
using CodeMentor.Domain.Tasks;
using CodeMentor.Infrastructure.CodeReview;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace CodeMentor.Application.Tests.CodeReview;

/// <summary>
/// S12-T3 / F14 (ADR-040..043): unit tests for the
/// <see cref="LearnerSnapshotService"/> aggregation logic. Each test seeds an
/// EF-InMemory DB with realistic rows, runs the service, and asserts the
/// snapshot shape end-to-end. Covers:
///   - Cold-start with no assessment (ADR-042 strictest case)
///   - Cold-start with assessment-only baseline
///   - Single prior submission (partial CodeQualityScores)
///   - 5+ submissions with a recurring weakness phrase (ADR-041 frequency)
///   - Improvement trend computation (last-3 vs prior-3)
///   - Recurring-weakness category gating by sample count
///   - RAG chunks woven into progressNotes
///   - RAG fallback annotation (ADR-043)
/// </summary>
public class LearnerSnapshotServiceTests
{
    private static ApplicationDbContext NewDb() => new(
        new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase($"snapshot_{Guid.NewGuid():N}")
            .Options);

    private static LearnerSnapshotService NewService(
        ApplicationDbContext db,
        IFeedbackHistoryRetriever? retriever = null,
        LearnerSnapshotOptions? opts = null) =>
        new(
            db,
            retriever ?? new EmptyRetriever(),
            Options.Create(opts ?? new LearnerSnapshotOptions()),
            NullLogger<LearnerSnapshotService>.Instance);

    /// <summary>
    /// Default behaviour: simulate the "AI service down" branch — returns
    /// empty chunks with <see cref="FeedbackHistoryRetrievalStatus.Unavailable"/>.
    /// Set <see cref="Status"/> to override (e.g., to RetrievalCompleted to
    /// simulate a healthy-but-empty corpus per post-S12 polish).
    /// </summary>
    private sealed class EmptyRetriever : IFeedbackHistoryRetriever
    {
        public FeedbackHistoryRetrievalStatus Status { get; init; } =
            FeedbackHistoryRetrievalStatus.Unavailable;

        public Task<FeedbackHistoryRetrievalResult> RetrieveAsync(
            Guid userId, string anchorText, int topK, CancellationToken ct = default) =>
            Task.FromResult(new FeedbackHistoryRetrievalResult(
                Array.Empty<PriorFeedbackChunk>(), Status));
    }

    private sealed class FixedRetriever : IFeedbackHistoryRetriever
    {
        public IReadOnlyList<PriorFeedbackChunk> Chunks { get; init; } = Array.Empty<PriorFeedbackChunk>();

        public int CallCount { get; private set; }

        public Task<FeedbackHistoryRetrievalResult> RetrieveAsync(
            Guid userId, string anchorText, int topK, CancellationToken ct = default)
        {
            CallCount++;
            return Task.FromResult(FeedbackHistoryRetrievalResult.Completed(Chunks));
        }
    }

    // ────────────────────────────────────────────────────────────────────
    // Helpers
    // ────────────────────────────────────────────────────────────────────
    private static async Task SeedCompletedSubmissionAsync(
        ApplicationDbContext db,
        Guid userId,
        Guid taskId,
        int score,
        IEnumerable<string> weaknesses,
        DateTime completedAt,
        string? taskTitle = null)
    {
        var submissionId = Guid.NewGuid();
        db.Submissions.Add(new Submission
        {
            Id = submissionId,
            UserId = userId,
            TaskId = taskId,
            Status = SubmissionStatus.Completed,
            AiAnalysisStatus = AiAnalysisStatus.Available,
            SubmissionType = SubmissionType.Upload,
            BlobPath = "test/blob.zip",
            CreatedAt = completedAt,
            CompletedAt = completedAt,
        });
        db.AIAnalysisResults.Add(new AIAnalysisResult
        {
            SubmissionId = submissionId,
            OverallScore = score,
            FeedbackJson = "{}",
            StrengthsJson = "[]",
            WeaknessesJson = JsonSerializer.Serialize(weaknesses),
            ModelUsed = "test",
            TokensUsed = 100,
            PromptVersion = "v1.0.0",
            ProcessedAt = completedAt,
        });
        if (taskTitle is not null &&
            !await db.Tasks.AnyAsync(t => t.Id == taskId))
        {
            db.Tasks.Add(new TaskItem
            {
                Id = taskId,
                Title = taskTitle,
                Description = "stub",
                Difficulty = 2,
                ExpectedLanguage = ProgrammingLanguage.Python,
                EstimatedHours = 4,
            });
        }
        await db.SaveChangesAsync();
    }

    // ────────────────────────────────────────────────────────────────────
    // (a) Cold-start, NO assessment — strictest first-submission case (ADR-042)
    // ────────────────────────────────────────────────────────────────────
    [Fact]
    public async Task BuildAsync_NewUser_NoAssessment_ReturnsMinimalSnapshot()
    {
        using var db = NewDb();
        var svc = NewService(db);
        var userId = Guid.NewGuid();
        var taskId = Guid.NewGuid();
        var currentSubId = Guid.NewGuid();

        var snapshot = await svc.BuildAsync(userId, currentSubId, taskId, currentStaticFindingsJson: null);

        Assert.Equal(userId, snapshot.UserId);
        Assert.Equal("Intermediate", snapshot.SkillLevel); // default fallback
        Assert.Equal(0, snapshot.CompletedSubmissionsCount);
        Assert.Null(snapshot.AverageOverallScore);
        Assert.Empty(snapshot.CodeQualityAverages);
        Assert.Empty(snapshot.WeakAreas);
        Assert.Empty(snapshot.StrongAreas);
        Assert.Null(snapshot.ImprovementTrend);
        Assert.Empty(snapshot.RecentSubmissions);
        Assert.Empty(snapshot.CommonMistakes);
        Assert.Empty(snapshot.RecurringWeaknesses);
        Assert.Empty(snapshot.RagChunks);
        Assert.Equal(0, snapshot.AttemptsOnCurrentTask);
        Assert.True(snapshot.IsFirstReview);
        Assert.Contains("first code submission", snapshot.ProgressNotes);
    }

    // ────────────────────────────────────────────────────────────────────
    // (b) Assessment-only baseline — cold-start, weakAreas come from SkillScores
    // ────────────────────────────────────────────────────────────────────
    [Fact]
    public async Task BuildAsync_WithAssessmentNoSubmissions_UsesSkillScoresFallback()
    {
        using var db = NewDb();
        var svc = NewService(db);
        var userId = Guid.NewGuid();

        db.Assessments.Add(new Assessment
        {
            UserId = userId,
            Status = AssessmentStatus.Completed,
            CompletedAt = DateTime.UtcNow.AddDays(-2),
            SkillLevel = Domain.Assessments.SkillLevel.Beginner,
            TotalScore = 55m,
            Track = Track.FullStack,
        });
        db.SkillScores.Add(new SkillScore
        {
            UserId = userId, Category = SkillCategory.Security, Score = 40m, Level = Domain.Assessments.SkillLevel.Beginner,
        });
        db.SkillScores.Add(new SkillScore
        {
            UserId = userId, Category = SkillCategory.DataStructures, Score = 85m, Level = Domain.Assessments.SkillLevel.Advanced,
        });
        await db.SaveChangesAsync();

        var snapshot = await svc.BuildAsync(userId, Guid.NewGuid(), Guid.NewGuid(), null);

        Assert.Equal("Beginner", snapshot.SkillLevel);
        Assert.True(snapshot.IsFirstReview);
        Assert.Contains("Security", snapshot.WeakAreas);
        Assert.DoesNotContain("DataStructures", snapshot.WeakAreas);
        Assert.Contains("DataStructures", snapshot.StrongAreas);
        Assert.Contains("first code submission", snapshot.ProgressNotes);
        Assert.Contains("Beginner", snapshot.ProgressNotes);
    }

    // ────────────────────────────────────────────────────────────────────
    // (c) 1 prior submission — basic case with partial CodeQualityScores
    // ────────────────────────────────────────────────────────────────────
    [Fact]
    public async Task BuildAsync_WithOnePriorSubmission_BuildsBasicProfile()
    {
        using var db = NewDb();
        var svc = NewService(db);
        var userId = Guid.NewGuid();
        var taskId = Guid.NewGuid();

        await SeedCompletedSubmissionAsync(
            db, userId, taskId, score: 75,
            weaknesses: new[] { "magic numbers without named constants" },
            completedAt: DateTime.UtcNow.AddDays(-1),
            taskTitle: "REST API Basics");

        db.CodeQualityScores.Add(new CodeQualityScore
        {
            UserId = userId, Category = CodeQualityCategory.Correctness, Score = 75m, SampleCount = 1,
        });
        db.CodeQualityScores.Add(new CodeQualityScore
        {
            UserId = userId, Category = CodeQualityCategory.Security, Score = 50m, SampleCount = 1,
        });
        await db.SaveChangesAsync();

        var snapshot = await svc.BuildAsync(userId, Guid.NewGuid(), Guid.NewGuid(), "static findings");

        Assert.False(snapshot.IsFirstReview);
        Assert.Equal(1, snapshot.CompletedSubmissionsCount);
        Assert.Equal(75.0, snapshot.AverageOverallScore);
        Assert.Contains("Security", snapshot.WeakAreas);
        Assert.DoesNotContain("Correctness", snapshot.WeakAreas);   // 75 ≥ 60 = not weak
        Assert.Null(snapshot.ImprovementTrend);                       // not enough data
        Assert.Empty(snapshot.RecurringWeaknesses);                   // sampleCount=1 < threshold (5)
        Assert.Single(snapshot.RecentSubmissions);
        Assert.Equal("REST API Basics", snapshot.RecentSubmissions[0].TaskName);
        Assert.Equal(75, snapshot.RecentSubmissions[0].Score);
        Assert.Contains("magic numbers without named constants", snapshot.RecentSubmissions[0].MainIssues);
    }

    // ────────────────────────────────────────────────────────────────────
    // (d) 5+ submissions with a recurring phrase → commonMistakes flags it
    //     (the core ADR-041 case)
    // ────────────────────────────────────────────────────────────────────
    [Fact]
    public async Task BuildAsync_WithFiveSubmissionsRepeatingPhrase_FlagsCommonMistake()
    {
        using var db = NewDb();
        var svc = NewService(db);
        var userId = Guid.NewGuid();
        var taskId = Guid.NewGuid();
        var now = DateTime.UtcNow;

        // 6 submissions, 4 of them carry the same weakness phrase verbatim.
        await SeedCompletedSubmissionAsync(db, userId, taskId, 70,
            new[] { "input validation missing on endpoint" }, now.AddDays(-1), "Task A");
        await SeedCompletedSubmissionAsync(db, userId, Guid.NewGuid(), 65,
            new[] { "input validation missing on endpoint", "no error handling" }, now.AddDays(-2), "Task B");
        await SeedCompletedSubmissionAsync(db, userId, Guid.NewGuid(), 72,
            new[] { "INPUT VALIDATION MISSING ON ENDPOINT" }, now.AddDays(-3), "Task C"); // case-insensitive
        await SeedCompletedSubmissionAsync(db, userId, Guid.NewGuid(), 80,
            new[] { "input validation  missing  on  endpoint" }, now.AddDays(-4), "Task D"); // whitespace-tolerant
        await SeedCompletedSubmissionAsync(db, userId, Guid.NewGuid(), 60,
            new[] { "different weakness" }, now.AddDays(-5), "Task E");
        await SeedCompletedSubmissionAsync(db, userId, Guid.NewGuid(), 68,
            new[] { "yet another issue" }, now.AddDays(-6), "Task F");

        var snapshot = await svc.BuildAsync(userId, Guid.NewGuid(), taskId, "static findings");

        Assert.Equal(6, snapshot.CompletedSubmissionsCount);
        // The phrase should be #1 by frequency (4 occurrences).
        Assert.NotEmpty(snapshot.CommonMistakes);
        Assert.Contains("input validation missing on endpoint",
            snapshot.CommonMistakes[0], StringComparison.OrdinalIgnoreCase);
    }

    // ────────────────────────────────────────────────────────────────────
    // (e) Improvement trend — last-3 mean vs prior-3 mean
    // ────────────────────────────────────────────────────────────────────
    [Fact]
    public async Task BuildAsync_TrendComputation_DetectsImprovement()
    {
        using var db = NewDb();
        var svc = NewService(db);
        var userId = Guid.NewGuid();
        var now = DateTime.UtcNow;

        // Last 3 (most recent first): 80, 85, 82 → mean 82.3
        // Prior 3: 60, 65, 70 → mean 65.0
        // delta = +17.3 → improving
        await SeedCompletedSubmissionAsync(db, userId, Guid.NewGuid(), 80, new[] { "x" }, now.AddDays(-1));
        await SeedCompletedSubmissionAsync(db, userId, Guid.NewGuid(), 85, new[] { "x" }, now.AddDays(-2));
        await SeedCompletedSubmissionAsync(db, userId, Guid.NewGuid(), 82, new[] { "x" }, now.AddDays(-3));
        await SeedCompletedSubmissionAsync(db, userId, Guid.NewGuid(), 60, new[] { "x" }, now.AddDays(-4));
        await SeedCompletedSubmissionAsync(db, userId, Guid.NewGuid(), 65, new[] { "x" }, now.AddDays(-5));
        await SeedCompletedSubmissionAsync(db, userId, Guid.NewGuid(), 70, new[] { "x" }, now.AddDays(-6));

        var snapshot = await svc.BuildAsync(userId, Guid.NewGuid(), Guid.NewGuid(), "anchor");

        Assert.Equal("improving", snapshot.ImprovementTrend);
        Assert.Contains("improving", snapshot.ProgressNotes);
    }

    [Fact]
    public async Task BuildAsync_TrendComputation_DetectsDecline()
    {
        using var db = NewDb();
        var svc = NewService(db);
        var userId = Guid.NewGuid();
        var now = DateTime.UtcNow;

        // Last 3: 50, 55, 60 → mean 55.0; prior 3: 80, 85, 75 → mean 80.0 → declining
        await SeedCompletedSubmissionAsync(db, userId, Guid.NewGuid(), 50, new[] { "x" }, now.AddDays(-1));
        await SeedCompletedSubmissionAsync(db, userId, Guid.NewGuid(), 55, new[] { "x" }, now.AddDays(-2));
        await SeedCompletedSubmissionAsync(db, userId, Guid.NewGuid(), 60, new[] { "x" }, now.AddDays(-3));
        await SeedCompletedSubmissionAsync(db, userId, Guid.NewGuid(), 80, new[] { "x" }, now.AddDays(-4));
        await SeedCompletedSubmissionAsync(db, userId, Guid.NewGuid(), 85, new[] { "x" }, now.AddDays(-5));
        await SeedCompletedSubmissionAsync(db, userId, Guid.NewGuid(), 75, new[] { "x" }, now.AddDays(-6));

        var snapshot = await svc.BuildAsync(userId, Guid.NewGuid(), Guid.NewGuid(), "anchor");

        Assert.Equal("declining", snapshot.ImprovementTrend);
    }

    // ────────────────────────────────────────────────────────────────────
    // (f) Recurring-weakness category — gated by sample-count threshold (5)
    // ────────────────────────────────────────────────────────────────────
    [Fact]
    public async Task BuildAsync_RecurringWeakness_RequiresSampleCountThreshold()
    {
        using var db = NewDb();
        var svc = NewService(db);
        var userId = Guid.NewGuid();

        // Security at 40 with sampleCount=2 → weak BUT NOT recurring (n < 5).
        db.CodeQualityScores.Add(new CodeQualityScore
        {
            UserId = userId, Category = CodeQualityCategory.Security, Score = 40m, SampleCount = 2,
        });
        // Performance at 35 with sampleCount=7 → weak AND recurring.
        db.CodeQualityScores.Add(new CodeQualityScore
        {
            UserId = userId, Category = CodeQualityCategory.Performance, Score = 35m, SampleCount = 7,
        });
        // Readability at 85 with sampleCount=7 → strong, NOT recurring.
        db.CodeQualityScores.Add(new CodeQualityScore
        {
            UserId = userId, Category = CodeQualityCategory.Readability, Score = 85m, SampleCount = 7,
        });
        await db.SaveChangesAsync();

        var snapshot = await svc.BuildAsync(userId, Guid.NewGuid(), Guid.NewGuid(), null);

        Assert.Contains("Security", snapshot.WeakAreas);
        Assert.Contains("Performance", snapshot.WeakAreas);
        Assert.DoesNotContain("Readability", snapshot.WeakAreas);
        Assert.Contains("Readability", snapshot.StrongAreas);

        // Only Performance meets the recurring gate (sampleCount ≥ 5).
        Assert.Single(snapshot.RecurringWeaknesses);
        Assert.Contains("Performance", snapshot.RecurringWeaknesses);
    }

    // ────────────────────────────────────────────────────────────────────
    // (g) RAG chunks woven into progressNotes
    // ────────────────────────────────────────────────────────────────────
    [Fact]
    public async Task BuildAsync_WhenRetrieverReturnsChunks_ProgressNotesIncludesThem()
    {
        using var db = NewDb();
        var userId = Guid.NewGuid();
        await SeedCompletedSubmissionAsync(db, userId, Guid.NewGuid(), 70,
            new[] { "any" }, DateTime.UtcNow.AddDays(-1), "Prior Task");

        var retriever = new FixedRetriever
        {
            Chunks = new[]
            {
                new PriorFeedbackChunk(
                    SourceSubmissionId: Guid.NewGuid(),
                    TaskName: "Prior Task",
                    ChunkText: "Race condition in the checkout flow at line 42",
                    Kind: "weakness",
                    SimilarityScore: 0.87,
                    SourceDate: DateTime.UtcNow.AddDays(-1)),
            },
        };
        var svc = NewService(db, retriever);

        var snapshot = await svc.BuildAsync(userId, Guid.NewGuid(), Guid.NewGuid(), "anchor findings");

        Assert.Single(snapshot.RagChunks);
        Assert.Equal(1, retriever.CallCount);
        Assert.Contains("Race condition in the checkout flow", snapshot.ProgressNotes);
        Assert.Contains("Relevant prior feedback excerpts", snapshot.ProgressNotes);
    }

    // ────────────────────────────────────────────────────────────────────
    // (h) RAG fallback annotation when retriever returns Unavailable
    //     (graceful Qdrant-down per ADR-043)
    // ────────────────────────────────────────────────────────────────────
    [Fact]
    public async Task BuildAsync_WhenRetrieverReturnsUnavailable_AnnotatesAdR043Fallback()
    {
        using var db = NewDb();
        var userId = Guid.NewGuid();
        await SeedCompletedSubmissionAsync(db, userId, Guid.NewGuid(), 70,
            new[] { "any" }, DateTime.UtcNow.AddDays(-1));

        // EmptyRetriever defaults to Unavailable — simulates Qdrant/AI down.
        var retriever = new EmptyRetriever
        {
            Status = FeedbackHistoryRetrievalStatus.Unavailable,
        };
        var svc = NewService(db, retriever);

        var snapshot = await svc.BuildAsync(userId, Guid.NewGuid(), Guid.NewGuid(), "anchor findings");

        Assert.Empty(snapshot.RagChunks);
        Assert.False(snapshot.IsFirstReview);
        Assert.Contains("detailed prior-feedback retrieval temporarily unavailable",
            snapshot.ProgressNotes);
        Assert.Contains("Do not fabricate", snapshot.ProgressNotes);
    }

    // ────────────────────────────────────────────────────────────────────
    // (h2) Post-S12 polish: RetrievalCompleted with 0 chunks — healthy
    //      service, just no embeddings indexed yet for this learner.
    //      Different (more accurate) narrative than the Unavailable case.
    // ────────────────────────────────────────────────────────────────────
    [Fact]
    public async Task BuildAsync_WhenRetrieverReturnsCompletedButEmpty_AnnotatesIndexWarmup()
    {
        using var db = NewDb();
        var userId = Guid.NewGuid();
        await SeedCompletedSubmissionAsync(db, userId, Guid.NewGuid(), 70,
            new[] { "any" }, DateTime.UtcNow.AddDays(-1));

        var retriever = new EmptyRetriever
        {
            Status = FeedbackHistoryRetrievalStatus.RetrievalCompleted,
        };
        var svc = NewService(db, retriever);

        var snapshot = await svc.BuildAsync(userId, Guid.NewGuid(), Guid.NewGuid(), "anchor findings");

        Assert.Empty(snapshot.RagChunks);
        Assert.False(snapshot.IsFirstReview);
        // Should NOT say "temporarily unavailable" — service was healthy.
        Assert.DoesNotContain("temporarily unavailable", snapshot.ProgressNotes);
        // Should say something about the index populating incrementally.
        Assert.Contains("no relevant prior-feedback excerpts are indexed yet",
            snapshot.ProgressNotes);
        Assert.Contains("Do not fabricate", snapshot.ProgressNotes);
    }

    // ────────────────────────────────────────────────────────────────────
    // (i) Cold-start short-circuits the retriever — no Qdrant call wasted
    // ────────────────────────────────────────────────────────────────────
    [Fact]
    public async Task BuildAsync_ColdStart_DoesNotCallRetriever()
    {
        using var db = NewDb();
        var retriever = new FixedRetriever
        {
            Chunks = new[]
            {
                new PriorFeedbackChunk(Guid.NewGuid(), "x", "chunk", "weakness", 0.9, DateTime.UtcNow),
            },
        };
        var svc = NewService(db, retriever);

        var snapshot = await svc.BuildAsync(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), "anchor");

        Assert.True(snapshot.IsFirstReview);
        Assert.Equal(0, retriever.CallCount);
        Assert.Empty(snapshot.RagChunks);
    }

    // ────────────────────────────────────────────────────────────────────
    // (j) Attempts-on-current-task counts every submission, completed or not
    // ────────────────────────────────────────────────────────────────────
    [Fact]
    public async Task BuildAsync_AttemptsOnCurrentTask_CountsAllStatuses()
    {
        using var db = NewDb();
        var svc = NewService(db);
        var userId = Guid.NewGuid();
        var taskId = Guid.NewGuid();

        // 3 prior attempts (2 completed, 1 failed) plus the current Pending submission.
        await SeedCompletedSubmissionAsync(db, userId, taskId, 60, new[] { "x" }, DateTime.UtcNow.AddDays(-3));
        await SeedCompletedSubmissionAsync(db, userId, taskId, 70, new[] { "x" }, DateTime.UtcNow.AddDays(-2));
        db.Submissions.Add(new Submission
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            TaskId = taskId,
            Status = SubmissionStatus.Failed,
            SubmissionType = SubmissionType.Upload,
            BlobPath = "x/y.zip",
            ErrorMessage = "boom",
            CreatedAt = DateTime.UtcNow.AddDays(-1),
        });
        var currentSubId = Guid.NewGuid();
        db.Submissions.Add(new Submission
        {
            Id = currentSubId,
            UserId = userId,
            TaskId = taskId,
            Status = SubmissionStatus.Pending,
            SubmissionType = SubmissionType.Upload,
            BlobPath = "x/y.zip",
            CreatedAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync();

        var snapshot = await svc.BuildAsync(userId, currentSubId, taskId, "anchor");

        // 2 completed + 1 failed + 1 pending = 4 attempts on this task.
        Assert.Equal(4, snapshot.AttemptsOnCurrentTask);
        Assert.Contains("attempt #4", snapshot.ProgressNotes);
    }
}

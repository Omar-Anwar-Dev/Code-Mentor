using System.Text.Json;
using CodeMentor.Application.CodeReview;
using CodeMentor.Domain.Assessments;
using CodeMentor.Domain.Notifications;
using CodeMentor.Domain.Submissions;
using CodeMentor.Domain.Tasks;
using CodeMentor.Infrastructure.CodeReview;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace CodeMentor.Application.Tests.Submissions;

/// <summary>
/// S6-T5 acceptance:
///   The unified payload has overall 0–100, 5 PRD category scores,
///   strengths / weaknesses, inline annotations, 3–5 recommendations,
///   3–5 resources, and the FeedbackAggregator writes Recommendation,
///   Resource, and Notification rows. Tested with two distinct sample
///   submissions: a Python web app with security flaws and a clean JS
///   utility module — both must produce a complete unified payload.
/// </summary>
public class FeedbackAggregatorTests
{
    private static ApplicationDbContext NewDb() => new(
        new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase($"feedback_agg_{Guid.NewGuid():N}")
            .Options);

    private static FeedbackAggregator NewAggregator(ApplicationDbContext db)
        => new(db, NullLogger<FeedbackAggregator>.Instance);

    [Fact]
    public async Task AggregateAsync_PythonWithIssues_PersistsAllSideEffects_AndUnifiedPayload()
    {
        using var db = NewDb();
        var (sub, aiRow) = await SeedSubmissionWithAiRow(db, overallScore: 62);

        // Sample 1: Python web app, multiple weaknesses, 4 recommendations, 2 weaknesses each with 2 resources.
        var aiResponse = BuildSampleResponse(
            overallScore: 62,
            scores: new AiReviewScores(70, 65, 40, 70, 60),
            strengths: new[] { "Clean function naming", "Good module separation" },
            weaknesses: new[] { "SQL injection vulnerability", "Missing input validation", "No error handling" },
            recommendations: new[]
            {
                new AiRecommendation("high", "security", "Use parameterized SQL queries to prevent injection.", "cursor.execute('SELECT ... WHERE name = ?', (name,))"),
                new AiRecommendation("medium", "correctness", "Add input validation on all request bodies.", null),
                new AiRecommendation("medium", "design", "Extract DB access to a repository class.", null),
                new AiRecommendation("low", "readability", "Consider docstrings on public functions.", null),
            },
            detailedIssues: new[]
            {
                new AiDetailedIssue("app/users.py", 12, null, "execute(f\"SELECT ...\")", "security", "critical",
                    "SQL injection", "Direct string interpolation into SQL query.",
                    "An attacker controlling 'name' can drop tables or exfiltrate data.",
                    false, "Use parameterized queries.", "cursor.execute('SELECT ... WHERE name = ?', (name,))"),
                new AiDetailedIssue("app/users.py", 8, null, "def find_user(name):", "correctness", "medium",
                    "No input validation", "name parameter is unchecked.", "Empty / NULL / oversize input crashes.",
                    false, "Validate length + characters.", null),
            },
            learningResources: new[]
            {
                new AiWeaknessWithResources("SQL injection prevention", new[]
                {
                    new AiLearningResource("OWASP SQL Injection cheat sheet", "https://owasp.org/sqli", "documentation", "How to defend."),
                    new AiLearningResource("Real Python: parameterized queries", "https://realpython.com/sqlite", "tutorial", "Hands-on Python tutorial."),
                }),
                new AiWeaknessWithResources("Input validation", new[]
                {
                    new AiLearningResource("FastAPI request validation", "https://fastapi.tiangolo.com/tutorial/body/", "documentation", "Pydantic-driven validation."),
                }),
            });

        await NewAggregator(db).AggregateAsync(sub, aiResponse);

        // ── Side effects ──
        var recs = db.Recommendations.AsNoTracking().Where(r => r.SubmissionId == sub.Id).ToList();
        Assert.Equal(4, recs.Count);
        Assert.True(recs.All(r => r.Priority is >= 1 and <= 5));
        Assert.Contains(recs, r => r.Priority == 1);                 // high → 1
        Assert.Contains(recs, r => r.Priority == 5);                 // low  → 5
        Assert.Contains(recs, r => r.Reason.StartsWith("Use parameterized"));

        var resources = db.Resources.AsNoTracking().Where(r => r.SubmissionId == sub.Id).ToList();
        Assert.Equal(3, resources.Count);
        Assert.Contains(resources, r => r.Type == ResourceType.Documentation && r.Title.Contains("OWASP"));
        Assert.Contains(resources, r => r.Type == ResourceType.Tutorial);
        Assert.Contains(resources, r => r.Topic == "Input validation");

        var notifications = db.Notifications.AsNoTracking().Where(n => n.UserId == sub.UserId).ToList();
        var feedbackReady = Assert.Single(notifications, n => n.Type == NotificationType.FeedbackReady);
        Assert.False(feedbackReady.IsRead);
        Assert.Equal($"/submissions/{sub.Id}", feedbackReady.Link);
        Assert.Contains("62/100", feedbackReady.Message);

        // ── Unified payload ──
        var refreshedRow = await db.AIAnalysisResults.AsNoTracking().FirstAsync(r => r.SubmissionId == sub.Id);
        using var doc = JsonDocument.Parse(refreshedRow.FeedbackJson);
        var root = doc.RootElement;
        Assert.Equal(62, root.GetProperty("overallScore").GetInt32());
        Assert.Equal(40, root.GetProperty("scores").GetProperty("security").GetInt32());
        var allScoreNames = root.GetProperty("scores").EnumerateObject().Select(p => p.Name).ToHashSet();
        Assert.Equal(new HashSet<string> { "correctness", "readability", "security", "performance", "design" }, allScoreNames);
        Assert.Equal(2, root.GetProperty("inlineAnnotations").GetArrayLength());
        // Severities normalized for the frontend (critical → error).
        Assert.Equal("error", root.GetProperty("inlineAnnotations")[0].GetProperty("severity").GetString());
        Assert.Equal("security", root.GetProperty("inlineAnnotations")[0].GetProperty("category").GetString());
        Assert.Equal(4, root.GetProperty("recommendations").GetArrayLength());
        Assert.Equal(3, root.GetProperty("resources").GetArrayLength());
        Assert.Equal("v1.0.0", root.GetProperty("metadata").GetProperty("promptVersion").GetString());
    }

    [Fact]
    public async Task AggregateAsync_CleanCodeMinimalIssues_StillProducesUnifiedPayload()
    {
        using var db = NewDb();
        var (sub, aiRow) = await SeedSubmissionWithAiRow(db, overallScore: 92);

        // Sample 2: clean code — 3 strengths, no weaknesses, 0-1 recs, 0 resources.
        var aiResponse = BuildSampleResponse(
            overallScore: 92,
            scores: new AiReviewScores(95, 90, 95, 90, 90),
            strengths: new[] { "Excellent naming", "Comprehensive type hints", "Pure functional style" },
            weaknesses: Array.Empty<string>(),
            recommendations: new[]
            {
                new AiRecommendation("low", "design", "Consider extracting magic numbers to constants.", null),
            },
            detailedIssues: Array.Empty<AiDetailedIssue>(),
            learningResources: Array.Empty<AiWeaknessWithResources>());

        await NewAggregator(db).AggregateAsync(sub, aiResponse);

        Assert.Single(db.Recommendations.AsNoTracking().Where(r => r.SubmissionId == sub.Id).ToList());
        Assert.Empty(db.Resources.AsNoTracking().Where(r => r.SubmissionId == sub.Id).ToList());
        Assert.Single(db.Notifications.AsNoTracking().Where(n => n.UserId == sub.UserId).ToList());

        var refreshedRow = await db.AIAnalysisResults.AsNoTracking().FirstAsync(r => r.SubmissionId == sub.Id);
        using var doc = JsonDocument.Parse(refreshedRow.FeedbackJson);
        var root = doc.RootElement;
        Assert.Equal(92, root.GetProperty("overallScore").GetInt32());
        Assert.Equal(0, root.GetProperty("inlineAnnotations").GetArrayLength());
        Assert.Equal(0, root.GetProperty("resources").GetArrayLength());
        Assert.Equal(3, root.GetProperty("strengths").GetArrayLength());
    }

    [Fact]
    public async Task AggregateAsync_ReRun_ReplacesPriorRecommendations_AndResources()
    {
        using var db = NewDb();
        var (sub, _) = await SeedSubmissionWithAiRow(db, overallScore: 60);
        var aggregator = NewAggregator(db);

        // First run: 2 recs, 1 resource.
        await aggregator.AggregateAsync(sub, BuildSampleResponse(
            overallScore: 60,
            scores: new AiReviewScores(60, 60, 60, 60, 60),
            strengths: Array.Empty<string>(),
            weaknesses: Array.Empty<string>(),
            recommendations: new[]
            {
                new AiRecommendation("high", "security", "Old rec 1", null),
                new AiRecommendation("medium", "design", "Old rec 2", null),
            },
            detailedIssues: Array.Empty<AiDetailedIssue>(),
            learningResources: new[]
            {
                new AiWeaknessWithResources("X", new[]
                {
                    new AiLearningResource("Old resource", "https://old.x", "article", "old"),
                }),
            }));

        Assert.Equal(2, db.Recommendations.Count(r => r.SubmissionId == sub.Id));
        Assert.Single(db.Resources.AsNoTracking().Where(r => r.SubmissionId == sub.Id).ToList());

        // Re-run with completely different content (simulating a manual retry).
        await aggregator.AggregateAsync(sub, BuildSampleResponse(
            overallScore: 80,
            scores: new AiReviewScores(80, 80, 80, 80, 80),
            strengths: Array.Empty<string>(),
            weaknesses: Array.Empty<string>(),
            recommendations: new[]
            {
                new AiRecommendation("low", "readability", "New rec", null),
            },
            detailedIssues: Array.Empty<AiDetailedIssue>(),
            learningResources: Array.Empty<AiWeaknessWithResources>()));

        var rec = Assert.Single(db.Recommendations.AsNoTracking().Where(r => r.SubmissionId == sub.Id).ToList());
        Assert.Equal("New rec", rec.Reason);
        Assert.Empty(db.Resources.AsNoTracking().Where(r => r.SubmissionId == sub.Id).ToList());

        // 2 notifications now (one per run) — the bell shows them in order.
        Assert.Equal(2, db.Notifications.AsNoTracking().Count(n => n.UserId == sub.UserId));
    }

    [Fact]
    public async Task AggregateAsync_AiUnavailable_DoesNothing()
    {
        using var db = NewDb();
        var (sub, _) = await SeedSubmissionWithAiRow(db, overallScore: 0);

        var aiResponse = new AiCombinedResponse(
            SubmissionId: "s",
            AnalysisType: "static",
            OverallScore: 0,
            StaticAnalysis: new AiStaticAnalysis(0, Array.Empty<AiIssue>(), new AiAnalysisSummary(0, 0, 0, 0),
                Array.Empty<string>(), Array.Empty<AiPerToolResult>()),
            AiReview: new AiReviewResponse(0, new AiReviewScores(0, 0, 0, 0, 0), Array.Empty<string>(),
                Array.Empty<string>(), Array.Empty<AiRecommendation>(), "", "", 0, "", false, "down"),
            Metadata: new AiAnalysisMetadata("t", Array.Empty<string>(), 0, 0, true, false));

        await NewAggregator(db).AggregateAsync(sub, aiResponse);

        Assert.Empty(db.Recommendations.AsNoTracking().Where(r => r.SubmissionId == sub.Id).ToList());
        Assert.Empty(db.Resources.AsNoTracking().Where(r => r.SubmissionId == sub.Id).ToList());
        Assert.Empty(db.Notifications.AsNoTracking().Where(n => n.UserId == sub.UserId).ToList());
    }

    [Fact]
    public async Task AggregateAsync_CapsRecommendationsAt5_AndResourcesAt5()
    {
        using var db = NewDb();
        var (sub, _) = await SeedSubmissionWithAiRow(db, overallScore: 70);

        // 8 recs and 8 resources — both should be capped at 5.
        var manyRecs = Enumerable.Range(1, 8)
            .Select(i => new AiRecommendation("medium", "design", $"Rec #{i}", null))
            .ToArray();
        var manyResources = Enumerable.Range(1, 8)
            .Select(i => new AiWeaknessWithResources($"Topic {i}", new[]
            {
                new AiLearningResource($"Title {i}", $"https://x.com/{i}", "article", "desc"),
            }))
            .ToArray();

        var aiResponse = BuildSampleResponse(
            overallScore: 70,
            scores: new AiReviewScores(70, 70, 70, 70, 70),
            strengths: Array.Empty<string>(),
            weaknesses: Array.Empty<string>(),
            recommendations: manyRecs,
            detailedIssues: Array.Empty<AiDetailedIssue>(),
            learningResources: manyResources);

        await NewAggregator(db).AggregateAsync(sub, aiResponse);

        Assert.Equal(FeedbackAggregator.MaxRecommendations, db.Recommendations.Count(r => r.SubmissionId == sub.Id));
        Assert.Equal(FeedbackAggregator.MaxResources, db.Resources.Count(r => r.SubmissionId == sub.Id));
    }

    [Fact]
    public async Task AggregateAsync_RecommendationMatchingSeededTaskTitle_GetsTaskIdLinked()
    {
        using var db = NewDb();
        var task = new TaskItem
        {
            Title = "Build a REST API with authentication",
            Description = "x",
            Track = Track.Backend,
            Difficulty = 3,
            Category = SkillCategory.Security,
            ExpectedLanguage = ProgrammingLanguage.Python,
            EstimatedHours = 6,
            IsActive = true,
        };
        db.Tasks.Add(task);
        await db.SaveChangesAsync();

        var (sub, _) = await SeedSubmissionWithAiRow(db, overallScore: 70);

        var aiResponse = BuildSampleResponse(
            overallScore: 70,
            scores: new AiReviewScores(70, 70, 70, 70, 70),
            strengths: Array.Empty<string>(),
            weaknesses: Array.Empty<string>(),
            recommendations: new[]
            {
                new AiRecommendation("medium", "security",
                    "Practice on a build a REST API with authentication exercise to deepen your auth skills.",
                    null),
            },
            detailedIssues: Array.Empty<AiDetailedIssue>(),
            learningResources: Array.Empty<AiWeaknessWithResources>());

        await NewAggregator(db).AggregateAsync(sub, aiResponse);

        var rec = Assert.Single(db.Recommendations.AsNoTracking().Where(r => r.SubmissionId == sub.Id).ToList());
        Assert.Equal(task.Id, rec.TaskId);
    }

    // ----- helpers --------------------------------------------------------

    private static async Task<(Submission, AIAnalysisResult)> SeedSubmissionWithAiRow(
        ApplicationDbContext db, int overallScore)
    {
        var sub = new Submission
        {
            UserId = Guid.NewGuid(),
            TaskId = Guid.NewGuid(),
            SubmissionType = SubmissionType.Upload,
            BlobPath = "u/p.zip",
            Status = SubmissionStatus.Completed,
            AiAnalysisStatus = AiAnalysisStatus.Available,
            CompletedAt = DateTime.UtcNow,
        };
        db.Submissions.Add(sub);

        var ai = new AIAnalysisResult
        {
            SubmissionId = sub.Id,
            OverallScore = overallScore,
            FeedbackJson = "{}",
            StrengthsJson = "[]",
            WeaknessesJson = "[]",
            ModelUsed = "gpt-5.1-codex-mini",
            TokensUsed = 1500,
            PromptVersion = "v1.0.0",
        };
        db.AIAnalysisResults.Add(ai);
        await db.SaveChangesAsync();
        return (sub, ai);
    }

    private static AiCombinedResponse BuildSampleResponse(
        int overallScore,
        AiReviewScores scores,
        string[] strengths,
        string[] weaknesses,
        AiRecommendation[] recommendations,
        AiDetailedIssue[] detailedIssues,
        AiWeaknessWithResources[] learningResources)
    {
        var aiReview = new AiReviewResponse(
            OverallScore: overallScore,
            Scores: scores,
            Strengths: strengths,
            Weaknesses: weaknesses,
            Recommendations: recommendations,
            Summary: "auto-generated test summary",
            ModelUsed: "gpt-5.1-codex-mini",
            TokensUsed: 2200,
            PromptVersion: "v1.0.0",
            Available: true,
            Error: null,
            DetailedIssues: detailedIssues,
            LearningResources: learningResources);

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
            Metadata: new AiAnalysisMetadata("test", new[] { "python" }, 1, 100, true, true));
    }
}

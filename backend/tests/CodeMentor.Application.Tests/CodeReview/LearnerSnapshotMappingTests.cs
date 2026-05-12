using System.Text.Json;
using CodeMentor.Application.CodeReview;

namespace CodeMentor.Application.Tests.CodeReview;

/// <summary>
/// S12-T2 / F14 (ADR-040): unit tests guarding the wire-shape contract between
/// the backend's <see cref="LearnerSnapshot"/> and the AI service's
/// <c>LearnerProfile</c> + <c>LearnerHistory</c> Pydantic schemas. Field
/// names + JSON shape MUST match exactly — these tests fail loudly if they
/// drift. See <c>ai-service/app/domain/schemas/requests.py</c> for the
/// authoritative AI-side schema definitions.
/// </summary>
public class LearnerSnapshotMappingTests
{
    private static LearnerSnapshot BuildSampleSnapshot() => new()
    {
        UserId = Guid.Parse("11111111-1111-1111-1111-111111111111"),
        SkillLevel = "Intermediate",
        CompletedSubmissionsCount = 7,
        AverageOverallScore = 68.5,
        CodeQualityAverages = new Dictionary<string, double>
        {
            ["Correctness"] = 72.3,
            ["Readability"] = 58.1,
            ["Security"] = 45.2,
            ["Performance"] = 81.0,
            ["Design"] = 64.5,
        },
        CodeQualitySampleCounts = new Dictionary<string, int>
        {
            ["Correctness"] = 6,
            ["Readability"] = 6,
            ["Security"] = 6,
            ["Performance"] = 6,
            ["Design"] = 6,
        },
        WeakAreas = new[] { "Security", "Readability" },
        StrongAreas = new[] { "Performance" },
        ImprovementTrend = "improving",
        RecentSubmissions = new[]
        {
            new RecentSubmissionSummary(
                SubmissionId: Guid.Parse("22222222-2222-2222-2222-222222222222"),
                TaskName: "REST API Auth",
                Score: 65,
                Date: new DateTime(2026, 4, 15, 12, 0, 0, DateTimeKind.Utc),
                MainIssues: new[] { "input validation missing", "no CSRF token" }),
            new RecentSubmissionSummary(
                SubmissionId: Guid.Parse("33333333-3333-3333-3333-333333333333"),
                TaskName: "User Dashboard",
                Score: 71,
                Date: new DateTime(2026, 4, 22, 12, 0, 0, DateTimeKind.Utc),
                MainIssues: new[] { "magic numbers without named constants" }),
        },
        CommonMistakes = new[]
        {
            "input validation missing",
            "magic numbers without named constants",
            "no error handling around async ops",
        },
        RecurringWeaknesses = new[] { "Security" },
        RagChunks = new[]
        {
            new PriorFeedbackChunk(
                SourceSubmissionId: Guid.Parse("22222222-2222-2222-2222-222222222222"),
                TaskName: "REST API Auth",
                ChunkText: "Race condition in the checkout flow",
                Kind: "weakness",
                SimilarityScore: 0.87,
                SourceDate: new DateTime(2026, 4, 15, 12, 0, 0, DateTimeKind.Utc)),
        },
        AttemptsOnCurrentTask = 2,
        IsFirstReview = false,
        ProgressNotes =
            "Recurring pattern: Security category averaging 45/100 across 6 samples. " +
            "Improvement trend over last 3 vs prior 3 submissions: +6 points. " +
            "Relevant prior feedback excerpts attached for AI grounding.",
    };

    [Fact]
    public void ToAiProfilePayload_Maps_AllFields_Verbatim()
    {
        var snapshot = BuildSampleSnapshot();
        var payload = snapshot.ToAiProfilePayload();

        Assert.Equal("Intermediate", payload.SkillLevel);
        Assert.Equal(7, payload.PreviousSubmissions);
        Assert.Equal(68.5, payload.AverageScore);
        Assert.Equal(new[] { "Security", "Readability" }, payload.WeakAreas);
        Assert.Equal(new[] { "Performance" }, payload.StrongAreas);
        Assert.Equal("improving", payload.ImprovementTrend);
    }

    [Fact]
    public void ToAiHistoryPayload_Maps_RecentSubmissions_ToWireDateFormat()
    {
        var snapshot = BuildSampleSnapshot();
        var payload = snapshot.ToAiHistoryPayload();

        Assert.Equal(2, payload.RecentSubmissions.Count);

        var first = payload.RecentSubmissions[0];
        Assert.Equal("REST API Auth", first.TaskName);
        Assert.Equal(65, first.Score);
        // ISO-8601 ("O") format — the AI service's `format_recent_submissions`
        // takes the string verbatim, so any format change here ripples to the
        // prompt rendering. Lock it down.
        Assert.Equal("2026-04-15T12:00:00.0000000Z", first.Date);
        Assert.Equal(new[] { "input validation missing", "no CSRF token" }, first.MainIssues);
    }

    [Fact]
    public void ToAiHistoryPayload_Forwards_CommonMistakes_And_RecurringWeaknesses()
    {
        var snapshot = BuildSampleSnapshot();
        var payload = snapshot.ToAiHistoryPayload();

        Assert.Equal(3, payload.CommonMistakes.Count);
        Assert.Equal("input validation missing", payload.CommonMistakes[0]);
        Assert.Contains("Security", payload.RecurringWeaknesses);
    }

    [Fact]
    public void ToAiHistoryPayload_Forwards_ProgressNotes_Verbatim()
    {
        var snapshot = BuildSampleSnapshot();
        var payload = snapshot.ToAiHistoryPayload();

        Assert.NotNull(payload.ProgressNotes);
        Assert.Contains("Recurring pattern", payload.ProgressNotes!);
        Assert.Contains("Improvement trend", payload.ProgressNotes);
    }

    [Fact]
    public void ToAiProfilePayload_Handles_ColdStart_Snapshot_WithNullsAndEmpties()
    {
        // Cold-start path per ADR-042: no prior submissions, no AI samples,
        // average score null, weakAreas may come from assessment alone.
        var snapshot = new LearnerSnapshot
        {
            UserId = Guid.NewGuid(),
            SkillLevel = "Beginner",
            CompletedSubmissionsCount = 0,
            AverageOverallScore = null,
            CodeQualityAverages = new Dictionary<string, double>(),
            CodeQualitySampleCounts = new Dictionary<string, int>(),
            WeakAreas = new[] { "Security" },                  // from SkillScores
            StrongAreas = Array.Empty<string>(),
            ImprovementTrend = null,
            RecentSubmissions = Array.Empty<RecentSubmissionSummary>(),
            CommonMistakes = Array.Empty<string>(),
            RecurringWeaknesses = Array.Empty<string>(),
            RagChunks = Array.Empty<PriorFeedbackChunk>(),
            AttemptsOnCurrentTask = 1,
            IsFirstReview = true,
            ProgressNotes = "This is the learner's first code submission.",
        };

        var profile = snapshot.ToAiProfilePayload();
        Assert.Equal(0, profile.PreviousSubmissions);
        Assert.Null(profile.AverageScore);
        Assert.Null(profile.ImprovementTrend);
        Assert.Single(profile.WeakAreas);
        Assert.Empty(profile.StrongAreas);

        var history = snapshot.ToAiHistoryPayload();
        Assert.Empty(history.RecentSubmissions);
        Assert.Empty(history.CommonMistakes);
        Assert.Empty(history.RecurringWeaknesses);
        Assert.Contains("first code submission", history.ProgressNotes!);
    }

    [Fact]
    public void ToAiProfilePayload_RoundTrips_To_ExpectedJsonShape()
    {
        // The AI service's Pydantic schema expects camelCase JSON keys
        // (skillLevel, previousSubmissions, averageScore, weakAreas,
        // strongAreas, improvementTrend). The `AiReviewClient`'s serializer
        // will apply camelCase naming; this test verifies the record's
        // field set + serialized shape so a drift between the C# record
        // and the Pydantic schema fails the unit test, not at runtime.
        var snapshot = BuildSampleSnapshot();
        var payload = snapshot.ToAiProfilePayload();

        var json = JsonSerializer.Serialize(payload, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        });

        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        Assert.True(root.TryGetProperty("skillLevel", out _));
        Assert.True(root.TryGetProperty("previousSubmissions", out _));
        Assert.True(root.TryGetProperty("averageScore", out _));
        Assert.True(root.TryGetProperty("weakAreas", out _));
        Assert.True(root.TryGetProperty("strongAreas", out _));
        Assert.True(root.TryGetProperty("improvementTrend", out _));

        // PascalCase keys MUST NOT leak — the AI service's Pydantic parser
        // would silently ignore them and leave the field defaults active.
        Assert.False(root.TryGetProperty("SkillLevel", out _));
        Assert.False(root.TryGetProperty("PreviousSubmissions", out _));
    }

    [Fact]
    public void ToAiHistoryPayload_RoundTrips_To_ExpectedJsonShape()
    {
        var snapshot = BuildSampleSnapshot();
        var payload = snapshot.ToAiHistoryPayload();

        var json = JsonSerializer.Serialize(payload, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        });

        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        Assert.True(root.TryGetProperty("recentSubmissions", out var recentSubs));
        Assert.True(recentSubs.GetArrayLength() == 2);

        var firstSub = recentSubs[0];
        Assert.True(firstSub.TryGetProperty("taskName", out _));
        Assert.True(firstSub.TryGetProperty("score", out _));
        Assert.True(firstSub.TryGetProperty("date", out _));
        Assert.True(firstSub.TryGetProperty("mainIssues", out _));

        Assert.True(root.TryGetProperty("commonMistakes", out _));
        Assert.True(root.TryGetProperty("recurringWeaknesses", out _));
        Assert.True(root.TryGetProperty("progressNotes", out _));
    }
}

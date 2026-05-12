using System.Text.Json;
using CodeMentor.Application.CodeReview;
using CodeMentor.Infrastructure.CodeReview;
using Microsoft.Extensions.Logging.Abstractions;
using Refit;

namespace CodeMentor.Application.Tests.CodeReview;

/// <summary>
/// S12-T6 / F14 (ADR-040): tests guarding the contract that
/// <see cref="AiReviewClient"/> forwards the <c>LearnerSnapshot</c> through
/// to the three new multipart form parts on the AI service's
/// <c>/api/analyze-zip</c> + <c>/api/analyze-zip-multi</c> endpoints, AND
/// that pre-F14 callers (snapshot=null) still produce the identical
/// wire-shape they did before.
/// </summary>
public class AiReviewClientSnapshotForwardingTests
{
    /// <summary>
    /// Captures the multipart parameter values Refit was asked to send.
    /// We do NOT need to assert on the HTTP framing — Refit does that.
    /// We only need to assert what the client passed *to* Refit.
    /// </summary>
    private sealed class CapturingRefit : IAiServiceRefit
    {
        public string? LastLearnerProfileJson { get; private set; }
        public string? LastLearnerHistoryJson { get; private set; }
        public string? LastProjectContextJson { get; private set; }
        public string? LastEndpoint { get; private set; }

        public Task<AiCombinedResponse> AnalyzeZipAsync(
            StreamPart file, string correlationId, CancellationToken ct,
            string? learnerProfileJson = null, string? learnerHistoryJson = null, string? projectContextJson = null)
        {
            LastEndpoint = "single";
            LastLearnerProfileJson = learnerProfileJson;
            LastLearnerHistoryJson = learnerHistoryJson;
            LastProjectContextJson = projectContextJson;
            return Task.FromResult(StubResponse());
        }

        public Task<AiCombinedResponse> AnalyzeZipMultiAsync(
            StreamPart file, string correlationId, CancellationToken ct,
            string? learnerProfileJson = null, string? learnerHistoryJson = null, string? projectContextJson = null)
        {
            LastEndpoint = "multi";
            LastLearnerProfileJson = learnerProfileJson;
            LastLearnerHistoryJson = learnerHistoryJson;
            LastProjectContextJson = projectContextJson;
            return Task.FromResult(StubResponse());
        }

        public Task<HttpResponseMessage> HealthAsync(CancellationToken ct) =>
            Task.FromResult(new HttpResponseMessage(System.Net.HttpStatusCode.OK));

        private static AiCombinedResponse StubResponse() => new(
            SubmissionId: "stub",
            AnalysisType: "combined",
            OverallScore: 50,
            StaticAnalysis: new AiStaticAnalysis(
                Score: 50,
                Issues: Array.Empty<AiIssue>(),
                Summary: new AiAnalysisSummary(0, 0, 0, 0),
                ToolsUsed: Array.Empty<string>(),
                PerTool: Array.Empty<AiPerToolResult>()),
            AiReview: null,
            Metadata: new AiAnalysisMetadata("test", Array.Empty<string>(), 0, 0, true, false));
    }

    [Fact]
    public async Task AnalyzeZipAsync_NullSnapshot_PreservesPreF14WireShape()
    {
        var refit = new CapturingRefit();
        var client = new AiReviewClient(refit, NullLogger<AiReviewClient>.Instance);
        using var zip = new MemoryStream(new byte[] { 0x50, 0x4B, 0x03, 0x04 });

        await client.AnalyzeZipAsync(zip, "submission.zip", "corr-1", snapshot: null);

        // All three F14 form parts are null → Refit emits the multipart payload
        // without those parts, identical to the Sprint 5 baseline.
        Assert.Equal("single", refit.LastEndpoint);
        Assert.Null(refit.LastLearnerProfileJson);
        Assert.Null(refit.LastLearnerHistoryJson);
        Assert.Null(refit.LastProjectContextJson);
    }

    [Fact]
    public async Task AnalyzeZipMultiAsync_NullSnapshot_PreservesPreF14WireShape()
    {
        var refit = new CapturingRefit();
        var client = new AiReviewClient(refit, NullLogger<AiReviewClient>.Instance);
        using var zip = new MemoryStream(new byte[] { 0x50, 0x4B, 0x03, 0x04 });

        await client.AnalyzeZipMultiAsync(zip, "submission.zip", "corr-2", snapshot: null);

        Assert.Equal("multi", refit.LastEndpoint);
        Assert.Null(refit.LastLearnerProfileJson);
        Assert.Null(refit.LastLearnerHistoryJson);
        Assert.Null(refit.LastProjectContextJson);
    }

    [Fact]
    public async Task AnalyzeZipAsync_PopulatedSnapshot_ForwardsBothProfileAndHistoryJson()
    {
        var refit = new CapturingRefit();
        var client = new AiReviewClient(refit, NullLogger<AiReviewClient>.Instance);
        using var zip = new MemoryStream(new byte[] { 0x50, 0x4B, 0x03, 0x04 });

        var snapshot = BuildPopulatedSnapshot();
        await client.AnalyzeZipAsync(zip, "submission.zip", "corr-3", snapshot: snapshot);

        Assert.Equal("single", refit.LastEndpoint);
        Assert.NotNull(refit.LastLearnerProfileJson);
        Assert.NotNull(refit.LastLearnerHistoryJson);

        // Validate the wire JSON has the exact camelCase keys the AI service's
        // Pydantic schemas expect — same drift-detection as the mapping tests.
        using var profileDoc = JsonDocument.Parse(refit.LastLearnerProfileJson!);
        var profileRoot = profileDoc.RootElement;
        Assert.True(profileRoot.TryGetProperty("skillLevel", out _));
        Assert.True(profileRoot.TryGetProperty("previousSubmissions", out _));
        Assert.True(profileRoot.TryGetProperty("averageScore", out _));
        Assert.True(profileRoot.TryGetProperty("weakAreas", out _));
        Assert.True(profileRoot.TryGetProperty("strongAreas", out _));
        Assert.True(profileRoot.TryGetProperty("improvementTrend", out _));

        using var historyDoc = JsonDocument.Parse(refit.LastLearnerHistoryJson!);
        var historyRoot = historyDoc.RootElement;
        Assert.True(historyRoot.TryGetProperty("recentSubmissions", out _));
        Assert.True(historyRoot.TryGetProperty("commonMistakes", out _));
        Assert.True(historyRoot.TryGetProperty("recurringWeaknesses", out _));
        Assert.True(historyRoot.TryGetProperty("progressNotes", out _));
    }

    [Fact]
    public async Task AnalyzeZipMultiAsync_PopulatedSnapshot_ForwardsBothProfileAndHistoryJson()
    {
        var refit = new CapturingRefit();
        var client = new AiReviewClient(refit, NullLogger<AiReviewClient>.Instance);
        using var zip = new MemoryStream(new byte[] { 0x50, 0x4B, 0x03, 0x04 });

        var snapshot = BuildPopulatedSnapshot();
        await client.AnalyzeZipMultiAsync(zip, "submission.zip", "corr-4", snapshot: snapshot);

        Assert.Equal("multi", refit.LastEndpoint);
        Assert.NotNull(refit.LastLearnerProfileJson);
        Assert.NotNull(refit.LastLearnerHistoryJson);
    }

    [Fact]
    public void SerializeSnapshot_NullSnapshot_ReturnsAllNullStrings()
    {
        var (profile, history, project) = AiReviewClient.SerializeSnapshot(null);

        Assert.Null(profile);
        Assert.Null(history);
        Assert.Null(project);
    }

    [Fact]
    public void SerializeSnapshot_PopulatedSnapshot_SerializesProfileAndHistoryToCamelCase()
    {
        var snapshot = BuildPopulatedSnapshot();
        var (profile, history, project) = AiReviewClient.SerializeSnapshot(snapshot);

        Assert.NotNull(profile);
        Assert.NotNull(history);
        Assert.Null(project); // project context is composed by SubmissionAnalysisJob, not the snapshot.

        // Profile JSON has the expected values; not just structure.
        using var profileDoc = JsonDocument.Parse(profile!);
        Assert.Equal("Intermediate", profileDoc.RootElement.GetProperty("skillLevel").GetString());
        Assert.Equal(7, profileDoc.RootElement.GetProperty("previousSubmissions").GetInt32());
        Assert.Equal(68.5, profileDoc.RootElement.GetProperty("averageScore").GetDouble());
        Assert.Equal("improving", profileDoc.RootElement.GetProperty("improvementTrend").GetString());

        // History JSON carries recentSubmissions + commonMistakes + recurringWeaknesses + progressNotes.
        using var historyDoc = JsonDocument.Parse(history!);
        var recent = historyDoc.RootElement.GetProperty("recentSubmissions");
        Assert.Equal(1, recent.GetArrayLength());
        Assert.Equal("Past Task", recent[0].GetProperty("taskName").GetString());
        Assert.Equal(65, recent[0].GetProperty("score").GetInt32());

        var common = historyDoc.RootElement.GetProperty("commonMistakes");
        Assert.Equal(1, common.GetArrayLength());
        Assert.Equal("magic numbers without named constants", common[0].GetString());
    }

    private static LearnerSnapshot BuildPopulatedSnapshot() => new()
    {
        UserId = Guid.NewGuid(),
        SkillLevel = "Intermediate",
        CompletedSubmissionsCount = 7,
        AverageOverallScore = 68.5,
        CodeQualityAverages = new Dictionary<string, double> { ["Security"] = 45 },
        CodeQualitySampleCounts = new Dictionary<string, int> { ["Security"] = 5 },
        WeakAreas = new[] { "Security" },
        StrongAreas = new[] { "Performance" },
        ImprovementTrend = "improving",
        RecentSubmissions = new[]
        {
            new RecentSubmissionSummary(
                SubmissionId: Guid.NewGuid(),
                TaskName: "Past Task",
                Score: 65,
                Date: new DateTime(2026, 4, 15, 12, 0, 0, DateTimeKind.Utc),
                MainIssues: new[] { "input validation missing" }),
        },
        CommonMistakes = new[] { "magic numbers without named constants" },
        RecurringWeaknesses = new[] { "Security" },
        RagChunks = Array.Empty<PriorFeedbackChunk>(),
        AttemptsOnCurrentTask = 2,
        IsFirstReview = false,
        ProgressNotes = "Test progress notes.",
    };
}

using CodeMentor.Application.CodeReview;

namespace CodeMentor.Api.IntegrationTests.TestHost;

/// <summary>
/// Integration-test fake — returns an empty but well-formed combined response so
/// <see cref="CodeMentor.Infrastructure.Submissions.SubmissionAnalysisJob"/>
/// can reach the Completed state without a live AI service. Individual tests
/// that want richer payloads can set <see cref="Response"/> before invoking.
/// </summary>
public sealed class FakeAiReviewClient : IAiReviewClient
{
    public AiCombinedResponse Response { get; set; } = EmptyResponse();
    public AiCombinedResponse? MultiResponse { get; set; }
    public string? LastEndpoint { get; private set; }

    /// <summary>
    /// S12 / F14 (ADR-040): records the most recent snapshot the production
    /// caller forwarded — null when no snapshot was passed (back-compat
    /// path) or when the caller is a pre-F14 test. Lets F14 integration
    /// tests assert the snapshot reached the wire boundary.
    /// </summary>
    public LearnerSnapshot? LastSnapshot { get; private set; }

    /// <summary>
    /// SBF-1 / T5: records the task brief the production caller forwarded.
    /// Null when the caller is pre-SBF-1 or task lookup failed.
    /// </summary>
    public TaskBrief? LastTaskBrief { get; private set; }

    public Task<AiCombinedResponse> AnalyzeZipAsync(
        Stream zipStream, string zipFileName, string correlationId,
        LearnerSnapshot? snapshot = null, TaskBrief? taskBrief = null, CancellationToken ct = default)
    {
        LastEndpoint = "single";
        LastSnapshot = snapshot;
        LastTaskBrief = taskBrief;
        return Task.FromResult(Response);
    }

    public Task<AiCombinedResponse> AnalyzeZipMultiAsync(
        Stream zipStream, string zipFileName, string correlationId,
        LearnerSnapshot? snapshot = null, TaskBrief? taskBrief = null, CancellationToken ct = default)
    {
        LastEndpoint = "multi";
        LastSnapshot = snapshot;
        LastTaskBrief = taskBrief;
        return Task.FromResult(MultiResponse ?? Response);
    }

    public Task<bool> IsHealthyAsync(CancellationToken ct = default) => Task.FromResult(true);

    public static AiCombinedResponse EmptyResponse() => new(
        SubmissionId: "integration-test",
        AnalysisType: "combined",
        OverallScore: 100,
        StaticAnalysis: new AiStaticAnalysis(
            Score: 100,
            Issues: Array.Empty<AiIssue>(),
            Summary: new AiAnalysisSummary(0, 0, 0, 0),
            ToolsUsed: Array.Empty<string>(),
            PerTool: Array.Empty<AiPerToolResult>()),
        AiReview: null,
        Metadata: new AiAnalysisMetadata("test", Array.Empty<string>(), 0, 0, true, false));
}

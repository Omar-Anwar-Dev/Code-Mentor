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

    public Task<AiCombinedResponse> AnalyzeZipAsync(
        Stream zipStream, string zipFileName, string correlationId, CancellationToken ct = default)
    {
        LastEndpoint = "single";
        return Task.FromResult(Response);
    }

    public Task<AiCombinedResponse> AnalyzeZipMultiAsync(
        Stream zipStream, string zipFileName, string correlationId, CancellationToken ct = default)
    {
        LastEndpoint = "multi";
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

using CodeMentor.Application.CodeReview;

namespace CodeMentor.Api.IntegrationTests.TestHost;

/// <summary>
/// Integration-test fake for <see cref="IProjectAuditAiClient"/>. Returns a
/// well-formed combined response by default; individual tests can replace
/// <see cref="Response"/> with richer payloads or set <see cref="ThrowUnavailable"/>
/// to simulate the AI-down graceful-degradation path (S5-T5 carried into F11).
/// Mirrors <see cref="FakeAiReviewClient"/>.
/// </summary>
public sealed class FakeProjectAuditAiClient : IProjectAuditAiClient
{
    public AiAuditCombinedResponse Response { get; set; } = EmptyResponse();

    /// <summary>When true, AuditProjectAsync throws AiServiceUnavailableException.</summary>
    public bool ThrowUnavailable { get; set; }

    public Task<AiAuditCombinedResponse> AuditProjectAsync(
        Stream zipStream,
        string zipFileName,
        string projectDescriptionJson,
        string correlationId,
        CancellationToken ct = default)
    {
        if (ThrowUnavailable)
            throw new AiServiceUnavailableException("Simulated AI outage (test).");
        return Task.FromResult(Response);
    }

    public Task<bool> IsHealthyAsync(CancellationToken ct = default) => Task.FromResult(!ThrowUnavailable);

    public static AiAuditCombinedResponse EmptyResponse() => new(
        AuditId: "integration-test-audit",
        OverallScore: 75,
        Grade: "B",
        StaticAnalysis: new AiStaticAnalysis(
            Score: 80,
            Issues: Array.Empty<AiIssue>(),
            Summary: new AiAnalysisSummary(0, 0, 0, 0),
            ToolsUsed: Array.Empty<string>(),
            PerTool: Array.Empty<AiPerToolResult>()),
        AiAudit: new AiAuditResponse(
            OverallScore: 75,
            Grade: "B",
            Scores: new AiAuditScores(
                CodeQuality: 80, Security: 70, Performance: 75,
                ArchitectureDesign: 72, Maintainability: 78, Completeness: 80),
            Strengths: new[] { "Clean module boundaries" },
            CriticalIssues: Array.Empty<AiAuditIssue>(),
            Warnings: Array.Empty<AiAuditIssue>(),
            Suggestions: Array.Empty<AiAuditIssue>(),
            MissingFeatures: Array.Empty<string>(),
            RecommendedImprovements: new[] { new AiAuditRecommendation(1, "Add input validation", "Use a schema validation library at every endpoint.") },
            TechStackAssessment: "Tech stack appropriate for stated scale.",
            InlineAnnotations: null,
            ModelUsed: "gpt-5.1-codex-mini",
            TokensInput: 5400,
            TokensOutput: 1800,
            PromptVersion: "project_audit.v1",
            Available: true,
            Error: null),
        Metadata: new AiAnalysisMetadata("integration-test-project", Array.Empty<string>(), 0, 0, true, true));

    /// <summary>Static-only response (AiAudit=null) to test the partial-result graceful path.</summary>
    public static AiAuditCombinedResponse StaticOnlyResponse() => new(
        AuditId: "integration-test-audit",
        OverallScore: 70,
        Grade: "C",
        StaticAnalysis: new AiStaticAnalysis(
            Score: 70,
            Issues: Array.Empty<AiIssue>(),
            Summary: new AiAnalysisSummary(0, 0, 0, 0),
            ToolsUsed: new[] { "ESLint" },
            PerTool: new[] {
                new AiPerToolResult(
                    Tool: "ESLint",
                    Issues: Array.Empty<AiIssue>(),
                    Summary: new AiAnalysisSummary(0, 0, 0, 0),
                    ExecutionTimeMs: 120),
            }),
        AiAudit: null,
        Metadata: new AiAnalysisMetadata("integration-test-project", new[] { "JavaScript" }, 1, 120, true, false));
}

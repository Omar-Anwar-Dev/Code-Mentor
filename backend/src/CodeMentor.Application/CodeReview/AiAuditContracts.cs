namespace CodeMentor.Application.CodeReview;

/// <summary>
/// DTOs for the AI service's <c>POST /api/project-audit</c> contract (architecture §6.10
/// + ADR-034). Names mirror the JSON keys the Python service emits.
///
/// Response schema reflects the 8-section audit report (architecture §4.4 step 6):
///   1. Overall score + grade
///   2. 6-category breakdown (CodeQuality / Security / Performance / ArchitectureDesign / Maintainability / Completeness)
///   3. Strengths
///   4. Critical issues (must-fix)
///   5. Warnings (should-fix)
///   6. Suggestions (nice-to-have)
///   7. Missing / incomplete features
///   8. Top-5 recommended improvements with how-to + tech-stack assessment + inline annotations
/// </summary>
public sealed record AiAuditScores(
    int CodeQuality,
    int Security,
    int Performance,
    int ArchitectureDesign,
    int Maintainability,
    int Completeness);

public sealed record AiAuditIssue(
    string Title,
    string? File,
    int? Line,
    string Severity,           // critical | high | medium | low | info
    string Description,
    string? Fix);

public sealed record AiAuditRecommendation(
    int Priority,              // 1 = top
    string Title,
    string HowTo);

public sealed record AiAuditResponse(
    int OverallScore,
    string Grade,              // A | B | C | D | F
    AiAuditScores Scores,
    IReadOnlyList<string> Strengths,
    IReadOnlyList<AiAuditIssue> CriticalIssues,
    IReadOnlyList<AiAuditIssue> Warnings,
    IReadOnlyList<AiAuditIssue> Suggestions,
    IReadOnlyList<string> MissingFeatures,
    IReadOnlyList<AiAuditRecommendation> RecommendedImprovements,
    string TechStackAssessment,
    IReadOnlyList<AiDetailedIssue>? InlineAnnotations,
    string ModelUsed,
    int TokensInput,
    int TokensOutput,
    string PromptVersion,
    bool Available,
    string? Error);

/// <summary>
/// Combined response from <c>POST /api/project-audit</c> — static analysis + audit
/// in one round-trip per ADR-034 (AI service handles internal orchestration). When
/// the LLM portion fails but static succeeds, <see cref="AiAudit"/> is null and
/// <see cref="StaticAnalysis"/> is populated (graceful degradation).
/// </summary>
public sealed record AiAuditCombinedResponse(
    string AuditId,
    int OverallScore,
    string Grade,
    AiStaticAnalysis? StaticAnalysis,
    AiAuditResponse? AiAudit,
    AiAnalysisMetadata Metadata);

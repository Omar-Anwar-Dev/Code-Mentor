using System.Text.Json.Serialization;

namespace CodeMentor.Application.CodeReview;

/// <summary>
/// DTOs matching the AI service contract (architecture §6.10). Names mirror the
/// JSON keys the Python service emits; we keep them flat + immutable records.
///
/// See ai-service/app/domain/schemas/responses.py for the authoritative shape.
/// </summary>
public sealed record AiIssue(
    string Severity,
    string Category,
    string Message,
    string File,
    int Line,
    int? Column,
    string Rule,
    string? SuggestedFix);

public sealed record AiAnalysisSummary(
    int TotalIssues,
    int Errors,
    int Warnings,
    int Info);

public sealed record AiPerToolResult(
    string Tool,
    IReadOnlyList<AiIssue> Issues,
    AiAnalysisSummary Summary,
    int ExecutionTimeMs);

public sealed record AiStaticAnalysis(
    int Score,
    IReadOnlyList<AiIssue> Issues,
    AiAnalysisSummary Summary,
    IReadOnlyList<string> ToolsUsed,
    IReadOnlyList<AiPerToolResult> PerTool);

// S6-T1: aligned with PRD F6 (correctness/readability/security/performance/design).
// Pre-S6 names (Functionality/BestPractices) are gone — the AI service ships
// the new names exclusively as of PROMPT_VERSION v1.0.0.
public sealed record AiReviewScores(
    int Correctness,
    int Readability,
    int Security,
    int Performance,
    int Design);

public sealed record AiRecommendation(
    string Priority,
    string Category,
    string Message,
    string? SuggestedFix);

// Enhanced feedback fields emitted by the AI service's enhanced prompt mode.
// Deserialized by Refit; absent/null when the model did not produce them.

public sealed record AiDetailedIssue(
    string File,
    int Line,
    int? EndLine,
    string? CodeSnippet,
    string IssueType,     // correctness | readability | security | performance | design
    string Severity,      // critical | high | medium | low
    string Title,
    string Message,
    string Explanation,
    bool IsRepeatedMistake,
    string SuggestedFix,
    string? CodeExample);

public sealed record AiLearningResource(
    string Title,
    string Url,
    string Type,          // documentation | tutorial | video | article | course
    string Description);

public sealed record AiWeaknessWithResources(
    string Weakness,
    IReadOnlyList<AiLearningResource> Resources);

public sealed record AiReviewResponse(
    int OverallScore,
    AiReviewScores Scores,
    IReadOnlyList<string> Strengths,
    IReadOnlyList<string> Weaknesses,
    IReadOnlyList<AiRecommendation> Recommendations,
    string Summary,
    string ModelUsed,
    int TokensUsed,
    string PromptVersion,
    bool Available,
    string? Error,
    IReadOnlyList<AiDetailedIssue>? DetailedIssues = null,
    IReadOnlyList<AiWeaknessWithResources>? LearningResources = null);

public sealed record AiAnalysisMetadata(
    string ProjectName,
    IReadOnlyList<string> LanguagesDetected,
    int FilesAnalyzed,
    int ExecutionTimeMs,
    bool StaticAvailable,
    bool AiAvailable);

public sealed record AiCombinedResponse(
    string SubmissionId,
    string AnalysisType,
    int OverallScore,
    AiStaticAnalysis? StaticAnalysis,
    AiReviewResponse? AiReview,
    AiAnalysisMetadata Metadata);

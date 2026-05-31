using Refit;

namespace CodeMentor.Infrastructure.CodeReview;

/// <summary>
/// S17-T1 / F15 (ADR-049): Refit surface for the AI service's
/// <c>POST /api/assessment-summary</c> endpoint.
///
/// The wire DTOs here mirror the Pydantic schemas at
/// <c>ai-service/app/domain/schemas/assessment_summary.py</c>. Property
/// names are PascalCase here and the Refit client is configured to
/// camel-case them on the wire — the AI service expects camelCase.
/// </summary>
public interface IAssessmentSummaryRefit
{
    [Post("/api/assessment-summary")]
    Task<AssessmentSummaryResponseDto> SummarizeAsync(
        [Body] AssessmentSummaryRequestDto body,
        [Header("X-Correlation-Id")] string correlationId,
        CancellationToken ct);
}

// ── Wire DTOs (camel-cased on the wire by the Refit client config). ──

public sealed record CategoryScoreInputDto(
    string Category,
    double Score,
    int TotalAnswered,
    int CorrectCount);

public sealed record AssessmentSummaryRequestDto(
    string Track,
    string SkillLevel,
    double TotalScore,
    int DurationSec,
    IReadOnlyList<CategoryScoreInputDto> CategoryScores);

public sealed record AssessmentSummaryResponseDto(
    string StrengthsParagraph,
    string WeaknessesParagraph,
    string PathGuidanceParagraph,
    string PromptVersion,
    int TokensUsed,
    int RetryCount);

using Refit;

namespace CodeMentor.Infrastructure.CodeReview;

/// <summary>
/// S16-T4 / F15 (ADR-049 / ADR-054): Refit surface for the AI service's
/// <c>POST /api/generate-questions</c> endpoint.
///
/// Production callers go through <c>QuestionGeneratorRefitClient</c>
/// rather than this interface directly — the wrapper translates
/// HTTP-level errors into the <c>AiGeneratorFailedException</c>
/// contract.
/// </summary>
public interface IQuestionGeneratorRefit
{
    [Post("/api/generate-questions")]
    Task<QGenerateResponse> GenerateAsync(
        [Body] QGenerateRequest body,
        [Header("X-Correlation-Id")] string correlationId,
        CancellationToken ct);
}

// ── Wire DTOs (match Pydantic schemas in ai-service/app/domain/schemas/generator.py). ──

public sealed record QGenerateRequest(
    string Category,
    int Difficulty,
    int Count,
    bool IncludeCode,
    string? Language,
    IReadOnlyList<string> ExistingSnippets);

public sealed record QGenerateResponse(
    IReadOnlyList<QGeneratedDraft> Drafts,
    string PromptVersion,
    int TokensUsed,
    int RetryCount,
    string BatchId);

public sealed record QGeneratedDraft(
    string QuestionText,
    string? CodeSnippet,
    string? CodeLanguage,
    IReadOnlyList<string> Options,
    string CorrectAnswer,
    string Explanation,
    double IrtA,
    double IrtB,
    string Rationale,
    string Category,
    int Difficulty);

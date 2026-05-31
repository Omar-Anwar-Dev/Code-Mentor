using CodeMentor.Domain.Assessments;

namespace CodeMentor.Application.Admin;

/// <summary>
/// S16-T4 / F15: Backend abstraction over the AI service's
/// <c>POST /api/generate-questions</c> endpoint. The production impl
/// (<c>QuestionGeneratorRefitClient</c>) calls the AI service via Refit;
/// tests substitute a fake to avoid burning OpenAI tokens.
/// </summary>
public interface IAiQuestionGenerator
{
    Task<AiGeneratedBatch> GenerateAsync(
        SkillCategory category,
        int difficulty,
        int count,
        bool includeCode,
        string? language,
        IReadOnlyList<string> existingSnippets,
        string correlationId,
        CancellationToken ct = default);
}

/// <summary>One batch returned by the generator. Each draft maps onto a
/// future <c>QuestionDraft</c> entity in the same order.</summary>
public sealed record AiGeneratedBatch(
    string BatchId,                  // server-side id from the AI service (correlator)
    IReadOnlyList<AiGeneratedDraft> Drafts,
    int TokensUsed,
    int RetryCount,
    string PromptVersion);

public sealed record AiGeneratedDraft(
    string QuestionText,
    string? CodeSnippet,
    string? CodeLanguage,
    IReadOnlyList<string> Options,   // exactly 4
    string CorrectAnswer,            // "A" | "B" | "C" | "D"
    string? Explanation,
    double IrtA,
    double IrtB,
    string Rationale,
    SkillCategory Category,
    int Difficulty);

/// <summary>Wraps any failure from the AI service generator call. The
/// route layer maps the inner status code (503 / 422 / 504 / 400) onto
/// the matching HTTP response.</summary>
public sealed class AiGeneratorFailedException : Exception
{
    public AiGeneratorFailedException(int httpStatus, string message)
        : base(message)
    {
        HttpStatus = httpStatus;
    }

    public int HttpStatus { get; }
}

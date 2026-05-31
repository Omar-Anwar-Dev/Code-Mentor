using Refit;

namespace CodeMentor.Infrastructure.CodeReview;

/// <summary>
/// S18-T3 / F16: Refit surface for the AI service's
/// <c>POST /api/generate-tasks</c> endpoint.
///
/// Wire DTOs mirror the Pydantic schemas at
/// <c>ai-service/app/domain/schemas/task_generator.py</c>.
/// camelCase on the wire via the Refit client config.
/// </summary>
public interface ITaskGeneratorRefit
{
    [Post("/api/generate-tasks")]
    Task<TGenerateResponse> GenerateAsync(
        [Body] TGenerateRequest body,
        [Header("X-Correlation-Id")] string correlationId,
        CancellationToken ct);
}

// ── Wire DTOs ──────────────────────────────────────────────────────

public sealed record TGenerateRequest(
    string Track,
    int Difficulty,
    int Count,
    IReadOnlyList<string> FocusSkills,
    IReadOnlyList<string> ExistingTitles);

public sealed record TGenerateResponse(
    IReadOnlyList<TGeneratedDraft> Drafts,
    string PromptVersion,
    int TokensUsed,
    int RetryCount,
    string BatchId);

public sealed record TSkillTag(string Skill, double Weight);

public sealed record TGeneratedDraft(
    string Title,
    string Description,
    string? AcceptanceCriteria,
    string? Deliverables,
    int Difficulty,
    string Category,
    string Track,
    string ExpectedLanguage,
    int EstimatedHours,
    IReadOnlyList<string> Prerequisites,
    IReadOnlyList<TSkillTag> SkillTags,
    Dictionary<string, double> LearningGain,
    string Rationale);

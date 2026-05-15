using Refit;

namespace CodeMentor.Infrastructure.CodeReview;

/// <summary>
/// S19-T4 / F16 (ADR-052): Refit surface for the AI service's
/// <c>POST /api/generate-path</c> endpoint — hybrid embedding-recall +
/// LLM rerank.
///
/// Wire DTOs mirror the Pydantic schemas at
/// <c>ai-service/app/domain/schemas/path_generator.py</c>.
/// camelCase on the wire via the Refit client config.
/// </summary>
public interface IPathGeneratorRefit
{
    [Post("/api/generate-path")]
    Task<PGenerateResponse> GenerateAsync(
        [Body] PGenerateRequest body,
        [Header("X-Correlation-Id")] string correlationId,
        CancellationToken ct);
}

// ── Wire DTOs (camelCase on the wire) ───────────────────────────────

public sealed record PGenerateRequest(
    IReadOnlyDictionary<string, decimal> SkillProfile,
    string Track,
    IReadOnlyList<string> CompletedTaskIds,
    string? AssessmentSummaryText,
    int TargetLength,
    int RecallTopK,
    IReadOnlyList<PCandidateTask>? CandidateTasks);

public sealed record PSkillTag(string Skill, decimal Weight);

public sealed record PCandidateTask(
    string TaskId,
    string Title,
    string DescriptionSummary,
    IReadOnlyList<PSkillTag> SkillTags,
    Dictionary<string, decimal> LearningGain,
    int Difficulty,
    IReadOnlyList<string> Prerequisites,
    string Track,
    string? ExpectedLanguage,
    string? Category,
    int? EstimatedHours);

public sealed record PGeneratedEntry(
    string TaskId,
    int OrderIndex,
    string Reasoning);

public sealed record PGenerateResponse(
    IReadOnlyList<PGeneratedEntry> PathTasks,
    string OverallReasoning,
    int RecallSize,
    string PromptVersion,
    int TokensUsed,
    int RetryCount);

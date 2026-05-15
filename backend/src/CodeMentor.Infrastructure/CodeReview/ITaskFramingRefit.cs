using Refit;

namespace CodeMentor.Infrastructure.CodeReview;

/// <summary>
/// S19-T5 / F16 (ADR-052): Refit surface for the AI service's
/// <c>POST /api/task-framing</c> endpoint. Wire DTOs mirror the
/// Pydantic schemas at <c>ai-service/app/domain/schemas/task_framing.py</c>.
/// camelCase on the wire via the Refit client config.
/// </summary>
public interface ITaskFramingRefit
{
    [Post("/api/task-framing")]
    Task<TFFramingResponse> FrameAsync(
        [Body] TFFramingRequest body,
        [Header("X-Correlation-Id")] string correlationId,
        CancellationToken ct);
}

// ── Wire DTOs ──────────────────────────────────────────────────────

public sealed record TFSkillTag(string Skill, double Weight);

public sealed record TFFramingRequest(
    string TaskId,
    string TaskTitle,
    string TaskDescription,
    IReadOnlyList<TFSkillTag> SkillTags,
    IReadOnlyDictionary<string, decimal> LearnerProfile,
    string Track,
    string? LearnerLevel);

public sealed record TFFramingResponse(
    string WhyThisMatters,
    IReadOnlyList<string> FocusAreas,
    IReadOnlyList<string> CommonPitfalls,
    string PromptVersion,
    int TokensUsed,
    int RetryCount);

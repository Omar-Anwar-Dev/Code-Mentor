using Refit;

namespace CodeMentor.Infrastructure.CodeReview;

/// <summary>
/// S20-T4 / F16 (ADR-053): Refit surface for the AI service's
/// <c>POST /api/adapt-path</c> endpoint — signal-driven action plan
/// generator.
///
/// Wire DTOs mirror the Pydantic schemas at
/// <c>ai-service/app/domain/schemas/path_adaptation.py</c>.
/// camelCase on the wire via the Refit client config.
/// </summary>
public interface IPathAdaptationRefit
{
    [Post("/api/adapt-path")]
    Task<PAdaptPathResponse> AdaptAsync(
        [Body] PAdaptPathRequest body,
        [Header("X-Correlation-Id")] string correlationId,
        CancellationToken ct);
}

// ── Wire DTOs (camelCase on the wire) ───────────────────────────────

public sealed record PAdaptSkillTag(string Skill, decimal Weight);

public sealed record PAdaptCurrentPathEntry(
    string PathTaskId,
    string TaskId,
    string Title,
    int OrderIndex,
    string Status,
    IReadOnlyList<PAdaptSkillTag> SkillTags);

public sealed record PAdaptRecentSubmission(
    string TaskId,
    decimal OverallScore,
    IReadOnlyDictionary<string, decimal> ScoresPerCategory,
    string? SummaryText);

public sealed record PAdaptCandidateReplacement(
    string TaskId,
    string Title,
    string DescriptionSummary,
    int Difficulty,
    IReadOnlyList<PAdaptSkillTag> SkillTags,
    IReadOnlyList<string> Prerequisites);

public sealed record PAdaptPathRequest(
    IReadOnlyList<PAdaptCurrentPathEntry> CurrentPath,
    IReadOnlyList<PAdaptRecentSubmission> RecentSubmissions,
    string SignalLevel,
    IReadOnlyDictionary<string, decimal> SkillProfile,
    IReadOnlyList<PAdaptCandidateReplacement> CandidateReplacements,
    IReadOnlyList<string> CompletedTaskIds,
    string Track);

public sealed record PAdaptProposedAction(
    string Type,
    int TargetPosition,
    string? NewTaskId,
    int? NewOrderIndex,
    string Reason,
    decimal Confidence);

public sealed record PAdaptPathResponse(
    IReadOnlyList<PAdaptProposedAction> Actions,
    string OverallReasoning,
    string SignalLevel,
    string PromptVersion,
    int TokensUsed,
    int RetryCount);

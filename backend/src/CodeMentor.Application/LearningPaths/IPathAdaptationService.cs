using CodeMentor.Application.LearningPaths.Contracts;

namespace CodeMentor.Application.LearningPaths;

/// <summary>
/// S20-T5 / F16 (ADR-053): learner + admin facing service surface for the
/// adaptation feature. Wraps the repository (read) + scheduler (refresh) +
/// transactional action application (respond → approved).
/// </summary>
public interface IPathAdaptationService
{
    /// <summary>List pending + history events for the caller's user. Pending
    /// events come first (newest within each bucket).</summary>
    Task<PathAdaptationListResponse> ListForUserAsync(
        Guid userId, CancellationToken ct = default);

    /// <summary>Approve or reject a Pending event. On Approve, the actions are
    /// applied to <c>PathTasks</c> in a single transaction; on Reject, only
    /// the LearnerDecision + RespondedAt fields change.</summary>
    Task<RespondAdaptationResult> RespondAsync(
        Guid userId, Guid eventId, string decision, CancellationToken ct = default);

    /// <summary>Enqueue a <c>PathAdaptationJob</c> with trigger=OnDemand for
    /// the user's active learning path. Bypasses cooldown.</summary>
    Task<RefreshAdaptationResult> EnqueueRefreshAsync(
        Guid userId, CancellationToken ct = default);

    /// <summary>Admin variant — list recent events across all users, optionally
    /// filtered by userId / pathId.</summary>
    Task<IReadOnlyList<AdminPathAdaptationEventDto>> ListForAdminAsync(
        Guid? userIdFilter, Guid? pathIdFilter, int take, CancellationToken ct = default);
}

public sealed record RespondAdaptationResult(
    bool Ok,
    string? Error,
    PathAdaptationRespondResponse? Response);

public sealed record RefreshAdaptationResult(
    bool Ok,
    string? Error,
    PathAdaptationRefreshResponse? Response);

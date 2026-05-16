using CodeMentor.Domain.Tasks;

namespace CodeMentor.Application.LearningPaths;

/// <summary>
/// S20-T3 / F16 (ADR-053): read-side repository for the
/// <see cref="PathAdaptationEvent"/> audit table. Writes go through the EF
/// context directly inside <c>PathAdaptationJob</c> (single transaction
/// with the <c>PathTasks</c> reorder + <c>LearningPath.LastAdaptedAt</c>
/// update + <c>Notifications</c> enqueue). Reads back the learner-facing
/// + admin-facing surfaces in <c>/api/learning-paths/me/adaptations</c>
/// and <c>/api/admin/adaptations</c> (S20-T5).
/// </summary>
public interface IPathAdaptationEventRepository
{
    /// <summary>Pending events for a user — drives the "AI suggests N changes"
    /// banner + modal on the path page. Newest first. <c>Pending</c> only.</summary>
    Task<IReadOnlyList<PathAdaptationEvent>> GetPendingForUserAsync(
        Guid userId, CancellationToken ct = default);

    /// <summary>Full timeline of events for a path — every cycle written
    /// regardless of decision. Newest first. Includes AutoApplied / Approved /
    /// Rejected / Expired plus any still-Pending rows.</summary>
    Task<IReadOnlyList<PathAdaptationEvent>> GetTimelineForPathAsync(
        Guid pathId, CancellationToken ct = default);

    /// <summary>Admin variant of the timeline — most recent across all paths.</summary>
    Task<IReadOnlyList<PathAdaptationEvent>> GetRecentAsync(
        int take, CancellationToken ct = default);

    /// <summary>Single-row read by id + user (used by the respond endpoint to
    /// authorize the action). Returns null if the event doesn't exist OR
    /// doesn't belong to the user.</summary>
    Task<PathAdaptationEvent?> GetByIdForUserAsync(
        Guid eventId, Guid userId, CancellationToken ct = default);

    /// <summary>Lookup by idempotency key — used inside
    /// <c>PathAdaptationJob</c> as a defensive check before insert (the
    /// unique index is the actual guard).</summary>
    Task<PathAdaptationEvent?> GetByIdempotencyKeyAsync(
        string idempotencyKey, CancellationToken ct = default);
}

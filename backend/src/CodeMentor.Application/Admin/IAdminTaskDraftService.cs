using CodeMentor.Application.Admin.Contracts;

namespace CodeMentor.Application.Admin;

/// <summary>
/// S18-T4 / F16: admin workflow for AI-generated task drafts. Mirrors
/// <see cref="IAdminQuestionDraftService"/> from S16-T4 with task-shaped
/// fields (Title / Description / AcceptanceCriteria / Deliverables /
/// SkillTags / LearningGain / Prerequisites) instead of MCQ shape.
/// </summary>
public interface IAdminTaskDraftService
{
    Task<GenerateTaskDraftsResponse> GenerateAsync(
        GenerateTaskDraftsRequest request,
        Guid actorUserId,
        CancellationToken ct = default);

    Task<IReadOnlyList<TaskDraftDto>?> GetBatchAsync(
        Guid batchId,
        CancellationToken ct = default);

    /// <summary>Atomic: status→Approved + insert <c>Tasks</c> row + enqueue
    /// <c>EmbedEntityJob.EmbedTaskAsync</c>. Returns the new task id.</summary>
    /// <exception cref="DraftAlreadyDecidedException">when the draft is no longer in Draft state.</exception>
    Task<Guid?> ApproveAsync(
        Guid draftId,
        ApproveTaskDraftRequest? edits,
        Guid actorUserId,
        CancellationToken ct = default);

    /// <summary>status→Rejected + optional reason. No Tasks row inserted.</summary>
    /// <exception cref="DraftAlreadyDecidedException">when the draft is no longer in Draft state.</exception>
    Task<bool> RejectAsync(
        Guid draftId,
        string? reason,
        Guid actorUserId,
        CancellationToken ct = default);
}

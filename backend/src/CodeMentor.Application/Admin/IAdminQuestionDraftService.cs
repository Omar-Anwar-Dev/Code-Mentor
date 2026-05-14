using CodeMentor.Application.Admin.Contracts;

namespace CodeMentor.Application.Admin;

/// <summary>
/// S16 / F15: admin workflow for AI-generated question drafts.
///
/// Lifecycle: generate (AI service call + persist) → list-for-review →
/// approve (atomic: status=Approved + Questions insert + EmbedEntityJob
/// enqueue, all in one DB unit-of-work) OR reject (status=Rejected +
/// optional reason logged).
///
/// All methods require admin authorization at the route layer.
/// </summary>
public interface IAdminQuestionDraftService
{
    Task<GenerateQuestionDraftsResponse> GenerateAsync(
        GenerateQuestionDraftsRequest request,
        Guid actorUserId,
        CancellationToken ct = default);

    Task<IReadOnlyList<QuestionDraftDto>?> GetBatchAsync(
        Guid batchId,
        CancellationToken ct = default);

    /// <summary>
    /// Atomic: status→Approved, insert <c>Questions</c> row, enqueue
    /// <c>EmbedEntityJob</c>. Returns the new <c>QuestionId</c>.
    /// </summary>
    /// <exception cref="DraftAlreadyDecidedException">when the draft has
    /// already been approved or rejected.</exception>
    /// <exception cref="ArgumentException">when admin edits leave the
    /// draft in an invalid state (e.g., correctAnswer doesn't index an
    /// option after option-list shrink).</exception>
    Task<Guid?> ApproveAsync(
        Guid draftId,
        ApproveQuestionDraftRequest? edits,
        Guid actorUserId,
        CancellationToken ct = default);

    /// <summary>status→Rejected + optional reason. No Questions row inserted.</summary>
    /// <exception cref="DraftAlreadyDecidedException">when the draft has
    /// already been approved or rejected.</exception>
    Task<bool> RejectAsync(
        Guid draftId,
        string? reason,
        Guid actorUserId,
        CancellationToken ct = default);

    /// <summary>S16-T9: last N batches with their approve/reject ratios.
    /// Powers the admin-dashboard sparkline widget.</summary>
    Task<IReadOnlyList<GeneratorBatchMetricDto>> GetRecentBatchMetricsAsync(
        int limit,
        CancellationToken ct = default);
}

/// <summary>Thrown when an admin tries to approve OR reject a draft that
/// has already transitioned out of <c>Draft</c> state. Route maps to 409.</summary>
public sealed class DraftAlreadyDecidedException : InvalidOperationException
{
    public DraftAlreadyDecidedException(Guid draftId, string currentStatus)
        : base($"Draft {draftId} is already in status '{currentStatus}'; no further decisions allowed.")
    {
        DraftId = draftId;
        CurrentStatus = currentStatus;
    }

    public Guid DraftId { get; }
    public string CurrentStatus { get; }
}

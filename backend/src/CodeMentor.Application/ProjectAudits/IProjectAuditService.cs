using CodeMentor.Application.ProjectAudits.Contracts;

namespace CodeMentor.Application.ProjectAudits;

/// <summary>
/// S9-T3 / S9-T5: orchestrates Project Audit creation, read, soft-delete, and
/// retry operations. F11 module — separate from Submissions per ADR-031.
/// </summary>
public interface IProjectAuditService
{
    /// <summary>S9-T3: create a new audit + enqueue the Hangfire job.</summary>
    Task<AuditOperationResult> CreateAsync(
        Guid userId,
        CreateAuditRequest request,
        CancellationToken ct = default);

    /// <summary>
    /// S9-T5: owner-scoped audit detail (status + scores + timestamps). Returns
    /// null if the audit doesn't exist, isn't owned by the caller, or is soft-deleted.
    /// </summary>
    Task<AuditDto?> GetAsync(Guid userId, Guid auditId, CancellationToken ct = default);

    /// <summary>
    /// S9-T5: full 8-section audit report. Returns null if the audit doesn't exist,
    /// isn't owned by the caller, is soft-deleted, isn't yet Completed, OR has no
    /// associated <c>ProjectAuditResult</c> row (e.g. AI portion still Unavailable).
    /// </summary>
    Task<AuditReportDto?> GetReportAsync(Guid userId, Guid auditId, CancellationToken ct = default);

    /// <summary>
    /// S9-T5: paginated history with optional date / score filters. Excludes
    /// soft-deleted rows. Page defaults to 1, size defaults to 20 (max 100).
    /// </summary>
    Task<AuditListResponse> ListMineAsync(
        Guid userId,
        AuditListQuery query,
        CancellationToken ct = default);

    /// <summary>
    /// S9-T5: soft delete (sets <c>IsDeleted=true</c>). Blob untouched — the daily
    /// <c>AuditBlobCleanupJob</c> (S9-T13) handles physical retention per ADR-033.
    /// Returns NotFound if missing / not owned / already deleted.
    /// </summary>
    Task<AuditOperationResult> SoftDeleteAsync(
        Guid userId,
        Guid auditId,
        CancellationToken ct = default);

    /// <summary>
    /// S9-T5: re-enqueue a Failed audit. Returns NotRetryable (mapped to 409) on
    /// any non-Failed status. Resets ErrorMessage / StartedAt / CompletedAt and
    /// increments AttemptNumber. Mirrors <c>SubmissionService.RetryAsync</c>.
    /// </summary>
    Task<AuditOperationResult> RetryAsync(
        Guid userId,
        Guid auditId,
        CancellationToken ct = default);
}

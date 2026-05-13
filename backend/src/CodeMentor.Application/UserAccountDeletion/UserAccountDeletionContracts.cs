namespace CodeMentor.Application.UserAccountDeletion;

/// <summary>
/// S14-T9 / ADR-046: status of the user's deletion request (if any). Returned
/// by <c>GET /api/user/account/delete</c> and embedded in the response of
/// <c>POST /api/user/account/delete</c>.
/// </summary>
public sealed record DeletionRequestStatus(
    Guid? RequestId,
    bool HasActiveRequest,
    DateTime? RequestedAt,
    DateTime? HardDeleteAtUtc,
    string? Reason);

public sealed record InitiateDeletionResponse(
    DeletionRequestStatus Status,
    string Message);

public sealed record CancelDeletionResponse(bool Cancelled, string Message);

/// <summary>
/// S14-T9 / ADR-046: account-deletion lifecycle service. Three external
/// surfaces (request / cancel / get) plus an internal auto-cancel hook for the
/// auth path. All paths raise account-security notifications (always-on via
/// <c>NotificationService.RaiseSecurityAlertAsync</c>).
/// </summary>
public interface IUserAccountDeletionService
{
    /// <summary>
    /// Initiate deletion. Idempotent: if a request is already active for this
    /// user, returns the existing <see cref="DeletionRequestStatus"/> without
    /// creating a duplicate row (per ADR-046 Q2 lock).
    /// </summary>
    Task<InitiateDeletionResponse> RequestDeletionAsync(Guid userId, string? reason, CancellationToken ct = default);

    /// <summary>
    /// User-initiated cancel (alternative to login-auto-cancel) per ADR-046 Q4.
    /// Returns Cancelled=false if there's no active request to cancel.
    /// </summary>
    Task<CancelDeletionResponse> CancelDeletionAsync(Guid userId, CancellationToken ct = default);

    /// <summary>
    /// Returns the current active deletion request for the user, or
    /// <see cref="DeletionRequestStatus.HasActiveRequest"/>=false if none.
    /// </summary>
    Task<DeletionRequestStatus> GetActiveAsync(Guid userId, CancellationToken ct = default);

    /// <summary>
    /// Called from the auth path on EVERY successful login. If the user has an
    /// active deletion request, cancels it (Spotify model). No-op otherwise.
    /// Returns true if a cancel happened (the auth controller can log it).
    /// </summary>
    Task<bool> AutoCancelOnLoginAsync(Guid userId, CancellationToken ct = default);
}

/// <summary>
/// S14-T9 / ADR-046: pluggable Hangfire scheduler for the hard-delete job.
/// Production uses <c>BackgroundJob.Schedule(..., delay: 30d)</c>; test
/// replacement runs the job inline so the 30-day wait is sidestepped.
/// </summary>
public interface IUserAccountDeletionScheduler
{
    /// <summary>
    /// Schedule the hard-delete cascade for <paramref name="userId"/> +
    /// <paramref name="requestId"/> to fire at <paramref name="fireAt"/>. Returns
    /// the Hangfire job id so the auto-cancel path can delete it.
    /// </summary>
    string Schedule(Guid userId, Guid requestId, DateTime fireAtUtc);

    /// <summary>
    /// Cancel a previously-scheduled job. Idempotent — silently no-ops if the
    /// job already fired or doesn't exist.
    /// </summary>
    void Cancel(string jobId);
}

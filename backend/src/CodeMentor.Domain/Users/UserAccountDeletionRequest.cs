namespace CodeMentor.Domain.Users;

/// <summary>
/// S14-T1 / ADR-046: records the 30-day cooling-off window per account
/// deletion request. The "active" request for a user is the row where
/// <c>CancelledAt IS NULL AND HardDeletedAt IS NULL</c>; one such row at most
/// per user. Historical rows (cancelled or hard-deleted) are preserved for
/// audit.
///
/// Lifecycle:
/// <list type="bullet">
///   <item><c>POST /api/user/account/delete</c> creates the row,
///   sets <c>User.IsDeleted=true</c>, schedules <c>HardDeleteUserJob</c> at
///   <c>HardDeleteAt</c>, captures the Hangfire job id in
///   <c>ScheduledJobId</c>.</item>
///   <item>Successful login during cooling-off (Spotify model — ADR-046 Q3):
///   the auth path looks up the active row, cancels the Hangfire job by
///   <c>ScheduledJobId</c>, sets <c>CancelledAt=now</c>, clears
///   <c>User.IsDeleted</c>, sends "account-restored" email + raises
///   in-app notification.</item>
///   <item>If the cooling-off window expires without a login, the scheduled
///   <c>HardDeleteUserJob</c> runs the cascade and sets
///   <c>HardDeletedAt=now</c>.</item>
/// </list>
/// </summary>
public class UserAccountDeletionRequest
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }

    public DateTime RequestedAt { get; set; } = DateTime.UtcNow;

    /// <summary><c>RequestedAt</c> + 30 days. <c>HardDeleteUserJob</c> fires at this instant.</summary>
    public DateTime HardDeleteAt { get; set; }

    /// <summary>Hangfire job id for the scheduled hard-delete — used to cancel on login.</summary>
    public string? ScheduledJobId { get; set; }

    /// <summary>Non-null if the user logged back in (auto-cancel) or explicitly cancelled.</summary>
    public DateTime? CancelledAt { get; set; }

    /// <summary>Non-null when the hard-delete actually ran. After this, no inverse op exists.</summary>
    public DateTime? HardDeletedAt { get; set; }

    /// <summary>Optional reason captured at request time for product analytics.</summary>
    public string? Reason { get; set; }
}

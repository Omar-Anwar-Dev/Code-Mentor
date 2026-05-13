using CodeMentor.Application.Notifications;
using CodeMentor.Application.UserAccountDeletion;
using CodeMentor.Domain.Users;
using CodeMentor.Infrastructure.Identity;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace CodeMentor.Infrastructure.UserAccountDeletion;

/// <summary>
/// S14-T9 / ADR-046: account-deletion lifecycle. The three external surfaces
/// (RequestDeletion / CancelDeletion / GetActive) are called by
/// <c>AccountDeletionController</c>; <c>AutoCancelOnLoginAsync</c> is called
/// from <c>AuthService.LoginAsync</c> + <c>GitHubOAuthService.HandleCallbackAsync</c>
/// to implement the Spotify-model auto-cancel.
///
/// Active-request invariant: at most one row per user with
/// <c>CancelledAt IS NULL AND HardDeletedAt IS NULL</c>. The
/// <c>IX_UserAccountDeletionRequests_User_Active</c> index from T1 backs the
/// lookup.
/// </summary>
public sealed class UserAccountDeletionService : IUserAccountDeletionService
{
    /// <summary>30-day cooling-off window (ADR-046 Q3).</summary>
    public static readonly TimeSpan CoolingOffWindow = TimeSpan.FromDays(30);

    private readonly ApplicationDbContext _db;
    private readonly UserManager<ApplicationUser> _users;
    private readonly IUserAccountDeletionScheduler _scheduler;
    private readonly INotificationService _notifications;
    private readonly ILogger<UserAccountDeletionService> _log;

    public UserAccountDeletionService(
        ApplicationDbContext db,
        UserManager<ApplicationUser> users,
        IUserAccountDeletionScheduler scheduler,
        INotificationService notifications,
        ILogger<UserAccountDeletionService> log)
    {
        _db = db;
        _users = users;
        _scheduler = scheduler;
        _notifications = notifications;
        _log = log;
    }

    public async Task<InitiateDeletionResponse> RequestDeletionAsync(Guid userId, string? reason, CancellationToken ct = default)
    {
        var user = await _users.FindByIdAsync(userId.ToString());
        if (user is null)
        {
            return new InitiateDeletionResponse(
                new DeletionRequestStatus(null, false, null, null, null),
                "User not found.");
        }

        // Idempotency (ADR-046 Q2): if a request is already active, return its status.
        var existing = await ActiveRequestQuery(userId).FirstOrDefaultAsync(ct);
        if (existing is not null)
        {
            _log.LogInformation("RequestDeletion: existing request {RequestId} already active for {UserId}", existing.Id, userId);
            return new InitiateDeletionResponse(
                MapStatus(existing),
                "A deletion request is already active. It will run automatically in 30 days unless you log in to cancel it.");
        }

        var now = DateTime.UtcNow;
        var hardDeleteAt = now + CoolingOffWindow;

        var request = new UserAccountDeletionRequest
        {
            UserId = userId,
            RequestedAt = now,
            HardDeleteAt = hardDeleteAt,
            Reason = reason,
        };
        _db.UserAccountDeletionRequests.Add(request);

        user.IsDeleted = true;
        user.DeletedAt = now;
        user.HardDeleteAt = hardDeleteAt;
        await _users.UpdateAsync(user);

        await _db.SaveChangesAsync(ct);

        // Schedule the Hangfire hard-delete job + capture the job id so AutoCancelOnLoginAsync
        // can call BackgroundJob.Delete on it.
        request.ScheduledJobId = _scheduler.Schedule(userId, request.Id, hardDeleteAt);
        await _db.SaveChangesAsync(ct);

        await _notifications.RaiseSecurityAlertAsync(userId, new SecurityAlertEvent(
            EventName: "Account deletion requested",
            EventDetail: $"Your account will be permanently deleted on {hardDeleteAt:u} UTC unless you log in to cancel within 30 days.",
            EventTimeUtc: now,
            SettingsRelativePath: "/settings"), ct);

        _log.LogInformation("RequestDeletion: scheduled hard-delete job {JobId} for user {UserId} at {HardDeleteAt}",
            request.ScheduledJobId, userId, hardDeleteAt);

        return new InitiateDeletionResponse(
            MapStatus(request),
            $"Your account is scheduled for permanent deletion on {hardDeleteAt:yyyy-MM-dd} UTC. Log in any time before then to cancel.");
    }

    public async Task<CancelDeletionResponse> CancelDeletionAsync(Guid userId, CancellationToken ct = default)
    {
        var cancelled = await AutoCancelOnLoginAsync(userId, ct);
        return new CancelDeletionResponse(
            cancelled,
            cancelled
                ? "Your account deletion has been cancelled."
                : "No active deletion request to cancel.");
    }

    public async Task<DeletionRequestStatus> GetActiveAsync(Guid userId, CancellationToken ct = default)
    {
        var existing = await ActiveRequestQuery(userId).AsNoTracking().FirstOrDefaultAsync(ct);
        return existing is null
            ? new DeletionRequestStatus(null, false, null, null, null)
            : MapStatus(existing);
    }

    public async Task<bool> AutoCancelOnLoginAsync(Guid userId, CancellationToken ct = default)
    {
        var existing = await ActiveRequestQuery(userId).FirstOrDefaultAsync(ct);
        if (existing is null) return false;

        var user = await _users.FindByIdAsync(userId.ToString());
        if (user is null)
        {
            _log.LogWarning("AutoCancelOnLogin: user {UserId} found in deletion request but missing from Users — orphan request will be ignored", userId);
            return false;
        }

        var now = DateTime.UtcNow;

        // 1. Cancel the Hangfire job FIRST (so even if SaveChanges fails below, the job is gone).
        if (!string.IsNullOrEmpty(existing.ScheduledJobId))
        {
            _scheduler.Cancel(existing.ScheduledJobId);
        }

        // 2. Mark the request cancelled.
        existing.CancelledAt = now;

        // 3. Clear soft-delete state on User so future queries don't filter them out.
        user.IsDeleted = false;
        user.DeletedAt = null;
        user.HardDeleteAt = null;
        await _users.UpdateAsync(user);

        await _db.SaveChangesAsync(ct);

        await _notifications.RaiseSecurityAlertAsync(userId, new SecurityAlertEvent(
            EventName: "Account restored",
            EventDetail: "Your scheduled account deletion has been cancelled. Welcome back.",
            EventTimeUtc: now,
            SettingsRelativePath: "/settings"), ct);

        _log.LogInformation("AutoCancelOnLogin: cancelled request {RequestId} for user {UserId} (Hangfire job {JobId})",
            existing.Id, userId, existing.ScheduledJobId);

        return true;
    }

    private IQueryable<UserAccountDeletionRequest> ActiveRequestQuery(Guid userId) =>
        _db.UserAccountDeletionRequests
            .Where(r => r.UserId == userId
                && r.CancelledAt == null
                && r.HardDeletedAt == null);

    private static DeletionRequestStatus MapStatus(UserAccountDeletionRequest r) => new(
        RequestId: r.Id,
        HasActiveRequest: true,
        RequestedAt: r.RequestedAt,
        HardDeleteAtUtc: r.HardDeleteAt,
        Reason: r.Reason);
}

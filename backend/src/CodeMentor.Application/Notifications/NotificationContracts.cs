namespace CodeMentor.Application.Notifications;

/// <summary>S6-T11: DTO returned by GET /api/notifications.</summary>
public sealed record NotificationDto(
    Guid Id,
    string Type,
    string Title,
    string Message,
    string? Link,
    bool IsRead,
    DateTime CreatedAt,
    DateTime? ReadAt);

public sealed record NotificationListResponse(
    IReadOnlyList<NotificationDto> Items,
    int Page,
    int Size,
    int Total,
    int UnreadCount);

// ============================================================
// S14-T5 / ADR-046: event-payload records for the 5 RaiseXxxAsync methods.
// Callers pass a RELATIVE path (e.g. "/submissions/abc-123"); NotificationService
// prepends EmailDelivery:AppBaseUrl when rendering the email template. The
// relative path lands directly on the in-app Notification.Link.
// ============================================================

public sealed record FeedbackReadyEvent(
    string TaskTitle,
    int OverallScore,
    string SubmissionRelativePath);

public sealed record AuditReadyEvent(
    string ProjectName,
    string Grade,
    int OverallScore,
    string AuditRelativePath);

public sealed record WeaknessDetectedEvent(
    string CategoryDisplayName,
    int OccurrenceCount,
    int TotalReviewedCount,
    string LatestFeedbackRelativePath);

public sealed record BadgeEarnedEvent(
    string BadgeName,
    string BadgeDescription,
    int? NewLevel,
    string AchievementsRelativePath);

public sealed record SecurityAlertEvent(
    string EventName,
    string EventDetail,
    DateTime EventTimeUtc,
    string SettingsRelativePath);

/// <summary>
/// S14-T8 / ADR-046: data-export-ready event. <c>DownloadUrl</c> is an
/// absolute signed URL (not a relative path — the email recipient needs an
/// absolute URL and the in-app surface stores it as-is for the FE to render
/// as a direct download link). <c>ExpiresAtUtc</c> tells the user how long
/// the link works.
/// </summary>
public sealed record DataExportReadyEvent(
    string DownloadUrl,
    DateTime ExpiresAtUtc,
    long ZipFileSizeBytes);

/// <summary>
/// S20-T4 / F16 (ADR-053): path-adaptation-pending event. Raised by
/// <c>PathAdaptationJob</c> when at least one proposed action is staged as
/// Pending (i.e. didn't meet the 3-of-3 auto-apply rule). Honors the
/// learner's <c>NotifAdaptation{Email,InApp}</c> prefs (ADR-061).
/// </summary>
public sealed record PathAdaptationPendingEvent(
    Guid PathId,
    Guid PathAdaptationEventId,
    int PendingActionCount,
    string PathRelativePath);

public interface INotificationService
{
    Task<NotificationListResponse> ListAsync(
        Guid userId,
        int page,
        int size,
        bool? isRead,
        CancellationToken ct = default);

    Task<bool> MarkReadAsync(
        Guid userId,
        Guid notificationId,
        CancellationToken ct = default);

    /// <summary>
    /// S14-T5 / ADR-046: raise a feedback-ready event. Honors the user's
    /// <c>NotifSubmissionEmail</c> + <c>NotifSubmissionInApp</c> prefs (defaults
    /// to all-on if no <c>UserSettings</c> row exists). Each in-app insert is
    /// committed before this method returns; the email-delivery row is
    /// committed + dispatched (or persisted as <c>Suppressed</c>) inside
    /// <see cref="IEmailDeliveryService.SendAsync"/>.
    /// </summary>
    Task RaiseFeedbackReadyAsync(Guid userId, FeedbackReadyEvent data, CancellationToken ct = default);

    /// <summary>S14-T5 / ADR-046: honors <c>NotifAudit{Email,InApp}</c> prefs.</summary>
    Task RaiseAuditReadyAsync(Guid userId, AuditReadyEvent data, CancellationToken ct = default);

    /// <summary>S14-T5 / ADR-046: honors <c>NotifWeakness{Email,InApp}</c> prefs (F14 history-aware reviews).</summary>
    Task RaiseWeaknessDetectedAsync(Guid userId, WeaknessDetectedEvent data, CancellationToken ct = default);

    /// <summary>S14-T5 / ADR-046: honors <c>NotifBadge{Email,InApp}</c> prefs (badge award + optional level-up).</summary>
    Task RaiseBadgeEarnedAsync(Guid userId, BadgeEarnedEvent data, CancellationToken ct = default);

    /// <summary>
    /// S14-T5 / ADR-046: account-security event. <strong>ALWAYS-ON</strong> —
    /// bypasses <c>NotifSecurity{Email,InApp}</c> prefs and dispatches both
    /// channels regardless of the persisted toggle values (which exist only
    /// for FE display consistency).
    /// </summary>
    Task RaiseSecurityAlertAsync(Guid userId, SecurityAlertEvent data, CancellationToken ct = default);

    /// <summary>
    /// S14-T8 / ADR-046: data export ready. Treated as an account-security-adjacent
    /// event — bypasses prefs and always dispatches. The user explicitly initiated
    /// the export so silencing the completion notification is undesirable.
    /// </summary>
    Task RaiseDataExportReadyAsync(Guid userId, DataExportReadyEvent data, CancellationToken ct = default);

    /// <summary>
    /// S20-T4 / F16 (ADR-053 / ADR-061): adaptation-pending event. Honors
    /// the learner's <c>NotifAdaptation{Email,InApp}</c> prefs (defaults to
    /// all-on if no <c>UserSettings</c> row). MVP-scope is in-app only;
    /// email channel is reserved for a future template land — the pref
    /// column is persisted now so the FE settings page can offer both
    /// toggles (consistent with the Sprint-14 5-pref pattern).
    /// </summary>
    Task RaisePathAdaptationPendingAsync(Guid userId, PathAdaptationPendingEvent data, CancellationToken ct = default);
}

using CodeMentor.Application.Emails;
using CodeMentor.Application.Notifications;
using CodeMentor.Domain.Notifications;
using CodeMentor.Domain.Users;
using CodeMentor.Infrastructure.Identity;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace CodeMentor.Infrastructure.Notifications;

/// <summary>
/// S6-T11 + S14-T5: paginated owner-scoped in-app list + mark-read PLUS the
/// 5 pref-aware <c>RaiseXxxAsync</c> event raisers (ADR-046). Each raise:
/// <list type="number">
///   <item>Loads the caller's <see cref="ApplicationUser"/> (silently no-ops if missing).</item>
///   <item>Reads <see cref="Domain.Users.UserSettings"/> (defaults to all-on if no row).</item>
///   <item>Conditionally inserts an in-app <c>Notification</c> row (per channel pref).</item>
///   <item>Dispatches via <see cref="IEmailDeliveryService"/> with
///   <c>suppress=true</c> when the email pref is off (still persists an
///   <c>EmailDelivery</c> row marked Suppressed for admin transparency).</item>
/// </list>
/// Account-security events bypass the pref check entirely — see
/// <see cref="RaiseSecurityAlertAsync"/>.
/// </summary>
public sealed class NotificationService : INotificationService
{
    public const int DefaultPageSize = 20;
    public const int MaxPageSize = 100;

    private readonly ApplicationDbContext _db;
    private readonly IEmailTemplateRenderer _templates;
    private readonly IEmailDeliveryService _emails;
    private readonly ILogger<NotificationService> _log;
    private readonly string _appBaseUrl;

    public NotificationService(
        ApplicationDbContext db,
        IEmailTemplateRenderer templates,
        IEmailDeliveryService emails,
        IConfiguration config,
        ILogger<NotificationService> log)
    {
        _db = db;
        _templates = templates;
        _emails = emails;
        _log = log;
        _appBaseUrl = (config["EmailDelivery:AppBaseUrl"] ?? "http://localhost:5173").TrimEnd('/');
    }

    // ====================================================================
    // S6-T11: existing in-app list + mark-read
    // ====================================================================

    public async Task<NotificationListResponse> ListAsync(
        Guid userId,
        int page,
        int size,
        bool? isRead,
        CancellationToken ct = default)
    {
        page = page < 1 ? 1 : page;
        size = size < 1 ? DefaultPageSize : Math.Min(size, MaxPageSize);

        var baseQuery = _db.Notifications
            .AsNoTracking()
            .Where(n => n.UserId == userId);

        if (isRead is bool readFilter)
        {
            baseQuery = baseQuery.Where(n => n.IsRead == readFilter);
        }

        var total = await baseQuery.CountAsync(ct);

        var items = await baseQuery
            .OrderByDescending(n => n.CreatedAt)
            .Skip((page - 1) * size)
            .Take(size)
            .Select(n => new NotificationDto(
                n.Id,
                n.Type.ToString(),
                n.Title,
                n.Message,
                n.Link,
                n.IsRead,
                n.CreatedAt,
                n.ReadAt))
            .ToListAsync(ct);

        var unreadCount = await _db.Notifications
            .AsNoTracking()
            .CountAsync(n => n.UserId == userId && !n.IsRead, ct);

        return new NotificationListResponse(items, page, size, total, unreadCount);
    }

    public async Task<bool> MarkReadAsync(Guid userId, Guid notificationId, CancellationToken ct = default)
    {
        var notif = await _db.Notifications
            .FirstOrDefaultAsync(n => n.Id == notificationId && n.UserId == userId, ct);

        if (notif is null) return false;

        if (!notif.IsRead)
        {
            notif.IsRead = true;
            notif.ReadAt = DateTime.UtcNow;
            await _db.SaveChangesAsync(ct);
        }
        return true;
    }

    // ====================================================================
    // S14-T5 / ADR-046: pref-aware event raisers
    // ====================================================================

    public async Task RaiseFeedbackReadyAsync(Guid userId, FeedbackReadyEvent data, CancellationToken ct = default)
    {
        var (user, prefs) = await LoadUserAndPrefsAsync(userId, ct);
        if (user is null) return;

        await MaybeWriteInAppAsync(prefs.NotifSubmissionInApp, userId,
            NotificationType.FeedbackReady,
            title: "Feedback ready",
            message: $"Your code review is complete (overall score {data.OverallScore}/100).",
            link: data.SubmissionRelativePath,
            ct);

        var emailModel = new FeedbackReadyEmailModel(
            user.FullName,
            data.TaskTitle,
            data.OverallScore,
            ToAbsolute(data.SubmissionRelativePath));
        var msg = _templates.RenderFeedbackReady(userId, user.Email!, emailModel);
        await _emails.SendAsync(msg, suppress: !prefs.NotifSubmissionEmail, ct);
    }

    public async Task RaiseAuditReadyAsync(Guid userId, AuditReadyEvent data, CancellationToken ct = default)
    {
        var (user, prefs) = await LoadUserAndPrefsAsync(userId, ct);
        if (user is null) return;

        await MaybeWriteInAppAsync(prefs.NotifAuditInApp, userId,
            NotificationType.AuditReady,
            title: "Audit ready",
            message: $"Your audit for '{data.ProjectName}' is ready — Grade {data.Grade} ({data.OverallScore}/100).",
            link: data.AuditRelativePath,
            ct);

        var emailModel = new AuditReadyEmailModel(
            user.FullName,
            data.ProjectName,
            data.Grade,
            data.OverallScore,
            ToAbsolute(data.AuditRelativePath));
        var msg = _templates.RenderAuditReady(userId, user.Email!, emailModel);
        await _emails.SendAsync(msg, suppress: !prefs.NotifAuditEmail, ct);
    }

    public async Task RaiseWeaknessDetectedAsync(Guid userId, WeaknessDetectedEvent data, CancellationToken ct = default)
    {
        var (user, prefs) = await LoadUserAndPrefsAsync(userId, ct);
        if (user is null) return;

        await MaybeWriteInAppAsync(prefs.NotifWeaknessInApp, userId,
            NotificationType.WeaknessDetected,
            title: $"Recurring pattern: {data.CategoryDisplayName}",
            message: $"Spotted in {data.OccurrenceCount} of your last {data.TotalReviewedCount} reviews.",
            link: data.LatestFeedbackRelativePath,
            ct);

        var emailModel = new WeaknessDetectedEmailModel(
            user.FullName,
            data.CategoryDisplayName,
            data.OccurrenceCount,
            data.TotalReviewedCount,
            ToAbsolute(data.LatestFeedbackRelativePath));
        var msg = _templates.RenderWeaknessDetected(userId, user.Email!, emailModel);
        await _emails.SendAsync(msg, suppress: !prefs.NotifWeaknessEmail, ct);
    }

    public async Task RaiseBadgeEarnedAsync(Guid userId, BadgeEarnedEvent data, CancellationToken ct = default)
    {
        var (user, prefs) = await LoadUserAndPrefsAsync(userId, ct);
        if (user is null) return;

        var levelSuffix = data.NewLevel.HasValue ? $" — level up to {data.NewLevel}" : "";
        await MaybeWriteInAppAsync(prefs.NotifBadgeInApp, userId,
            NotificationType.BadgeEarned,
            title: $"Badge earned: {data.BadgeName}{levelSuffix}",
            message: data.BadgeDescription,
            link: data.AchievementsRelativePath,
            ct);

        var emailModel = new BadgeEarnedEmailModel(
            user.FullName,
            data.BadgeName,
            data.BadgeDescription,
            data.NewLevel,
            ToAbsolute(data.AchievementsRelativePath));
        var msg = _templates.RenderBadgeEarned(userId, user.Email!, emailModel);
        await _emails.SendAsync(msg, suppress: !prefs.NotifBadgeEmail, ct);
    }

    public async Task RaiseDataExportReadyAsync(Guid userId, DataExportReadyEvent data, CancellationToken ct = default)
    {
        // Treated as security-adjacent — bypasses prefs (always-on). The user
        // explicitly initiated the export, so silencing the completion
        // notification is undesirable; the download link is also time-bounded
        // (1h TTL) so they need to act on the notification.
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user is null)
        {
            _log.LogWarning("RaiseDataExportReadyAsync: user {UserId} not found — skipping", userId);
            return;
        }

        // In-app: store the absolute download URL directly on Notification.Link so
        // the bell-icon click navigates to the SAS URL. Subject is dynamic so the
        // user can act before the link expires.
        await MaybeWriteInAppAsync(forceOn: true, userId,
            NotificationType.DataExportReady,
            title: "Your data export is ready",
            message: $"Download your ZIP archive — link expires {data.ExpiresAtUtc:u} UTC.",
            link: data.DownloadUrl,
            ct);

        var emailModel = new DataExportReadyEmailModel(
            user.FullName,
            data.DownloadUrl,
            data.ExpiresAtUtc,
            data.ZipFileSizeBytes);
        var msg = _templates.RenderDataExportReady(userId, user.Email!, emailModel);
        await _emails.SendAsync(msg, suppress: false, ct);
    }

    public async Task RaiseSecurityAlertAsync(Guid userId, SecurityAlertEvent data, CancellationToken ct = default)
    {
        // ADR-046: security events bypass user prefs entirely. We don't even read the row.
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user is null)
        {
            _log.LogWarning("RaiseSecurityAlertAsync: user {UserId} not found — skipping", userId);
            return;
        }

        await MaybeWriteInAppAsync(forceOn: true, userId,
            NotificationType.SecurityAlert,
            title: "Security alert",
            message: $"{data.EventName}: {data.EventDetail}",
            link: data.SettingsRelativePath,
            ct);

        var emailModel = new SecurityAlertEmailModel(
            user.FullName,
            data.EventName,
            data.EventDetail,
            data.EventTimeUtc,
            ToAbsolute(data.SettingsRelativePath));
        var msg = _templates.RenderSecurityAlert(userId, user.Email!, emailModel);
        // suppress=false ALWAYS for security alerts (ADR-046 always-on guarantee).
        await _emails.SendAsync(msg, suppress: false, ct);
    }

    // ====================================================================
    // helpers
    // ====================================================================

    private async Task<(ApplicationUser? user, EffectivePrefs prefs)> LoadUserAndPrefsAsync(
        Guid userId,
        CancellationToken ct)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user is null)
        {
            _log.LogWarning("Raise*Async: user {UserId} not found — skipping", userId);
            return (null, EffectivePrefs.AllOn);
        }

        var row = await _db.UserSettings.AsNoTracking()
            .FirstOrDefaultAsync(s => s.UserId == userId, ct);
        return (user, EffectivePrefs.FromRow(row));
    }

    private async Task MaybeWriteInAppAsync(
        bool forceOn,
        Guid userId,
        NotificationType type,
        string title,
        string message,
        string? link,
        CancellationToken ct)
    {
        if (!forceOn) return;
        _db.Notifications.Add(new Notification
        {
            UserId = userId,
            Type = type,
            Title = title,
            Message = message,
            Link = link,
        });
        await _db.SaveChangesAsync(ct);
    }

    private string ToAbsolute(string relativePath)
    {
        if (string.IsNullOrEmpty(relativePath)) return _appBaseUrl;
        if (Uri.IsWellFormedUriString(relativePath, UriKind.Absolute)) return relativePath;
        return _appBaseUrl + (relativePath.StartsWith('/') ? relativePath : "/" + relativePath);
    }

    /// <summary>
    /// Effective per-event channel prefs. Defaults to all-on when no
    /// <see cref="UserSettings"/> row exists (matches the migration seed +
    /// lazy-init defaults; safer default for an opt-in pref model).
    /// </summary>
    private readonly record struct EffectivePrefs(
        bool NotifSubmissionEmail, bool NotifSubmissionInApp,
        bool NotifAuditEmail, bool NotifAuditInApp,
        bool NotifWeaknessEmail, bool NotifWeaknessInApp,
        bool NotifBadgeEmail, bool NotifBadgeInApp)
    {
        public static readonly EffectivePrefs AllOn = new(true, true, true, true, true, true, true, true);

        // Note: explicit Domain.Users qualifier — the sibling namespace
        // CodeMentor.Infrastructure.UserSettings (S14-T2 service folder) shadows the
        // type name here. Same pattern as ApplicationDbContext.cs (Domain.LearningCV.LearningCV).
        public static EffectivePrefs FromRow(Domain.Users.UserSettings? row) =>
            row is null
                ? AllOn
                : new EffectivePrefs(
                    row.NotifSubmissionEmail, row.NotifSubmissionInApp,
                    row.NotifAuditEmail, row.NotifAuditInApp,
                    row.NotifWeaknessEmail, row.NotifWeaknessInApp,
                    row.NotifBadgeEmail, row.NotifBadgeInApp);
    }
}

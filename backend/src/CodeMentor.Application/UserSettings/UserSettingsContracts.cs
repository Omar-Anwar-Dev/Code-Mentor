namespace CodeMentor.Application.UserSettings;

/// <summary>
/// S14-T2 / ADR-046: response payload for <c>GET /api/user/settings</c> and
/// <c>PATCH /api/user/settings</c>. Mirrors the <c>UserSettings</c> domain
/// entity 1-1 minus the internal <c>Id</c>/<c>UserId</c> identifiers (the
/// endpoint always scopes to the caller's identity, so neither value is needed
/// by the FE).
/// </summary>
public sealed record UserSettingsDto(
    bool NotifSubmissionEmail,
    bool NotifSubmissionInApp,
    bool NotifAuditEmail,
    bool NotifAuditInApp,
    bool NotifWeaknessEmail,
    bool NotifWeaknessInApp,
    bool NotifBadgeEmail,
    bool NotifBadgeInApp,
    bool NotifSecurityEmail,
    bool NotifSecurityInApp,
    bool ProfileDiscoverable,
    bool PublicCvDefault,
    bool ShowInLeaderboard,
    DateTime CreatedAt,
    DateTime UpdatedAt);

/// <summary>
/// S14-T2 / ADR-046: partial-update request for <c>PATCH /api/user/settings</c>.
/// Every field is nullable; only the fields the caller supplies are applied to
/// the persisted row. <c>NotifSecurity*</c> fields are accepted and persisted
/// as-is for FE display consistency, but the notification dispatcher
/// (S14-T5) bypasses these prefs at send time — security alerts always fire.
/// </summary>
public sealed record UserSettingsPatchRequest(
    bool? NotifSubmissionEmail = null,
    bool? NotifSubmissionInApp = null,
    bool? NotifAuditEmail = null,
    bool? NotifAuditInApp = null,
    bool? NotifWeaknessEmail = null,
    bool? NotifWeaknessInApp = null,
    bool? NotifBadgeEmail = null,
    bool? NotifBadgeInApp = null,
    bool? NotifSecurityEmail = null,
    bool? NotifSecurityInApp = null,
    bool? ProfileDiscoverable = null,
    bool? PublicCvDefault = null,
    bool? ShowInLeaderboard = null);

public interface IUserSettingsService
{
    /// <summary>
    /// Returns the caller's <c>UserSettings</c> row. If none exists (user
    /// created after the <c>AddUserSettings</c> migration's seed step), a
    /// default row is lazily created and returned. Always returns a valid DTO.
    /// </summary>
    Task<UserSettingsDto> GetForUserAsync(Guid userId, CancellationToken ct = default);

    /// <summary>
    /// Applies a partial update. Fields left null in <paramref name="patch"/>
    /// are not touched. Idempotent for repeat PATCHes with the same payload.
    /// Lazy-inits the row if absent (same default seeds as
    /// <see cref="GetForUserAsync"/>).
    /// </summary>
    Task<UserSettingsDto> UpdateForUserAsync(
        Guid userId,
        UserSettingsPatchRequest patch,
        CancellationToken ct = default);
}

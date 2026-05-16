namespace CodeMentor.Domain.Users;

/// <summary>
/// S14-T1 / ADR-046: per-user preferences for notifications + privacy. 1-1 with
/// User. A default row is created by the <c>AddUserSettings</c> migration's data
/// step for every existing user, and lazily by <c>UserSettingsService</c> on
/// first GET if absent.
///
/// Notification prefs are per-channel (email + in-app). Account-security
/// channels are persisted for FE display consistency but the backend ignores
/// them at dispatch time — security events are ALWAYS sent
/// (see <c>NotificationService.RaiseAsync</c> bypass).
/// </summary>
public class UserSettings
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>FK to <c>ApplicationUser.Id</c>. Unique — one row per user.</summary>
    public Guid UserId { get; set; }

    // ----- Notification prefs: 5 prefs × 2 channels. Defaults: all on.

    public bool NotifSubmissionEmail { get; set; } = true;
    public bool NotifSubmissionInApp { get; set; } = true;

    public bool NotifAuditEmail { get; set; } = true;
    public bool NotifAuditInApp { get; set; } = true;

    public bool NotifWeaknessEmail { get; set; } = true;
    public bool NotifWeaknessInApp { get; set; } = true;

    public bool NotifBadgeEmail { get; set; } = true;
    public bool NotifBadgeInApp { get; set; } = true;

    // 5th pref: account security. Persisted but ALWAYS-ON at dispatch (see class summary).
    public bool NotifSecurityEmail { get; set; } = true;
    public bool NotifSecurityInApp { get; set; } = true;

    // 6th pref (S20-T0 / ADR-061): path adaptation alerts. Pref-aware (NOT always-on).
    // Defaults ON so the headline F16 "AI proposed N changes" event surfaces by
    // default. Learners can opt out per channel via the settings page.
    public bool NotifAdaptationEmail { get; set; } = true;
    public bool NotifAdaptationInApp { get; set; } = true;

    // ----- Privacy toggles (3).

    /// <summary>Hides the user from learner-facing search + leaderboard surfaces. Admin still sees them.</summary>
    public bool ProfileDiscoverable { get; set; } = true;

    /// <summary>Default visibility for a freshly-created Learning CV. Existing CVs retain their own <c>IsPublic</c>.</summary>
    public bool PublicCvDefault { get; set; } = false;

    /// <summary>Reserved for the post-MVP leaderboard surface. Stored now so the FE can offer the toggle.</summary>
    public bool ShowInLeaderboard { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

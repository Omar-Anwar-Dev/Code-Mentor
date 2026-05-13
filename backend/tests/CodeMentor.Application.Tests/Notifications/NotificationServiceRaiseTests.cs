using CodeMentor.Application.Emails;
using CodeMentor.Application.Notifications;
using CodeMentor.Domain.Notifications;
using CodeMentor.Domain.Users;
using CodeMentor.Infrastructure.Emails;
using CodeMentor.Infrastructure.Identity;
using CodeMentor.Infrastructure.Notifications;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;

namespace CodeMentor.Application.Tests.Notifications;

/// <summary>
/// S14-T5 / ADR-046 acceptance — pref-aware suppression matrix for all 5
/// <c>RaiseXxxAsync</c> event paths. Covers:
/// <list type="bullet">
///   <item>All-on default (no <c>UserSettings</c> row) → both channels fire.</item>
///   <item>InApp pref off → no <c>Notification</c> row; email still sent.</item>
///   <item>Email pref off → <c>Notification</c> row written; <c>EmailDelivery</c>
///   row marked <c>Suppressed</c>.</item>
///   <item>Security event always-on — fires both channels even with all
///   prefs off (ADR-046 bypass).</item>
///   <item>User not found → silent no-op (no rows, no email).</item>
///   <item>Relative-path → absolute-URL conversion in email links.</item>
/// </list>
/// </summary>
public class NotificationServiceRaiseTests
{
    // ====== Test helpers ======

    private static ApplicationDbContext NewDb() => new(
        new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase($"raise_{Guid.NewGuid():N}")
            .Options);

    /// <summary>Real NotificationService wired with LoggedOnly provider.</summary>
    private static INotificationService NewService(
        ApplicationDbContext db,
        string? appBaseUrl = null)
    {
        var dict = new Dictionary<string, string?>();
        if (appBaseUrl is not null) dict["EmailDelivery:AppBaseUrl"] = appBaseUrl;
        IConfiguration cfg = new ConfigurationBuilder().AddInMemoryCollection(dict).Build();

        var renderer = new EmailTemplateRenderer(cfg);
        var provider = new LoggedOnlyEmailProvider(NullLogger<LoggedOnlyEmailProvider>.Instance);
        var delivery = new EmailDeliveryService(db, provider, NullLogger<EmailDeliveryService>.Instance);
        return new NotificationService(db, renderer, delivery, cfg, NullLogger<NotificationService>.Instance);
    }

    private static async Task<Guid> SeedUserAsync(
        ApplicationDbContext db,
        Domain.Users.UserSettings? settings = null)
    {
        var userId = Guid.NewGuid();
        db.Users.Add(new ApplicationUser
        {
            Id = userId,
            FullName = "Test Learner",
            UserName = $"test-{userId:N}@local",
            Email = $"test-{userId:N}@local",
            NormalizedEmail = $"TEST-{userId:N}@LOCAL".ToUpperInvariant(),
        });
        if (settings is not null)
        {
            settings.UserId = userId;
            db.UserSettings.Add(settings);
        }
        await db.SaveChangesAsync();
        return userId;
    }

    // ====== Default all-on (no UserSettings row) ======

    [Fact]
    public async Task RaiseFeedbackReady_NoSettingsRow_FiresBothChannels()
    {
        using var db = NewDb();
        var userId = await SeedUserAsync(db);
        var svc = NewService(db);

        await svc.RaiseFeedbackReadyAsync(userId, new FeedbackReadyEvent(
            TaskTitle: "Library System",
            OverallScore: 86,
            SubmissionRelativePath: "/submissions/abc"));

        // In-app row written:
        var notif = await db.Notifications.AsNoTracking().SingleAsync();
        Assert.Equal(NotificationType.FeedbackReady, notif.Type);
        Assert.Equal("/submissions/abc", notif.Link);
        Assert.Contains("86", notif.Message);
        // EmailDelivery row exists and was Sent:
        var email = await db.EmailDeliveries.AsNoTracking().SingleAsync();
        Assert.Equal("feedback-ready", email.Type);
        Assert.Equal(EmailDeliveryStatus.Sent, email.Status);
    }

    [Fact]
    public async Task RaiseAuditReady_NoSettingsRow_FiresBothChannels()
    {
        using var db = NewDb();
        var userId = await SeedUserAsync(db);
        var svc = NewService(db);

        await svc.RaiseAuditReadyAsync(userId, new AuditReadyEvent(
            ProjectName: "OnlineStore-Net",
            Grade: "B",
            OverallScore: 78,
            AuditRelativePath: "/audits/xyz"));

        var notif = await db.Notifications.AsNoTracking().SingleAsync();
        Assert.Equal(NotificationType.AuditReady, notif.Type);
        var email = await db.EmailDeliveries.AsNoTracking().SingleAsync();
        Assert.Equal("audit-ready", email.Type);
        Assert.Equal(EmailDeliveryStatus.Sent, email.Status);
    }

    [Fact]
    public async Task RaiseWeaknessDetected_NoSettingsRow_FiresBothChannels()
    {
        using var db = NewDb();
        var userId = await SeedUserAsync(db);
        var svc = NewService(db);

        await svc.RaiseWeaknessDetectedAsync(userId, new WeaknessDetectedEvent(
            CategoryDisplayName: "Readability",
            OccurrenceCount: 3,
            TotalReviewedCount: 5,
            LatestFeedbackRelativePath: "/submissions/latest"));

        var notif = await db.Notifications.AsNoTracking().SingleAsync();
        Assert.Equal(NotificationType.WeaknessDetected, notif.Type);
        Assert.Contains("Readability", notif.Title);
        var email = await db.EmailDeliveries.AsNoTracking().SingleAsync();
        Assert.Equal("weakness-detected", email.Type);
        Assert.Equal(EmailDeliveryStatus.Sent, email.Status);
    }

    [Fact]
    public async Task RaiseBadgeEarned_NoSettingsRow_FiresBothChannels_AndIncludesLevelInTitle()
    {
        using var db = NewDb();
        var userId = await SeedUserAsync(db);
        var svc = NewService(db);

        await svc.RaiseBadgeEarnedAsync(userId, new BadgeEarnedEvent(
            BadgeName: "First Steps",
            BadgeDescription: "First passing submission.",
            NewLevel: 2,
            AchievementsRelativePath: "/achievements"));

        var notif = await db.Notifications.AsNoTracking().SingleAsync();
        Assert.Equal(NotificationType.BadgeEarned, notif.Type);
        Assert.Contains("First Steps", notif.Title);
        Assert.Contains("level up to 2", notif.Title);
        var email = await db.EmailDeliveries.AsNoTracking().SingleAsync();
        Assert.Equal("badge-earned", email.Type);
    }

    // ====== In-app pref off → no Notification row, email still fires ======

    [Fact]
    public async Task RaiseFeedbackReady_InAppOff_OnlyEmailFires()
    {
        using var db = NewDb();
        var userId = await SeedUserAsync(db, new Domain.Users.UserSettings {NotifSubmissionInApp = false });
        var svc = NewService(db);

        await svc.RaiseFeedbackReadyAsync(userId, new FeedbackReadyEvent("T", 80, "/x"));

        Assert.Equal(0, await db.Notifications.AsNoTracking().CountAsync());
        var email = await db.EmailDeliveries.AsNoTracking().SingleAsync();
        Assert.Equal(EmailDeliveryStatus.Sent, email.Status);
    }

    [Fact]
    public async Task RaiseAuditReady_InAppOff_OnlyEmailFires()
    {
        using var db = NewDb();
        var userId = await SeedUserAsync(db, new Domain.Users.UserSettings {NotifAuditInApp = false });
        var svc = NewService(db);

        await svc.RaiseAuditReadyAsync(userId, new AuditReadyEvent("P", "A", 90, "/x"));

        Assert.Equal(0, await db.Notifications.AsNoTracking().CountAsync());
        Assert.Single(await db.EmailDeliveries.AsNoTracking().ToListAsync());
    }

    [Fact]
    public async Task RaiseWeaknessDetected_InAppOff_OnlyEmailFires()
    {
        using var db = NewDb();
        var userId = await SeedUserAsync(db, new Domain.Users.UserSettings {NotifWeaknessInApp = false });
        var svc = NewService(db);

        await svc.RaiseWeaknessDetectedAsync(userId, new WeaknessDetectedEvent("C", 3, 5, "/x"));

        Assert.Equal(0, await db.Notifications.AsNoTracking().CountAsync());
        Assert.Single(await db.EmailDeliveries.AsNoTracking().ToListAsync());
    }

    [Fact]
    public async Task RaiseBadgeEarned_InAppOff_OnlyEmailFires()
    {
        using var db = NewDb();
        var userId = await SeedUserAsync(db, new Domain.Users.UserSettings {NotifBadgeInApp = false });
        var svc = NewService(db);

        await svc.RaiseBadgeEarnedAsync(userId, new BadgeEarnedEvent("B", "D", null, "/x"));

        Assert.Equal(0, await db.Notifications.AsNoTracking().CountAsync());
        Assert.Single(await db.EmailDeliveries.AsNoTracking().ToListAsync());
    }

    // ====== Email pref off → in-app fires, EmailDelivery row marked Suppressed ======

    [Fact]
    public async Task RaiseFeedbackReady_EmailOff_InAppFires_EmailRowSuppressed()
    {
        using var db = NewDb();
        var userId = await SeedUserAsync(db, new Domain.Users.UserSettings {NotifSubmissionEmail = false });
        var svc = NewService(db);

        await svc.RaiseFeedbackReadyAsync(userId, new FeedbackReadyEvent("T", 80, "/x"));

        Assert.Single(await db.Notifications.AsNoTracking().ToListAsync());
        var email = await db.EmailDeliveries.AsNoTracking().SingleAsync();
        Assert.Equal(EmailDeliveryStatus.Suppressed, email.Status);
        Assert.Equal(0, email.AttemptCount);
    }

    [Fact]
    public async Task RaiseAuditReady_EmailOff_InAppFires_EmailRowSuppressed()
    {
        using var db = NewDb();
        var userId = await SeedUserAsync(db, new Domain.Users.UserSettings {NotifAuditEmail = false });
        var svc = NewService(db);

        await svc.RaiseAuditReadyAsync(userId, new AuditReadyEvent("P", "A", 90, "/x"));

        Assert.Single(await db.Notifications.AsNoTracking().ToListAsync());
        var email = await db.EmailDeliveries.AsNoTracking().SingleAsync();
        Assert.Equal(EmailDeliveryStatus.Suppressed, email.Status);
    }

    [Fact]
    public async Task RaiseWeaknessDetected_EmailOff_InAppFires_EmailRowSuppressed()
    {
        using var db = NewDb();
        var userId = await SeedUserAsync(db, new Domain.Users.UserSettings {NotifWeaknessEmail = false });
        var svc = NewService(db);

        await svc.RaiseWeaknessDetectedAsync(userId, new WeaknessDetectedEvent("C", 3, 5, "/x"));

        Assert.Single(await db.Notifications.AsNoTracking().ToListAsync());
        Assert.Equal(EmailDeliveryStatus.Suppressed,
            (await db.EmailDeliveries.AsNoTracking().SingleAsync()).Status);
    }

    [Fact]
    public async Task RaiseBadgeEarned_EmailOff_InAppFires_EmailRowSuppressed()
    {
        using var db = NewDb();
        var userId = await SeedUserAsync(db, new Domain.Users.UserSettings {NotifBadgeEmail = false });
        var svc = NewService(db);

        await svc.RaiseBadgeEarnedAsync(userId, new BadgeEarnedEvent("B", "D", null, "/x"));

        Assert.Single(await db.Notifications.AsNoTracking().ToListAsync());
        Assert.Equal(EmailDeliveryStatus.Suppressed,
            (await db.EmailDeliveries.AsNoTracking().SingleAsync()).Status);
    }

    // ====== Security: always-on bypass ======

    [Fact]
    public async Task RaiseSecurityAlert_AllPrefsOff_StillFiresBothChannels()
    {
        // Even with EVERY pref off, security events bypass the pref check entirely
        // and always dispatch both channels (ADR-046 always-on guarantee).
        using var db = NewDb();
        var userId = await SeedUserAsync(db, new Domain.Users.UserSettings
        {
            NotifSubmissionEmail = false,
            NotifSubmissionInApp = false,
            NotifAuditEmail = false,
            NotifAuditInApp = false,
            NotifWeaknessEmail = false,
            NotifWeaknessInApp = false,
            NotifBadgeEmail = false,
            NotifBadgeInApp = false,
            NotifSecurityEmail = false,
            NotifSecurityInApp = false,
        });
        var svc = NewService(db);

        await svc.RaiseSecurityAlertAsync(userId, new SecurityAlertEvent(
            EventName: "Account deletion requested",
            EventDetail: "Will hard-delete in 30 days unless you log in.",
            EventTimeUtc: DateTime.UtcNow,
            SettingsRelativePath: "/settings"));

        var notif = await db.Notifications.AsNoTracking().SingleAsync();
        Assert.Equal(NotificationType.SecurityAlert, notif.Type);
        Assert.Equal("Security alert", notif.Title);
        var email = await db.EmailDeliveries.AsNoTracking().SingleAsync();
        Assert.Equal("security-alert", email.Type);
        Assert.Equal(EmailDeliveryStatus.Sent, email.Status); // NOT Suppressed
    }

    // ====== User not found → silent no-op ======

    [Fact]
    public async Task Raise_UnknownUser_SilentNoOp()
    {
        using var db = NewDb();
        var svc = NewService(db);
        var unknownUserId = Guid.NewGuid();

        await svc.RaiseFeedbackReadyAsync(unknownUserId, new FeedbackReadyEvent("T", 80, "/x"));
        await svc.RaiseSecurityAlertAsync(unknownUserId, new SecurityAlertEvent(
            "Test", "Test", DateTime.UtcNow, "/settings"));

        Assert.Equal(0, await db.Notifications.AsNoTracking().CountAsync());
        Assert.Equal(0, await db.EmailDeliveries.AsNoTracking().CountAsync());
    }

    // ====== Relative-path → absolute-URL conversion ======

    [Fact]
    public async Task Raise_ConvertsRelativePathToAbsoluteUrlInEmail()
    {
        using var db = NewDb();
        var userId = await SeedUserAsync(db);
        var svc = NewService(db, appBaseUrl: "https://code-mentor.example.com");

        await svc.RaiseFeedbackReadyAsync(userId, new FeedbackReadyEvent(
            TaskTitle: "T",
            OverallScore: 80,
            SubmissionRelativePath: "/submissions/abc-123"));

        // In-app Link stays relative (FE prepends its own origin).
        var notif = await db.Notifications.AsNoTracking().SingleAsync();
        Assert.Equal("/submissions/abc-123", notif.Link);

        // Email body uses absolute URL with configured base.
        var email = await db.EmailDeliveries.AsNoTracking().SingleAsync();
        Assert.Contains("https://code-mentor.example.com/submissions/abc-123", email.BodyHtml);
        Assert.Contains("https://code-mentor.example.com/submissions/abc-123", email.BodyText);
    }
}

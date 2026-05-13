using CodeMentor.Application.Emails;
using CodeMentor.Infrastructure.Emails;
using Microsoft.Extensions.Configuration;

namespace CodeMentor.Application.Tests.Emails;

/// <summary>
/// S14-T4 / ADR-046 acceptance — every template renders with sample data,
/// surfaces its dynamic fields in BOTH HTML + plain-text variants, and
/// applies the shared Neon &amp; Glass brand wrapper consistently. The actual
/// pixel-render in Gmail / Outlook is verified at S14-T11 walkthrough; here
/// we test the content + structural invariants that any client must preserve.
/// </summary>
public class EmailTemplateRendererTests
{
    private static IEmailTemplateRenderer NewRenderer(string? appBaseUrl = null)
    {
        var dict = new Dictionary<string, string?>();
        if (appBaseUrl is not null) dict["EmailDelivery:AppBaseUrl"] = appBaseUrl;
        IConfiguration cfg = new ConfigurationBuilder().AddInMemoryCollection(dict).Build();
        return new EmailTemplateRenderer(cfg);
    }

    private static readonly Guid SampleUserId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private const string SampleTo = "learner@test.local";

    // ====== feedback-ready ======

    [Fact]
    public void Render_FeedbackReady_PutsSubjectAndScoreIntoBothBodies()
    {
        var renderer = NewRenderer();
        var msg = renderer.RenderFeedbackReady(
            SampleUserId,
            SampleTo,
            new FeedbackReadyEmailModel(
                UserFullName: "Omar Anwar",
                TaskTitle: "Library Management System",
                OverallScore: 86,
                SubmissionUrl: "http://localhost:5173/submissions/abc-123"));

        Assert.Equal("feedback-ready", msg.Type);
        Assert.Equal(SampleUserId, msg.UserId);
        Assert.Equal(SampleTo, msg.ToAddress);
        Assert.Contains("Library Management System", msg.Subject);
        Assert.Contains("86/100", msg.Subject);

        // Both body variants contain the dynamic data:
        foreach (var body in new[] { msg.BodyHtml, msg.BodyText })
        {
            Assert.Contains("Omar Anwar", body);
            Assert.Contains("Library Management System", body);
            Assert.Contains("86", body);
            Assert.Contains("http://localhost:5173/submissions/abc-123", body);
        }
    }

    [Theory]
    [InlineData(95, "Strong work")]
    [InlineData(72, "Good progress")]
    [InlineData(45, "room to grow")]
    public void Render_FeedbackReady_PicksScoreBandEncouragement(int score, string expectedSnippet)
    {
        var renderer = NewRenderer();
        var msg = renderer.RenderFeedbackReady(
            SampleUserId,
            SampleTo,
            new FeedbackReadyEmailModel("Omar", "Task X", score, "https://app/sub/1"));
        Assert.Contains(expectedSnippet, msg.BodyText);
    }

    // ====== audit-ready ======

    [Fact]
    public void Render_AuditReady_PutsGradeAndScoreIntoBothBodies()
    {
        var renderer = NewRenderer();
        var msg = renderer.RenderAuditReady(
            SampleUserId,
            SampleTo,
            new AuditReadyEmailModel(
                UserFullName: "Yara Khaled",
                ProjectName: "OnlineStore-Net",
                Grade: "B",
                OverallScore: 78,
                AuditUrl: "http://localhost:5173/audits/xyz"));

        Assert.Equal("audit-ready", msg.Type);
        Assert.Contains("OnlineStore-Net", msg.Subject);
        Assert.Contains("Grade B", msg.Subject);
        Assert.Contains("78/100", msg.Subject);

        foreach (var body in new[] { msg.BodyHtml, msg.BodyText })
        {
            Assert.Contains("Yara Khaled", body);
            Assert.Contains("OnlineStore-Net", body);
            Assert.Contains("B", body);
            Assert.Contains("78", body);
            Assert.Contains("http://localhost:5173/audits/xyz", body);
        }
    }

    // ====== weakness-detected ======

    [Fact]
    public void Render_WeaknessDetected_PutsCategoryAndOccurrenceCountIntoBothBodies()
    {
        var renderer = NewRenderer();
        var msg = renderer.RenderWeaknessDetected(
            SampleUserId,
            SampleTo,
            new WeaknessDetectedEmailModel(
                UserFullName: "Karim Adel",
                CategoryDisplayName: "Readability",
                OccurrenceCount: 3,
                TotalReviewedCount: 5,
                LatestFeedbackUrl: "http://localhost:5173/submissions/latest"));

        Assert.Equal("weakness-detected", msg.Type);
        Assert.Contains("Readability", msg.Subject);
        Assert.Contains("3 of 5", msg.Subject);

        foreach (var body in new[] { msg.BodyHtml, msg.BodyText })
        {
            Assert.Contains("Karim Adel", body);
            Assert.Contains("Readability", body);
            Assert.Contains("3", body);
            Assert.Contains("5", body);
            Assert.Contains("http://localhost:5173/submissions/latest", body);
        }
    }

    // ====== badge-earned ======

    [Fact]
    public void Render_BadgeEarned_WithLevel_PutsBadgeAndLevelIntoBothBodies()
    {
        var renderer = NewRenderer();
        var msg = renderer.RenderBadgeEarned(
            SampleUserId,
            SampleTo,
            new BadgeEarnedEmailModel(
                UserFullName: "Heba Ramy",
                BadgeName: "First Steps",
                BadgeDescription: "Completed your first submission with a passing score.",
                NewLevel: 2,
                AchievementsUrl: "http://localhost:5173/achievements"));

        Assert.Equal("badge-earned", msg.Type);
        Assert.Contains("First Steps", msg.Subject);
        Assert.Contains("level up", msg.Subject, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("2", msg.Subject);

        foreach (var body in new[] { msg.BodyHtml, msg.BodyText })
        {
            Assert.Contains("Heba Ramy", body);
            Assert.Contains("First Steps", body);
            Assert.Contains("Completed your first submission", body);
            Assert.Contains("Level 2", body);
            Assert.Contains("http://localhost:5173/achievements", body);
        }
    }

    [Fact]
    public void Render_BadgeEarned_NoLevel_OmitsLevelLine()
    {
        var renderer = NewRenderer();
        var msg = renderer.RenderBadgeEarned(
            SampleUserId,
            SampleTo,
            new BadgeEarnedEmailModel("Mostafa", "Quick Iteration", "Submitted 3 times in a day.", null, "https://app/x"));

        Assert.DoesNotContain("level up", msg.Subject, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("Level ", msg.BodyText);
    }

    // ====== security-alert ======

    [Fact]
    public void Render_SecurityAlert_PutsEventDataAndUtcTimeIntoBothBodies()
    {
        var renderer = NewRenderer();
        var alertTime = new DateTime(2026, 5, 13, 14, 30, 0, DateTimeKind.Utc);
        var msg = renderer.RenderSecurityAlert(
            SampleUserId,
            SampleTo,
            new SecurityAlertEmailModel(
                UserFullName: "Omar",
                EventName: "Account deletion requested",
                EventDetail: "Your account will be permanently deleted in 30 days unless you log in to cancel.",
                EventTimeUtc: alertTime,
                SettingsUrl: "http://localhost:5173/settings"));

        Assert.Equal("security-alert", msg.Type);
        Assert.Contains("Account deletion requested", msg.Subject);

        foreach (var body in new[] { msg.BodyHtml, msg.BodyText })
        {
            Assert.Contains("Account deletion requested", body);
            Assert.Contains("permanently deleted in 30 days", body);
            Assert.Contains("2026-05-13 14:30:00Z", body); // ISO-ish "u" format
        }
    }

    // ====== Brand wrapper consistency ======

    [Fact]
    public void AllTemplates_HtmlBody_ContainsBrandHeaderAndFooter()
    {
        var renderer = NewRenderer();
        var samples = new[]
        {
            renderer.RenderFeedbackReady(SampleUserId, SampleTo,
                new FeedbackReadyEmailModel("U", "T", 75, "http://localhost:5173/x")).BodyHtml,
            renderer.RenderAuditReady(SampleUserId, SampleTo,
                new AuditReadyEmailModel("U", "P", "A", 90, "http://localhost:5173/x")).BodyHtml,
            renderer.RenderWeaknessDetected(SampleUserId, SampleTo,
                new WeaknessDetectedEmailModel("U", "C", 3, 5, "http://localhost:5173/x")).BodyHtml,
            renderer.RenderBadgeEarned(SampleUserId, SampleTo,
                new BadgeEarnedEmailModel("U", "B", "D", 1, "http://localhost:5173/x")).BodyHtml,
            renderer.RenderSecurityAlert(SampleUserId, SampleTo,
                new SecurityAlertEmailModel("U", "E", "D", DateTime.UtcNow, "http://localhost:5173/x")).BodyHtml,
        };

        foreach (var html in samples)
        {
            // Brand identity:
            Assert.Contains("Code Mentor", html);
            Assert.Contains("linear-gradient", html); // signature gradient applied somewhere
            Assert.Contains("#06b6d4", html);          // cyan stop
            Assert.Contains("#ec4899", html);          // fuchsia stop
            // Outlook fallback:
            Assert.Contains("#8b5cf6", html);
            // Footer credits + settings link:
            Assert.Contains("Benha University", html);
            Assert.Contains("Prof. Mostafa El-Gendy", html);
            Assert.Contains("/settings", html);
            // Structural: table-based layout (Outlook-safe), inline CSS, no <div>.
            Assert.Contains("<table", html);
            Assert.DoesNotContain("<div", html);
        }
    }

    [Fact]
    public void AllTemplates_TextBody_ContainsBrandFooterAndSettingsLink()
    {
        var renderer = NewRenderer();
        var samples = new[]
        {
            renderer.RenderFeedbackReady(SampleUserId, SampleTo,
                new FeedbackReadyEmailModel("U", "T", 75, "https://app/x")).BodyText,
            renderer.RenderAuditReady(SampleUserId, SampleTo,
                new AuditReadyEmailModel("U", "P", "A", 90, "https://app/x")).BodyText,
            renderer.RenderWeaknessDetected(SampleUserId, SampleTo,
                new WeaknessDetectedEmailModel("U", "C", 3, 5, "https://app/x")).BodyText,
            renderer.RenderBadgeEarned(SampleUserId, SampleTo,
                new BadgeEarnedEmailModel("U", "B", "D", 1, "https://app/x")).BodyText,
            renderer.RenderSecurityAlert(SampleUserId, SampleTo,
                new SecurityAlertEmailModel("U", "E", "D", DateTime.UtcNow, "https://app/x")).BodyText,
        };

        foreach (var text in samples)
        {
            Assert.Contains("Code Mentor", text);
            Assert.Contains("Manage preferences:", text);
            Assert.Contains("/settings", text);
            Assert.Contains("Benha University", text);
        }
    }

    // ====== Configurable AppBaseUrl ======

    [Fact]
    public void Render_HonorsConfiguredAppBaseUrl()
    {
        var renderer = NewRenderer(appBaseUrl: "https://code-mentor.example.com");
        var msg = renderer.RenderFeedbackReady(SampleUserId, SampleTo,
            new FeedbackReadyEmailModel("U", "T", 75, "https://app/x"));

        // The footer-generated settings URL uses the configured base.
        Assert.Contains("https://code-mentor.example.com/settings", msg.BodyHtml);
        Assert.Contains("https://code-mentor.example.com/settings", msg.BodyText);
    }

    // ====== HTML escaping ======

    [Fact]
    public void Render_EscapesHtmlInDynamicFields()
    {
        var renderer = NewRenderer();
        var msg = renderer.RenderFeedbackReady(
            SampleUserId,
            SampleTo,
            new FeedbackReadyEmailModel(
                UserFullName: "<script>alert(1)</script>",
                TaskTitle: "Task & Co",
                OverallScore: 70,
                SubmissionUrl: "http://localhost:5173/x"));

        Assert.DoesNotContain("<script>alert(1)</script>", msg.BodyHtml);
        Assert.Contains("&lt;script&gt;", msg.BodyHtml);
        Assert.Contains("Task &amp; Co", msg.BodyHtml);
    }
}

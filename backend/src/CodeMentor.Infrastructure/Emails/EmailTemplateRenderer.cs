using System.Globalization;
using CodeMentor.Application.Emails;
using Microsoft.Extensions.Configuration;

namespace CodeMentor.Infrastructure.Emails;

/// <summary>
/// S14-T4 / ADR-046: builds <see cref="EmailMessage"/> instances from typed
/// model inputs for the 5 event types in scope:
/// <c>feedback-ready</c> / <c>audit-ready</c> / <c>weakness-detected</c> /
/// <c>badge-earned</c> / <c>security-alert</c>. Each method applies the
/// <see cref="BrandLayout"/> wrapper (gradient header + footer) and returns
/// HTML + plain-text variants. Caller passes the result to
/// <see cref="IEmailDeliveryService.SendAsync"/> for persist + dispatch.
///
/// App URL configuration: reads <c>EmailDelivery:AppBaseUrl</c> for absolute
/// link generation (e.g. <c>https://app.code-mentor.local</c>). Defaults to
/// <c>http://localhost:5173</c> for dev so tests + the live walkthrough work
/// without explicit configuration. The "settings" footer link is derived as
/// <c>{AppBaseUrl}/settings</c>.
/// </summary>
public sealed class EmailTemplateRenderer : IEmailTemplateRenderer
{
    private readonly string _settingsUrl;

    public EmailTemplateRenderer(IConfiguration config)
    {
        var appBaseUrl = config["EmailDelivery:AppBaseUrl"] ?? "http://localhost:5173";
        _settingsUrl = $"{appBaseUrl.TrimEnd('/')}/settings";
    }

    public EmailMessage RenderFeedbackReady(Guid userId, string toAddress, FeedbackReadyEmailModel m)
    {
        var subject = $"Your feedback on '{m.TaskTitle}' is ready — score {m.OverallScore}/100";

        var contentHtml = $@"<h1 style=""margin:0 0 16px 0;font-size:24px;font-weight:700;color:#111827;"">Your feedback is ready</h1>
<p style=""margin:0 0 8px 0;"">Hi {BrandLayout.Esc(m.UserFullName)},</p>
<p style=""margin:0 0 16px 0;"">We've finished reviewing your submission for <strong>{BrandLayout.Esc(m.TaskTitle)}</strong>. Your overall score is <strong style=""color:#7c3aed;font-size:18px;"">{m.OverallScore}/100</strong>.</p>
<p style=""margin:0 0 24px 0;"">{ScoreEncouragementHtml(m.OverallScore)}</p>
{BrandLayout.PrimaryButton(m.SubmissionUrl, "View feedback & recommendations")}";

        var contentText = $@"Your feedback is ready

Hi {m.UserFullName},

We've finished reviewing your submission for {m.TaskTitle}.
Your overall score is {m.OverallScore}/100.

{ScoreEncouragementText(m.OverallScore)}

View feedback: {m.SubmissionUrl}";

        return new EmailMessage(
            "feedback-ready",
            userId,
            toAddress,
            subject,
            BrandLayout.WrapHtml(subject, "Submission Feedback", contentHtml, _settingsUrl),
            BrandLayout.WrapText("Submission Feedback", contentText, _settingsUrl));
    }

    public EmailMessage RenderAuditReady(Guid userId, string toAddress, AuditReadyEmailModel m)
    {
        var subject = $"Your project audit on '{m.ProjectName}' is ready — Grade {m.Grade} ({m.OverallScore}/100)";

        var contentHtml = $@"<h1 style=""margin:0 0 16px 0;font-size:24px;font-weight:700;color:#111827;"">Your project audit is ready</h1>
<p style=""margin:0 0 8px 0;"">Hi {BrandLayout.Esc(m.UserFullName)},</p>
<p style=""margin:0 0 16px 0;"">The audit of your project <strong>{BrandLayout.Esc(m.ProjectName)}</strong> has finished.</p>
<table role=""presentation"" cellspacing=""0"" cellpadding=""0"" border=""0"" style=""margin:0 0 24px 0;"">
<tr>
<td style=""padding:12px 20px;border-radius:8px;background:#f5f3ff;color:#7c3aed;font-size:28px;font-weight:700;text-align:center;min-width:60px;"">{BrandLayout.Esc(m.Grade)}</td>
<td style=""padding:0 0 0 16px;color:#4b5563;font-size:15px;"">Overall score <strong style=""color:#111827;"">{m.OverallScore}/100</strong></td>
</tr></table>
<p style=""margin:0 0 24px 0;"">The full audit covers strengths, critical issues, suggested fixes, tech-stack assessment, and 5 recommended improvements with priority levels.</p>
{BrandLayout.PrimaryButton(m.AuditUrl, "View audit report")}";

        var contentText = $@"Your project audit is ready

Hi {m.UserFullName},

The audit of your project {m.ProjectName} has finished.
Grade: {m.Grade}    Score: {m.OverallScore}/100

The full audit covers strengths, critical issues, suggested fixes,
tech-stack assessment, and 5 recommended improvements with priorities.

View audit: {m.AuditUrl}";

        return new EmailMessage(
            "audit-ready",
            userId,
            toAddress,
            subject,
            BrandLayout.WrapHtml(subject, "Project Audit", contentHtml, _settingsUrl),
            BrandLayout.WrapText("Project Audit", contentText, _settingsUrl));
    }

    public EmailMessage RenderWeaknessDetected(Guid userId, string toAddress, WeaknessDetectedEmailModel m)
    {
        var subject = $"Recurring pattern: {m.CategoryDisplayName} ({m.OccurrenceCount} of {m.TotalReviewedCount} reviews)";

        var contentHtml = $@"<h1 style=""margin:0 0 16px 0;font-size:24px;font-weight:700;color:#111827;"">A recurring pattern in your reviews</h1>
<p style=""margin:0 0 8px 0;"">Hi {BrandLayout.Esc(m.UserFullName)},</p>
<p style=""margin:0 0 16px 0;"">We've spotted <strong style=""color:#7c3aed;"">{BrandLayout.Esc(m.CategoryDisplayName)}</strong> coming up in <strong>{m.OccurrenceCount} of your last {m.TotalReviewedCount} reviews</strong>. Catching this pattern early lets you target it before it slows down future work.</p>
<p style=""margin:0 0 24px 0;color:#4b5563;font-style:italic;"">The latest feedback has specific examples + suggested fixes for this category.</p>
{BrandLayout.PrimaryButton(m.LatestFeedbackUrl, "Review the latest feedback")}";

        var contentText = $@"A recurring pattern in your reviews

Hi {m.UserFullName},

We've spotted {m.CategoryDisplayName} coming up in
{m.OccurrenceCount} of your last {m.TotalReviewedCount} reviews.

Catching this pattern early lets you target it before it slows down
future work. The latest feedback has specific examples + suggested fixes.

Review feedback: {m.LatestFeedbackUrl}";

        return new EmailMessage(
            "weakness-detected",
            userId,
            toAddress,
            subject,
            BrandLayout.WrapHtml(subject, "Recurring Pattern", contentHtml, _settingsUrl),
            BrandLayout.WrapText("Recurring Pattern", contentText, _settingsUrl));
    }

    public EmailMessage RenderBadgeEarned(Guid userId, string toAddress, BadgeEarnedEmailModel m)
    {
        var subject = m.NewLevel.HasValue
            ? $"You earned the '{m.BadgeName}' badge — level up to {m.NewLevel}!"
            : $"You earned the '{m.BadgeName}' badge!";

        var levelLine = m.NewLevel.HasValue
            ? $@"<p style=""margin:0 0 16px 0;color:#7c3aed;font-weight:600;"">You also leveled up to <strong>Level {m.NewLevel.Value}</strong>.</p>"
            : "";

        var contentHtml = $@"<h1 style=""margin:0 0 16px 0;font-size:24px;font-weight:700;color:#111827;"">Badge earned: {BrandLayout.Esc(m.BadgeName)}</h1>
<p style=""margin:0 0 8px 0;"">Hi {BrandLayout.Esc(m.UserFullName)},</p>
<p style=""margin:0 0 16px 0;"">{BrandLayout.Esc(m.BadgeDescription)}</p>
{levelLine}
<p style=""margin:0 0 24px 0;"">Keep going — every submission is a step.</p>
{BrandLayout.PrimaryButton(m.AchievementsUrl, "View achievements")}";

        var levelLineText = m.NewLevel.HasValue
            ? $"\nYou also leveled up to Level {m.NewLevel.Value}.\n"
            : "";

        var contentText = $@"Badge earned: {m.BadgeName}

Hi {m.UserFullName},

{m.BadgeDescription}
{levelLineText}
Keep going — every submission is a step.

View achievements: {m.AchievementsUrl}";

        return new EmailMessage(
            "badge-earned",
            userId,
            toAddress,
            subject,
            BrandLayout.WrapHtml(subject, "Achievement", contentHtml, _settingsUrl),
            BrandLayout.WrapText("Achievement", contentText, _settingsUrl));
    }

    public EmailMessage RenderSecurityAlert(Guid userId, string toAddress, SecurityAlertEmailModel m)
    {
        var subject = $"Security alert: {m.EventName}";
        var formattedTime = m.EventTimeUtc.ToString("u", CultureInfo.InvariantCulture);

        var contentHtml = $@"<h1 style=""margin:0 0 16px 0;font-size:24px;font-weight:700;color:#dc2626;"">Security alert</h1>
<p style=""margin:0 0 8px 0;"">Hi {BrandLayout.Esc(m.UserFullName)},</p>
<p style=""margin:0 0 16px 0;"">A security-relevant event occurred on your Code Mentor account:</p>
<table role=""presentation"" cellspacing=""0"" cellpadding=""0"" border=""0"" style=""margin:0 0 16px 0;background:#fef2f2;border-left:4px solid #dc2626;border-radius:6px;padding:12px 16px;"">
<tr><td>
<p style=""margin:0 0 4px 0;font-weight:700;color:#991b1b;font-size:14px;"">{BrandLayout.Esc(m.EventName)}</p>
<p style=""margin:0 0 4px 0;color:#4b5563;font-size:14px;"">{BrandLayout.Esc(m.EventDetail)}</p>
<p style=""margin:0;color:#6b7280;font-size:12px;font-family:'JetBrains Mono','Courier New',monospace;"">{BrandLayout.Esc(formattedTime)} UTC</p>
</td></tr></table>
<p style=""margin:0 0 24px 0;"">If this was you, no action needed. If it wasn't, sign out of all devices and change your password immediately.</p>
{BrandLayout.PrimaryButton(m.SettingsUrl, "Review account settings")}";

        var contentText = $@"Security alert

Hi {m.UserFullName},

A security-relevant event occurred on your Code Mentor account:

  {m.EventName}
  {m.EventDetail}
  {formattedTime} UTC

If this was you, no action needed. If it wasn't, sign out of all
devices and change your password immediately.

Account settings: {m.SettingsUrl}";

        return new EmailMessage(
            "security-alert",
            userId,
            toAddress,
            subject,
            BrandLayout.WrapHtml(subject, "Security", contentHtml, _settingsUrl),
            BrandLayout.WrapText("Security", contentText, _settingsUrl));
    }

    public EmailMessage RenderDataExportReady(Guid userId, string toAddress, DataExportReadyEmailModel m)
    {
        var subject = "Your Code Mentor data export is ready";
        var sizeDisplay = FormatBytes(m.ZipFileSizeBytes);
        var expiresUtc = m.ExpiresAtUtc.ToString("u", CultureInfo.InvariantCulture);

        var contentHtml = $@"<h1 style=""margin:0 0 16px 0;font-size:24px;font-weight:700;color:#111827;"">Your data export is ready</h1>
<p style=""margin:0 0 8px 0;"">Hi {BrandLayout.Esc(m.UserFullName)},</p>
<p style=""margin:0 0 16px 0;"">We've packaged your account data into a ZIP archive ({BrandLayout.Esc(sizeDisplay)}). It includes 6 JSON files (profile, submissions, audits, assessments, gamification, notifications) plus a human-readable PDF dossier.</p>
<table role=""presentation"" cellspacing=""0"" cellpadding=""0"" border=""0"" style=""margin:0 0 16px 0;background:#f5f3ff;border-left:4px solid #7c3aed;border-radius:6px;padding:12px 16px;"">
<tr><td>
<p style=""margin:0;color:#6b21a8;font-size:13px;""><strong>Link expires:</strong> <span style=""font-family:'JetBrains Mono','Courier New',monospace;"">{BrandLayout.Esc(expiresUtc)} UTC</span> &nbsp; (1 hour from now)</p>
</td></tr></table>
{BrandLayout.PrimaryButton(m.DownloadUrl, "Download your data")}
<p style=""margin:24px 0 0 0;color:#6b7280;font-size:13px;"">After the link expires you can request a fresh export from your account settings at any time.</p>";

        var contentText = $@"Your data export is ready

Hi {m.UserFullName},

We've packaged your account data into a ZIP archive ({sizeDisplay}). It includes
6 JSON files (profile, submissions, audits, assessments, gamification,
notifications) plus a human-readable PDF dossier.

Link expires: {expiresUtc} UTC  (1 hour from now)

Download: {m.DownloadUrl}

After the link expires you can request a fresh export from your account
settings at any time.";

        return new EmailMessage(
            "data-export-ready",
            userId,
            toAddress,
            subject,
            BrandLayout.WrapHtml(subject, "Data Export", contentHtml, _settingsUrl),
            BrandLayout.WrapText("Data Export", contentText, _settingsUrl));
    }

    // ---- helpers ----

    private static string FormatBytes(long bytes)
    {
        if (bytes < 1024) return $"{bytes} B";
        if (bytes < 1024 * 1024) return $"{bytes / 1024.0:F1} KB";
        return $"{bytes / (1024.0 * 1024.0):F1} MB";
    }


    private static string ScoreEncouragementHtml(int score) =>
        score >= 80
            ? @"<span style=""color:#10b981;font-weight:600;"">Strong work</span> — your fundamentals are solid. The detailed feedback below highlights what worked and where you can push further."
            : score >= 60
                ? @"<span style=""color:#f59e0b;font-weight:600;"">Good progress</span> — review the recommendations to push higher next time."
                : @"<span style=""color:#dc2626;font-weight:600;"">There's room to grow</span> — the recommendations focus on the highest-impact changes you can make.";

    private static string ScoreEncouragementText(int score) =>
        score >= 80 ? "Strong work — your fundamentals are solid. The detailed feedback highlights what worked and where you can push further."
        : score >= 60 ? "Good progress — review the recommendations to push higher next time."
        : "There's room to grow — the recommendations focus on the highest-impact changes you can make.";
}

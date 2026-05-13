namespace CodeMentor.Application.Emails;

/// <summary>
/// S14-T3 / ADR-046: provider-agnostic outbound email payload. The same record
/// flows into both <c>SendGridEmailProvider</c> (real SMTP) and
/// <c>LoggedOnlyEmailProvider</c> (dev/R18-fallback), and is persisted on
/// <c>EmailDelivery</c> for audit + retry.
/// </summary>
/// <param name="Type">
/// Logical event key matching the template (e.g. <c>feedback-ready</c>,
/// <c>audit-ready</c>, <c>weakness-detected</c>, <c>badge-earned</c>,
/// <c>security-alert</c>, <c>data-export-ready</c>,
/// <c>account-deletion-requested</c>, <c>account-restored</c>).
/// </param>
public sealed record EmailMessage(
    string Type,
    Guid UserId,
    string ToAddress,
    string Subject,
    string BodyHtml,
    string BodyText);

/// <summary>
/// S14-T3 / ADR-046: outcome of a single provider dispatch attempt. On transient
/// failures the provider returns <c>(Success=false, Error=...)</c> instead of
/// throwing, so <c>EmailDeliveryService</c> can persist the row + retry via
/// <c>EmailRetryJob</c> without unwinding the calling stack.
/// </summary>
public sealed record EmailDispatchResult(
    bool Success,
    string? ProviderMessageId,
    string? Error);

/// <summary>
/// S14-T3 / ADR-046: pluggable email provider. Two implementations:
/// <c>SendGridEmailProvider</c> (real SMTP, free tier 100/day) and
/// <c>LoggedOnlyEmailProvider</c> (dev/test default + R18 demo-day fallback).
/// Selected at DI time by the <c>EmailDelivery:Provider</c> config key.
/// </summary>
public interface IEmailProvider
{
    /// <summary>Diagnostic name — <c>"SendGrid"</c> or <c>"LoggedOnly"</c>.</summary>
    string Name { get; }

    /// <summary>
    /// Dispatch the email. Never throws on transient failures (network, 5xx,
    /// rate-limit) — returns <c>(false, error)</c> so the caller can persist
    /// and retry. Only throws if the operation is cancelled.
    /// </summary>
    Task<EmailDispatchResult> SendAsync(EmailMessage message, CancellationToken ct = default);
}

/// <summary>
/// S14-T3 / ADR-046: persist-then-dispatch orchestrator.
/// <list type="number">
///   <item>Insert <c>EmailDelivery</c> row with <c>Status=Pending</c>
///   (or <c>Status=Suppressed</c> when caller-provided <c>suppress=true</c>).</item>
///   <item>Dispatch via the configured <see cref="IEmailProvider"/>.</item>
///   <item>Update the row: <c>Sent</c>+<c>SentAt</c>+<c>ProviderMessageId</c> on success;
///   <c>Pending</c>+exponential <c>NextAttemptAt</c> on retryable failure;
///   <c>Failed</c> after <c>EmailDeliveryService.MaxAttempts</c> tries.</item>
/// </list>
/// </summary>
public interface IEmailDeliveryService
{
    /// <summary>
    /// Persist + dispatch (or persist as <c>Suppressed</c> and skip dispatch when
    /// <paramref name="suppress"/> is true). Returns the EmailDelivery row id.
    /// </summary>
    Task<Guid> SendAsync(EmailMessage message, bool suppress, CancellationToken ct = default);
}

// ============================================================
// S14-T4 / ADR-046: 5 strongly-typed email template inputs + renderer interface.
// Templates are inline-C# (not file-based) so callers get compile-time safety
// on field names. The brand wrapper (Neon & Glass header + footer) is applied
// uniformly via BrandLayout — see EmailTemplateRenderer.
// ============================================================

public sealed record FeedbackReadyEmailModel(
    string UserFullName,
    string TaskTitle,
    int OverallScore,
    string SubmissionUrl);

public sealed record AuditReadyEmailModel(
    string UserFullName,
    string ProjectName,
    string Grade,
    int OverallScore,
    string AuditUrl);

public sealed record WeaknessDetectedEmailModel(
    string UserFullName,
    string CategoryDisplayName,
    int OccurrenceCount,
    int TotalReviewedCount,
    string LatestFeedbackUrl);

public sealed record BadgeEarnedEmailModel(
    string UserFullName,
    string BadgeName,
    string BadgeDescription,
    int? NewLevel,
    string AchievementsUrl);

public sealed record SecurityAlertEmailModel(
    string UserFullName,
    string EventName,
    string EventDetail,
    DateTime EventTimeUtc,
    string SettingsUrl);

/// <summary>
/// S14-T8 / ADR-046: data export ready. <c>DownloadUrl</c> is a signed
/// blob-storage SAS URL with a short TTL (typically 1 hour). The footer of the
/// email reiterates the expiry time so the user knows the link won't work past
/// it. <c>ZipFileSizeKb</c> is for UX preview ("~840 KB").
/// </summary>
public sealed record DataExportReadyEmailModel(
    string UserFullName,
    string DownloadUrl,
    DateTime ExpiresAtUtc,
    long ZipFileSizeBytes);

/// <summary>
/// S14-T4 / ADR-046: builds <see cref="EmailMessage"/> instances from typed
/// model inputs. Each method returns a ready-to-dispatch message (subject +
/// HTML + plain-text) with the Code Mentor Neon &amp; Glass brand wrapper applied
/// inline-CSS so Outlook + Gmail render the gradient header consistently.
/// </summary>
public interface IEmailTemplateRenderer
{
    EmailMessage RenderFeedbackReady(Guid userId, string toAddress, FeedbackReadyEmailModel model);
    EmailMessage RenderAuditReady(Guid userId, string toAddress, AuditReadyEmailModel model);
    EmailMessage RenderWeaknessDetected(Guid userId, string toAddress, WeaknessDetectedEmailModel model);
    EmailMessage RenderBadgeEarned(Guid userId, string toAddress, BadgeEarnedEmailModel model);
    EmailMessage RenderSecurityAlert(Guid userId, string toAddress, SecurityAlertEmailModel model);

    /// <summary>S14-T8 / ADR-046: data export ready (signed download link + expiry).</summary>
    EmailMessage RenderDataExportReady(Guid userId, string toAddress, DataExportReadyEmailModel model);
}

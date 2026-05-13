namespace CodeMentor.Domain.Users;

/// <summary>
/// S14-T1 / ADR-046: persisted audit row per email send attempt. Written by
/// both <c>SendGridEmailProvider</c> (real SMTP) and <c>LoggedOnlyEmailProvider</c>
/// (dev / R18-fallback mode) so admin always has visibility into "what was
/// sent" or "what would have been sent."
///
/// Retry semantics: <c>EmailRetryJob</c> (Hangfire, every 5 min) picks up rows
/// with <c>Status=Pending</c> and <c>AttemptCount &lt; 3</c>, exponential
/// backoff via <c>NextAttemptAt</c>. After 3 failed attempts <c>Status=Failed</c>.
/// Rows with <c>Status=Suppressed</c> record that delivery was skipped due to
/// user prefs (kept for admin transparency).
/// </summary>
public class EmailDelivery
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }

    /// <summary>
    /// Logical event key (matches the matching template file in
    /// <c>CodeMentor.Infrastructure/Emails/Templates/*.html</c>):
    /// <c>feedback-ready</c> · <c>audit-ready</c> · <c>weakness-detected</c>
    /// · <c>badge-earned</c> · <c>security-alert</c> · <c>data-export-ready</c>
    /// · <c>account-deletion-requested</c> · <c>account-restored</c>.
    /// </summary>
    public string Type { get; set; } = string.Empty;

    public string ToAddress { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string BodyHtml { get; set; } = string.Empty;
    public string BodyText { get; set; } = string.Empty;

    public EmailDeliveryStatus Status { get; set; } = EmailDeliveryStatus.Pending;

    /// <summary>Provider response id (e.g. SendGrid <c>X-Message-Id</c>) on success; null otherwise.</summary>
    public string? ProviderMessageId { get; set; }

    public string? LastError { get; set; }
    public int AttemptCount { get; set; } = 0;
    public DateTime? NextAttemptAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? SentAt { get; set; }
}

public enum EmailDeliveryStatus
{
    Pending = 1,
    Sent = 2,
    Failed = 3,

    /// <summary>Skipped at dispatch time because the user's matching pref is off.</summary>
    Suppressed = 4,
}

using CodeMentor.Application.Emails;
using CodeMentor.Domain.Users;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.Extensions.Logging;

namespace CodeMentor.Infrastructure.Emails;

/// <summary>
/// S14-T3 / ADR-046: orchestrates the persist-then-dispatch flow for outbound
/// email. Always writes an <see cref="EmailDelivery"/> row first so admin has
/// visibility into every send attempt (whether it ultimately ships via SendGrid,
/// is logged-only, or is suppressed by user prefs). The dispatcher then
/// transitions the row state based on the provider result. Retry is driven by
/// <c>EmailRetryJob</c> via the internal <see cref="TryDispatchAsync"/> seam.
///
/// Retry policy: up to <see cref="MaxAttempts"/> total tries per row.
/// Backoff: 5 minutes → 25 minutes (exponential, base 5).
/// </summary>
public sealed class EmailDeliveryService : IEmailDeliveryService
{
    /// <summary>Maximum total dispatch attempts per row (initial + 2 retries).</summary>
    public const int MaxAttempts = 3;

    private readonly ApplicationDbContext _db;
    private readonly IEmailProvider _provider;
    private readonly ILogger<EmailDeliveryService> _log;

    public EmailDeliveryService(
        ApplicationDbContext db,
        IEmailProvider provider,
        ILogger<EmailDeliveryService> log)
    {
        _db = db;
        _provider = provider;
        _log = log;
    }

    public async Task<Guid> SendAsync(EmailMessage message, bool suppress, CancellationToken ct = default)
    {
        var row = new EmailDelivery
        {
            UserId = message.UserId,
            Type = message.Type,
            ToAddress = message.ToAddress,
            Subject = message.Subject,
            BodyHtml = message.BodyHtml,
            BodyText = message.BodyText,
            Status = suppress ? EmailDeliveryStatus.Suppressed : EmailDeliveryStatus.Pending,
            AttemptCount = 0,
            CreatedAt = DateTime.UtcNow,
        };
        _db.EmailDeliveries.Add(row);
        await _db.SaveChangesAsync(ct);

        if (suppress)
        {
            _log.LogInformation(
                "EmailDelivery suppressed by user pref (type={Type} userId={UserId} rowId={RowId})",
                message.Type, message.UserId, row.Id);
            return row.Id;
        }

        await TryDispatchAsync(row, ct);
        return row.Id;
    }

    /// <summary>
    /// Single dispatch attempt against the provider. Increments
    /// <c>AttemptCount</c>, updates the row's status/error/next-retry, and
    /// persists. Shared by <see cref="SendAsync"/> (initial attempt) and
    /// <c>EmailRetryJob</c> (subsequent attempts). Public for the retry job
    /// + test-suite seams; NOT exposed on <see cref="IEmailDeliveryService"/>
    /// since external callers always go through <see cref="SendAsync"/>.
    /// </summary>
    public async Task TryDispatchAsync(EmailDelivery row, CancellationToken ct)
    {
        row.AttemptCount += 1;
        var message = new EmailMessage(
            row.Type, row.UserId, row.ToAddress, row.Subject, row.BodyHtml, row.BodyText);
        var result = await _provider.SendAsync(message, ct);

        if (result.Success)
        {
            row.Status = EmailDeliveryStatus.Sent;
            row.SentAt = DateTime.UtcNow;
            row.ProviderMessageId = result.ProviderMessageId;
            row.LastError = null;
            row.NextAttemptAt = null;
        }
        else if (row.AttemptCount >= MaxAttempts)
        {
            row.Status = EmailDeliveryStatus.Failed;
            row.LastError = result.Error;
            row.NextAttemptAt = null;
            _log.LogWarning(
                "EmailDelivery exhausted {Max} attempts for type={Type} rowId={RowId}: {Error}",
                MaxAttempts, row.Type, row.Id, result.Error);
        }
        else
        {
            row.Status = EmailDeliveryStatus.Pending;
            row.LastError = result.Error;
            // Exponential: 5min, 25min, ... base 5 keeps the retry rhythm
            // inside the cap-3 budget reasonable while still bounded.
            row.NextAttemptAt = DateTime.UtcNow
                + TimeSpan.FromMinutes(5 * Math.Pow(5, row.AttemptCount - 1));
        }

        await _db.SaveChangesAsync(ct);
    }
}

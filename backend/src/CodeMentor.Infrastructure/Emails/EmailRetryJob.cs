using CodeMentor.Domain.Users;
using CodeMentor.Infrastructure.Persistence;
using Hangfire;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace CodeMentor.Infrastructure.Emails;

/// <summary>
/// S14-T3 / ADR-046: Hangfire recurring job. Every 5 minutes scans for
/// <see cref="EmailDelivery"/> rows where <c>Status=Pending</c>,
/// <c>AttemptCount &lt; EmailDeliveryService.MaxAttempts</c>, and
/// <c>NextAttemptAt &lt;= now</c>, then calls back into
/// <c>EmailDeliveryService.TryDispatchAsync</c> for each — keeping retry
/// semantics in one place. <c>AutomaticRetry(Attempts=0)</c> disables Hangfire's
/// own retry layer because per-row retries are encoded in the row itself,
/// not in Hangfire job state.
/// </summary>
public sealed class EmailRetryJob
{
    public const string RecurringJobId = "email-retry";
    public const string Cron = "*/5 * * * *"; // every 5 minutes

    /// <summary>Cap rows processed per run so a backlog doesn't starve the worker.</summary>
    public const int BatchSize = 50;

    private readonly ApplicationDbContext _db;
    private readonly EmailDeliveryService _delivery;
    private readonly ILogger<EmailRetryJob> _log;

    public EmailRetryJob(
        ApplicationDbContext db,
        EmailDeliveryService delivery,
        ILogger<EmailRetryJob> log)
    {
        _db = db;
        _delivery = delivery;
        _log = log;
    }

    [AutomaticRetry(Attempts = 0)]
    public async Task ExecuteAsync(CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        var due = await _db.EmailDeliveries
            .Where(d => d.Status == EmailDeliveryStatus.Pending
                && d.AttemptCount < EmailDeliveryService.MaxAttempts
                && (d.NextAttemptAt == null || d.NextAttemptAt <= now))
            .OrderBy(d => d.CreatedAt)
            .Take(BatchSize)
            .ToListAsync(ct);

        if (due.Count == 0) return;

        _log.LogInformation("EmailRetryJob: dispatching {Count} pending rows", due.Count);

        foreach (var row in due)
        {
            ct.ThrowIfCancellationRequested();
            try
            {
                await _delivery.TryDispatchAsync(row, ct);
            }
            catch (OperationCanceledException)
            {
                throw;
            }
            catch (Exception ex)
            {
                // The row was not saved (TryDispatchAsync saves at the end). Leave it as-is;
                // it will be picked up again on the next run. Logged so this isn't silent.
                _log.LogError(ex, "EmailRetryJob: row {RowId} dispatch threw — leaving for next run", row.Id);
            }
        }
    }
}

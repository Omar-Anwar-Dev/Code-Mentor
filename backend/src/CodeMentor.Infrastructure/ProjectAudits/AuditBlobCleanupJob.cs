using System.Text.Json;
using CodeMentor.Application.Storage;
using CodeMentor.Domain.Audit;
using CodeMentor.Domain.ProjectAudits;
using CodeMentor.Infrastructure.Persistence;
using Hangfire;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace CodeMentor.Infrastructure.ProjectAudits;

/// <summary>
/// S9-T13 / F11 (ADR-033): Hangfire recurring job. Daily at ~03:00 UTC, deletes
/// every blob in <see cref="BlobContainers.Audits"/> whose owning
/// <see cref="ProjectAudit"/> row was created more than 90 days ago. The metadata
/// row is preserved (the audit report itself is yours to keep — only the source
/// code is purged), but <c>BlobPath</c> is nulled and an <see cref="AuditLog"/>
/// row is written for traceability.
///
/// Registered as a <see cref="RecurringJob"/> in Program.cs at startup. The test
/// harness skips registration via <c>Hangfire:SkipSmokeJob</c> so InMemory tests
/// don't need a Hangfire SQL backend.
/// </summary>
public sealed class AuditBlobCleanupJob
{
    /// <summary>Stable Hangfire recurring-job ID — used in `RecurringJob.AddOrUpdate`.</summary>
    public const string RecurringJobId = "audit-blob-cleanup";

    /// <summary>ADR-033: 90-day retention. Centralized so tests can verify the policy.</summary>
    public static readonly TimeSpan RetentionWindow = TimeSpan.FromDays(90);

    private static readonly JsonSerializerOptions LogJson = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false,
    };

    private readonly ApplicationDbContext _db;
    private readonly IBlobStorage _blobs;
    private readonly ILogger<AuditBlobCleanupJob> _logger;

    public AuditBlobCleanupJob(
        ApplicationDbContext db,
        IBlobStorage blobs,
        ILogger<AuditBlobCleanupJob> logger)
    {
        _db = db;
        _blobs = blobs;
        _logger = logger;
    }

    /// <summary>
    /// Hangfire entrypoint. Runs once when triggered (daily by the recurring
    /// schedule). Idempotent: re-runs find nothing to delete because the prior
    /// run nulled <c>BlobPath</c>.
    /// </summary>
    [DisableConcurrentExecution(timeoutInSeconds: 300)]
    public async Task RunAsync(CancellationToken ct = default)
    {
        var cutoff = DateTime.UtcNow - RetentionWindow;
        _logger.LogInformation(
            "AuditBlobCleanupJob: scanning ProjectAudits.CreatedAt < {Cutoff:O} for blobs to purge",
            cutoff);

        // Pull only what we need — Id + BlobPath. EF tracking off; we re-load with
        // tracking inside the loop so the BlobPath=null update is committed cleanly.
        var stale = await _db.ProjectAudits
            .AsNoTracking()
            .Where(a => a.BlobPath != null && a.CreatedAt < cutoff)
            .Select(a => new { a.Id, a.UserId, a.BlobPath })
            .ToListAsync(ct);

        if (stale.Count == 0)
        {
            _logger.LogInformation("AuditBlobCleanupJob: nothing to clean — done.");
            return;
        }

        var deleted = 0;
        var failed = 0;

        foreach (var row in stale)
        {
            try
            {
                await _blobs.DeleteAsync(BlobContainers.Audits, row.BlobPath!, ct);

                // Re-load tracked + null the BlobPath. Skip if someone else already
                // nulled it (defense against concurrent re-runs).
                var tracked = await _db.ProjectAudits
                    .FirstOrDefaultAsync(a => a.Id == row.Id, ct);
                if (tracked is null || tracked.BlobPath is null) continue;

                var oldBlobPath = tracked.BlobPath;
                tracked.BlobPath = null;

                _db.AuditLogs.Add(new AuditLog
                {
                    UserId = null, // System actor — no HTTP context inside a Hangfire job.
                    Action = "AuditBlobCleanup",
                    EntityType = nameof(ProjectAudit),
                    EntityId = row.Id.ToString("D"),
                    OldValueJson = JsonSerializer.Serialize(new { BlobPath = oldBlobPath }, LogJson),
                    NewValueJson = JsonSerializer.Serialize(new { BlobPath = (string?)null }, LogJson),
                    IpAddress = null,
                    CreatedAt = DateTime.UtcNow,
                });

                await _db.SaveChangesAsync(ct);
                deleted++;
            }
            catch (Exception ex)
            {
                // Per-row failure shouldn't fail the whole sweep — the next daily
                // run will retry. Hangfire's job-level retry is a separate concern.
                failed++;
                _logger.LogWarning(ex,
                    "AuditBlobCleanupJob: failed to clean blob {BlobPath} for audit {AuditId}; will retry tomorrow",
                    row.BlobPath, row.Id);
            }
        }

        _logger.LogInformation(
            "AuditBlobCleanupJob: scan complete — {Deleted} blob(s) deleted, {Failed} failed (out of {Total})",
            deleted, failed, stale.Count);
    }
}

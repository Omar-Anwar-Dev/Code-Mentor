using CodeMentor.Infrastructure.Identity;
using CodeMentor.Infrastructure.Persistence;
using Hangfire;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace CodeMentor.Infrastructure.UserAccountDeletion;

/// <summary>
/// S14-T9 / ADR-046: Hangfire job that runs the multi-domain hard-delete
/// cascade after the 30-day cooling-off window expires. Re-checks the active
/// request invariant at fire-time — if the request was cancelled (via login
/// auto-cancel or explicit DELETE) the job no-ops. ALL changes happen inside
/// a single <c>IDbContextTransaction</c> so partial failures roll back.
///
/// Cascade order (per the T9 design review entry in progress.md):
///   1. Purge user-direct rows (no FK dependents)
///   2. Purge user-direct rows with EF-cascade children
///   3. Anonymize Submissions + ProjectAudits (Q1 owner choice: ANONYMIZE — set UserId=null)
///   4. AuditLogs.UserId nulled (keep audit trail)
///   5. PII scrub on User row (kept as tombstone for analytics referential integrity)
///   6. UserAccountDeletionRequest.HardDeletedAt set
///
/// <c>[AutomaticRetry(Attempts=1)]</c> — Hangfire retries ONCE on transient
/// failure (e.g., DB connection blip). After that, the request stays in the
/// soft-deleted state and an admin sweep can re-trigger.
/// </summary>
public sealed class HardDeleteUserJob
{
    private readonly ApplicationDbContext _db;
    private readonly ILogger<HardDeleteUserJob> _log;

    public HardDeleteUserJob(ApplicationDbContext db, ILogger<HardDeleteUserJob> log)
    {
        _db = db;
        _log = log;
    }

    [AutomaticRetry(Attempts = 1)]
    public async Task ExecuteAsync(Guid userId, Guid requestId, CancellationToken ct = default)
    {
        _log.LogInformation("HardDeleteUserJob: starting for user {UserId} (request {RequestId})", userId, requestId);

        // ── Pre-flight: verify the request is still active ──
        var request = await _db.UserAccountDeletionRequests
            .FirstOrDefaultAsync(r => r.Id == requestId && r.UserId == userId, ct);

        if (request is null)
        {
            _log.LogWarning("HardDeleteUserJob: request {RequestId} not found — skipping", requestId);
            return;
        }
        if (request.CancelledAt is not null)
        {
            _log.LogInformation("HardDeleteUserJob: request {RequestId} was cancelled at {CancelledAt} — skipping cascade",
                requestId, request.CancelledAt);
            return;
        }
        if (request.HardDeletedAt is not null)
        {
            _log.LogInformation("HardDeleteUserJob: request {RequestId} already hard-deleted at {HardDeletedAt} — skipping (idempotent)",
                requestId, request.HardDeletedAt);
            return;
        }

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user is null)
        {
            _log.LogWarning("HardDeleteUserJob: user {UserId} already gone — marking request hard-deleted and exiting",
                userId);
            request.HardDeletedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync(ct);
            return;
        }

        // ── Transactional cascade ──
        // SQL Server: explicit transaction wraps the whole cascade so partial failures roll back.
        // InMemory provider (used in tests): can't begin a transaction; single-writer semantics
        // make partial-failure rollback moot for the test path anyway.
        var useTx = _db.Database.IsRelational();
        await using var tx = useTx ? await _db.Database.BeginTransactionAsync(ct) : null;

        // We use RemoveRange + ToListAsync (not ExecuteDeleteAsync) because the latter is
        // relational-only — InMemory tests would fail. The performance cost is acceptable:
        // account deletion is a rare event + the per-user row counts are small.

        // Phase 1: purge user-direct rows (no dependent children blocking).
        await PurgeAsync(_db.Notifications, n => n.UserId == userId, ct);
        await PurgeAsync(_db.EmailDeliveries, e => e.UserId == userId, ct);
        await PurgeAsync(_db.Set<OAuthToken>(), t => t.UserId == userId, ct);
        await PurgeAsync(_db.RefreshTokens, t => t.UserId == userId, ct);
        await PurgeAsync(_db.XpTransactions, x => x.UserId == userId, ct);
        await PurgeAsync(_db.UserBadges, ub => ub.UserId == userId, ct);
        await PurgeAsync(_db.SkillScores, s => s.UserId == userId, ct);
        await PurgeAsync(_db.CodeQualityScores, s => s.UserId == userId, ct);
        await PurgeAsync(_db.UserSettings, s => s.UserId == userId, ct);

        // Phase 2: purge user-direct rows + EF-cascade children. RemoveRange triggers EF's
        // client-side cascade if the relationship is configured DeleteBehavior.Cascade —
        // covers LearningCVViews/CVId, AssessmentResponses/AssessmentId, PathTasks/PathId,
        // MentorChatMessages/SessionId.
        await PurgeAsync(_db.LearningCVs, c => c.UserId == userId, ct);
        await PurgeAsync(_db.Assessments, a => a.UserId == userId, ct);
        await PurgeAsync(_db.LearningPaths, p => p.UserId == userId, ct);
        await PurgeAsync(_db.MentorChatSessions, s => s.UserId == userId, ct);

        // Phase 3: ANONYMIZE Submissions + ProjectAudits (ADR-046 Q1 owner choice).
        // Set UserId = null on each row so aggregate analytics + AI training samples are
        // preserved but the rows are no longer attributable to a specific user.
        var submissions = await _db.Submissions.Where(s => s.UserId == userId).ToListAsync(ct);
        foreach (var s in submissions) s.UserId = null;

        var audits = await _db.ProjectAudits.Where(a => a.UserId == userId).ToListAsync(ct);
        foreach (var a in audits) a.UserId = null;

        // Phase 4: AuditLogs actor — keep rows; null out UserId so the audit trail survives.
        var auditLogs = await _db.AuditLogs.Where(a => a.UserId == userId).ToListAsync(ct);
        foreach (var log in auditLogs) log.UserId = null;

        // Phase 5: PII scrub on the User tombstone row.
        // The tombstone preserves referential integrity (any anonymized FK references that
        // point at this row's Id remain valid) while removing all personal data.
        var tombstoneSuffix = userId.ToString("N").Substring(0, 8);
        user.Email = null;
        user.NormalizedEmail = null;
        user.UserName = $"deleted-{tombstoneSuffix}@deleted.local";
        user.NormalizedUserName = $"DELETED-{tombstoneSuffix}@DELETED.LOCAL";
        user.FullName = "(deleted user)";
        user.GitHubUsername = null;
        user.ProfilePictureUrl = null;
        user.PhoneNumber = null;
        user.PhoneNumberConfirmed = false;
        user.PasswordHash = null;
        user.SecurityStamp = Guid.NewGuid().ToString();
        user.ConcurrencyStamp = Guid.NewGuid().ToString();
        // IsDeleted stays true. HardDeleteAt unchanged for audit.

        // Phase 6: mark the request hard-deleted (kept as audit trail).
        request.HardDeletedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);
        if (tx is not null) await tx.CommitAsync(ct);

        _log.LogInformation("HardDeleteUserJob: completed for user {UserId} (request {RequestId})", userId, requestId);
    }

    /// <summary>Fetch rows matching the predicate, attach for delete, save inside the outer transaction.</summary>
    private async Task PurgeAsync<TEntity>(
        Microsoft.EntityFrameworkCore.DbSet<TEntity> set,
        System.Linq.Expressions.Expression<Func<TEntity, bool>> where,
        CancellationToken ct) where TEntity : class
    {
        var rows = await set.Where(where).ToListAsync(ct);
        if (rows.Count > 0) set.RemoveRange(rows);
    }
}

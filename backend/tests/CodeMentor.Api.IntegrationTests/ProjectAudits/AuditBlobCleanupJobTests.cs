using System.Text;
using CodeMentor.Api.IntegrationTests.TestHost;
using CodeMentor.Application.Storage;
using CodeMentor.Domain.Audit;
using CodeMentor.Domain.ProjectAudits;
using CodeMentor.Infrastructure.Persistence;
using CodeMentor.Infrastructure.ProjectAudits;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;

namespace CodeMentor.Api.IntegrationTests.ProjectAudits;

/// <summary>
/// S9-T13 acceptance:
///  - Old audits (CreatedAt < UtcNow - 90d) → blob deleted, BlobPath=null,
///    AuditLog row written.
///  - Recent audits (CreatedAt within window) → blob preserved, BlobPath untouched.
///  - Audits whose BlobPath is already null → no-op (defends against re-runs).
///  - Metadata row (ProjectAudit) preserved in all cases — only the blob + BlobPath go.
///  - Recurring-job ID + retention-window constants are stable (catches accidental rename).
/// </summary>
public class AuditBlobCleanupJobTests : IClassFixture<CodeMentorWebApplicationFactory>
{
    private readonly CodeMentorWebApplicationFactory _factory;

    public AuditBlobCleanupJobTests(CodeMentorWebApplicationFactory factory) => _factory = factory;

    [Fact]
    public async Task RunAsync_DeletesOldBlobs_PreservesRecent_AndWritesAuditLog()
    {
        var blobs = (FakeBlobStorage)_factory.Services.GetRequiredService<IBlobStorage>();
        var userId = Guid.NewGuid();

        Guid oldId, recentId, alreadyNullId;
        string oldBlobPath, recentBlobPath;

        // ── Arrange: seed 3 audits + their blobs ──
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

            oldBlobPath = $"user/{userId:N}/old/{Guid.NewGuid():N}-project.zip";
            recentBlobPath = $"user/{userId:N}/recent/{Guid.NewGuid():N}-project.zip";
            blobs.SeedBlob(BlobContainers.Audits, oldBlobPath, Encoding.UTF8.GetBytes("PK\x05\x06 old zip"));
            blobs.SeedBlob(BlobContainers.Audits, recentBlobPath, Encoding.UTF8.GetBytes("PK\x05\x06 recent zip"));

            var oldAudit = new ProjectAudit
            {
                UserId = userId,
                ProjectName = "old-project",
                SourceType = AuditSourceType.Upload,
                BlobPath = oldBlobPath,
                CreatedAt = DateTime.UtcNow - AuditBlobCleanupJob.RetentionWindow - TimeSpan.FromDays(1),
            };
            var recentAudit = new ProjectAudit
            {
                UserId = userId,
                ProjectName = "recent-project",
                SourceType = AuditSourceType.Upload,
                BlobPath = recentBlobPath,
                CreatedAt = DateTime.UtcNow - TimeSpan.FromDays(7),
            };
            var alreadyNullAudit = new ProjectAudit
            {
                UserId = userId,
                ProjectName = "already-cleaned",
                SourceType = AuditSourceType.Upload,
                BlobPath = null,                                                       // already null — should be skipped
                CreatedAt = DateTime.UtcNow - AuditBlobCleanupJob.RetentionWindow - TimeSpan.FromDays(10),
            };
            db.ProjectAudits.AddRange(oldAudit, recentAudit, alreadyNullAudit);
            await db.SaveChangesAsync();

            oldId = oldAudit.Id;
            recentId = recentAudit.Id;
            alreadyNullId = alreadyNullAudit.Id;
        }

        // Sanity: both blobs are present pre-run.
        Assert.True(await blobs.ExistsAsync(BlobContainers.Audits, oldBlobPath));
        Assert.True(await blobs.ExistsAsync(BlobContainers.Audits, recentBlobPath));

        // ── Act: run the cleanup sweep in a scope (mirrors how Hangfire invokes it) ──
        using (var scope = _factory.Services.CreateScope())
        {
            var job = scope.ServiceProvider.GetRequiredService<AuditBlobCleanupJob>();
            await job.RunAsync(CancellationToken.None);
        }

        // ── Assert: state across all 3 audits ──
        using (var verify = _factory.Services.CreateScope())
        {
            var db = verify.ServiceProvider.GetRequiredService<ApplicationDbContext>();

            // Old audit: row preserved, BlobPath nulled.
            var oldAfter = await db.ProjectAudits.AsNoTracking().SingleAsync(a => a.Id == oldId);
            Assert.NotNull(oldAfter);
            Assert.Null(oldAfter.BlobPath);
            Assert.Equal("old-project", oldAfter.ProjectName);

            // Recent audit: untouched.
            var recentAfter = await db.ProjectAudits.AsNoTracking().SingleAsync(a => a.Id == recentId);
            Assert.Equal(recentBlobPath, recentAfter.BlobPath);

            // Already-null audit: still null, no spurious change.
            var nullAfter = await db.ProjectAudits.AsNoTracking().SingleAsync(a => a.Id == alreadyNullId);
            Assert.Null(nullAfter.BlobPath);

            // AuditLog written for the deletion.
            var log = await db.AuditLogs
                .AsNoTracking()
                .Where(l => l.Action == "AuditBlobCleanup" && l.EntityId == oldId.ToString("D"))
                .SingleOrDefaultAsync();
            Assert.NotNull(log);
            Assert.Equal("ProjectAudit", log!.EntityType);
            Assert.Null(log.UserId);                                                    // system actor — no HTTP context inside a job
            Assert.Contains(oldBlobPath, log.OldValueJson);
            Assert.Contains("null", log.NewValueJson!);

            // No spurious log for the recent OR the already-null audit.
            var spuriousCount = await db.AuditLogs.AsNoTracking()
                .CountAsync(l => l.Action == "AuditBlobCleanup"
                              && (l.EntityId == recentId.ToString("D") || l.EntityId == alreadyNullId.ToString("D")));
            Assert.Equal(0, spuriousCount);
        }

        // Blob fakes reflect the deletion + preservation.
        Assert.False(await blobs.ExistsAsync(BlobContainers.Audits, oldBlobPath));
        Assert.True(await blobs.ExistsAsync(BlobContainers.Audits, recentBlobPath));
    }

    [Fact]
    public async Task RunAsync_NothingToClean_LogsAndReturns_WithoutErrors()
    {
        // Use an empty in-memory DB by using a fresh factory scope. We don't seed
        // anything → the job should find no candidates and exit cleanly.
        using var scope = _factory.Services.CreateScope();
        var job = scope.ServiceProvider.GetRequiredService<AuditBlobCleanupJob>();

        // No exception should be raised even when there's nothing to do.
        await job.RunAsync(CancellationToken.None);
    }

    [Fact]
    public void RecurringJobConstants_AreStable()
    {
        // These are referenced by Program.cs's RecurringJob.AddOrUpdate registration.
        // A silent rename would break the Hangfire schedule's identity continuity
        // across deploys — easier to fail this test than to debug a duplicate-job
        // entry in production.
        Assert.Equal("audit-blob-cleanup", AuditBlobCleanupJob.RecurringJobId);
        Assert.Equal(TimeSpan.FromDays(90), AuditBlobCleanupJob.RetentionWindow);
    }
}

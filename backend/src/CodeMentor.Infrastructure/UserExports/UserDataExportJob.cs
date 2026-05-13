using System.IO.Compression;
using System.Text;
using System.Text.Json;
using CodeMentor.Application.Notifications;
using CodeMentor.Application.Storage;
using CodeMentor.Infrastructure.Identity;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace CodeMentor.Infrastructure.UserExports;

/// <summary>
/// S14-T8 / ADR-046: collects the user's data across 6 domains, builds 6
/// JSON files + 1 PDF dossier, ZIPs them, uploads to blob storage, generates
/// a 1-hour SAS URL, and raises the data-export-ready notification + email.
///
/// Idempotency: each invocation creates a new ZIP at a unique
/// <c>{userId}/{timestamp}-{guid}.zip</c> path so concurrent requests can't
/// stomp on each other. Old ZIPs are swept by a separate post-MVP cleanup job
/// (per <see cref="BlobContainers.UserExports"/> retention comment).
///
/// Notification + email dispatch run as the LAST step — if they fail, the ZIP
/// is still in blob storage and an admin can fetch the SAS manually. The job
/// itself is non-idempotent on partial failure (no checkpoint resume); a
/// Hangfire retry would re-run the full collection from scratch.
/// </summary>
public sealed class UserDataExportJob
{
    public static readonly TimeSpan SasValidity = TimeSpan.FromHours(1);

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = true,
        DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull,
    };

    private readonly ApplicationDbContext _db;
    private readonly IBlobStorage _blobs;
    private readonly INotificationService _notifications;
    private readonly UserDataExportPdfRenderer _pdfRenderer;
    private readonly ILogger<UserDataExportJob> _logger;

    public UserDataExportJob(
        ApplicationDbContext db,
        IBlobStorage blobs,
        INotificationService notifications,
        UserDataExportPdfRenderer pdfRenderer,
        ILogger<UserDataExportJob> logger)
    {
        _db = db;
        _blobs = blobs;
        _notifications = notifications;
        _pdfRenderer = pdfRenderer;
        _logger = logger;
    }

    public async Task ExecuteAsync(Guid userId, CancellationToken ct = default)
    {
        _logger.LogInformation("UserDataExportJob: starting for {UserId}", userId);

        var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user is null)
        {
            _logger.LogWarning("UserDataExportJob: user {UserId} not found — skipping", userId);
            return;
        }

        // ── 1. Collect all 6 domain slices in parallel-safe sequential reads. ──
        var settings = await _db.UserSettings.AsNoTracking()
            .FirstOrDefaultAsync(s => s.UserId == userId, ct);

        var submissions = await _db.Submissions.AsNoTracking()
            .Where(s => s.UserId == userId)
            .OrderByDescending(s => s.CreatedAt)
            .Select(s => new
            {
                s.Id, s.TaskId, s.SubmissionType, s.RepositoryUrl, s.Status, s.AiAnalysisStatus,
                s.CreatedAt, s.CompletedAt,
            })
            .ToListAsync(ct);

        var audits = await _db.ProjectAudits.AsNoTracking()
            .Where(a => a.UserId == userId && !a.IsDeleted)
            .OrderByDescending(a => a.CreatedAt)
            .Select(a => new
            {
                a.Id, a.ProjectName, a.SourceType, a.Status, a.AiReviewStatus,
                a.OverallScore, a.Grade, a.CreatedAt, a.CompletedAt,
            })
            .ToListAsync(ct);

        var assessments = await _db.Assessments.AsNoTracking()
            .Where(a => a.UserId == userId)
            .OrderByDescending(a => a.StartedAt)
            .Select(a => new
            {
                a.Id, a.Track, a.Status, a.TotalScore, a.SkillLevel,
                a.StartedAt, a.CompletedAt,
            })
            .ToListAsync(ct);

        var xpTransactions = await _db.XpTransactions.AsNoTracking()
            .Where(t => t.UserId == userId)
            .OrderByDescending(t => t.CreatedAt)
            .Select(t => new { t.Id, t.Amount, t.Reason, t.CreatedAt })
            .ToListAsync(ct);

        var userBadges = await _db.UserBadges.AsNoTracking()
            .Where(ub => ub.UserId == userId)
            .Include(ub => ub.Badge)
            .Select(ub => new
            {
                BadgeKey = ub.Badge!.Key,
                ub.Badge.Name,
                ub.Badge.Description,
                ub.EarnedAt,
            })
            .ToListAsync(ct);

        var notifCutoff = DateTime.UtcNow.AddDays(-90);
        var notifications = await _db.Notifications.AsNoTracking()
            .Where(n => n.UserId == userId && n.CreatedAt >= notifCutoff)
            .OrderByDescending(n => n.CreatedAt)
            .Select(n => new { n.Id, n.Type, n.Title, n.Message, n.Link, n.IsRead, n.CreatedAt, n.ReadAt })
            .ToListAsync(ct);

        var totalXp = xpTransactions.Sum(t => t.Amount);

        // ── 2. Build the dossier + the 6 JSON payloads + the PDF. ──
        var dossier = new UserDataExportDossier(
            User: user,
            SubmissionCount: submissions.Count,
            AuditCount: audits.Count,
            AssessmentCount: assessments.Count(a => a.CompletedAt is not null),
            BadgeCount: userBadges.Count,
            TotalXp: totalXp,
            RecentSubmissionTitles: submissions.Take(5)
                .Select(s => $"Submission {s.Id:N}  ({s.Status} — {s.CreatedAt:yyyy-MM-dd})")
                .ToList(),
            ExportedAtUtc: DateTime.UtcNow);
        var pdfBytes = _pdfRenderer.Render(dossier);

        // ── 3. ZIP everything in-memory. ──
        await using var zipStream = new MemoryStream();
        using (var archive = new ZipArchive(zipStream, ZipArchiveMode.Create, leaveOpen: true))
        {
            await AddJsonEntryAsync(archive, "profile.json", new
            {
                user.Id, user.Email, user.FullName, user.GitHubUsername,
                user.ProfilePictureUrl, user.CreatedAt, user.UpdatedAt,
                Settings = settings,
            }, ct);
            await AddJsonEntryAsync(archive, "submissions.json", submissions, ct);
            await AddJsonEntryAsync(archive, "audits.json", audits, ct);
            await AddJsonEntryAsync(archive, "assessments.json", assessments, ct);
            await AddJsonEntryAsync(archive, "gamification.json", new
            {
                TotalXp = totalXp,
                Transactions = xpTransactions,
                Badges = userBadges,
            }, ct);
            await AddJsonEntryAsync(archive, "notifications.json", notifications, ct);

            // PDF dossier
            var pdfEntry = archive.CreateEntry("data-export.pdf", CompressionLevel.Optimal);
            await using var pdfStreamWriter = pdfEntry.Open();
            await pdfStreamWriter.WriteAsync(pdfBytes, ct);
        }

        zipStream.Position = 0;
        var zipSize = zipStream.Length;

        // ── 4. Upload to blob + generate SAS. ──
        await _blobs.EnsureContainerAsync(BlobContainers.UserExports, ct);
        var blobPath = $"{userId:N}/{DateTime.UtcNow:yyyyMMdd-HHmmss}-{Guid.NewGuid():N}.zip";
        await _blobs.UploadAsync(BlobContainers.UserExports, blobPath, zipStream, "application/zip", ct);

        var sasUri = _blobs.GenerateDownloadSasUrl(BlobContainers.UserExports, blobPath, SasValidity);

        // ── 5. Raise notification + email (always-on per RaiseDataExportReadyAsync). ──
        var expiresAt = DateTime.UtcNow + SasValidity;
        await _notifications.RaiseDataExportReadyAsync(userId, new DataExportReadyEvent(
            DownloadUrl: sasUri.ToString(),
            ExpiresAtUtc: expiresAt,
            ZipFileSizeBytes: zipSize), ct);

        _logger.LogInformation(
            "UserDataExportJob: completed for {UserId} → {Size} bytes at {BlobPath} (expires {ExpiresAt:u})",
            userId, zipSize, blobPath, expiresAt);
    }

    private static async Task AddJsonEntryAsync(ZipArchive archive, string fileName, object payload, CancellationToken ct)
    {
        var entry = archive.CreateEntry(fileName, CompressionLevel.Optimal);
        await using var entryStream = entry.Open();
        var bytes = JsonSerializer.SerializeToUtf8Bytes(payload, JsonOptions);
        await entryStream.WriteAsync(bytes, ct);
    }
}

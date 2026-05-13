using System.Security.Cryptography;
using System.Text;
using CodeMentor.Application.Gamification;
using CodeMentor.Application.LearningCV;
using CodeMentor.Application.LearningCV.Contracts;
using CodeMentor.Domain.Assessments;
using CodeMentor.Domain.Gamification;
using CodeMentor.Domain.LearningCV;
using CodeMentor.Domain.Submissions;
using CodeMentor.Infrastructure.Identity;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace CodeMentor.Infrastructure.LearningCV;

/// <summary>
/// S7-T2: aggregates the learner's CV view from existing tables (no separate
/// snapshot pipeline). The persisted <c>LearningCVs</c> row only carries
/// metadata (slug, isPublic, viewCount); profile + skills + projects + stats
/// are computed at request time.
/// </summary>
public sealed class LearningCVService : ILearningCVService
{
    private readonly ApplicationDbContext _db;
    private readonly UserManager<ApplicationUser> _users;
    private readonly IBadgeService _badges;

    public LearningCVService(
        ApplicationDbContext db,
        UserManager<ApplicationUser> users,
        IBadgeService badges)
    {
        _db = db;
        _users = users;
        _badges = badges;
    }

    public async Task<LearningCVDto> GetMineAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await _users.FindByIdAsync(userId.ToString())
            ?? throw new InvalidOperationException($"User {userId} not found.");

        var cv = await GetOrCreateRowAsync(user, ct);
        cv.LastGeneratedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);

        return await BuildAsync(user, cv, includeEmail: true, ct);
    }

    public async Task<LearningCVDto> UpdateMineAsync(
        Guid userId,
        Application.LearningCV.Contracts.UpdateLearningCVRequest request,
        CancellationToken ct = default)
    {
        var user = await _users.FindByIdAsync(userId.ToString())
            ?? throw new InvalidOperationException($"User {userId} not found.");

        var cv = await GetOrCreateRowAsync(user, ct);

        var awardCvBadge = false;
        if (request.IsPublic.HasValue)
        {
            // Generate the slug lazily on first publish, but only if absent.
            // A toggle back to private later keeps the existing slug so the URL
            // stays stable across re-publishes.
            if (request.IsPublic.Value && string.IsNullOrEmpty(cv.PublicSlug))
            {
                cv.PublicSlug = await GenerateUniqueSlugAsync(user.UserName, userId, ct);
                awardCvBadge = true;
            }
            cv.IsPublic = request.IsPublic.Value;
        }

        cv.LastGeneratedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);

        // S8-T3: badge on the very first publish (slug just generated). Idempotent
        // by design — re-publishes after a private toggle don't re-award.
        if (awardCvBadge)
        {
            await _badges.AwardIfEligibleAsync(userId, BadgeKeys.FirstLearningCVGenerated, ct);
        }

        return await BuildAsync(user, cv, includeEmail: true, ct);
    }

    public async Task<LearningCVDto?> GetPublicAsync(string slug, string? ipAddress, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(slug)) return null;

        var cv = await _db.LearningCVs.FirstOrDefaultAsync(c => c.PublicSlug == slug, ct);
        if (cv is null || !cv.IsPublic) return null;

        // S14-T9 / ADR-046: soft-deleted users (in 30-day cooling-off) are hidden
        // from the public surface. Their CV slug returns 404 just like the
        // ProfileDiscoverable kill switch — but unlike that, this isn't a
        // user-toggleable visibility setting; it's the platform-side consequence
        // of requesting account deletion.
        var ownerIsDeleted = await _db.Users.AsNoTracking()
            .Where(u => u.Id == cv.UserId)
            .Select(u => u.IsDeleted)
            .FirstOrDefaultAsync(ct);
        if (ownerIsDeleted) return null;

        // S14-T6 / ADR-046: ProfileDiscoverable kill switch. Even when the CV
        // is explicitly public, the user can toggle ProfileDiscoverable=false
        // in their settings to hide their public surface platform-wide —
        // /api/public/cv/{slug} returns 404 + the FE's PublicCV page 404s.
        // No row → treat as default-true (existing CVs aren't surprise-hidden).
        var settings = await _db.UserSettings.AsNoTracking()
            .FirstOrDefaultAsync(s => s.UserId == cv.UserId, ct);
        if (settings is { ProfileDiscoverable: false }) return null;

        var user = await _users.FindByIdAsync(cv.UserId.ToString());
        if (user is null) return null;

        await TryIncrementViewAsync(cv, ipAddress, ct);

        return await BuildAsync(user, cv, includeEmail: false, ct);
    }

    /// <summary>
    /// S7-T4: at most one view increment per (CV, IP) per 24h. The IP is hashed
    /// before persistence so the dedupe table doesn't double as a visitor log.
    /// A null/empty IP is treated as "anonymous request" and skips both the
    /// dedupe write and the increment.
    /// </summary>
    private async Task TryIncrementViewAsync(Domain.LearningCV.LearningCV cv, string? ipAddress, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(ipAddress)) return;

        var ipHash = HashIp(ipAddress);
        var since = DateTime.UtcNow.AddHours(-24);

        var alreadyCounted = await _db.LearningCVViews.AsNoTracking()
            .AnyAsync(v => v.CVId == cv.Id && v.IpAddressHash == ipHash && v.ViewedAt >= since, ct);
        if (alreadyCounted) return;

        _db.LearningCVViews.Add(new LearningCVView
        {
            CVId = cv.Id,
            IpAddressHash = ipHash,
            ViewedAt = DateTime.UtcNow,
        });
        cv.ViewCount++;
        await _db.SaveChangesAsync(ct);
    }

    private static string HashIp(string ipAddress)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(ipAddress));
        return Convert.ToHexString(bytes);
    }

    private async Task<Domain.LearningCV.LearningCV> GetOrCreateRowAsync(ApplicationUser user, CancellationToken ct)
    {
        var userId = user.Id;
        var cv = await _db.LearningCVs.FirstOrDefaultAsync(c => c.UserId == userId, ct);
        if (cv is null)
        {
            // S14-T6 / ADR-046: honor the PublicCvDefault privacy toggle for the
            // user's FIRST CV creation. If the user opted to default-public, we
            // also generate the slug at create time so the CV is genuinely
            // accessible (IsPublic=true + slug=null would be a contradiction).
            // Existing CVs are NOT retroactively flipped by changing the setting.
            var settings = await _db.UserSettings.AsNoTracking()
                .FirstOrDefaultAsync(s => s.UserId == userId, ct);
            var defaultPublic = settings?.PublicCvDefault ?? false;

            cv = new Domain.LearningCV.LearningCV
            {
                UserId = userId,
                IsPublic = defaultPublic,
                PublicSlug = defaultPublic
                    ? await GenerateUniqueSlugAsync(user.UserName, userId, ct)
                    : null,
            };
            _db.LearningCVs.Add(cv);
            await _db.SaveChangesAsync(ct);

            // Mirror UpdateMineAsync's badge-on-first-publish behavior: if the
            // default-public path actually made the CV public + slug-bearing,
            // that's the user's "first publish" event.
            if (defaultPublic)
            {
                await _badges.AwardIfEligibleAsync(userId, BadgeKeys.FirstLearningCVGenerated, ct);
            }
        }
        return cv;
    }

    private async Task<string> GenerateUniqueSlugAsync(string? userName, Guid userId, CancellationToken ct)
    {
        for (var suffix = 0; suffix < 1000; suffix++)
        {
            var candidate = PublicSlugGenerator.Generate(userName, userId, suffix);
            var clash = await _db.LearningCVs.AsNoTracking()
                .AnyAsync(c => c.PublicSlug == candidate, ct);
            if (!clash) return candidate;
        }
        // Pathological fallback — a 12-char hex of UserId is collision-resistant.
        return $"learner-{userId.ToString("N")[..12]}";
    }

    /// <summary>
    /// Composes the public DTO. Caller decides whether to include the email
    /// (owner sees it; public viewers don't).
    /// </summary>
    internal async Task<LearningCVDto> BuildAsync(
        ApplicationUser user,
        Domain.LearningCV.LearningCV cv,
        bool includeEmail,
        CancellationToken ct)
    {
        var userId = user.Id;

        var profile = new LearningCVProfileDto(
            UserId: userId,
            FullName: user.FullName,
            Email: includeEmail ? user.Email : null,
            GitHubUsername: user.GitHubUsername,
            ProfilePictureUrl: user.ProfilePictureUrl,
            CreatedAt: user.CreatedAt);

        // Assessment-driven skill axis (Sprint 2). Sorted alphabetically for
        // stable ordering across response renders.
        var assessmentScores = await _db.SkillScores.AsNoTracking()
            .Where(s => s.UserId == userId)
            .OrderBy(s => s.Category)
            .Select(s => new LearningCVSkillScoreDto(
                s.Category.ToString(),
                s.Score,
                s.Level.ToString()))
            .ToListAsync(ct);

        var latestCompletedAssessmentLevel = await _db.Assessments.AsNoTracking()
            .Where(a => a.UserId == userId && a.Status == AssessmentStatus.Completed)
            .OrderByDescending(a => a.CompletedAt)
            .Select(a => (string?)a.SkillLevel.ToString())
            .FirstOrDefaultAsync(ct);

        var skillProfile = new LearningCVSkillProfileDto(assessmentScores, latestCompletedAssessmentLevel);

        // S7-T1 / ADR-028: submission AI scores axis. Sorted alphabetically for stability.
        var codeQualityScores = await _db.CodeQualityScores.AsNoTracking()
            .Where(s => s.UserId == userId)
            .OrderBy(s => s.Category)
            .Select(s => new LearningCVCodeQualityScoreDto(
                s.Category.ToString(),
                s.Score,
                s.SampleCount))
            .ToListAsync(ct);

        var codeQualityProfile = new LearningCVCodeQualityProfileDto(codeQualityScores);

        // PRD F10 "verified projects" = top 5 highest-scored AI-reviewed
        // submissions. Tied scores fall back to most-recent-first so a learner
        // who scored 90 twice sees the latest at the top.
        var projects = await _db.AIAnalysisResults.AsNoTracking()
            .Join(_db.Submissions.AsNoTracking(),
                ai => ai.SubmissionId, s => s.Id,
                (ai, s) => new { Ai = ai, Sub = s })
            .Where(x => x.Sub.UserId == userId
                     && x.Sub.Status == SubmissionStatus.Completed
                     && x.Sub.AiAnalysisStatus == AiAnalysisStatus.Available
                     && x.Sub.CompletedAt != null)
            .Join(_db.Tasks.AsNoTracking(),
                x => x.Sub.TaskId, t => t.Id,
                (x, t) => new { x.Ai, x.Sub, Task = t })
            .OrderByDescending(x => x.Ai.OverallScore)
            .ThenByDescending(x => x.Sub.CompletedAt)
            .Take(5)
            .Select(x => new LearningCVProjectDto(
                x.Sub.Id,
                x.Task.Title,
                x.Task.Track.ToString(),
                x.Task.ExpectedLanguage.ToString(),
                x.Ai.OverallScore,
                x.Sub.CompletedAt!.Value,
                $"/submissions/{x.Sub.Id}/feedback"))
            .ToListAsync(ct);

        // Activity stats — single round-trip per count, all owner-scoped.
        var submissionsTotal = await _db.Submissions.AsNoTracking()
            .CountAsync(s => s.UserId == userId, ct);
        var submissionsCompleted = await _db.Submissions.AsNoTracking()
            .CountAsync(s => s.UserId == userId && s.Status == SubmissionStatus.Completed, ct);
        var assessmentsCompleted = await _db.Assessments.AsNoTracking()
            .CountAsync(a => a.UserId == userId && a.Status == AssessmentStatus.Completed, ct);
        var pathsActive = await _db.LearningPaths.AsNoTracking()
            .CountAsync(p => p.UserId == userId && p.IsActive, ct);

        var stats = new LearningCVStatsDto(
            submissionsTotal,
            submissionsCompleted,
            assessmentsCompleted,
            pathsActive,
            user.CreatedAt);

        var meta = new LearningCVMetadataDto(
            cv.PublicSlug,
            cv.IsPublic,
            cv.LastGeneratedAt,
            cv.ViewCount);

        return new LearningCVDto(profile, skillProfile, codeQualityProfile, projects, stats, meta);
    }
}

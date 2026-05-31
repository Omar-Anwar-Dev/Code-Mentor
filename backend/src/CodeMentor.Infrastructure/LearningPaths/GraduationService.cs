using System.Text.Json;
using CodeMentor.Application.LearningPaths;
using CodeMentor.Application.LearningPaths.Contracts;
using CodeMentor.Domain.Assessments;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace CodeMentor.Infrastructure.LearningPaths;

/// <summary>
/// S21-T3 / F16: assembles the Graduation page payload.
///
/// Implementation notes:
///   1. Read the user's active <c>LearningPath</c>. Return null if none, or
///      if <c>ProgressPercent &lt; 100</c> (the FE only shows the page once
///      the bar is full).
///   2. Deserialise <c>InitialSkillProfileJson</c> for the "before" radar
///      points. Legacy pre-S21 paths have a null column → empty before list
///      (the FE renders an explanatory "Snapshot unavailable for pre-S21
///      paths" caption).
///   3. Read the current <c>LearnerSkillProfile</c> rows for the "after"
///      radar points.
///   4. Look up the most-recent Completed Full reassessment for this user
///      since the path's <c>GeneratedAt</c>. If present, look up its
///      <c>AssessmentSummary</c> (may still be in-flight; nulls flow through
///      cleanly).
///   5. NextPhaseEligible = a Full variant Assessment is Completed for this
///      path. The summary's presence is independent — eligibility is gated by
///      the assessment row, not the summary row.
/// </summary>
public sealed class GraduationService : IGraduationService
{
    private readonly ApplicationDbContext _db;
    private readonly ILearnerSkillProfileService _profiles;
    private readonly ILogger<GraduationService> _logger;

    public GraduationService(
        ApplicationDbContext db,
        ILearnerSkillProfileService profiles,
        ILogger<GraduationService> logger)
    {
        _db = db;
        _profiles = profiles;
        _logger = logger;
    }

    public async Task<GraduationViewDto?> GetForUserAsync(Guid userId, CancellationToken ct = default)
    {
        var path = await _db.LearningPaths
            .AsNoTracking()
            .Where(p => p.UserId == userId && p.IsActive)
            .OrderByDescending(p => p.GeneratedAt)
            .FirstOrDefaultAsync(ct);
        if (path is null || path.ProgressPercent < 100m)
        {
            // 404 — graduation surface isn't rendered before the path is
            // fully complete. The /next-phase endpoint is the matching
            // 409-on-incomplete gate; the FE never lets the user click into
            // graduation until the path bar hits 100% anyway.
            return null;
        }

        IReadOnlyList<SkillSnapshotEntry> before = Array.Empty<SkillSnapshotEntry>();
        if (!string.IsNullOrWhiteSpace(path.InitialSkillProfileJson))
        {
            try
            {
                // Serialised by LearningPathService.GeneratePathAsync via
                // anonymous object → camelCase property names. Use the
                // matching case-insensitive deserialiser.
                var raw = JsonSerializer.Deserialize<List<InitialEntryDto>>(
                    path.InitialSkillProfileJson,
                    SnapshotJsonOptions) ?? new();
                before = raw
                    .Where(e => !string.IsNullOrWhiteSpace(e.Category))
                    .Select(e => new SkillSnapshotEntry(e.Category!, Math.Round(e.SmoothedScore, 2)))
                    .OrderBy(e => e.Category, StringComparer.OrdinalIgnoreCase)
                    .ToList();
            }
            catch (JsonException ex)
            {
                _logger.LogWarning(ex,
                    "Could not deserialise InitialSkillProfileJson for path {PathId}; treating as legacy/empty.",
                    path.Id);
                before = Array.Empty<SkillSnapshotEntry>();
            }
        }

        var afterRaw = await _profiles.GetByUserAsync(userId, ct);
        var after = afterRaw
            .Select(s => new SkillSnapshotEntry(s.Category.ToString(), Math.Round(s.SmoothedScore, 2)))
            .OrderBy(e => e.Category, StringComparer.OrdinalIgnoreCase)
            .ToList();

        // Latest Completed Full reassessment for this path.
        var fullAssessment = await _db.Assessments
            .AsNoTracking()
            .Where(a => a.UserId == userId
                        && a.Variant == AssessmentVariant.Full
                        && a.Status == AssessmentStatus.Completed
                        && a.StartedAt >= path.GeneratedAt)
            .OrderByDescending(a => a.CompletedAt)
            .FirstOrDefaultAsync(ct);

        string? strengths = null;
        string? weaknesses = null;
        string? nextSteps = null;
        if (fullAssessment is not null)
        {
            var summary = await _db.AssessmentSummaries
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.AssessmentId == fullAssessment.Id, ct);
            if (summary is not null)
            {
                strengths = summary.StrengthsParagraph;
                weaknesses = summary.WeaknessesParagraph;
                nextSteps = summary.PathGuidanceParagraph;
            }
        }

        return new GraduationViewDto(
            PathId: path.Id,
            Version: path.Version,
            Track: path.Track.ToString(),
            ProgressPercent: path.ProgressPercent,
            GeneratedAt: path.GeneratedAt,
            Before: before,
            After: after,
            JourneySummaryStrengths: strengths,
            JourneySummaryWeaknesses: weaknesses,
            JourneySummaryNextSteps: nextSteps,
            NextPhaseEligible: fullAssessment is not null,
            FullReassessmentAssessmentId: fullAssessment?.Id);
    }

    private sealed class InitialEntryDto
    {
        public string? Category { get; set; }
        public decimal SmoothedScore { get; set; }
    }

    private static readonly JsonSerializerOptions SnapshotJsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
    };
}

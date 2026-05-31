using CodeMentor.Application.LearningPaths;
using CodeMentor.Domain.Assessments;
using CodeMentor.Domain.Skills;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace CodeMentor.Infrastructure.LearningPaths;

/// <summary>
/// S19-T3 / F16 (ADR-049 / ADR-052): EMA-smoothing implementation of
/// <see cref="ILearnerSkillProfileService"/>.
///
/// Smoothing formula on each update:
/// <code>new = α · sample + (1 − α) · old</code> with α = 0.4 (the
/// owner-locked smoothing factor from S19 kickoff). First-observation
/// rows skip the smoothing — the sample becomes the seed.
/// </summary>
public sealed class LearnerSkillProfileService : ILearnerSkillProfileService
{
    /// <summary>S19 locked answer #3: EMA smoothing factor.</summary>
    public const decimal EmaAlpha = 0.4m;

    private readonly ApplicationDbContext _db;
    private readonly ILogger<LearnerSkillProfileService> _logger;

    public LearnerSkillProfileService(
        ApplicationDbContext db,
        ILogger<LearnerSkillProfileService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task InitializeFromAssessmentAsync(
        Guid userId,
        Guid assessmentId,
        CancellationToken ct = default)
    {
        var assessment = await _db.Assessments
            .FirstOrDefaultAsync(a => a.Id == assessmentId && a.UserId == userId, ct);
        if (assessment is null)
            throw new InvalidOperationException(
                $"Assessment {assessmentId} not found for user {userId}.");

        var skillScores = await _db.SkillScores
            .Where(s => s.UserId == userId)
            .ToListAsync(ct);

        if (skillScores.Count == 0)
        {
            _logger.LogWarning(
                "LearnerSkillProfile init: no SkillScores for user {UserId}; nothing to seed.",
                userId);
            return;
        }

        // Pull existing profile rows once to avoid N+1 queries.
        var existing = await _db.LearnerSkillProfiles
            .Where(p => p.UserId == userId)
            .ToListAsync(ct);

        foreach (var score in skillScores)
        {
            var row = existing.FirstOrDefault(p => p.Category == score.Category);
            if (row is null)
            {
                row = new LearnerSkillProfile
                {
                    UserId = userId,
                    Category = score.Category,
                    SmoothedScore = ClampScore(score.Score),
                    Level = MapLevel(score.Score),
                    LastSource = LearnerSkillProfileSource.Assessment,
                    SampleCount = 1,
                    LastUpdatedAt = DateTime.UtcNow,
                };
                _db.LearnerSkillProfiles.Add(row);
                existing.Add(row);
            }
            else
            {
                // Re-seed on a fresh Assessment: take the new score as authoritative.
                // EMA smoothing applies on Submission updates only — an Assessment
                // is a holistic re-measure and should reset the signal.
                row.SmoothedScore = ClampScore(score.Score);
                row.Level = MapLevel(row.SmoothedScore);
                row.LastSource = LearnerSkillProfileSource.Assessment;
                row.SampleCount += 1;
                row.LastUpdatedAt = DateTime.UtcNow;
            }
        }

        await _db.SaveChangesAsync(ct);
        _logger.LogInformation(
            "LearnerSkillProfile initialised for user {UserId} from assessment {AssessmentId}: {Count} categories.",
            userId, assessmentId, skillScores.Count);
    }

    public async Task UpdateFromSubmissionAsync(
        Guid userId,
        IReadOnlyDictionary<SkillCategory, decimal> samples,
        CancellationToken ct = default)
    {
        if (samples.Count == 0) return;

        var existing = await _db.LearnerSkillProfiles
            .Where(p => p.UserId == userId)
            .ToListAsync(ct);

        foreach (var (category, sampleRaw) in samples)
        {
            var sample = ClampScore(sampleRaw);
            var row = existing.FirstOrDefault(p => p.Category == category);

            if (row is null)
            {
                // First observation for this category — seed without smoothing.
                row = new LearnerSkillProfile
                {
                    UserId = userId,
                    Category = category,
                    SmoothedScore = sample,
                    Level = MapLevel(sample),
                    LastSource = LearnerSkillProfileSource.SubmissionInferred,
                    SampleCount = 1,
                    LastUpdatedAt = DateTime.UtcNow,
                };
                _db.LearnerSkillProfiles.Add(row);
                existing.Add(row);
            }
            else
            {
                // EMA: new = α · sample + (1 − α) · old.
                var smoothed = EmaAlpha * sample + (1m - EmaAlpha) * row.SmoothedScore;
                row.SmoothedScore = ClampScore(smoothed);
                row.Level = MapLevel(row.SmoothedScore);
                row.LastSource = LearnerSkillProfileSource.SubmissionInferred;
                row.SampleCount += 1;
                row.LastUpdatedAt = DateTime.UtcNow;
            }
        }

        await _db.SaveChangesAsync(ct);
        _logger.LogInformation(
            "LearnerSkillProfile updated for user {UserId} from submission sample: {Count} categories.",
            userId, samples.Count);
    }

    public async Task<IReadOnlyList<LearnerSkillProfileSnapshot>> GetByUserAsync(
        Guid userId,
        CancellationToken ct = default)
    {
        var rows = await _db.LearnerSkillProfiles
            .Where(p => p.UserId == userId)
            .OrderBy(p => p.Category)
            .ToListAsync(ct);

        return rows
            .Select(p => new LearnerSkillProfileSnapshot(
                p.Category,
                p.SmoothedScore,
                p.Level.ToString(),
                p.LastSource.ToString(),
                p.SampleCount,
                p.LastUpdatedAt))
            .ToList();
    }

    // -- helpers ----------------------------------------------------------

    /// <summary>Round-half-to-even to 2dp + clamp to the [0, 100] range
    /// the column constraints expect.</summary>
    public static decimal ClampScore(decimal raw)
    {
        if (raw < 0m) return 0m;
        if (raw > 100m) return 100m;
        return Math.Round(raw, 2, MidpointRounding.ToEven);
    }

    /// <summary>Maps a smoothed score to the same SkillLevel thresholds
    /// the rest of the platform uses (matches
    /// <see cref="AssessmentService"/>'s mapping inside
    /// <c>UpsertSkillScoresAsync</c>).</summary>
    public static SkillLevel MapLevel(decimal score) => score switch
    {
        >= 80m => SkillLevel.Advanced,
        >= 60m => SkillLevel.Intermediate,
        _ => SkillLevel.Beginner,
    };
}

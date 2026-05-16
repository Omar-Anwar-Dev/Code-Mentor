using System.Text.Json;
using CodeMentor.Application.Admin;
using CodeMentor.Domain.Assessments;
using CodeMentor.Domain.Skills;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace CodeMentor.Infrastructure.Admin;

/// <summary>
/// S21-T8 / F16: dogfood Tier-2 metrics aggregator. Read-only over the
/// existing tables (LearningPaths, Assessments, LearnerSkillProfile,
/// PathAdaptationEvents, Questions, Tasks). The surface stays bounded —
/// we deliberately avoid joining at the SQL layer + summarising in C# so
/// the InMemory test provider executes identically to SQL Server.
/// </summary>
public sealed class DogfoodMetricsService : IDogfoodMetricsService
{
    private readonly ApplicationDbContext _db;
    private readonly ILogger<DogfoodMetricsService> _logger;

    public DogfoodMetricsService(ApplicationDbContext db, ILogger<DogfoodMetricsService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<DogfoodMetricsDto> GetAsync(CancellationToken ct = default)
    {
        // Distinct learners with at least one Completed Initial assessment.
        var learnerIdsWithInitial = await _db.Assessments
            .AsNoTracking()
            .Where(a => a.Variant == AssessmentVariant.Initial
                        && a.Status == AssessmentStatus.Completed)
            .Select(a => a.UserId)
            .Distinct()
            .ToListAsync(ct);
        var distinctLearners = learnerIdsWithInitial.Count;

        var allPaths = await _db.LearningPaths
            .AsNoTracking()
            .ToListAsync(ct);

        var learnersAt100 = allPaths
            .Where(p => p.IsActive && p.ProgressPercent >= 100m)
            .Select(p => p.UserId)
            .Distinct()
            .Count();

        var learnersOnPhase2 = allPaths
            .Where(p => p.Version >= 2)
            .Select(p => p.UserId)
            .Distinct()
            .Count();

        var learnersGraduated = await _db.Assessments
            .AsNoTracking()
            .Where(a => a.Variant == AssessmentVariant.Full
                        && a.Status == AssessmentStatus.Completed)
            .Select(a => a.UserId)
            .Distinct()
            .CountAsync(ct);

        // Pre/Post deltas. For each user, parse the InitialSkillProfileJson
        // from their FIRST (Version=1) path. Then read current LearnerSkill
        // Profile rows. Compute per-category delta on overlapping categories.
        var firstPaths = allPaths
            .Where(p => p.Version == 1 && !string.IsNullOrWhiteSpace(p.InitialSkillProfileJson))
            .GroupBy(p => p.UserId)
            .Select(g => g.OrderBy(p => p.GeneratedAt).First())
            .ToList();

        var allCurrentProfiles = await _db.LearnerSkillProfiles
            .AsNoTracking()
            .ToListAsync(ct);
        var currentByUser = allCurrentProfiles.GroupBy(p => p.UserId).ToDictionary(
            g => g.Key,
            g => g.ToDictionary(p => p.Category, p => p.SmoothedScore));

        var perCatSamples = new Dictionary<SkillCategory, List<(decimal initial, decimal current)>>();
        foreach (var path in firstPaths)
        {
            if (!currentByUser.TryGetValue(path.UserId, out var currentMap)) continue;

            IReadOnlyList<(SkillCategory cat, decimal score)> initial = ParseInitialSnapshot(path.InitialSkillProfileJson!);
            foreach (var (cat, initialScore) in initial)
            {
                if (!currentMap.TryGetValue(cat, out var currentScore)) continue;
                if (!perCatSamples.TryGetValue(cat, out var list))
                {
                    list = new List<(decimal, decimal)>();
                    perCatSamples[cat] = list;
                }
                list.Add((initialScore, currentScore));
            }
        }

        var categoryDeltas = perCatSamples
            .Select(kvp =>
            {
                var avgInitial = kvp.Value.Average(x => x.initial);
                var avgCurrent = kvp.Value.Average(x => x.current);
                return new CategoryDeltaDto(
                    Category: kvp.Key.ToString(),
                    AvgInitial: Math.Round(avgInitial, 2),
                    AvgCurrent: Math.Round(avgCurrent, 2),
                    Delta: Math.Round(avgCurrent - avgInitial, 2),
                    SampleSize: kvp.Value.Count);
            })
            .OrderBy(c => c.Category, StringComparer.OrdinalIgnoreCase)
            .ToList();

        var avgOverallDelta = categoryDeltas.Count == 0
            ? 0m
            : Math.Round(categoryDeltas.Average(c => c.Delta), 2);

        // Pending-proposal approval rate. Adaptation decisions across all users.
        var approvedCount = await _db.PathAdaptationEvents
            .AsNoTracking()
            .CountAsync(e => e.LearnerDecision == Domain.Tasks.PathAdaptationDecision.Approved, ct);
        var rejectedCount = await _db.PathAdaptationEvents
            .AsNoTracking()
            .CountAsync(e => e.LearnerDecision == Domain.Tasks.PathAdaptationDecision.Rejected, ct);
        var approvalRate = (approvedCount + rejectedCount) == 0
            ? 0m
            : Math.Round((decimal)approvedCount / (approvedCount + rejectedCount), 4);

        var empiricallyCalibrated = await _db.Questions
            .AsNoTracking()
            .CountAsync(q => q.CalibrationSource == Domain.Assessments.CalibrationSource.Empirical, ct);

        // Adaptation cycles per learner (excludes AutoApplied empty-action cycles).
        var totalAdaptationsWithActions = await _db.PathAdaptationEvents
            .AsNoTracking()
            .CountAsync(e => e.LearnerDecision != Domain.Tasks.PathAdaptationDecision.AutoApplied
                             || e.ActionsJson != "[]", ct);
        var cyclesPerLearner = distinctLearners == 0
            ? 0m
            : Math.Round((decimal)totalAdaptationsWithActions / distinctLearners, 2);

        var totalBank = await _db.Questions.AsNoTracking().CountAsync(q => q.IsActive, ct);
        var totalTasks = await _db.Tasks.AsNoTracking().CountAsync(t => t.IsActive, ct);

        return new DogfoodMetricsDto(
            DistinctLearners: distinctLearners,
            LearnersAt100: learnersAt100,
            LearnersGraduated: learnersGraduated,
            LearnersOnPhase2: learnersOnPhase2,
            AvgPrePostDeltaOverall: avgOverallDelta,
            AvgPrePostDeltaByCategory: categoryDeltas,
            PendingProposalApprovalRate: approvalRate,
            EmpiricallyCalibratedQuestions: empiricallyCalibrated,
            AdaptationCyclesPerLearner: cyclesPerLearner,
            TotalBankQuestions: totalBank,
            TotalActiveTasks: totalTasks,
            CapturedAt: DateTime.UtcNow);
    }

    private IReadOnlyList<(SkillCategory cat, decimal score)> ParseInitialSnapshot(string json)
    {
        try
        {
            var raw = JsonSerializer.Deserialize<List<InitialEntry>>(json, SnapshotJsonOptions) ?? new();
            return raw
                .Where(e => !string.IsNullOrWhiteSpace(e.Category)
                            && Enum.TryParse<SkillCategory>(e.Category, out _))
                .Select(e => ((SkillCategory)Enum.Parse(typeof(SkillCategory), e.Category!), e.SmoothedScore))
                .ToList();
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "Could not parse InitialSkillProfileJson; skipping in dogfood metrics.");
            return Array.Empty<(SkillCategory, decimal)>();
        }
    }

    private sealed class InitialEntry
    {
        public string? Category { get; set; }
        public decimal SmoothedScore { get; set; }
    }

    private static readonly JsonSerializerOptions SnapshotJsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
    };
}

using System.Text.Json;
using CodeMentor.Application.CodeReview;
using CodeMentor.Domain.Assessments;
using CodeMentor.Domain.Skills;
using CodeMentor.Domain.Submissions;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace CodeMentor.Infrastructure.CodeReview;

/// <summary>
/// S12-T3 / F14 (ADR-040, ADR-041, ADR-042, ADR-043): aggregates the data
/// scattered across Skills (<c>CodeQualityScores</c>, <c>SkillScores</c>),
/// Submissions (<c>Submissions</c>, <c>AIAnalysisResults</c>), Assessments
/// (<c>Assessments</c>), and Tasks (<c>Tasks</c>) into a single
/// <see cref="LearnerSnapshot"/> per AI review. Calls into
/// <see cref="IFeedbackHistoryRetriever"/> for the RAG portion; Qdrant
/// failure is handled inside the retriever (returns empty list) so this
/// service is unconditionally non-throwing on the happy-path data.
/// </summary>
public sealed class LearnerSnapshotService : ILearnerSnapshotService
{
    private readonly ApplicationDbContext _db;
    private readonly IFeedbackHistoryRetriever _retriever;
    private readonly LearnerSnapshotOptions _opts;
    private readonly ILogger<LearnerSnapshotService> _logger;

    public LearnerSnapshotService(
        ApplicationDbContext db,
        IFeedbackHistoryRetriever retriever,
        IOptions<LearnerSnapshotOptions> opts,
        ILogger<LearnerSnapshotService> logger)
    {
        _db = db;
        _retriever = retriever;
        _opts = opts.Value;
        _logger = logger;
    }

    public async Task<LearnerSnapshot> BuildAsync(
        Guid userId,
        Guid currentSubmissionId,
        Guid currentTaskId,
        string? currentStaticFindingsJson,
        CancellationToken ct = default)
    {
        // ── Load all the raw rows in parallel-ish (EF Core SQL serializes them
        // anyway, but expressing the intent makes the data dependencies clear). ──
        var qualityScores = await _db.CodeQualityScores
            .AsNoTracking()
            .Where(s => s.UserId == userId)
            .ToListAsync(ct);

        var recentCompletedSubmissions = await _db.Submissions
            .AsNoTracking()
            .Where(s => s.UserId == userId
                        && s.Status == SubmissionStatus.Completed
                        && s.AiAnalysisStatus == AiAnalysisStatus.Available
                        && s.Id != currentSubmissionId)
            .OrderByDescending(s => s.CompletedAt)
            .Take(_opts.CommonMistakesLookback)
            .ToListAsync(ct);

        var recentSubmissionIds = recentCompletedSubmissions.Select(s => s.Id).ToList();
        var recentTaskIds = recentCompletedSubmissions.Select(s => s.TaskId).Distinct().ToList();

        var aiResults = recentSubmissionIds.Count == 0
            ? new List<AIAnalysisResult>()
            : await _db.AIAnalysisResults
                .AsNoTracking()
                .Where(r => recentSubmissionIds.Contains(r.SubmissionId))
                .ToListAsync(ct);

        var taskNames = recentTaskIds.Count == 0
            ? new Dictionary<Guid, string>()
            : await _db.Tasks
                .AsNoTracking()
                .Where(t => recentTaskIds.Contains(t.Id))
                .Select(t => new { t.Id, t.Title })
                .ToDictionaryAsync(t => t.Id, t => t.Title, ct);

        var completedCount = await _db.Submissions
            .AsNoTracking()
            .CountAsync(s => s.UserId == userId
                              && s.Status == SubmissionStatus.Completed
                              && s.Id != currentSubmissionId, ct);

        var attemptsOnCurrentTask = await _db.Submissions
            .AsNoTracking()
            .CountAsync(s => s.UserId == userId && s.TaskId == currentTaskId, ct);

        var latestAssessment = await _db.Assessments
            .AsNoTracking()
            .Where(a => a.UserId == userId && a.Status == AssessmentStatus.Completed)
            .OrderByDescending(a => a.CompletedAt)
            .FirstOrDefaultAsync(ct);

        var skillScores = await _db.SkillScores
            .AsNoTracking()
            .Where(s => s.UserId == userId)
            .ToListAsync(ct);

        // ── Compute the snapshot fields ──
        var skillLevel = latestAssessment?.SkillLevel?.ToString() ?? "Intermediate";

        var (codeQualityAverages, codeQualitySampleCounts) = BuildCodeQualityMaps(qualityScores);

        var weakAreas = ComputeWeakAreas(qualityScores, skillScores);
        var strongAreas = ComputeStrongAreas(qualityScores, skillScores);

        var averageOverallScore = aiResults.Count == 0
            ? (double?)null
            : Math.Round(aiResults.Average(r => (double)r.OverallScore), 2);

        var improvementTrend = ComputeImprovementTrend(aiResults, recentCompletedSubmissions);

        var commonMistakes = ComputeCommonMistakes(aiResults);
        var recurringWeaknesses = ComputeRecurringWeaknesses(qualityScores);

        var recentSubmissionsSummary = BuildRecentSubmissionSummaries(
            recentCompletedSubmissions, aiResults, taskNames);

        var isFirstReview = completedCount == 0;

        // ── RAG retrieval (ADR-040 + ADR-042 + ADR-043) ──
        // Post-S12 polish (2026-05-12): the retriever now returns an
        // explicit status so the narrative can distinguish "service down"
        // from "service healthy, no chunks for this user yet". Both
        // produce empty chunk lists but only the former is a degraded
        // state.
        var ragResult = await RetrieveRagChunksAsync(
            userId, currentStaticFindingsJson, isFirstReview, ct);
        var ragChunks = ragResult.Chunks;

        var progressNotes = BuildProgressNotes(
            isFirstReview: isFirstReview,
            skillLevel: skillLevel,
            weakAreas: weakAreas,
            strongAreas: strongAreas,
            recurringWeaknesses: recurringWeaknesses,
            improvementTrend: improvementTrend,
            averageOverallScore: averageOverallScore,
            attemptsOnCurrentTask: attemptsOnCurrentTask,
            ragChunks: ragChunks,
            ragStatus: ragResult.Status);

        _logger.LogInformation(
            "LearnerSnapshot built for user {UserId}: completed={Completed} avg={Avg} trend={Trend} recurring={Recurring} rag={Rag} firstReview={First}",
            userId, completedCount, averageOverallScore, improvementTrend,
            recurringWeaknesses.Count, ragChunks.Count, isFirstReview);

        return new LearnerSnapshot
        {
            UserId = userId,
            SkillLevel = skillLevel,
            CompletedSubmissionsCount = completedCount,
            AverageOverallScore = averageOverallScore,
            CodeQualityAverages = codeQualityAverages,
            CodeQualitySampleCounts = codeQualitySampleCounts,
            WeakAreas = weakAreas,
            StrongAreas = strongAreas,
            ImprovementTrend = improvementTrend,
            RecentSubmissions = recentSubmissionsSummary,
            CommonMistakes = commonMistakes,
            RecurringWeaknesses = recurringWeaknesses,
            RagChunks = ragChunks,
            AttemptsOnCurrentTask = attemptsOnCurrentTask,
            IsFirstReview = isFirstReview,
            ProgressNotes = progressNotes,
        };
    }

    // ────────────────────────────────────────────────────────────────────
    // CodeQualityScores → averages + sample counts map
    // ────────────────────────────────────────────────────────────────────
    private static (IReadOnlyDictionary<string, double> Averages,
                    IReadOnlyDictionary<string, int> SampleCounts)
        BuildCodeQualityMaps(IReadOnlyList<CodeQualityScore> qualityScores)
    {
        var avg = new Dictionary<string, double>();
        var counts = new Dictionary<string, int>();
        foreach (var s in qualityScores)
        {
            avg[s.Category.ToString()] = Math.Round((double)s.Score, 2);
            counts[s.Category.ToString()] = s.SampleCount;
        }
        return (avg, counts);
    }

    // ────────────────────────────────────────────────────────────────────
    // Weak / Strong areas — uses CodeQualityScores when available, falls back
    // to assessment SkillScores for cold-start users (ADR-042).
    // ────────────────────────────────────────────────────────────────────
    private IReadOnlyList<string> ComputeWeakAreas(
        IReadOnlyList<CodeQualityScore> qualityScores,
        IReadOnlyList<SkillScore> skillScores)
    {
        if (qualityScores.Count > 0)
        {
            return qualityScores
                .Where(s => s.SampleCount >= 1 && (double)s.Score < _opts.WeakAreaScoreThreshold)
                .OrderBy(s => s.Score)
                .Select(s => s.Category.ToString())
                .ToList();
        }
        // Cold-start fallback: assessment-derived skills.
        return skillScores
            .Where(s => (double)s.Score < _opts.WeakAreaScoreThreshold)
            .OrderBy(s => s.Score)
            .Select(s => s.Category.ToString())
            .ToList();
    }

    private IReadOnlyList<string> ComputeStrongAreas(
        IReadOnlyList<CodeQualityScore> qualityScores,
        IReadOnlyList<SkillScore> skillScores)
    {
        if (qualityScores.Count > 0)
        {
            return qualityScores
                .Where(s => s.SampleCount >= 1 && (double)s.Score >= _opts.StrongAreaScoreThreshold)
                .OrderByDescending(s => s.Score)
                .Select(s => s.Category.ToString())
                .ToList();
        }
        return skillScores
            .Where(s => (double)s.Score >= _opts.StrongAreaScoreThreshold)
            .OrderByDescending(s => s.Score)
            .Select(s => s.Category.ToString())
            .ToList();
    }

    // ────────────────────────────────────────────────────────────────────
    // Improvement trend — last 3 vs prior 3 by mean OverallScore.
    // Null when fewer than 4 datapoints are available.
    // ────────────────────────────────────────────────────────────────────
    private static string? ComputeImprovementTrend(
        IReadOnlyList<AIAnalysisResult> aiResults,
        IReadOnlyList<Submission> recentSubmissions)
    {
        // Pair each AI result with its parent submission's CompletedAt so the
        // ordering matches calendar time (the rows above are already in DESC
        // order; restate for safety).
        var byTime = recentSubmissions
            .Join(aiResults,
                  s => s.Id,
                  r => r.SubmissionId,
                  (s, r) => new { When = s.CompletedAt ?? s.CreatedAt, r.OverallScore })
            .OrderByDescending(x => x.When)
            .ToList();

        if (byTime.Count < 4) return null;

        var lastN = byTime.Take(3).Select(x => (double)x.OverallScore).Average();
        var priorN = byTime.Skip(3).Take(3).Select(x => (double)x.OverallScore).Average();
        var delta = lastN - priorN;
        if (delta >= 3) return "improving";
        if (delta <= -3) return "declining";
        return "stable";
    }

    // ────────────────────────────────────────────────────────────────────
    // Common mistakes — top-5 most frequent weakness phrases across the last
    // N submissions' WeaknessesJson (case-insensitive, whitespace-normalized).
    // Per ADR-041.
    // ────────────────────────────────────────────────────────────────────
    private static readonly JsonSerializerOptions _parseOpts = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    private IReadOnlyList<string> ComputeCommonMistakes(IReadOnlyList<AIAnalysisResult> aiResults)
    {
        if (aiResults.Count == 0) return Array.Empty<string>();

        // Track frequency + last-seen index (for tie-breaking by recency).
        var freq = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        var lastSeen = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        var displayCase = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

        // aiResults are in arbitrary order from the IN-query; sort by ProcessedAt
        // DESC so "newer first" ordering drives the lastSeen index. Lower index
        // = newer.
        var ordered = aiResults.OrderByDescending(r => r.ProcessedAt).ToList();
        for (var idx = 0; idx < ordered.Count; idx++)
        {
            var weaknesses = ParseStringList(ordered[idx].WeaknessesJson);
            foreach (var w in weaknesses)
            {
                var normalized = NormalizePhrase(w);
                if (string.IsNullOrWhiteSpace(normalized)) continue;
                freq[normalized] = freq.GetValueOrDefault(normalized) + 1;
                if (!lastSeen.ContainsKey(normalized))
                {
                    lastSeen[normalized] = idx;
                    displayCase[normalized] = Truncate(w.Trim(), _opts.MainIssueMaxChars);
                }
            }
        }

        return freq
            .OrderByDescending(kv => kv.Value)
            .ThenBy(kv => lastSeen[kv.Key])              // earlier index = newer = wins tie
            .Take(5)
            .Select(kv => displayCase[kv.Key])
            .ToList();
    }

    private static IReadOnlyList<string> ParseStringList(string json)
    {
        if (string.IsNullOrWhiteSpace(json)) return Array.Empty<string>();
        try
        {
            var list = JsonSerializer.Deserialize<List<string>>(json, _parseOpts);
            return list ?? new List<string>();
        }
        catch (JsonException)
        {
            return Array.Empty<string>();
        }
    }

    private static string NormalizePhrase(string raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return string.Empty;
        // Whitespace-normalized, lowercased, trimmed.
        return string.Join(' ', raw.Split(new[] { ' ', '\t', '\r', '\n' },
            StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
            .ToLowerInvariant();
    }

    private static string Truncate(string s, int max) =>
        s.Length <= max ? s : s.Substring(0, max) + "…";

    // ────────────────────────────────────────────────────────────────────
    // Recurring weaknesses — categories where avg < threshold AND
    // sampleCount >= RecurringThresholdSampleSize. Per ADR-041.
    // ────────────────────────────────────────────────────────────────────
    private IReadOnlyList<string> ComputeRecurringWeaknesses(IReadOnlyList<CodeQualityScore> qualityScores)
    {
        return qualityScores
            .Where(s => s.SampleCount >= _opts.RecurringThresholdSampleSize
                        && (double)s.Score < _opts.WeakAreaScoreThreshold)
            .OrderBy(s => s.Score)
            .Select(s => s.Category.ToString())
            .ToList();
    }

    // ────────────────────────────────────────────────────────────────────
    // Recent submissions summaries — join submissions ↔ AI results ↔ tasks
    // into a compact per-row DTO with the top-3 weaknesses as "main issues".
    // ────────────────────────────────────────────────────────────────────
    private IReadOnlyList<RecentSubmissionSummary> BuildRecentSubmissionSummaries(
        IReadOnlyList<Submission> recentSubmissions,
        IReadOnlyList<AIAnalysisResult> aiResults,
        IReadOnlyDictionary<Guid, string> taskNames)
    {
        var aiBySubmission = aiResults.ToDictionary(r => r.SubmissionId);

        return recentSubmissions
            .Select(s =>
            {
                aiBySubmission.TryGetValue(s.Id, out var ai);
                var weaknesses = ai is null
                    ? (IReadOnlyList<string>)Array.Empty<string>()
                    : ParseStringList(ai.WeaknessesJson)
                        .Take(3)
                        .Select(w => Truncate(w.Trim(), _opts.MainIssueMaxChars))
                        .ToList();
                taskNames.TryGetValue(s.TaskId, out var title);
                return new RecentSubmissionSummary(
                    SubmissionId: s.Id,
                    TaskName: title ?? "(unknown task)",
                    Score: ai?.OverallScore ?? 0,
                    Date: s.CompletedAt ?? s.CreatedAt,
                    MainIssues: weaknesses);
            })
            .ToList();
    }

    // ────────────────────────────────────────────────────────────────────
    // RAG retrieval with cold-start short-circuit (ADR-042) + graceful
    // fallback (ADR-043 — retriever swallows Qdrant failures and returns
    // empty list; here we just guard against the cold-start case so we
    // never make a no-op network call).
    //
    // The status returned to the caller mirrors the retriever's contract:
    //   - AnchorEmpty: cold-start short-circuit OR empty anchor (no HTTP)
    //   - RetrievalCompleted: HTTP ok (chunks may be empty for sparse users)
    //   - Unavailable: ADR-043 transport failure
    // ────────────────────────────────────────────────────────────────────
    private async Task<FeedbackHistoryRetrievalResult> RetrieveRagChunksAsync(
        Guid userId,
        string? anchorText,
        bool isFirstReview,
        CancellationToken ct)
    {
        if (isFirstReview)
        {
            // Cold-start: empty corpus, skip Qdrant entirely.
            return FeedbackHistoryRetrievalResult.AnchorEmpty();
        }

        if (string.IsNullOrWhiteSpace(anchorText))
        {
            // No anchor → similarity has nothing to bite on. Skip.
            return FeedbackHistoryRetrievalResult.AnchorEmpty();
        }

        return await _retriever.RetrieveAsync(userId, anchorText, _opts.RagTopK, ct);
    }

    // ────────────────────────────────────────────────────────────────────
    // ProgressNotes narrative — composed from the structured fields above so
    // the AI prompt's `progressNotes` field receives a human-readable summary
    // the model can quote/reference. Cold-start gets a dedicated narrative
    // per ADR-042; Qdrant outage gets the ADR-043 "temporarily unavailable"
    // annotation, while "service healthy but no chunks indexed yet for this
    // learner" gets a separate, more accurate annotation that calibrates
    // the AI not to invent prior-feedback references.
    // ────────────────────────────────────────────────────────────────────
    private static string BuildProgressNotes(
        bool isFirstReview,
        string skillLevel,
        IReadOnlyList<string> weakAreas,
        IReadOnlyList<string> strongAreas,
        IReadOnlyList<string> recurringWeaknesses,
        string? improvementTrend,
        double? averageOverallScore,
        int attemptsOnCurrentTask,
        IReadOnlyList<PriorFeedbackChunk> ragChunks,
        FeedbackHistoryRetrievalStatus ragStatus)
    {
        var lines = new List<string>();

        if (isFirstReview)
        {
            lines.Add(
                "This is the learner's first code submission to the platform. " +
                $"Assessment baseline classifies them as {skillLevel}. " +
                (weakAreas.Count > 0
                    ? $"Assessment gaps: {string.Join(", ", weakAreas)}. "
                    : "") +
                (strongAreas.Count > 0
                    ? $"Assessment strengths: {string.Join(", ", strongAreas)}. "
                    : "") +
                "Calibrate review depth and tone accordingly — no prior submissions to compare against.");
            return string.Join('\n', lines);
        }

        if (averageOverallScore.HasValue)
        {
            lines.Add(
                $"Learner ({skillLevel}) has completed prior submissions with an average overall score of {averageOverallScore:0.0}. " +
                (improvementTrend is not null
                    ? $"Trend over the last 3 vs prior 3 submissions: {improvementTrend}."
                    : "Insufficient history for a trend signal yet."));
        }
        else
        {
            lines.Add(
                $"Learner ({skillLevel}) has prior submissions but no AI-reviewed history is available yet.");
        }

        if (recurringWeaknesses.Count > 0)
        {
            lines.Add(
                "Recurring weakness categories (avg < threshold with sufficient samples): " +
                string.Join(", ", recurringWeaknesses) +
                ". Escalate these in the current review — generic advice has already been given and ignored or unabsorbed.");
        }

        if (attemptsOnCurrentTask > 1)
        {
            lines.Add(
                $"This is the learner's attempt #{attemptsOnCurrentTask} at the current task. " +
                "Acknowledge prior attempts; if specific past feedback is referenced below, build on it explicitly.");
        }

        if (ragChunks.Count > 0)
        {
            lines.Add("");
            lines.Add("Relevant prior feedback excerpts retrieved from this learner's history " +
                      "(most similar to the current submission's static-analysis findings):");
            for (var i = 0; i < ragChunks.Count; i++)
            {
                var c = ragChunks[i];
                lines.Add(
                    $"{i + 1}. [{c.Kind}] On task \"{c.TaskName}\" ({c.SourceDate:yyyy-MM-dd}, " +
                    $"similarity={c.SimilarityScore:0.00}): {c.ChunkText}");
            }
            lines.Add(
                "When relevant, reference these specific past observations in the current review — " +
                "do not restate them verbatim if the current code doesn't trigger them.");
        }
        else
        {
            // Two distinct "no chunks" situations — both legitimately produce
            // an empty list, but they mean very different things to the AI
            // and to ops. The status disambiguates.
            switch (ragStatus)
            {
                case FeedbackHistoryRetrievalStatus.Unavailable:
                    // ADR-043 fallback path actually engaged.
                    lines.Add(
                        "[note: detailed prior-feedback retrieval temporarily unavailable; " +
                        "review based on the aggregate profile above only. Do not fabricate " +
                        "references to specific past submissions.]");
                    break;

                case FeedbackHistoryRetrievalStatus.RetrievalCompleted:
                    // Healthy service, just no relevant chunks indexed for this
                    // learner yet — expected on early submissions before the
                    // mentor-chat index warms up. Reassures the AI not to
                    // invent excerpts.
                    lines.Add(
                        "[note: no relevant prior-feedback excerpts are indexed yet for this " +
                        "learner — the retrieval index populates incrementally as their " +
                        "submissions complete. The aggregate profile above already reflects " +
                        "recurring-pattern signals; rely on that. Do not fabricate references " +
                        "to specific past submissions.]");
                    break;

                case FeedbackHistoryRetrievalStatus.AnchorEmpty:
                    // No anchor (typically cold-start path that already
                    // wrote its dedicated narrative above; or the rare case
                    // where the caller forgot the anchor). Stay silent here
                    // to avoid double-narrating cold-start.
                    break;
            }
        }

        return string.Join('\n', lines);
    }
}

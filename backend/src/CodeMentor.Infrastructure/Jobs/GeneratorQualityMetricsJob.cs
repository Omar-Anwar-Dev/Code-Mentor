using CodeMentor.Application.Admin;
using Microsoft.Extensions.Logging;

namespace CodeMentor.Infrastructure.Jobs;

/// <summary>
/// S16-T9 / F15 (ADR-049 / ADR-054): weekly Hangfire job that pulls the
/// last 8 generator batches and logs the per-batch approve/reject ratios.
///
/// Purpose: surface R20 (generator-quality drift) early. If reject rate
/// trends above 30% across multiple batches, the team iterates the
/// `generate_questions_v1.md` prompt before the next content burst.
///
/// The admin dashboard widget reads the same metrics on-demand via
/// <c>GET /api/admin/questions/drafts/metrics?limit=8</c>; this job's
/// role is to write a periodic log line that surfaces in Seq / log
/// aggregators so operators can spot regressions without polling the UI.
/// </summary>
public sealed class GeneratorQualityMetricsJob
{
    /// <summary>Stable Hangfire recurring-job ID — used in
    /// <c>RecurringJob.AddOrUpdate</c>.</summary>
    public const string RecurringJobId = "generator-quality-metrics";

    /// <summary>Cron: Monday 04:00 UTC. Same low-traffic window as the
    /// audit-blob-cleanup job.</summary>
    public const string Cron = "0 4 * * 1";

    private readonly IAdminQuestionDraftService _drafts;
    private readonly ILogger<GeneratorQualityMetricsJob> _log;

    public GeneratorQualityMetricsJob(
        IAdminQuestionDraftService drafts,
        ILogger<GeneratorQualityMetricsJob> log)
    {
        _drafts = drafts;
        _log = log;
    }

    public async Task RunAsync(CancellationToken ct = default)
    {
        var metrics = await _drafts.GetRecentBatchMetricsAsync(limit: 8, ct);
        if (metrics.Count == 0)
        {
            _log.LogInformation("GeneratorQualityMetricsJob: no batches recorded yet — skipping.");
            return;
        }

        // Aggregate across the last 8 batches.
        var totalDrafts = metrics.Sum(m => m.TotalDrafts);
        var totalApproved = metrics.Sum(m => m.Approved);
        var totalRejected = metrics.Sum(m => m.Rejected);
        var weightedRejectRate = (totalApproved + totalRejected) == 0
            ? 0.0
            : (double)totalRejected / (totalApproved + totalRejected) * 100.0;

        _log.LogInformation(
            "GeneratorQualityMetricsJob: last {Count} batches — drafts={TotalDrafts}, "
            + "approved={TotalApproved}, rejected={TotalRejected}, rejectRate={RejectRate:F1}% "
            + "(bar: 30%, status: {Status})",
            metrics.Count, totalDrafts, totalApproved, totalRejected,
            weightedRejectRate,
            weightedRejectRate < 30 ? "WITHIN" : "OVER");

        // Per-batch breakdown — surfaces individual batches drifting above the bar.
        foreach (var batch in metrics)
        {
            _log.LogInformation(
                "GeneratorQualityMetricsJob: batch {BatchId} ({BatchAt:yyyy-MM-dd}) "
                + "approved={Approved}/{Total} ({RejectRate:F1}% reject) prompt={Prompt}",
                batch.BatchId, batch.GeneratedAt, batch.Approved, batch.TotalDrafts,
                batch.RejectRatePct, batch.PromptVersion);
        }
    }
}

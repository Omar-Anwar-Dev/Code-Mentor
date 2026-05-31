using CodeMentor.Application.LearningPaths;
using CodeMentor.Domain.Skills;
using CodeMentor.Domain.Tasks;

namespace CodeMentor.Infrastructure.LearningPaths;

/// <summary>
/// S20-T4 / F16 (ADR-053): trigger-evaluator implementation per
/// <c>docs/assessment-learning-path.md</c> §7.1.
///
/// Decision flow:
/// 1. If <c>path.ProgressPercent &gt;= 100</c> → fire, trigger=Completion100,
///    signal=Large (bypasses cooldown).
/// 2. Else if 24h cooldown active → don't fire (return decision with Trigger=
///    Periodic for log clarity, ShouldFire=false).
/// 3. Else if <c>completedSinceLast &gt;= 3</c> → fire, trigger=Periodic, signal=Small.
/// 4. Else if maxSwing &gt; 10pt → fire, trigger=ScoreSwing, signal=Small/Medium/Large
///    by band: 10-20 = Small, 20-30 = Medium, &gt; 30 = Large.
/// 5. Else don't fire (NoAction).
///
/// Bands match the AI service's <c>signal_level</c> enum at
/// <c>ai-service/app/domain/schemas/path_adaptation.py</c>.
/// </summary>
public sealed class PathAdaptationTriggerEvaluator : IPathAdaptationTriggerEvaluator
{
    /// <summary>Cooldown window per locked answer #2 (24h).</summary>
    public static readonly TimeSpan CooldownWindow = TimeSpan.FromHours(24);

    /// <summary>Threshold below which a score swing is "no action".</summary>
    public const decimal NoActionSwingMax = 10.0m;

    /// <summary>Per-3-completed threshold for Periodic trigger.</summary>
    public const int PeriodicCompletedThreshold = 3;

    public PathAdaptationTriggerDecision Evaluate(
        LearningPath path,
        IReadOnlyDictionary<CodeQualityCategory, decimal> codeQualityBefore,
        IReadOnlyDictionary<CodeQualityCategory, decimal> codeQualityAfter,
        int completedSinceLastAdaptation,
        DateTime nowUtc)
    {
        // Max |before - after| across all categories the submission touched.
        decimal maxSwing = 0m;
        foreach (var (cat, after) in codeQualityAfter)
        {
            if (codeQualityBefore.TryGetValue(cat, out var before))
            {
                var swing = Math.Abs(after - before);
                if (swing > maxSwing) maxSwing = swing;
            }
            else
            {
                // First sample in this category — treat as no signal (no before to
                // compare against; this is the seeding case, not a swing).
            }
        }

        // (1) Completion100 — always fires, bypasses cooldown.
        if (path.ProgressPercent >= 100m)
        {
            return new PathAdaptationTriggerDecision(
                ShouldFire: true,
                Trigger: PathAdaptationTrigger.Completion100,
                SignalLevel: PathAdaptationSignalLevel.Large,
                MaxSwing: maxSwing,
                CompletedSinceLast: completedSinceLastAdaptation,
                Reason: "path reached 100% progress (Completion100 bypasses cooldown)");
        }

        // Cooldown check applies to (a) Periodic and (b) ScoreSwing only.
        var cooldownActive = path.LastAdaptedAt is not null
            && (nowUtc - path.LastAdaptedAt.Value) < CooldownWindow;
        if (cooldownActive)
        {
            return new PathAdaptationTriggerDecision(
                ShouldFire: false,
                Trigger: PathAdaptationTrigger.Periodic,
                SignalLevel: PathAdaptationSignalLevel.NoAction,
                MaxSwing: maxSwing,
                CompletedSinceLast: completedSinceLastAdaptation,
                Reason: $"24h cooldown active (LastAdaptedAt={path.LastAdaptedAt:o})");
        }

        // (a) Periodic — every 3 completed PathTasks since last adaptation.
        if (completedSinceLastAdaptation >= PeriodicCompletedThreshold)
        {
            return new PathAdaptationTriggerDecision(
                ShouldFire: true,
                Trigger: PathAdaptationTrigger.Periodic,
                SignalLevel: PathAdaptationSignalLevel.Small,
                MaxSwing: maxSwing,
                CompletedSinceLast: completedSinceLastAdaptation,
                Reason: $"completedSinceLast={completedSinceLastAdaptation} >= {PeriodicCompletedThreshold}");
        }

        // (b) ScoreSwing — max swing > 10pt.
        if (maxSwing > NoActionSwingMax)
        {
            var signal = ClassifySwing(maxSwing);
            return new PathAdaptationTriggerDecision(
                ShouldFire: true,
                Trigger: PathAdaptationTrigger.ScoreSwing,
                SignalLevel: signal,
                MaxSwing: maxSwing,
                CompletedSinceLast: completedSinceLastAdaptation,
                Reason: $"maxSwing={maxSwing:F1}pt > {NoActionSwingMax:F0}");
        }

        // No condition fired.
        return new PathAdaptationTriggerDecision(
            ShouldFire: false,
            Trigger: PathAdaptationTrigger.Periodic,
            SignalLevel: PathAdaptationSignalLevel.NoAction,
            MaxSwing: maxSwing,
            CompletedSinceLast: completedSinceLastAdaptation,
            Reason: $"no trigger met (swing={maxSwing:F1}pt, completed={completedSinceLastAdaptation})");
    }

    /// <summary>
    /// Classify a non-zero swing into the AI service's signal level:
    /// 10-20 → Small, 20-30 → Medium, &gt; 30 → Large.
    /// Public so tests can reuse it.
    /// </summary>
    public static PathAdaptationSignalLevel ClassifySwing(decimal swing)
    {
        if (swing <= NoActionSwingMax) return PathAdaptationSignalLevel.NoAction;
        if (swing <= 20m) return PathAdaptationSignalLevel.Small;
        if (swing <= 30m) return PathAdaptationSignalLevel.Medium;
        return PathAdaptationSignalLevel.Large;
    }
}

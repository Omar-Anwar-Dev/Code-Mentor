using CodeMentor.Domain.Skills;
using CodeMentor.Domain.Tasks;

namespace CodeMentor.Application.LearningPaths;

/// <summary>
/// S20-T4 / F16 (ADR-053): pure-logic evaluator that decides whether a
/// submission-driven adaptation cycle should fire. Called by
/// <c>SubmissionAnalysisJob</c> right after the FeedbackAggregator runs.
///
/// Inputs:
/// - Active <see cref="LearningPath"/> snapshot (incl. <c>LastAdaptedAt</c>,
///   <c>ProgressPercent</c>, completed PathTasks).
/// - <c>CodeQualityScore</c> snapshot BEFORE the submission's
///   running-average update.
/// - Same snapshot AFTER the update (or the AI review scores from this
///   submission as a delta proxy).
///
/// Outputs (<see cref="PathAdaptationTriggerDecision"/>):
/// - <c>ShouldFire</c>: gate result.
/// - <c>Trigger</c>: which condition fired (Periodic / ScoreSwing / Completion100).
///   For not-firing, <c>Trigger</c> is set to the closest match for log clarity.
/// - <c>SignalLevel</c>: classification used by both the cooldown override + the
///   AI service's <c>signalLevel</c> request param.
///
/// Trigger semantics per <c>docs/assessment-learning-path.md</c> §7.1:
/// - Trigger (a) Periodic: ≥3 PathTasks completed since path.LastAdaptedAt.
/// - Trigger (b) ScoreSwing: max |before - after| score swing &gt; 10pt.
/// - Trigger (c) Completion100: path.ProgressPercent >= 100. Bypasses cooldown.
/// - 24h cooldown: applies to (a) and (b); bypassed by (c) and OnDemand.
/// </summary>
public interface IPathAdaptationTriggerEvaluator
{
    PathAdaptationTriggerDecision Evaluate(
        LearningPath path,
        IReadOnlyDictionary<CodeQualityCategory, decimal> codeQualityBefore,
        IReadOnlyDictionary<CodeQualityCategory, decimal> codeQualityAfter,
        int completedSinceLastAdaptation,
        DateTime nowUtc);
}

/// <summary>S20-T4 / F16: outcome of an evaluator pass.</summary>
public sealed record PathAdaptationTriggerDecision(
    bool ShouldFire,
    PathAdaptationTrigger Trigger,
    PathAdaptationSignalLevel SignalLevel,
    decimal MaxSwing,
    int CompletedSinceLast,
    string Reason);

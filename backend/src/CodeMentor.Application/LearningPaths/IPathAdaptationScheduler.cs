using CodeMentor.Domain.Tasks;

namespace CodeMentor.Application.LearningPaths;

/// <summary>
/// S20-T4 / F16 (ADR-053): abstracts the mechanism that enqueues the
/// <c>PathAdaptationJob</c>. Hangfire in prod; an inline / immediate
/// scheduler in tests.
///
/// Three enqueue paths reflect the trigger sources:
/// 1. <see cref="EnqueueFromSubmission"/> — called by <c>SubmissionAnalysisJob</c>
///    after the FeedbackAggregator runs; trigger ∈ { Periodic, ScoreSwing,
///    Completion100 } based on the post-submission state.
/// 2. <see cref="EnqueueOnDemand"/> — called by the <c>/api/learning-paths/me/refresh</c>
///    endpoint (S20-T5); always trigger=OnDemand; bypasses cooldown.
/// 3. <see cref="EnqueueFromReassessment"/> — forward-compat for S21
///    (MiniReassessment trigger). Not used by S20.
/// </summary>
public interface IPathAdaptationScheduler
{
    /// <summary>Submission-driven enqueue (Periodic / ScoreSwing / Completion100).</summary>
    void EnqueueFromSubmission(
        Guid pathId,
        Guid userId,
        PathAdaptationTrigger trigger,
        PathAdaptationSignalLevel signalLevel,
        Guid submissionId);

    /// <summary>Explicit "Refresh" button enqueue. Always bypasses cooldown.</summary>
    void EnqueueOnDemand(
        Guid pathId,
        Guid userId,
        PathAdaptationSignalLevel signalLevel);
}

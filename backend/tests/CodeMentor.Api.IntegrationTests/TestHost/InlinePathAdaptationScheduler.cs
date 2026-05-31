using CodeMentor.Application.LearningPaths;
using CodeMentor.Domain.Tasks;

namespace CodeMentor.Api.IntegrationTests.TestHost;

/// <summary>
/// S20-T5 / F16 (ADR-053): test replacement for the Hangfire-backed
/// adaptation scheduler. Does NOT actually run the job (the integration
/// tests assert on the HTTP surface, not the post-enqueue state). The
/// enqueue calls are simply recorded for verification.
///
/// If a future test needs the job to actually run inline (a la
/// <c>InlineLearningPathScheduler</c>), this implementation can be
/// switched to fire-and-wait without changing its public surface.
/// </summary>
public sealed class InlinePathAdaptationScheduler : IPathAdaptationScheduler
{
    public List<(Guid PathId, Guid UserId, PathAdaptationTrigger Trigger,
        PathAdaptationSignalLevel SignalLevel, Guid SubmissionId)> Enqueued { get; } = new();

    public void EnqueueFromSubmission(
        Guid pathId, Guid userId,
        PathAdaptationTrigger trigger, PathAdaptationSignalLevel signalLevel,
        Guid submissionId)
        => Enqueued.Add((pathId, userId, trigger, signalLevel, submissionId));

    public void EnqueueOnDemand(
        Guid pathId, Guid userId, PathAdaptationSignalLevel signalLevel)
        => Enqueued.Add((pathId, userId, PathAdaptationTrigger.OnDemand, signalLevel, Guid.Empty));
}

using CodeMentor.Application.LearningPaths;
using CodeMentor.Domain.Tasks;
using Hangfire;

namespace CodeMentor.Infrastructure.LearningPaths;

/// <summary>
/// S20-T4 / F16 (ADR-053): Hangfire-backed scheduler for
/// <see cref="PathAdaptationJob"/>. Three enqueue paths reflect the
/// trigger sources (submission, on-demand, future S21 reassessment).
/// </summary>
public sealed class HangfirePathAdaptationScheduler : IPathAdaptationScheduler
{
    private readonly IBackgroundJobClient _jobs;

    public HangfirePathAdaptationScheduler(IBackgroundJobClient jobs) => _jobs = jobs;

    public void EnqueueFromSubmission(
        Guid pathId,
        Guid userId,
        PathAdaptationTrigger trigger,
        PathAdaptationSignalLevel signalLevel,
        Guid submissionId)
    {
        _jobs.Enqueue<PathAdaptationJob>(j => j.ExecuteAsync(
            pathId, userId, trigger, signalLevel, submissionId, CancellationToken.None));
    }

    public void EnqueueOnDemand(
        Guid pathId,
        Guid userId,
        PathAdaptationSignalLevel signalLevel)
    {
        // OnDemand uses the All-zeros sentinel for submissionId — the job
        // generates an idempotency-key salt from Guid.NewGuid() in that case,
        // so concurrent Refresh clicks each enqueue a unique job.
        _jobs.Enqueue<PathAdaptationJob>(j => j.ExecuteAsync(
            pathId, userId, PathAdaptationTrigger.OnDemand, signalLevel,
            Guid.Empty, CancellationToken.None));
    }
}

using CodeMentor.Application.Assessments;
using Hangfire;

namespace CodeMentor.Infrastructure.Assessments;

/// <summary>
/// S17-T2 / F15 (ADR-049): production binding of
/// <see cref="IAssessmentSummaryScheduler"/>. Fire-and-forget enqueue
/// onto Hangfire. The job picks up in a fresh DI scope.
/// </summary>
public sealed class HangfireAssessmentSummaryScheduler : IAssessmentSummaryScheduler
{
    private readonly IBackgroundJobClient _jobs;

    public HangfireAssessmentSummaryScheduler(IBackgroundJobClient jobs) => _jobs = jobs;

    public void EnqueueGeneration(Guid userId, Guid assessmentId)
    {
        _jobs.Enqueue<GenerateAssessmentSummaryJob>(
            j => j.ExecuteAsync(userId, assessmentId, CancellationToken.None));
    }
}

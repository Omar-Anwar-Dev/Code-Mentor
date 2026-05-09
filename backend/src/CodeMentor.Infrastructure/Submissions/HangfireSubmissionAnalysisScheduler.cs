using CodeMentor.Application.Submissions;
using Hangfire;

namespace CodeMentor.Infrastructure.Submissions;

public class HangfireSubmissionAnalysisScheduler : ISubmissionAnalysisScheduler
{
    private readonly IBackgroundJobClient _jobs;

    public HangfireSubmissionAnalysisScheduler(IBackgroundJobClient jobs) => _jobs = jobs;

    public void Schedule(Guid submissionId)
        => _jobs.Enqueue<SubmissionAnalysisJob>(job => job.RunAsync(submissionId, CancellationToken.None));

    public void ScheduleAfter(Guid submissionId, TimeSpan delay)
        => _jobs.Schedule<SubmissionAnalysisJob>(job => job.RunAsync(submissionId, CancellationToken.None), delay);
}

using CodeMentor.Application.ProjectAudits;
using Hangfire;

namespace CodeMentor.Infrastructure.ProjectAudits;

/// <summary>
/// S9-T3: production scheduler — enqueues <see cref="ProjectAuditJob"/> via
/// Hangfire. Mirrors <c>HangfireSubmissionAnalysisScheduler</c>.
/// </summary>
public class HangfireProjectAuditScheduler : IProjectAuditScheduler
{
    private readonly IBackgroundJobClient _jobs;

    public HangfireProjectAuditScheduler(IBackgroundJobClient jobs) => _jobs = jobs;

    public void Schedule(Guid auditId)
        => _jobs.Enqueue<ProjectAuditJob>(job => job.RunAsync(auditId, CancellationToken.None));

    public void ScheduleAfter(Guid auditId, TimeSpan delay)
        => _jobs.Schedule<ProjectAuditJob>(job => job.RunAsync(auditId, CancellationToken.None), delay);
}

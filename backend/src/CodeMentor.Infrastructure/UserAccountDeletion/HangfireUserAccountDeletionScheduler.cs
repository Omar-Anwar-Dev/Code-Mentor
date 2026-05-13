using CodeMentor.Application.UserAccountDeletion;
using Hangfire;

namespace CodeMentor.Infrastructure.UserAccountDeletion;

/// <summary>
/// S14-T9 / ADR-046: production scheduler. Uses <c>BackgroundJob.Schedule</c>
/// with a future <c>DateTimeOffset</c> for the 30-day delayed execution +
/// <c>BackgroundJob.Delete</c> for the auto-cancel path. Test replacement
/// <c>InlineUserAccountDeletionScheduler</c> captures jobs without firing them
/// so tests can manually trigger the cascade.
/// </summary>
public sealed class HangfireUserAccountDeletionScheduler : IUserAccountDeletionScheduler
{
    private readonly IBackgroundJobClient _jobs;

    public HangfireUserAccountDeletionScheduler(IBackgroundJobClient jobs) => _jobs = jobs;

    public string Schedule(Guid userId, Guid requestId, DateTime fireAtUtc)
    {
        var enqueueAt = new DateTimeOffset(DateTime.SpecifyKind(fireAtUtc, DateTimeKind.Utc));
        var jobId = _jobs.Schedule<HardDeleteUserJob>(
            j => j.ExecuteAsync(userId, requestId, CancellationToken.None),
            enqueueAt);
        return jobId;
    }

    public void Cancel(string jobId)
    {
        if (string.IsNullOrEmpty(jobId)) return;
        _jobs.Delete(jobId);
    }
}

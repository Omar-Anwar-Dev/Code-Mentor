using CodeMentor.Application.UserExports;
using Hangfire;

namespace CodeMentor.Infrastructure.UserExports;

/// <summary>
/// S14-T8 / ADR-046: production Hangfire-backed scheduler. Test replacement
/// is <c>InlineUserDataExportScheduler</c> in the integration test factory.
/// </summary>
public sealed class HangfireUserDataExportScheduler : IUserDataExportScheduler
{
    private readonly IBackgroundJobClient _jobs;

    public HangfireUserDataExportScheduler(IBackgroundJobClient jobs) => _jobs = jobs;

    public void Schedule(Guid userId)
    {
        _jobs.Enqueue<UserDataExportJob>(j => j.ExecuteAsync(userId, CancellationToken.None));
    }
}

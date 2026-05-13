using CodeMentor.Application.UserAccountDeletion;
using CodeMentor.Infrastructure.UserAccountDeletion;
using Microsoft.Extensions.DependencyInjection;

namespace CodeMentor.Api.IntegrationTests.TestHost;

/// <summary>
/// S14-T9: test replacement for <see cref="HangfireUserAccountDeletionScheduler"/>.
/// Does NOT execute the job at schedule time — captures the scheduled triple
/// (userId, requestId, fireAt) in <see cref="Scheduled"/> so tests can assert
/// scheduling happened, then manually call <see cref="TriggerHardDeleteAsync"/>
/// to run the cascade synchronously (sidestepping the 30-day Hangfire wait).
/// </summary>
public sealed class InlineUserAccountDeletionScheduler : IUserAccountDeletionScheduler
{
    private readonly IServiceScopeFactory _scopes;
    public InlineUserAccountDeletionScheduler(IServiceScopeFactory scopes) => _scopes = scopes;

    /// <summary>Tuples scheduled by Schedule(...). Tests assert the count + payload.</summary>
    public List<(Guid UserId, Guid RequestId, DateTime FireAt, string JobId)> Scheduled { get; } = new();

    /// <summary>Job ids passed to Cancel(...). Tests assert the auto-cancel hook reached us.</summary>
    public List<string> Cancelled { get; } = new();

    public string Schedule(Guid userId, Guid requestId, DateTime fireAtUtc)
    {
        var jobId = $"inline-job-{Guid.NewGuid():N}";
        Scheduled.Add((userId, requestId, fireAtUtc, jobId));
        return jobId;
    }

    public void Cancel(string jobId)
    {
        Cancelled.Add(jobId);
    }

    /// <summary>
    /// Test helper: run the hard-delete cascade synchronously for the given
    /// (userId, requestId) — equivalent to Hangfire firing the scheduled job.
    /// </summary>
    public async Task TriggerHardDeleteAsync(Guid userId, Guid requestId)
    {
        using var scope = _scopes.CreateScope();
        var job = scope.ServiceProvider.GetRequiredService<HardDeleteUserJob>();
        await job.ExecuteAsync(userId, requestId, CancellationToken.None);
    }
}

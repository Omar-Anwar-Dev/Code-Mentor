using CodeMentor.Application.ProjectAudits;
using CodeMentor.Infrastructure.ProjectAudits;
using Microsoft.Extensions.DependencyInjection;

namespace CodeMentor.Api.IntegrationTests.TestHost;

/// <summary>
/// Test replacement for <c>HangfireProjectAuditScheduler</c>. Runs
/// <see cref="ProjectAuditJob"/> synchronously in a fresh DI scope so
/// integration tests observe the scheduler call (and any state changes the
/// stub job applies) immediately after POST. Mirrors
/// <see cref="InlineSubmissionAnalysisScheduler"/>.
/// </summary>
public sealed class InlineProjectAuditScheduler : IProjectAuditScheduler
{
    private readonly IServiceScopeFactory _scopes;
    public InlineProjectAuditScheduler(IServiceScopeFactory scopes) => _scopes = scopes;

    /// <summary>Audit IDs that <see cref="Schedule"/> was called with during the test.</summary>
    public List<Guid> Scheduled { get; } = new();

    /// <summary>Records delayed retries scheduled during a test run.</summary>
    public List<(Guid AuditId, TimeSpan Delay)> DelayedRetries { get; } = new();

    public void Schedule(Guid auditId)
    {
        Scheduled.Add(auditId);
        using var scope = _scopes.CreateScope();
        var job = scope.ServiceProvider.GetRequiredService<ProjectAuditJob>();
        job.RunAsync(auditId, CancellationToken.None).GetAwaiter().GetResult();
    }

    public void ScheduleAfter(Guid auditId, TimeSpan delay)
    {
        // Don't run inline — the whole point of the delay is "later." Tests
        // assert scheduling via the DelayedRetries list (mirrors the submissions pattern).
        DelayedRetries.Add((auditId, delay));
    }
}

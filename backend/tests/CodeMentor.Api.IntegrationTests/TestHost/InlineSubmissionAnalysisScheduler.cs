using CodeMentor.Application.Submissions;
using CodeMentor.Infrastructure.Submissions;
using Microsoft.Extensions.DependencyInjection;

namespace CodeMentor.Api.IntegrationTests.TestHost;

/// <summary>
/// Test replacement for Hangfire-backed scheduler: runs <c>SubmissionAnalysisJob</c>
/// synchronously in a fresh DI scope so integration tests observe the status
/// transitions immediately after POST.
/// </summary>
public sealed class InlineSubmissionAnalysisScheduler : ISubmissionAnalysisScheduler
{
    private readonly IServiceScopeFactory _scopes;
    public InlineSubmissionAnalysisScheduler(IServiceScopeFactory scopes) => _scopes = scopes;

    /// <summary>Records delayed retries scheduled during a test run.</summary>
    public List<(Guid SubmissionId, TimeSpan Delay)> DelayedRetries { get; } = new();

    public void Schedule(Guid submissionId)
    {
        using var scope = _scopes.CreateScope();
        var job = scope.ServiceProvider.GetRequiredService<SubmissionAnalysisJob>();
        job.RunAsync(submissionId, CancellationToken.None).GetAwaiter().GetResult();
    }

    public void ScheduleAfter(Guid submissionId, TimeSpan delay)
    {
        // Don't re-run the job inline — the whole point of the delay is "later."
        // Tests assert scheduling via the DelayedRetries list.
        DelayedRetries.Add((submissionId, delay));
    }
}

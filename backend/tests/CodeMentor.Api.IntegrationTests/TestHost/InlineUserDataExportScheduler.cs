using CodeMentor.Application.UserExports;
using CodeMentor.Infrastructure.UserExports;
using Microsoft.Extensions.DependencyInjection;

namespace CodeMentor.Api.IntegrationTests.TestHost;

/// <summary>
/// S14-T8: synchronous test replacement for <c>HangfireUserDataExportScheduler</c>.
/// Runs <see cref="UserDataExportJob.ExecuteAsync"/> in a fresh DI scope as
/// part of the request, so tests can assert on the resulting ZIP + notification
/// + email rows immediately after POST returns.
/// </summary>
public sealed class InlineUserDataExportScheduler : IUserDataExportScheduler
{
    private readonly IServiceScopeFactory _scopes;
    public InlineUserDataExportScheduler(IServiceScopeFactory scopes) => _scopes = scopes;

    /// <summary>UserIds that have been scheduled (so tests can assert "POST scheduled").</summary>
    public List<Guid> Scheduled { get; } = new();

    public void Schedule(Guid userId)
    {
        Scheduled.Add(userId);
        using var scope = _scopes.CreateScope();
        var job = scope.ServiceProvider.GetRequiredService<UserDataExportJob>();
        job.ExecuteAsync(userId, CancellationToken.None).GetAwaiter().GetResult();
    }
}

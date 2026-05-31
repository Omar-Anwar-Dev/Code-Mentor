using CodeMentor.Application.LearningPaths;
using CodeMentor.Infrastructure.LearningPaths;
using Microsoft.Extensions.DependencyInjection;

namespace CodeMentor.Api.IntegrationTests.TestHost;

/// <summary>
/// S19-T6 / F16: test replacement for
/// <see cref="IGenerateTaskFramingScheduler"/>. Runs
/// <see cref="GenerateTaskFramingJob"/> synchronously on a fresh DI
/// scope so integration tests can assert state mutations without
/// needing Hangfire to be reachable.
/// </summary>
public sealed class InlineGenerateTaskFramingScheduler : IGenerateTaskFramingScheduler
{
    public List<(Guid UserId, Guid TaskId)> Scheduled { get; } = new();
    public bool InvokeJobInline { get; set; } = true;

    private readonly IServiceScopeFactory _scopes;

    public InlineGenerateTaskFramingScheduler(IServiceScopeFactory scopes) => _scopes = scopes;

    public void EnqueueGeneration(Guid userId, Guid taskId)
    {
        Scheduled.Add((userId, taskId));
        if (!InvokeJobInline) return;

        using var scope = _scopes.CreateScope();
        var job = scope.ServiceProvider.GetRequiredService<GenerateTaskFramingJob>();
        // Block the calling thread; tests are synchronous-friendly.
        job.ExecuteAsync(userId, taskId, CancellationToken.None).GetAwaiter().GetResult();
    }

    public void Reset()
    {
        Scheduled.Clear();
        InvokeJobInline = true;
    }
}

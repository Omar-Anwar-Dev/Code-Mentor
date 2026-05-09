using CodeMentor.Application.LearningPaths;
using Microsoft.Extensions.DependencyInjection;

namespace CodeMentor.Api.IntegrationTests.TestHost;

/// <summary>
/// Test replacement for Hangfire-backed scheduler: runs the generation synchronously
/// inside a fresh DI scope so integration tests can assert the path exists right after
/// the assessment-complete flow.
/// </summary>
public sealed class InlineLearningPathScheduler : ILearningPathScheduler
{
    private readonly IServiceScopeFactory _scopes;
    public InlineLearningPathScheduler(IServiceScopeFactory scopes) => _scopes = scopes;

    public void EnqueueGeneration(Guid userId, Guid assessmentId)
    {
        // Fire and wait: callers (tests) want the generation observable synchronously.
        // Use a separate scope so we don't collide with the caller's scoped DbContext.
        using var scope = _scopes.CreateScope();
        var svc = scope.ServiceProvider.GetRequiredService<ILearningPathService>();
        svc.GeneratePathAsync(userId, assessmentId).GetAwaiter().GetResult();
    }
}

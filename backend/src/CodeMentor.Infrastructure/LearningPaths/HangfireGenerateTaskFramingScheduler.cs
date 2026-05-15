using CodeMentor.Application.LearningPaths;
using Hangfire;

namespace CodeMentor.Infrastructure.LearningPaths;

/// <summary>
/// S19-T6 / F16: production binding of
/// <see cref="IGenerateTaskFramingScheduler"/>. Fire-and-forget enqueue
/// onto Hangfire. The job picks up in a fresh DI scope.
/// </summary>
public sealed class HangfireGenerateTaskFramingScheduler : IGenerateTaskFramingScheduler
{
    private readonly IBackgroundJobClient _jobs;

    public HangfireGenerateTaskFramingScheduler(IBackgroundJobClient jobs) => _jobs = jobs;

    public void EnqueueGeneration(Guid userId, Guid taskId)
    {
        _jobs.Enqueue<GenerateTaskFramingJob>(
            j => j.ExecuteAsync(userId, taskId, CancellationToken.None));
    }
}

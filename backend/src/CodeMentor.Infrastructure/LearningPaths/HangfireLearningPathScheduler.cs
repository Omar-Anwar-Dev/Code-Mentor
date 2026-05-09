using CodeMentor.Application.LearningPaths;
using Hangfire;

namespace CodeMentor.Infrastructure.LearningPaths;

public sealed class HangfireLearningPathScheduler : ILearningPathScheduler
{
    private readonly IBackgroundJobClient _jobs;

    public HangfireLearningPathScheduler(IBackgroundJobClient jobs) => _jobs = jobs;

    public void EnqueueGeneration(Guid userId, Guid assessmentId)
    {
        _jobs.Enqueue<GenerateLearningPathJob>(j => j.ExecuteAsync(userId, assessmentId, CancellationToken.None));
    }
}

namespace CodeMentor.Application.LearningPaths;

/// <summary>
/// S19-T6 / F16: Hangfire scheduler hook for the background
/// :code:`GenerateTaskFramingJob`. Real-life impl uses
/// :code:`IBackgroundJobClient`; tests use an inline impl that runs
/// the job synchronously.
/// </summary>
public interface IGenerateTaskFramingScheduler
{
    /// <summary>Enqueue a regeneration for the given (user, task). Idempotent
    /// — the job itself short-circuits if a fresh row already exists.</summary>
    void EnqueueGeneration(Guid userId, Guid taskId);
}

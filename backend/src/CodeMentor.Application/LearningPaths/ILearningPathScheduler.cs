namespace CodeMentor.Application.LearningPaths;

/// <summary>
/// Abstracts the mechanism that enqueues path generation (Hangfire in prod, inline in tests).
/// Keeps the AssessmentService independent of Hangfire's static APIs.
/// </summary>
public interface ILearningPathScheduler
{
    void EnqueueGeneration(Guid userId, Guid assessmentId);
}

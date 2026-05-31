namespace CodeMentor.Application.Assessments;

/// <summary>
/// S17-T2 / F15 (ADR-049): abstraction for enqueuing the
/// <c>GenerateAssessmentSummaryJob</c>. Production binding is a Hangfire
/// fire-and-forget enqueue; tests can swap in an inline scheduler that
/// runs the job synchronously (mirrors the
/// <c>ILearningPathScheduler</c> pattern from S2).
/// </summary>
public interface IAssessmentSummaryScheduler
{
    /// <summary>Enqueue summary generation for one Completed assessment.
    /// MUST only be called from <c>AssessmentService.CompleteAsync</c>
    /// (full assessments only — mini-reassessments do NOT trigger).</summary>
    void EnqueueGeneration(Guid userId, Guid assessmentId);
}

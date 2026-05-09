namespace CodeMentor.Application.MentorChat;

/// <summary>
/// S10-T4 / F12: enqueueing seam for the Hangfire mentor-chat indexing job.
/// Mirrors <c>ISubmissionAnalysisScheduler</c> from S4-T6 / ADR-021 so unit
/// tests can swap in an inline scheduler that runs the job synchronously.
/// </summary>
public interface IMentorChatIndexScheduler
{
    /// <summary>Enqueue an indexing run for a freshly Completed submission.</summary>
    void EnqueueSubmissionIndex(Guid submissionId);

    /// <summary>Enqueue an indexing run for a freshly Completed audit.</summary>
    void EnqueueAuditIndex(Guid auditId);
}

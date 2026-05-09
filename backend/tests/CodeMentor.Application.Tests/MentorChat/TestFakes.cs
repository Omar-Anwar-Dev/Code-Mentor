using CodeMentor.Application.MentorChat;

namespace CodeMentor.Application.Tests.MentorChat;

/// <summary>
/// S10-T4 test double — records every enqueue call so tests can assert that
/// the analysis pipeline triggers indexing on Completed transitions. Defaults
/// to a no-op for tests that don't care about mentor-chat indexing.
/// </summary>
public sealed class FakeMentorChatIndexScheduler : IMentorChatIndexScheduler
{
    public List<Guid> SubmissionEnqueues { get; } = new();
    public List<Guid> AuditEnqueues { get; } = new();

    public void EnqueueSubmissionIndex(Guid submissionId) => SubmissionEnqueues.Add(submissionId);
    public void EnqueueAuditIndex(Guid auditId) => AuditEnqueues.Add(auditId);
}

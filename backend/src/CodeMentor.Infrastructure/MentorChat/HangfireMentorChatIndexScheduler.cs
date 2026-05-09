using CodeMentor.Application.MentorChat;
using Hangfire;

namespace CodeMentor.Infrastructure.MentorChat;

/// <summary>
/// Production scheduler — pushes the indexing job onto Hangfire's queue. The
/// test harness substitutes <c>InlineMentorChatIndexScheduler</c> so unit
/// tests run the job synchronously without spinning up a Hangfire backend
/// (mirrors S4-T6 / S5-T1 pattern for the analysis pipeline).
/// </summary>
public sealed class HangfireMentorChatIndexScheduler : IMentorChatIndexScheduler
{
    private readonly IBackgroundJobClient _jobs;

    public HangfireMentorChatIndexScheduler(IBackgroundJobClient jobs)
    {
        _jobs = jobs;
    }

    public void EnqueueSubmissionIndex(Guid submissionId) =>
        _jobs.Enqueue<IndexForMentorChatJob>(j => j.IndexSubmissionAsync(submissionId, CancellationToken.None));

    public void EnqueueAuditIndex(Guid auditId) =>
        _jobs.Enqueue<IndexForMentorChatJob>(j => j.IndexAuditAsync(auditId, CancellationToken.None));
}

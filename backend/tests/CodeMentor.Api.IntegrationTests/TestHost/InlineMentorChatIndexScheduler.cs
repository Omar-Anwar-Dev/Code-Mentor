using CodeMentor.Application.MentorChat;
using CodeMentor.Infrastructure.MentorChat;
using Microsoft.Extensions.DependencyInjection;

namespace CodeMentor.Api.IntegrationTests.TestHost;

/// <summary>
/// S10-T4: test replacement for <see cref="HangfireMentorChatIndexScheduler"/>.
/// Runs <see cref="IndexForMentorChatJob"/> synchronously in a fresh DI scope
/// so integration tests observe <c>MentorIndexedAt</c> being populated as soon
/// as the analysis pipeline finishes — mirrors the inline-submission pattern
/// from S5/S9 (<see cref="InlineSubmissionAnalysisScheduler"/>).
///
/// Singleton so tests can resolve the concrete type and assert against the
/// recorded enqueue lists if they need to verify scheduling without forcing
/// the full indexing run.
/// </summary>
public sealed class InlineMentorChatIndexScheduler : IMentorChatIndexScheduler
{
    private readonly IServiceScopeFactory _scopes;

    public InlineMentorChatIndexScheduler(IServiceScopeFactory scopes) => _scopes = scopes;

    public List<Guid> SubmissionEnqueues { get; } = new();
    public List<Guid> AuditEnqueues { get; } = new();

    /// <summary>
    /// Recorded job exceptions so tests can assert that the AI-unavailable path
    /// produces an <see cref="CodeMentor.Application.CodeReview.AiServiceUnavailableException"/>
    /// without crashing the parent submission/audit pipeline. Production Hangfire
    /// is fire-and-forget — the parent job never sees the indexing failure — so
    /// we mirror that semantics here by swallowing exceptions instead of throwing
    /// them back to the SubmissionAnalysisJob caller.
    /// </summary>
    public List<Exception> SwallowedExceptions { get; } = new();

    public void EnqueueSubmissionIndex(Guid submissionId)
    {
        SubmissionEnqueues.Add(submissionId);
        try
        {
            using var scope = _scopes.CreateScope();
            var job = scope.ServiceProvider.GetRequiredService<IndexForMentorChatJob>();
            job.IndexSubmissionAsync(submissionId, CancellationToken.None).GetAwaiter().GetResult();
        }
        catch (Exception ex)
        {
            SwallowedExceptions.Add(ex);
        }
    }

    public void EnqueueAuditIndex(Guid auditId)
    {
        AuditEnqueues.Add(auditId);
        try
        {
            using var scope = _scopes.CreateScope();
            var job = scope.ServiceProvider.GetRequiredService<IndexForMentorChatJob>();
            job.IndexAuditAsync(auditId, CancellationToken.None).GetAwaiter().GetResult();
        }
        catch (Exception ex)
        {
            SwallowedExceptions.Add(ex);
        }
    }
}

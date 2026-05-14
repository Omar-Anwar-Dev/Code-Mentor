using CodeMentor.Application.Admin;
using CodeMentor.Infrastructure.Jobs;
using Microsoft.Extensions.DependencyInjection;

namespace CodeMentor.Api.IntegrationTests.TestHost;

/// <summary>
/// S16-T4 + S16-T5: test replacement for <c>HangfireEmbedEntityScheduler</c>.
///
/// Records every enqueue AND runs <see cref="EmbedEntityJob.EmbedQuestionAsync"/>
/// synchronously in a fresh DI scope so tests can assert that the
/// approve → embed → reload pipeline lands end-to-end (mirrors the
/// pattern from <see cref="InlineMentorChatIndexScheduler"/>). The AI
/// service call goes through the test fake <see cref="FakeGeneralEmbeddingsRefit"/>
/// — no live OpenAI/network.
/// </summary>
public sealed class InlineEmbedEntityScheduler : IEmbedEntityScheduler
{
    private readonly IServiceScopeFactory _scopes;

    public InlineEmbedEntityScheduler(IServiceScopeFactory scopes) => _scopes = scopes;

    public List<Guid> QuestionEnqueues { get; } = new();
    public List<Exception> SwallowedExceptions { get; } = new();

    public void EnqueueQuestionEmbed(Guid questionId)
    {
        QuestionEnqueues.Add(questionId);
        try
        {
            using var scope = _scopes.CreateScope();
            var job = scope.ServiceProvider.GetRequiredService<EmbedEntityJob>();
            job.EmbedQuestionAsync(questionId, CancellationToken.None).GetAwaiter().GetResult();
        }
        catch (Exception ex)
        {
            // Production Hangfire is fire-and-forget — the parent approve
            // request never sees the indexing failure. Mirror that here by
            // swallowing exceptions instead of throwing back to the caller.
            SwallowedExceptions.Add(ex);
        }
    }
}

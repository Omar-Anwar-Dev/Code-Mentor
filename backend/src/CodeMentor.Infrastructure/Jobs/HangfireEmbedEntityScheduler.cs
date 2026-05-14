using CodeMentor.Application.Admin;
using Hangfire;

namespace CodeMentor.Infrastructure.Jobs;

/// <summary>
/// S16-T4 / F15: production implementation of <see cref="IEmbedEntityScheduler"/>.
/// Wraps Hangfire's <see cref="IBackgroundJobClient"/> so the approve flow
/// can enqueue an <see cref="EmbedEntityJob.EmbedQuestionAsync"/> call
/// fire-and-forget while keeping the approve HTTP response snappy.
/// </summary>
public sealed class HangfireEmbedEntityScheduler : IEmbedEntityScheduler
{
    private readonly IBackgroundJobClient _hangfire;

    public HangfireEmbedEntityScheduler(IBackgroundJobClient hangfire)
    {
        _hangfire = hangfire;
    }

    public void EnqueueQuestionEmbed(Guid questionId)
    {
        _hangfire.Enqueue<EmbedEntityJob>(j => j.EmbedQuestionAsync(questionId, CancellationToken.None));
    }
}

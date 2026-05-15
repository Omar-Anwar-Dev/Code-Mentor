namespace CodeMentor.Application.Admin;

/// <summary>
/// S16-T4 + S16-T5 / F15+F16 (ADR-049 / ADR-052): scheduler abstraction
/// over the Hangfire <c>EmbedEntityJob&lt;Question&gt;</c>. The approve
/// flow enqueues a Question embed; the job body lives in
/// <c>CodeMentor.Infrastructure.Jobs.EmbedEntityJob</c>.
///
/// Production impl (<c>HangfireEmbedEntityScheduler</c>) wraps
/// <c>IBackgroundJobClient.Enqueue&lt;EmbedEntityJob&gt;(...)</c>;
/// integration tests replace it with an inline impl that runs the job
/// synchronously, mirroring the pattern from
/// <c>IMentorChatIndexScheduler</c> / <c>InlineMentorChatIndexScheduler</c>.
/// </summary>
public interface IEmbedEntityScheduler
{
    void EnqueueQuestionEmbed(Guid questionId);

    /// <summary>S18-T6: enqueue the EmbedEntityJob.EmbedTaskAsync overload for an approved task.</summary>
    void EnqueueTaskEmbed(Guid taskId);
}

using System.Text.Json;
using CodeMentor.Domain.Assessments;
using CodeMentor.Infrastructure.CodeReview;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace CodeMentor.Infrastructure.Jobs;

/// <summary>
/// S16-T5 / F15+F16 (ADR-049 / ADR-052): Hangfire job that embeds an
/// approved <see cref="Question"/> via the AI service
/// <c>POST /api/embed</c>, persists the resulting 1536-float vector on
/// <see cref="Question.EmbeddingJson"/>, then signals the AI service to
/// refresh its in-memory cache via <c>POST /api/embeddings/reload</c>.
///
/// The job is enqueued by <c>AdminQuestionDraftService.ApproveAsync</c>
/// inside the same DB transaction as the approve. Hangfire's standard
/// retry policy applies if the AI service is transiently down.
/// </summary>
public sealed class EmbedEntityJob
{
    private readonly ApplicationDbContext _db;
    private readonly IGeneralEmbeddingsRefit _embeddings;
    private readonly ILogger<EmbedEntityJob> _log;

    public EmbedEntityJob(
        ApplicationDbContext db,
        IGeneralEmbeddingsRefit embeddings,
        ILogger<EmbedEntityJob> log)
    {
        _db = db;
        _embeddings = embeddings;
        _log = log;
    }

    public async Task EmbedQuestionAsync(Guid questionId, CancellationToken ct = default)
    {
        var question = await _db.Questions.FirstOrDefaultAsync(q => q.Id == questionId, ct);
        if (question is null)
        {
            _log.LogWarning("EmbedEntityJob: question {QuestionId} not found, skipping.", questionId);
            return;
        }

        var text = BuildEmbeddingText(question);
        var correlationId = $"embed-question-{questionId:N}";

        EmbedTextResponse response;
        try
        {
            response = await _embeddings.EmbedAsync(
                new EmbedTextRequest(text, questionId.ToString("N")),
                correlationId,
                ct);
        }
        catch (Exception ex)
        {
            _log.LogWarning(ex,
                "EmbedEntityJob: /api/embed failed for question {QuestionId}; Hangfire will retry per its retention policy.",
                questionId);
            throw; // Let Hangfire's retry kick in.
        }

        var vectorJson = JsonSerializer.Serialize(response.Vector);
        question.EmbeddingJson = vectorJson;
        await _db.SaveChangesAsync(ct);

        try
        {
            await _embeddings.ReloadAsync(
                new EmbeddingsReloadRequest("questions"),
                correlationId,
                ct);
        }
        catch (Exception ex)
        {
            // Cache-reload is a hint, not load-bearing. The vector is
            // already persisted on the row — log and move on; the cache
            // (when it lands in S19/S20) will pick it up on next full
            // rebuild OR the next reload signal.
            _log.LogWarning(ex,
                "EmbedEntityJob: /api/embeddings/reload signal failed for question {QuestionId}; vector is persisted, cache will catch up on next reload.",
                questionId);
        }

        _log.LogInformation(
            "EmbedEntityJob: question {QuestionId} embedded, dims={Dims}, tokens={Tokens}.",
            questionId, response.Dims, response.TokensUsed);
    }

    /// <summary>Compose the text fed to the embedding model. Includes the
    /// question text and any code snippet so the vector captures both
    /// prompt and snippet context for the F16 path-generation similarity
    /// retrieval.</summary>
    private static string BuildEmbeddingText(Question q)
    {
        if (string.IsNullOrWhiteSpace(q.CodeSnippet))
            return q.Content;
        return $"{q.Content}\n\n[Code snippet ({q.CodeLanguage ?? "code"})]:\n{q.CodeSnippet}";
    }
}

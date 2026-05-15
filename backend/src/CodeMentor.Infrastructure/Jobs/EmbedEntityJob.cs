using System.Text.Json;
using CodeMentor.Domain.Assessments;
using CodeMentor.Domain.Tasks;
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

    /// <summary>S18-T6 / F16 (ADR-052): Task overload — same pipeline shape as
    /// <see cref="EmbedQuestionAsync"/> but for the Tasks table. The embedding
    /// text composes title + first 800 chars of description + skill tags joined
    /// (per the implementation-plan.md S18-T6 spec).
    /// </summary>
    public async Task EmbedTaskAsync(Guid taskId, CancellationToken ct = default)
    {
        var task = await _db.Tasks.FirstOrDefaultAsync(t => t.Id == taskId, ct);
        if (task is null)
        {
            _log.LogWarning("EmbedEntityJob: task {TaskId} not found, skipping.", taskId);
            return;
        }

        var text = BuildTaskEmbeddingText(task);
        var correlationId = $"embed-task-{taskId:N}";

        EmbedTextResponse response;
        try
        {
            response = await _embeddings.EmbedAsync(
                new EmbedTextRequest(text, taskId.ToString("N")),
                correlationId,
                ct);
        }
        catch (Exception ex)
        {
            _log.LogWarning(ex,
                "EmbedEntityJob: /api/embed failed for task {TaskId}; Hangfire will retry per its retention policy.",
                taskId);
            throw;
        }

        var vectorJson = JsonSerializer.Serialize(response.Vector);
        task.EmbeddingJson = vectorJson;
        await _db.SaveChangesAsync(ct);

        try
        {
            await _embeddings.ReloadAsync(
                new EmbeddingsReloadRequest("tasks"),
                correlationId,
                ct);
        }
        catch (Exception ex)
        {
            _log.LogWarning(ex,
                "EmbedEntityJob: /api/embeddings/reload signal failed for task {TaskId}; vector is persisted, cache will catch up on next reload.",
                taskId);
        }

        _log.LogInformation(
            "EmbedEntityJob: task {TaskId} embedded, dims={Dims}, tokens={Tokens}.",
            taskId, response.Dims, response.TokensUsed);
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

    /// <summary>S18-T6: compose the embedding text for a Task. Per the
    /// implementation-plan S18-T6 spec: title + first 800 chars of description
    /// + skill tags joined.</summary>
    private static string BuildTaskEmbeddingText(TaskItem t)
    {
        const int descCap = 800;
        var desc = t.Description ?? string.Empty;
        if (desc.Length > descCap) desc = desc[..descCap];

        var tagsText = string.Empty;
        if (!string.IsNullOrWhiteSpace(t.SkillTagsJson))
        {
            try
            {
                using var doc = JsonDocument.Parse(t.SkillTagsJson);
                if (doc.RootElement.ValueKind == JsonValueKind.Array)
                {
                    var skills = new List<string>();
                    foreach (var el in doc.RootElement.EnumerateArray())
                    {
                        if (el.TryGetProperty("skill", out var s) && s.ValueKind == JsonValueKind.String)
                        {
                            skills.Add(s.GetString() ?? string.Empty);
                        }
                    }
                    if (skills.Count > 0)
                        tagsText = $"\n\n[Skills]: {string.Join(", ", skills)}";
                }
            }
            catch (JsonException)
            {
                // Tolerate malformed JSON — fall back to title + description only.
            }
        }

        return $"{t.Title}\n\n{desc}{tagsText}";
    }
}

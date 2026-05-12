using CodeMentor.Application.CodeReview;
using CodeMentor.Application.MentorChat;
using Microsoft.Extensions.Logging;
using Refit;

namespace CodeMentor.Infrastructure.MentorChat;

/// <summary>
/// Production implementation of <see cref="IEmbeddingsClient"/>. Wraps the
/// Refit interface and translates transport-level failures into
/// <see cref="AiServiceUnavailableException"/> — same convention as the
/// review/audit clients (Sprint 5 ADR-022, Sprint 9 ADR-035) so every AI-service
/// outage path triggers Hangfire's retry semantics consistently.
/// </summary>
public sealed class EmbeddingsClient : IEmbeddingsClient
{
    private readonly IEmbeddingsRefit _refit;
    private readonly ILogger<EmbeddingsClient> _logger;

    public EmbeddingsClient(IEmbeddingsRefit refit, ILogger<EmbeddingsClient> logger)
    {
        _refit = refit;
        _logger = logger;
    }

    public async Task<EmbeddingsUpsertResult> UpsertAsync(
        EmbeddingsUpsertRequest request,
        string correlationId,
        CancellationToken ct = default)
    {
        var body = new EmbeddingsRefitRequest(
            Scope: request.Scope,
            ScopeId: request.ScopeId,
            CodeFiles: request.CodeFiles,
            FeedbackSummary: request.FeedbackSummary,
            Strengths: request.Strengths,
            Weaknesses: request.Weaknesses,
            Recommendations: request.Recommendations,
            Annotations: request.Annotations,
            UserId: request.UserId,
            TaskId: request.TaskId,
            TaskName: request.TaskName);

        try
        {
            var resp = await _refit.UpsertAsync(body, correlationId, ct);
            return new EmbeddingsUpsertResult(
                Indexed: resp.Indexed,
                Skipped: resp.Skipped,
                ChunkCount: resp.ChunkCount,
                DurationMs: resp.DurationMs,
                Collection: resp.Collection ?? string.Empty);
        }
        catch (ApiException ex) when ((int)ex.StatusCode >= 500
                                   || ex.StatusCode == System.Net.HttpStatusCode.ServiceUnavailable)
        {
            _logger.LogWarning(ex,
                "Embeddings upsert failed: AI service returned {Status} for {Scope}/{ScopeId}",
                ex.StatusCode, request.Scope, request.ScopeId);
            throw new AiServiceUnavailableException(
                $"Embeddings upsert returned {(int)ex.StatusCode}", ex);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex, "Embeddings AI service unreachable for {Scope}/{ScopeId}",
                request.Scope, request.ScopeId);
            throw new AiServiceUnavailableException("Embeddings AI service unreachable", ex);
        }
        catch (TaskCanceledException ex) when (!ct.IsCancellationRequested)
        {
            _logger.LogWarning(ex, "Embeddings AI service timed out for {Scope}/{ScopeId}",
                request.Scope, request.ScopeId);
            throw new AiServiceUnavailableException("Embeddings AI service timed out", ex);
        }
    }
}

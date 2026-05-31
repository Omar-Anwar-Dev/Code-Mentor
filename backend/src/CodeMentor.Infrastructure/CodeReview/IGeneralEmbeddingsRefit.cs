using Refit;

namespace CodeMentor.Infrastructure.CodeReview;

/// <summary>
/// S16-T4 / F15+F16 (ADR-052): Refit surface for the AI service's general
/// embed + cache-reload endpoints. These differ from <c>IEmbeddingsRefit</c>
/// (F12 Qdrant upsert / search) because they don't touch Qdrant — they
/// produce a raw 1536-dim vector and signal a cache refresh.
/// </summary>
public interface IGeneralEmbeddingsRefit
{
    [Post("/api/embed")]
    Task<EmbedTextResponse> EmbedAsync(
        [Body] EmbedTextRequest body,
        [Header("X-Correlation-Id")] string correlationId,
        CancellationToken ct);

    [Post("/api/embeddings/reload")]
    Task<EmbeddingsReloadResponse> ReloadAsync(
        [Body] EmbeddingsReloadRequest body,
        [Header("X-Correlation-Id")] string correlationId,
        CancellationToken ct);
}

// ── Wire DTOs (match Pydantic schemas in ai-service/app/domain/schemas/embeddings.py). ──

public sealed record EmbedTextRequest(string Text, string? SourceId);

public sealed record EmbedTextResponse(
    IReadOnlyList<double> Vector,
    int Dims,
    string Model,
    int TokensUsed);

public sealed record EmbeddingsReloadRequest(string Scope);  // "questions" | "tasks"

public sealed record EmbeddingsReloadResponse(
    bool Ok,
    string Refreshed,
    bool CachePresent);

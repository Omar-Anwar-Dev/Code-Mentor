using CodeMentor.Application.MentorChat;
using Refit;

namespace CodeMentor.Infrastructure.MentorChat;

/// <summary>
/// Refit surface for the AI service's <c>POST /api/embeddings/upsert</c> endpoint.
/// Internal-by-default; production code depends on
/// <see cref="IEmbeddingsClient"/>.
///
/// We reuse the Application-layer DTOs verbatim — they're already plain records
/// with the right serialization shape, and double-defining them would force a
/// per-call mapping for no benefit. The single ApplicationDTO surface keeps the
/// job simple.
/// </summary>
public interface IEmbeddingsRefit
{
    [Post("/api/embeddings/upsert")]
    Task<EmbeddingsRefitResponse> UpsertAsync(
        [Body] EmbeddingsRefitRequest body,
        [Header("X-Correlation-Id")] string correlationId,
        CancellationToken ct);
}

/// <summary>
/// Refit request body. Mirrors the AI service's
/// <c>EmbeddingsUpsertRequest</c> Pydantic schema field-for-field. Lives in
/// Infrastructure so the Application contract (<c>EmbeddingsUpsertRequest</c>)
/// stays free of HTTP-layer concerns.
/// </summary>
public sealed record EmbeddingsRefitRequest(
    string Scope,
    string ScopeId,
    IReadOnlyList<EmbeddingsCodeFileDto> CodeFiles,
    string? FeedbackSummary,
    IReadOnlyList<string> Strengths,
    IReadOnlyList<string> Weaknesses,
    IReadOnlyList<string> Recommendations,
    IReadOnlyList<EmbeddingsAnnotationDto> Annotations);

public sealed record EmbeddingsRefitResponse(
    int Indexed,
    int Skipped,
    int ChunkCount,
    int DurationMs,
    string Collection);

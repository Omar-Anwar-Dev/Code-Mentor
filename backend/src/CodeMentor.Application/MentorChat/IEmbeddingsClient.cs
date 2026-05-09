namespace CodeMentor.Application.MentorChat;

/// <summary>
/// S10-T4 / F12: client for the AI-service <c>POST /api/embeddings/upsert</c>
/// endpoint (chunks code/feedback, embeds, upserts into Qdrant). Lives next to
/// — but separate from — <see cref="CodeReview.IAiReviewClient"/> because
/// embedding has different timeout/cost characteristics from review and we
/// want to retry the two paths independently (ADR-036).
/// </summary>
public interface IEmbeddingsClient
{
    /// <summary>
    /// Posts a single upsert request to the AI service. Throws
    /// <see cref="CodeMentor.Application.CodeReview.AiServiceUnavailableException"/>
    /// on transport failures (5xx, network unreachable, timeout) so the caller
    /// can decide between failing fast and Hangfire's auto-retry path.
    /// </summary>
    Task<EmbeddingsUpsertResult> UpsertAsync(
        EmbeddingsUpsertRequest request,
        string correlationId,
        CancellationToken ct = default);
}

/// <summary>Backend-shaped DTO matching the AI service's request schema.</summary>
public sealed record EmbeddingsUpsertRequest(
    string Scope,                                // "submission" | "audit"
    string ScopeId,
    IReadOnlyList<EmbeddingsCodeFileDto> CodeFiles,
    string? FeedbackSummary,
    IReadOnlyList<string> Strengths,
    IReadOnlyList<string> Weaknesses,
    IReadOnlyList<string> Recommendations,
    IReadOnlyList<EmbeddingsAnnotationDto> Annotations);

public sealed record EmbeddingsCodeFileDto(string FilePath, string Content);

public sealed record EmbeddingsAnnotationDto(
    string? File,
    string? FilePath,
    int? Line,
    int? LineNumber,
    string? Title,
    string? Severity,
    string? Message,
    string? Description);

public sealed record EmbeddingsUpsertResult(
    int Indexed,
    int Skipped,
    int ChunkCount,
    int DurationMs,
    string Collection);

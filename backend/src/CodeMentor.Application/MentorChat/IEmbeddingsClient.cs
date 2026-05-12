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

/// <summary>
/// Backend-shaped DTO matching the AI service's request schema.
///
/// S12 / F14 (ADR-040): added <see cref="UserId"/>, <see cref="TaskId"/>, and
/// <see cref="TaskName"/> so the indexed payload carries enough context for
/// cross-submission RAG retrieval (F14 history-aware code review). All three
/// are optional — pre-F14 callers omit them and existing F12 retrieval still
/// works because it filters by <c>(scope, scopeId)</c>.
/// </summary>
public sealed record EmbeddingsUpsertRequest(
    string Scope,                                // "submission" | "audit"
    string ScopeId,
    IReadOnlyList<EmbeddingsCodeFileDto> CodeFiles,
    string? FeedbackSummary,
    IReadOnlyList<string> Strengths,
    IReadOnlyList<string> Weaknesses,
    IReadOnlyList<string> Recommendations,
    IReadOnlyList<EmbeddingsAnnotationDto> Annotations,
    string? UserId = null,
    string? TaskId = null,
    string? TaskName = null);

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

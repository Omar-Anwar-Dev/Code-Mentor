using Refit;

namespace CodeMentor.Infrastructure.CodeReview;

/// <summary>
/// S12-T5 / F14 (ADR-040): Refit surface for the AI service's
/// <c>POST /api/embeddings/search-feedback-history</c> endpoint. The
/// production <see cref="FeedbackHistoryRetriever"/> wraps this with
/// graceful-fallback semantics (catch all transport failures → empty
/// list, telemetry counter, no throw) per ADR-043.
/// </summary>
public interface IFeedbackHistorySearchRefit
{
    [Post("/api/embeddings/search-feedback-history")]
    Task<FeedbackHistorySearchRefitResponse> SearchAsync(
        [Body] FeedbackHistorySearchRefitRequest body,
        [Header("X-Correlation-Id")] string correlationId,
        CancellationToken ct);
}

/// <summary>
/// Wire-shape request body mirroring the AI service's
/// <c>FeedbackHistorySearchRequest</c> Pydantic model field-for-field.
/// </summary>
public sealed record FeedbackHistorySearchRefitRequest(
    string UserId,
    string AnchorText,
    int TopK,
    IReadOnlyList<string> ExcludeKinds);

/// <summary>
/// Wire-shape response body mirroring the AI service's
/// <c>FeedbackHistorySearchResponse</c>.
/// </summary>
public sealed record FeedbackHistorySearchRefitResponse(
    IReadOnlyList<FeedbackHistoryRefitChunk> Chunks,
    string PromptVersion);

/// <summary>
/// One retrieved chunk; the production retriever maps this onto
/// <see cref="CodeMentor.Application.CodeReview.PriorFeedbackChunk"/> for
/// consumption by the <c>LearnerSnapshot</c> aggregator.
/// </summary>
public sealed record FeedbackHistoryRefitChunk(
    string SourceSubmissionId,
    string? TaskName,
    string? TaskId,
    string ChunkText,
    string Kind,
    double SimilarityScore,
    string? SourceDate);

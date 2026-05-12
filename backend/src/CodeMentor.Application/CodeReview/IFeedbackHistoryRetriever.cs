namespace CodeMentor.Application.CodeReview;

/// <summary>
/// S12 / F14 (ADR-040): retrieves the top-k prior-feedback chunks from
/// Qdrant's <c>feedback_history</c> collection most similar to the
/// in-progress submission's static-analysis findings. Filtered by user so
/// the snapshot remains private (ADR-040 user-history-only RAG scope).
///
/// Failures (Qdrant unreachable, query timeout, schema mismatch) MUST be
/// swallowed inside the implementation and surfaced as an empty list +
/// telemetry — see ADR-043 (profile-only fallback). The
/// <c>LearnerSnapshotService</c> proceeds without RAG context rather than
/// blocking the review on an infrastructure issue.
///
/// Post-S12 polish (2026-05-12): the return type carries an explicit
/// <see cref="FeedbackHistoryRetrievalStatus"/> so the caller can
/// distinguish between "service healthy, no chunks for this user yet"
/// and "service down, fallback engaged" — both produce empty
/// <see cref="FeedbackHistoryRetrievalResult.Chunks"/> but only the
/// latter is a degraded state worth surfacing to operators or to the
/// AI prompt as "temporarily unavailable" wording.
/// </summary>
public interface IFeedbackHistoryRetriever
{
    /// <summary>
    /// Retrieve up to <paramref name="topK"/> feedback chunks for
    /// <paramref name="userId"/> most similar to <paramref name="anchorText"/>.
    /// </summary>
    /// <param name="userId">User filter — chunks are scoped per-learner.</param>
    /// <param name="anchorText">Free-form text used to derive the query embedding. In production this is a serialization of the current submission's static-analysis findings. Empty string short-circuits to an empty result with status <see cref="FeedbackHistoryRetrievalStatus.AnchorEmpty"/>.</param>
    /// <param name="topK">Maximum number of chunks to return. Implementation may return fewer when the corpus is small.</param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>
    /// A result carrying an ordered chunk list (highest similarity first)
    /// plus a status code so the caller can disambiguate between
    /// "successful retrieval with N≥0 chunks" and "fallback engaged".
    /// </returns>
    Task<FeedbackHistoryRetrievalResult> RetrieveAsync(
        Guid userId,
        string anchorText,
        int topK,
        CancellationToken ct = default);
}

/// <summary>
/// Why a retrieval call produced (or did not produce) chunks. Drives the
/// narrative wording in <c>LearnerSnapshotService.BuildProgressNotes</c>
/// so the AI prompt reflects the real situation (healthy-but-empty vs
/// service-degraded), not a misleading "temporarily unavailable" message
/// for every empty result.
/// </summary>
public enum FeedbackHistoryRetrievalStatus
{
    /// <summary>
    /// AI service called successfully and returned a chunk list (size may
    /// be zero if no embeddings match the user's history + anchor yet —
    /// expected during the first few submissions before the index warms
    /// up — or N&gt;0 if real matches were found).
    /// </summary>
    RetrievalCompleted = 0,

    /// <summary>
    /// <paramref name="anchorText"/> was null/empty/whitespace; the
    /// retriever short-circuited without making an HTTP call. Distinct
    /// from <see cref="Unavailable"/> because no service is involved.
    /// </summary>
    AnchorEmpty = 1,

    /// <summary>
    /// Transport-level failure: AI service unreachable, query timed out,
    /// returned a non-2xx response, or threw an unexpected exception.
    /// ADR-043 fallback path engaged; the <c>f14.rag_fallback_count</c>
    /// telemetry counter is incremented exactly once per occurrence.
    /// </summary>
    Unavailable = 2,
}

/// <summary>
/// Tagged result for <see cref="IFeedbackHistoryRetriever.RetrieveAsync"/>.
/// Empty chunk list is normal under <see cref="FeedbackHistoryRetrievalStatus.RetrievalCompleted"/>
/// (first few submissions, sparse user history) and under
/// <see cref="FeedbackHistoryRetrievalStatus.Unavailable"/> (service down).
/// Callers needing a yes/no answer about RAG should look at the
/// <see cref="Status"/>, not at <see cref="Chunks"/>.Count.
/// </summary>
public sealed record FeedbackHistoryRetrievalResult(
    IReadOnlyList<PriorFeedbackChunk> Chunks,
    FeedbackHistoryRetrievalStatus Status)
{
    /// <summary>Convenience factory for the "no anchor" short-circuit.</summary>
    public static FeedbackHistoryRetrievalResult AnchorEmpty() =>
        new(Array.Empty<PriorFeedbackChunk>(), FeedbackHistoryRetrievalStatus.AnchorEmpty);

    /// <summary>Convenience factory for the ADR-043 unavailable fallback.</summary>
    public static FeedbackHistoryRetrievalResult Unavailable() =>
        new(Array.Empty<PriorFeedbackChunk>(), FeedbackHistoryRetrievalStatus.Unavailable);

    /// <summary>Convenience factory for the success path (chunk list may be empty).</summary>
    public static FeedbackHistoryRetrievalResult Completed(IReadOnlyList<PriorFeedbackChunk> chunks) =>
        new(chunks, FeedbackHistoryRetrievalStatus.RetrievalCompleted);
}

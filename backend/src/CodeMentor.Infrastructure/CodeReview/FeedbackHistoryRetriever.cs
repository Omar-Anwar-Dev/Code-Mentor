using System.Diagnostics.Metrics;
using CodeMentor.Application.CodeReview;
using Microsoft.Extensions.Logging;
using Refit;

namespace CodeMentor.Infrastructure.CodeReview;

/// <summary>
/// S12-T5 / F14 (ADR-040, ADR-043): production implementation of
/// <see cref="IFeedbackHistoryRetriever"/>. Calls the AI service's
/// <c>POST /api/embeddings/search-feedback-history</c> endpoint and
/// translates the response into the Application-layer
/// <see cref="PriorFeedbackChunk"/> shape consumed by
/// <c>LearnerSnapshotService</c>.
///
/// Failure semantics — every path returns an empty list:
///   - Empty / whitespace anchor → empty (short-circuit, no HTTP).
///   - Refit/HTTP transport failure → empty + telemetry counter +
///     warning log; the snapshot proceeds in "profile-only" mode and
///     <c>LearnerSnapshotService</c> annotates the prompt narrative
///     accordingly.
///   - 4xx response → empty + warning log (treated like a transient
///     failure for retrieval; the upstream pipeline doesn't fail).
///   - Cancellation propagates as <see cref="OperationCanceledException"/>
///     — the only exception that escapes this retriever.
/// </summary>
public sealed class FeedbackHistoryRetriever : IFeedbackHistoryRetriever
{
    /// <summary>
    /// Telemetry counter incremented every time the retriever returns an
    /// empty list due to a Qdrant/AI-service failure (not a cold-start
    /// short-circuit or a genuine zero-result query). Surfaced via the
    /// <c>code-mentor.f14</c> meter so Seq dashboards can chart sustained
    /// Qdrant outages.
    /// </summary>
    public static readonly Meter Meter = new("code-mentor.f14", "1.0.0");

    private static readonly Counter<long> _ragFallbackCount =
        Meter.CreateCounter<long>("f14.rag_fallback_count");

    private readonly IFeedbackHistorySearchRefit _refit;
    private readonly ILogger<FeedbackHistoryRetriever> _logger;

    public FeedbackHistoryRetriever(
        IFeedbackHistorySearchRefit refit,
        ILogger<FeedbackHistoryRetriever> logger)
    {
        _refit = refit;
        _logger = logger;
    }

    public async Task<FeedbackHistoryRetrievalResult> RetrieveAsync(
        Guid userId,
        string anchorText,
        int topK,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(anchorText))
        {
            return FeedbackHistoryRetrievalResult.AnchorEmpty();
        }

        var body = new FeedbackHistorySearchRefitRequest(
            UserId: userId.ToString("N"),
            AnchorText: anchorText,
            TopK: Math.Max(1, topK),
            // Default exclusion: raw code chunks are noisy for cross-submission
            // RAG (F14 wants prior *feedback* excerpts, not prior code).
            ExcludeKinds: new[] { "code" });
        var correlationId = $"f14-rag-{userId:N}";

        try
        {
            var resp = await _refit.SearchAsync(body, correlationId, ct);
            // RetrievalCompleted with zero chunks is normal during the first
            // few submissions before the index warms up — it's a healthy
            // state, distinct from Unavailable.
            return FeedbackHistoryRetrievalResult.Completed(MapChunks(userId, resp));
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            // Caller-initiated cancellation propagates — this is the only
            // exception type the retriever lets escape (per its contract).
            throw;
        }
        catch (ApiException ex)
        {
            _logger.LogWarning(ex,
                "FeedbackHistoryRetriever: AI service returned {Status} for user={UserId} (fallback to empty)",
                ex.StatusCode, userId);
            _ragFallbackCount.Add(1);
            return FeedbackHistoryRetrievalResult.Unavailable();
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex,
                "FeedbackHistoryRetriever: AI service unreachable for user={UserId} (fallback to empty)",
                userId);
            _ragFallbackCount.Add(1);
            return FeedbackHistoryRetrievalResult.Unavailable();
        }
        catch (TaskCanceledException ex)
        {
            _logger.LogWarning(ex,
                "FeedbackHistoryRetriever: AI service timed out for user={UserId} (fallback to empty)",
                userId);
            _ragFallbackCount.Add(1);
            return FeedbackHistoryRetrievalResult.Unavailable();
        }
        catch (Exception ex)
        {
            // Defensive catch — anything else (Refit deserialization failures,
            // unexpected runtime errors) falls back to empty so a malformed
            // AI-service response can't take down the submission pipeline.
            _logger.LogWarning(ex,
                "FeedbackHistoryRetriever: unexpected failure for user={UserId} (fallback to empty)",
                userId);
            _ragFallbackCount.Add(1);
            return FeedbackHistoryRetrievalResult.Unavailable();
        }
    }

    private static IReadOnlyList<PriorFeedbackChunk> MapChunks(
        Guid userId, FeedbackHistorySearchRefitResponse resp)
    {
        if (resp.Chunks is null || resp.Chunks.Count == 0)
        {
            return Array.Empty<PriorFeedbackChunk>();
        }

        var output = new List<PriorFeedbackChunk>(resp.Chunks.Count);
        foreach (var wire in resp.Chunks)
        {
            if (string.IsNullOrWhiteSpace(wire.ChunkText))
            {
                continue;
            }

            // ScopeId is "N" UUID format from the AI service; parse defensively
            // so a malformed chunk doesn't blow up the whole batch.
            if (!Guid.TryParseExact(wire.SourceSubmissionId, "N", out var sourceId))
            {
                // Fall back to default Guid — still surfaces the chunk text but
                // the snapshot consumer's "source" reference is best-effort.
                sourceId = Guid.Empty;
            }

            var sourceDate = ParseIsoDate(wire.SourceDate);

            output.Add(new PriorFeedbackChunk(
                SourceSubmissionId: sourceId,
                TaskName: wire.TaskName ?? "(unknown task)",
                ChunkText: wire.ChunkText.Trim(),
                Kind: string.IsNullOrWhiteSpace(wire.Kind) ? "feedback" : wire.Kind,
                SimilarityScore: wire.SimilarityScore,
                SourceDate: sourceDate));
        }

        return output;
    }

    private static DateTime ParseIsoDate(string? iso)
    {
        if (string.IsNullOrWhiteSpace(iso)) return DateTime.UtcNow;
        if (DateTime.TryParse(iso, System.Globalization.CultureInfo.InvariantCulture,
                System.Globalization.DateTimeStyles.AssumeUniversal | System.Globalization.DateTimeStyles.AdjustToUniversal,
                out var parsed))
        {
            return DateTime.SpecifyKind(parsed, DateTimeKind.Utc);
        }
        return DateTime.UtcNow;
    }
}

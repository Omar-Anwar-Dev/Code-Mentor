using CodeMentor.Domain.Submissions;

namespace CodeMentor.Application.CodeReview;

/// <summary>
/// S6-T5: produces the unified feedback payload (PRD F6) from the AI + static
/// analysis output, persists Recommendation/Resource rows for the submission,
/// emits a FeedbackReady notification, and rewrites <c>AIAnalysisResult.FeedbackJson</c>
/// so the <c>GET /api/submissions/{id}/feedback</c> endpoint (S6-T7) can serve
/// it directly without re-aggregating.
///
/// Idempotent: re-runs (manual retry, AI retry) replace the prior Recommendation
/// and Resource rows for the same submission so there's never a stale tail.
/// </summary>
public interface IFeedbackAggregator
{
    /// <summary>
    /// Aggregates the AI + static results into the unified payload, persists
    /// Recommendations + Resources + Notification rows, and updates the
    /// submission's <see cref="AIAnalysisResult.FeedbackJson"/>.
    /// Caller MUST have already written the AIAnalysisResult row for <paramref name="submission"/>.
    /// </summary>
    Task AggregateAsync(Submission submission, AiCombinedResponse aiResponse, CancellationToken ct = default);
}

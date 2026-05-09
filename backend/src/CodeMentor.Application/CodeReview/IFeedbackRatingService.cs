using CodeMentor.Application.CodeReview.Contracts;

namespace CodeMentor.Application.CodeReview;

public interface IFeedbackRatingService
{
    /// <summary>
    /// S8-T7: upsert a single (submission, category) thumbs vote. Idempotent —
    /// duplicate calls overwrite the existing row. Returns NotFound when the
    /// submission doesn't belong to the caller or doesn't exist; ValidationFailed
    /// when the request shape is malformed.
    /// </summary>
    Task<RateFeedbackResult> RateAsync(
        Guid userId,
        Guid submissionId,
        RateFeedbackRequest request,
        CancellationToken ct = default);

    /// <summary>S8-T8: read all current ratings for a submission (per-category map).</summary>
    Task<IReadOnlyList<FeedbackRatingDto>> GetRatingsAsync(
        Guid userId, Guid submissionId, CancellationToken ct = default);
}

public enum RateFeedbackResult
{
    Saved = 0,
    NotFound = 1,
    ValidationFailed = 2,
}

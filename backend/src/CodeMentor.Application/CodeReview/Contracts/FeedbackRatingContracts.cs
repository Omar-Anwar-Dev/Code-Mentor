namespace CodeMentor.Application.CodeReview.Contracts;

/// <summary>
/// S8-T7 / SF4: thumbs up/down per code-quality category.
/// <para>
/// <see cref="Category"/> case-insensitively matches one of the 5 PRD F6
/// categories (correctness/readability/security/performance/design).
/// <see cref="Vote"/> is "up" or "down" (case-insensitive).
/// </para>
/// </summary>
public sealed record RateFeedbackRequest(string Category, string Vote);

public sealed record FeedbackRatingDto(
    string Category,
    string Vote,
    DateTime UpdatedAt);

using CodeMentor.Application.CodeReview;

namespace CodeMentor.Application.Skills;

/// <summary>
/// S7-T1: feeds a fresh AI review's per-category scores into the user's
/// <c>CodeQualityScore</c> rows as a running average. Called once per submission
/// at the moment the AI portion is first persisted (retries don't re-contribute).
/// </summary>
public interface ICodeQualityScoreUpdater
{
    Task RecordAiReviewAsync(Guid userId, AiReviewScores scores, CancellationToken ct = default);
}

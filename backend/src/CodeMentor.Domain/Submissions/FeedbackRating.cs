using CodeMentor.Domain.Skills;

namespace CodeMentor.Domain.Submissions;

public enum FeedbackVote
{
    Down = 0,
    Up = 1,
}

/// <summary>
/// S8-T7 / SF4: per-category thumbs up/down on a submission's feedback.
/// Unique on <c>(SubmissionId, Category)</c> — duplicate writes overwrite via
/// upsert in the service layer.
/// </summary>
public class FeedbackRating
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid SubmissionId { get; set; }
    public CodeQualityCategory Category { get; set; }
    public FeedbackVote Vote { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Submission? Submission { get; set; }
}

namespace CodeMentor.Domain.Submissions;

/// <summary>
/// S6-T6: 3–5 of these per submission, produced by FeedbackAggregator (S6-T5)
/// from the AI review's learningResources blocks. The frontend renders them
/// on the feedback page as external "go learn this" cards.
/// </summary>
public class Resource
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid SubmissionId { get; set; }

    public string Title { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;

    /// <summary>Article | Video | Documentation | Tutorial | Course (string-stored enum).</summary>
    public ResourceType Type { get; set; } = ResourceType.Article;

    /// <summary>The weakness/topic this resource addresses (e.g., "Error Handling in Python").</summary>
    public string Topic { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Submission? Submission { get; set; }
}

public enum ResourceType
{
    Article = 1,
    Video = 2,
    Documentation = 3,
    Tutorial = 4,
    Course = 5,
}

namespace CodeMentor.Domain.Submissions;

public class Submission
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public Guid TaskId { get; set; }

    public SubmissionType SubmissionType { get; set; }
    public string? RepositoryUrl { get; set; }
    public string? BlobPath { get; set; }

    public SubmissionStatus Status { get; set; } = SubmissionStatus.Pending;
    public AiAnalysisStatus AiAnalysisStatus { get; set; } = AiAnalysisStatus.NotAttempted;
    public string? ErrorMessage { get; set; }
    public int AttemptNumber { get; set; } = 1;
    /// <summary>
    /// S5-T5: counts automatic retries triggered by AI-unavailable degradation,
    /// separate from <see cref="AttemptNumber"/> which tracks user-initiated retries.
    /// </summary>
    public int AiAutoRetryCount { get; set; } = 0;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }

    /// <summary>
    /// S10-T2 / F12: set when <c>IndexSubmissionForMentorChatJob</c> finishes upserting
    /// chunks into Qdrant for this submission. Until non-null the FE chat panel shows
    /// a "Preparing mentor…" readiness state and the backend mentor-chat endpoints
    /// return 409 (architecture §6.12; ADR-036).
    /// </summary>
    public DateTime? MentorIndexedAt { get; set; }
}

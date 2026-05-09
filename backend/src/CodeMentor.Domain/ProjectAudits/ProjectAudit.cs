namespace CodeMentor.Domain.ProjectAudits;

/// <summary>
/// S9-T1 / F11: standalone, learning-path-independent project audit. Parallel to
/// <see cref="Submissions.Submission"/> but not branched inside it (ADR-031).
/// One audit per upload — re-running on the same project produces a new row.
/// </summary>
public class ProjectAudit
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }

    public string ProjectName { get; set; } = string.Empty;

    /// <summary>
    /// Full structured form payload as JSON: summary, detailed description, project
    /// type, tech stack, features, target audience, focus areas, known issues.
    /// Source of truth for the AI prompt's project context.
    /// </summary>
    public string ProjectDescriptionJson { get; set; } = "{}";

    public AuditSourceType SourceType { get; set; }
    public string? RepositoryUrl { get; set; }

    /// <summary>
    /// Nullable: set null on 90-day cleanup (ADR-033) while metadata row is preserved.
    /// </summary>
    public string? BlobPath { get; set; }

    public ProjectAuditStatus Status { get; set; } = ProjectAuditStatus.Pending;
    public ProjectAuditAiStatus AiReviewStatus { get; set; } = ProjectAuditAiStatus.NotAttempted;

    /// <summary>0–100; null until <see cref="Status"/> reaches Completed.</summary>
    public int? OverallScore { get; set; }

    /// <summary>A / B / C / D / F derived from <see cref="OverallScore"/>; null until Completed.</summary>
    public string? Grade { get; set; }

    public string? ErrorMessage { get; set; }
    public int AttemptNumber { get; set; } = 1;

    /// <summary>
    /// Mirrors Submission.AiAutoRetryCount (ADR-025) — counts 15-min auto-retries
    /// triggered by AI-unavailable degradation, separate from user-initiated retries.
    /// </summary>
    public int AiAutoRetryCount { get; set; } = 0;

    public bool IsDeleted { get; set; } = false;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }

    /// <summary>
    /// S10-T2 / F12: set when <c>IndexSubmissionForMentorChatJob</c> finishes upserting
    /// chunks into Qdrant for this audit. Until non-null the FE chat panel shows a
    /// "Preparing mentor…" readiness state and the backend mentor-chat endpoints
    /// return 409 (architecture §6.12; ADR-036). Mirror of <c>Submission.MentorIndexedAt</c>.
    /// </summary>
    public DateTime? MentorIndexedAt { get; set; }
}

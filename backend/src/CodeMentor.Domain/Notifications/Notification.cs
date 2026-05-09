namespace CodeMentor.Domain.Notifications;

/// <summary>
/// S6-T6: in-app notification entity. One row created per significant user-facing
/// event (architecture §5.1). For Sprint 6 the only producer is the
/// FeedbackAggregator (FeedbackReady when a submission's analysis completes).
/// PRD F6 acceptance: a learner sees a "Feedback ready" item on
/// <c>GET /api/notifications</c> after a submission completes.
/// </summary>
public class Notification
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }

    public NotificationType Type { get; set; }

    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;

    /// <summary>Relative URL the bell-icon click should navigate to (e.g. <c>/submissions/{id}</c>).</summary>
    public string? Link { get; set; }

    public bool IsRead { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ReadAt { get; set; }
}

public enum NotificationType
{
    FeedbackReady = 1,
    AssessmentReminder = 2,
    PathTaskCompleted = 3,
    PathGenerated = 4,
}

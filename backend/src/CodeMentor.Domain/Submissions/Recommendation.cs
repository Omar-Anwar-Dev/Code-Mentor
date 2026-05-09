namespace CodeMentor.Domain.Submissions;

/// <summary>
/// S6-T6: 3–5 of these per submission, produced by FeedbackAggregator (S6-T5)
/// from the AI review's recommendations array. Each row is either a "do this
/// existing seeded Task next" pointer (TaskId set) or a free-text suggestion
/// the AI produced that doesn't map to any seeded Task (Topic set, TaskId null).
///
/// PRD F3 US-13 ("Add to my path") wires this into the SF3 stretch flow that
/// converts a Recommendation → new PathTask via /api/learning-paths/me/tasks/from-recommendation/{id}.
/// </summary>
public class Recommendation
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid SubmissionId { get; set; }

    /// <summary>FK to <c>Tasks</c> when the AI's suggestion maps to a seeded Task; null for text-only suggestions.</summary>
    public Guid? TaskId { get; set; }

    /// <summary>Free-text topic for AI suggestions without a matching Task row (e.g. "learn SOLID principles").</summary>
    public string? Topic { get; set; }

    public string Reason { get; set; } = string.Empty;

    /// <summary>1 = highest priority, 5 = lowest. Mapped from AI's "high|medium|low" by FeedbackAggregator.</summary>
    public int Priority { get; set; } = 3;

    /// <summary>True when the learner has clicked "Add to my path" — flips on POST /learning-paths/me/tasks/from-recommendation/{id} (SF3, Sprint 8).</summary>
    public bool IsAdded { get; set; } = false;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Submission? Submission { get; set; }
}

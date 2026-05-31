namespace CodeMentor.Domain.Tasks;

/// <summary>
/// S19-T6 / F16 (ADR-049 / ADR-052): AI-generated per-task framing
/// shown to one specific learner on the task page above the description.
///
/// Three sub-cards (Why this matters / Focus areas / Common pitfalls)
/// stored alongside the TTL + provenance fields. Composite unique key
/// on (UserId, TaskId) — one active framing per learner per task.
///
/// TTL: 7 days per S19 locked answer #4. After expiry the GET endpoint
/// regenerates via the Hangfire job and overwrites this row in place.
/// </summary>
public class TaskFraming
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid UserId { get; set; }
    public Guid TaskId { get; set; }

    public TaskItem? Task { get; set; }

    /// <summary>One paragraph (60-300 chars after trim) explaining why this
    /// learner should pay attention to this task. References at least one of
    /// the learner's actual scores.</summary>
    public string WhyThisMatters { get; set; } = string.Empty;

    /// <summary>JSON array of 2-5 strings, each 15-200 chars after trim.</summary>
    public string FocusAreasJson { get; set; } = "[]";

    /// <summary>JSON array of 2-5 strings, each 15-200 chars after trim.</summary>
    public string CommonPitfallsJson { get; set; } = "[]";

    /// <summary>e.g., "task_framing_v1". Bumped when the prompt template is replaced.</summary>
    public string PromptVersion { get; set; } = string.Empty;

    public int TokensUsed { get; set; }
    public int RetryCount { get; set; }

    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;

    /// <summary>Hard cut-off — after this time the row is considered stale and
    /// the GET endpoint enqueues a regenerate. 7-day TTL per S19 locked
    /// answer #4. S20 adaptation events also flip this to a past timestamp
    /// to force regeneration.</summary>
    public DateTime ExpiresAt { get; set; } = DateTime.UtcNow.AddDays(7);

    /// <summary>Incremented on each regeneration (S20 wires this up further).</summary>
    public int RegeneratedCount { get; set; }
}

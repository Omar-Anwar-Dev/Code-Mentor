namespace CodeMentor.Domain.Tasks;

/// <summary>
/// S20-T3 / F16 (ADR-049 / ADR-053): one row per adaptation cycle on a
/// <see cref="LearningPath"/>. Every cycle writes a row — even when the
/// action list is empty — so the audit log captures every triggered
/// evaluation + cooldown decision.
///
/// Lifecycle:
/// 1. <c>SubmissionAnalysisJob</c> evaluates the trigger conditions at
///    end-of-job (see <c>IPathAdaptationTriggerEvaluator</c>); if a
///    trigger fires AND cooldown allows, enqueues <c>PathAdaptationJob</c>.
/// 2. <c>PathAdaptationJob</c> calls AI service <c>/api/adapt-path</c>,
///    then per action decides AutoApply (3-of-3 rule) or Pending. Writes
///    one row with the full audit trail.
/// 3. Learner opens the path → modal lists pending events → approves /
///    rejects per action → backend updates <see cref="LearnerDecision"/>
///    + <see cref="RespondedAt"/>.
/// 4. After 7 days with <see cref="LearnerDecision"/>=Pending and no
///    response, a cleanup job (S20-T4 or scheduled, deferred to S21)
///    sets <see cref="LearnerDecision"/>=Expired.
///
/// Schema mirrors <c>docs/assessment-learning-path.md</c> §4.2.2.
/// </summary>
public class PathAdaptationEvent
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>FK to <see cref="LearningPath.Id"/>. The
    /// <c>(PathId, TriggeredAt DESC)</c> composite index powers the
    /// timeline render at <c>/path/adaptations</c>.</summary>
    public Guid PathId { get; set; }

    /// <summary>FK to <c>ApplicationUser.Id</c>. The
    /// <c>(UserId, LearnerDecision)</c> composite index powers the
    /// pending-modal lookup at <c>GET /api/learning-paths/me/adaptations?status=pending</c>.</summary>
    public Guid UserId { get; set; }

    public DateTime TriggeredAt { get; set; } = DateTime.UtcNow;

    /// <summary>Which condition fired this cycle. Stored as nvarchar via
    /// <c>HasConversion&lt;string&gt;()</c> so adding enum values doesn't
    /// require a migration.</summary>
    public PathAdaptationTrigger Trigger { get; set; }

    /// <summary>Signal classification computed by the backend (no_action / small /
    /// medium / large). Stored alongside the actions so the admin dashboard can
    /// group events by signal level + show distribution over time.</summary>
    public PathAdaptationSignalLevel SignalLevel { get; set; }

    /// <summary>JSON snapshot of <see cref="PathTask"/> ordering BEFORE applying
    /// auto-approved actions. Shape: <c>[{ "pathTaskId": "...", "taskId": "...",
    /// "orderIndex": 1, "status": "NotStarted" }, ...]</c>. Persisted as
    /// nvarchar(max) — no schema enforcement at the DB layer; serializer is the
    /// source of truth.</summary>
    public string BeforeStateJson { get; set; } = "[]";

    /// <summary>JSON snapshot of <see cref="PathTask"/> ordering AFTER applying
    /// auto-approved actions. Same shape as <see cref="BeforeStateJson"/>.
    /// Equal to <see cref="BeforeStateJson"/> when no actions auto-applied.</summary>
    public string AfterStateJson { get; set; } = "[]";

    /// <summary>Free-text reasoning from the LLM (matches the
    /// <c>overallReasoning</c> field of the AI service response).</summary>
    public string AIReasoningText { get; set; } = string.Empty;

    /// <summary>0..1, average of per-action confidences. 0 when the
    /// action list is empty (e.g., AI unavailable, no_action signal).</summary>
    public double ConfidenceScore { get; set; }

    /// <summary>JSON array mirroring the AI service's <c>actions</c> field:
    /// <c>[{ "type": "reorder" | "swap", "targetPosition": 2, "newTaskId":
    /// "T-7" | null, "newOrderIndex": 1 | null, "reason": "...", "confidence":
    /// 0.85 }, ...]</c>. Empty array <c>[]</c> when no actions proposed.</summary>
    public string ActionsJson { get; set; } = "[]";

    /// <summary>Lifecycle status of this event from the learner's POV. Stored
    /// as nvarchar via <c>HasConversion&lt;string&gt;()</c>.</summary>
    public PathAdaptationDecision LearnerDecision { get; set; }

    /// <summary>Set when the learner explicitly approves/rejects (Pending →
    /// Approved/Rejected) OR when the 7-day auto-expiry kicks in (Pending →
    /// Expired). Null while still Pending or for AutoApplied events.</summary>
    public DateTime? RespondedAt { get; set; }

    /// <summary>Echo of the prompt version returned by the AI service (e.g.
    /// "adapt_path_v1"). Empty when no LLM call was made (no_action signal).</summary>
    public string AIPromptVersion { get; set; } = string.Empty;

    /// <summary>Approximate input-token count for the LLM call. Null when no
    /// LLM call was made.</summary>
    public int? TokensInput { get; set; }

    /// <summary>Approximate output-token count for the LLM call. Null when no
    /// LLM call was made.</summary>
    public int? TokensOutput { get; set; }

    /// <summary>Deterministic key used to dedupe concurrent enqueues of
    /// <c>PathAdaptationJob</c> from concurrent submissions. Format:
    /// <c>PathAdaptationJob:{pathId}:{triggerHash}:{hourBucket}</c>. Unique
    /// across the table — retries / concurrent triggers produce no
    /// duplicate event row.</summary>
    public string IdempotencyKey { get; set; } = string.Empty;
}

/// <summary>S20-T3 / F16: which condition fired the adaptation cycle. Persisted as
/// nvarchar(30) via <c>HasConversion&lt;string&gt;()</c>.</summary>
public enum PathAdaptationTrigger
{
    /// <summary>≥3 PathTasks completed since the path's <c>LastAdaptedAt</c>.</summary>
    Periodic = 1,

    /// <summary>Max |new_score - old_score| across categories exceeded 10pt
    /// after the most recent submission's EMA update.</summary>
    ScoreSwing = 2,

    /// <summary>The path's <c>ProgressPercent</c> reached 100. Bypasses the
    /// 24-hour cooldown.</summary>
    Completion100 = 3,

    /// <summary>Learner clicked the "Refresh" button. Bypasses both the
    /// cooldown and the score-swing threshold.</summary>
    OnDemand = 4,

    /// <summary>Forward-compat (S21): mini reassessment recomputed the
    /// learner's skill profile mid-path. Not emitted by S20.</summary>
    MiniReassessment = 5,
}

/// <summary>S20-T3 / F16: signal-level classification computed from the
/// before/after profile + completed-count + trigger type. Maps 1-1 to the
/// AI service's <c>signal_level</c> request parameter.</summary>
public enum PathAdaptationSignalLevel
{
    /// <summary>Trigger fired but post-evaluation no action is warranted
    /// (score swing &lt; 10pt and no other condition). The job records the
    /// event for audit purposes and exits without an LLM call.</summary>
    NoAction = 1,

    /// <summary>Swing 10-20pt OR every-3-completed trigger. Only reorder
    /// actions allowed; no swaps. Reorder must be intra-skill-area.</summary>
    Small = 2,

    /// <summary>Swing 20-30pt. Reorder + swap allowed; at most one swap unless
    /// evidence is strong.</summary>
    Medium = 3,

    /// <summary>Swing &gt; 30pt OR Completion100. Reorder + swap allowed;
    /// multiple swaps allowed when justified.</summary>
    Large = 4,
}

/// <summary>S20-T3 / F16: the learner's response to a proposed action set,
/// OR the system-applied state when auto-apply was used. Persisted as
/// nvarchar(20) via <c>HasConversion&lt;string&gt;()</c>.</summary>
public enum PathAdaptationDecision
{
    /// <summary>All proposed actions met the 3-of-3 auto-apply rule
    /// (type=reorder AND confidence&gt;0.8 AND intra-skill-area). The
    /// system applied them transactionally to <c>PathTasks</c> and surfaced
    /// a toast to the learner. <c>RespondedAt</c> stays null.</summary>
    AutoApplied = 1,

    /// <summary>At least one action did NOT meet auto-apply; the entire event
    /// is staged for learner review. The non-dismissable banner appears on
    /// the path page until the learner responds OR 7 days elapse.</summary>
    Pending = 2,

    /// <summary>Learner reviewed the proposed actions and approved them. The
    /// backend applied them transactionally on respond. <c>RespondedAt</c>
    /// records the approval timestamp.</summary>
    Approved = 3,

    /// <summary>Learner reviewed and rejected the entire action set. Path
    /// state remains unchanged. <c>RespondedAt</c> records the rejection
    /// timestamp.</summary>
    Rejected = 4,

    /// <summary>7-day window elapsed without learner response. A cleanup
    /// job sets this state + <c>RespondedAt</c> = expiry timestamp. No
    /// path changes applied.</summary>
    Expired = 5,
}

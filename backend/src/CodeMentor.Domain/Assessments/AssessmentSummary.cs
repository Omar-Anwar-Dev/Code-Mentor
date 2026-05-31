namespace CodeMentor.Domain.Assessments;

/// <summary>
/// S17-T2 / F15 (ADR-049): persisted AI-generated 3-paragraph summary
/// produced for a Completed <see cref="Assessment"/>.
///
/// Lifecycle:
///   1. <see cref="Assessment"/>.Status transitions to
///      <see cref="AssessmentStatus.Completed"/> via
///      <c>AssessmentService.CompleteAsync</c>.
///   2. The same method enqueues <c>GenerateAssessmentSummaryJob</c> via
///      <c>IAssessmentSummaryScheduler</c>.
///   3. The job calls AI service <c>POST /api/assessment-summary</c>,
///      persists this row, and returns. <c>AssessmentId</c> is unique —
///      one summary per Assessment (per S17 locked answer #1).
///
/// Mini-reassessments (post-S20) do NOT trigger summary generation —
/// only full assessments do. Today the only signal we have is
/// <c>Status == Completed</c>, which is already restricted to full
/// assessments (mini-reassessments will introduce their own status /
/// flag in S20 and the enqueue site is the single place to gate).
/// </summary>
public class AssessmentSummary
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>FK + unique index to <see cref="Assessment.Id"/>. One summary per Assessment.</summary>
    public Guid AssessmentId { get; set; }

    public Assessment? Assessment { get; set; }

    /// <summary>Denormalised owner — saves a join on the GET endpoint and the
    /// /assessments/{id}/summary OwnsResource check.</summary>
    public Guid UserId { get; set; }

    // ── AI-produced content (3 plain-prose paragraphs) ────────────────────

    public string StrengthsParagraph { get; set; } = string.Empty;
    public string WeaknessesParagraph { get; set; } = string.Empty;
    public string PathGuidanceParagraph { get; set; } = string.Empty;

    // ── Provenance + audit trail ──────────────────────────────────────────

    /// <summary>e.g., "assessment_summary_v1" — bumped when the prompt template is replaced.</summary>
    public string PromptVersion { get; set; } = string.Empty;

    /// <summary>Total OpenAI tokens consumed by the generation call (input + output + reasoning).</summary>
    public int TokensUsed { get; set; }

    /// <summary>0 = parsed on first try; 1 = needed one self-correction retry.</summary>
    public int RetryCount { get; set; }

    /// <summary>End-to-end latency from job pick-up to AI service return, in ms.
    /// Used for the p95 ≤ 8 s acceptance bar; surfaced in walkthrough docs.</summary>
    public int LatencyMs { get; set; }

    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
}

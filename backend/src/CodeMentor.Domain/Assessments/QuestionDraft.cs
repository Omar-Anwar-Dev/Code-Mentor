namespace CodeMentor.Domain.Assessments;

/// <summary>
/// S16 / F15 (ADR-049 / ADR-054): one AI-generated question draft awaiting
/// admin review. The lifecycle is:
///   1. <c>POST /api/admin/questions/generate</c> calls the AI service,
///      persists one <see cref="QuestionDraft"/> per returned draft with
///      <see cref="Status"/> = <see cref="QuestionDraftStatus.Draft"/>.
///   2. <c>POST /api/admin/questions/drafts/{id}/approve</c> transitions to
///      <see cref="QuestionDraftStatus.Approved"/>, inserts a <see cref="Question"/>
///      row, and enqueues an <c>EmbedEntityJob</c> for the new Question — all
///      in one DB unit-of-work per the S16 atomic-approve hard rule.
///   3. <c>POST /api/admin/questions/drafts/{id}/reject</c> transitions to
///      <see cref="QuestionDraftStatus.Rejected"/>; no Question row is inserted.
///
/// A batch is a logical grouping of drafts produced by ONE generator call.
/// All drafts in a batch share the same <see cref="BatchId"/> and
/// <see cref="GeneratedById"/>.
/// </summary>
public class QuestionDraft
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Correlator for the batch this draft came from. All drafts
    /// returned by a single generator call share the same value.</summary>
    public Guid BatchId { get; set; }

    /// <summary>0-based position of this draft within the batch (preserves
    /// the AI's original ordering for the review UI).</summary>
    public int PositionInBatch { get; set; }

    public QuestionDraftStatus Status { get; set; } = QuestionDraftStatus.Draft;

    // ── AI-produced content ────────────────────────────────────────────

    public string QuestionText { get; set; } = string.Empty;
    public string? CodeSnippet { get; set; }
    public string? CodeLanguage { get; set; }

    /// <summary>4 options as a JSON array of strings; same value-converter
    /// pattern as <see cref="Question.Options"/>.</summary>
    public IReadOnlyList<string> Options { get; set; } = [];

    /// <summary>"A" | "B" | "C" | "D".</summary>
    public string CorrectAnswer { get; set; } = string.Empty;
    public string? Explanation { get; set; }

    public double IRT_A { get; set; } = 1.0;
    public double IRT_B { get; set; } = 0.0;

    /// <summary>1-sentence justification the AI emitted for its (a, b) self-rating.
    /// Surfaced to the admin reviewer in the drafts table.</summary>
    public string Rationale { get; set; } = string.Empty;

    public SkillCategory Category { get; set; }
    public int Difficulty { get; set; }

    public string PromptVersion { get; set; } = string.Empty;

    // ── Provenance + audit trail ───────────────────────────────────────

    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
    public Guid GeneratedById { get; set; }

    /// <summary>Set when Status transitions away from Draft.</summary>
    public Guid? DecidedById { get; set; }
    public DateTime? DecidedAt { get; set; }

    /// <summary>Free-text reason captured when the admin clicks "reject".
    /// Optional per S16 kickoff locked answer #4 — null = "no reason given".</summary>
    public string? RejectionReason { get; set; }

    /// <summary>The full original AI payload (JSON snapshot of the
    /// <see cref="GeneratedQuestionDraft"/> shape) captured at generate
    /// time. Preserved verbatim even when admin edits before approve so
    /// the audit trail records what the AI produced before human edits.
    /// </summary>
    public string OriginalDraftJson { get; set; } = "{}";

    /// <summary>Set when Status transitions to Approved → the Questions row
    /// that came out of this draft. Null for Draft and Rejected drafts.</summary>
    public Guid? ApprovedQuestionId { get; set; }
}

using CodeMentor.Domain.Assessments;

namespace CodeMentor.Domain.Tasks;

/// <summary>
/// S18-T1 / F16 (ADR-049 / ADR-058): one AI-generated task draft awaiting
/// admin review. Mirrors <see cref="QuestionDraft"/> from S16-T4 with the
/// task-shaped fields (Title, Description, AcceptanceCriteria, Deliverables,
/// Track, ExpectedLanguage, EstimatedHours, Prerequisites) instead of the
/// MCQ shape (Options, CorrectAnswer).
///
/// Lifecycle:
///   1. <c>POST /api/admin/tasks/generate</c> calls the AI service,
///      persists one <see cref="TaskDraft"/> per returned draft with
///      <see cref="Status"/> = <see cref="TaskDraftStatus.Draft"/>.
///   2. <c>POST /api/admin/tasks/drafts/{id}/approve</c> transitions to
///      <see cref="TaskDraftStatus.Approved"/>, inserts a <see cref="TaskItem"/>
///      row, and enqueues an <c>EmbedEntityJob&lt;TaskItem&gt;</c> — all
///      in one DB unit-of-work per the S16/S18 atomic-approve hard rule.
///   3. <c>POST /api/admin/tasks/drafts/{id}/reject</c> transitions to
///      <see cref="TaskDraftStatus.Rejected"/>; no Tasks row is inserted.
///
/// All drafts in a batch share the same <see cref="BatchId"/> + <see cref="GeneratedById"/>.
/// </summary>
public class TaskDraft
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid BatchId { get; set; }
    public int PositionInBatch { get; set; }
    public TaskDraftStatus Status { get; set; } = TaskDraftStatus.Draft;

    // ── AI-produced content ─────────────────────────────────────────────

    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;          // markdown
    public string? AcceptanceCriteria { get; set; }                  // markdown
    public string? Deliverables { get; set; }                        // markdown

    public int Difficulty { get; set; }      // 1..5
    public SkillCategory Category { get; set; }
    public Track Track { get; set; }
    public ProgrammingLanguage ExpectedLanguage { get; set; }
    public int EstimatedHours { get; set; }

    /// <summary>JSON-encoded prerequisites list (titles or task ids); enforced via
    /// TaskPrerequisiteValidator (S18-T8) at path-generation time, not here.</summary>
    public IReadOnlyList<string> Prerequisites { get; set; } = [];

    /// <summary>JSON array of {skill, weight} (weights sum to 1.0 ± 0.05).</summary>
    public string SkillTagsJson { get; set; } = "[]";

    /// <summary>JSON object mapping skill → learning gain.</summary>
    public string LearningGainJson { get; set; } = "{}";

    /// <summary>1-sentence justification the AI emitted for its tag/gain self-rating.</summary>
    public string Rationale { get; set; } = string.Empty;

    public string PromptVersion { get; set; } = string.Empty;

    // ── Provenance + audit trail ────────────────────────────────────────

    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
    public Guid GeneratedById { get; set; }

    public Guid? DecidedById { get; set; }
    public DateTime? DecidedAt { get; set; }

    public string? RejectionReason { get; set; }

    /// <summary>Verbatim AI payload captured at generate time. Preserved even when
    /// admin edits before approve so the audit trail records what the AI produced.</summary>
    public string OriginalDraftJson { get; set; } = "{}";

    /// <summary>Set when Status transitions to Approved → the Tasks row that
    /// came out of this draft. Null for Draft and Rejected drafts.</summary>
    public Guid? ApprovedTaskId { get; set; }
}

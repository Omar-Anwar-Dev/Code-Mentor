namespace CodeMentor.Domain.Assessments;

public class Question
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Content { get; set; } = string.Empty;
    public int Difficulty { get; set; } // 1..3
    public SkillCategory Category { get; set; }

    // 4-option multiple choice. Options stored as JSON (EF converts via value converter).
    public IReadOnlyList<string> Options { get; set; } = [];

    public string CorrectAnswer { get; set; } = string.Empty; // "A" | "B" | "C" | "D"
    public string? Explanation { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool IsActive { get; set; } = true;

    // ── S15 / F15 (ADR-049 / ADR-050 / ADR-055): IRT + provenance + AI columns ──

    // 2PL IRT parameters per item. Backfilled in S15-T4 from the existing
    // Difficulty (1 → -1.0; 2 → 0.0; 3 → +1.0); recalibrated empirically
    // by RecalibrateIRTJob once an item crosses the 1000-response threshold.
    public double IRT_A { get; set; } = 1.0;
    public double IRT_B { get; set; } = 0.0;

    // Provenance for the (IRT_A, IRT_B) values above. Default 'AI' is a
    // historical convenience for the S15-T4 backfill — the AI Generator
    // (Sprint 16) is the only source of post-S15 draft calibration.
    public CalibrationSource CalibrationSource { get; set; } = CalibrationSource.AI;

    // Provenance for the question CONTENT. Default 'Manual' covers the 60
    // hand-authored seed questions; the Sprint-16 AI Generator + admin
    // approval flow produces 'AI' rows.
    public QuestionSource Source { get; set; } = QuestionSource.Manual;

    // Admin who approved the question for the live bank. Null for the
    // pre-S16 seed questions (no admin-approval flow existed yet).
    // Stored as a Guid to match ApplicationUser's PK; FK configured in
    // ApplicationDbContext (no nav property — keeps Domain layer clean).
    public Guid? ApprovedById { get; set; }
    public DateTime? ApprovedAt { get; set; }

    // Optional code snippet rendered above the question text on the FE
    // (Prism syntax-highlight, language label badge). When non-null the
    // CodeLanguage hints the highlighter; when null the question is text-only.
    public string? CodeSnippet { get; set; }
    public string? CodeLanguage { get; set; }

    // Cached `text-embedding-3-small` vector (1536 floats serialized as
    // JSON). Populated by the EmbedEntityJob on Question approve in S16;
    // null for pre-S16 seed questions until the one-shot batch embed runs.
    public string? EmbeddingJson { get; set; }

    // The prompt template version (e.g., "generate_questions_v1") used by
    // the AI Generator when this question was drafted. Null for Manual rows.
    public string? PromptVersion { get; set; }
}

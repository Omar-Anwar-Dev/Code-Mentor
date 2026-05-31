using CodeMentor.Domain.Assessments;

namespace CodeMentor.Domain.Tasks;

public class TaskItem
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty; // markdown
    public string? AcceptanceCriteria { get; set; } // markdown — done definition surfaced to learners + AI
    public string? Deliverables { get; set; }       // markdown — what the learner is expected to submit
    public int Difficulty { get; set; } // 1..5
    public SkillCategory Category { get; set; }
    public Track Track { get; set; }
    public ProgrammingLanguage ExpectedLanguage { get; set; }
    public int EstimatedHours { get; set; }
    public IReadOnlyList<string> Prerequisites { get; set; } = [];
    public Guid? CreatedBy { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // ── S18-T1 / F16 (ADR-049): AI-driven metadata + provenance ─────────

    /// <summary>JSON array of {skill, weight} where weights sum to 1.0 ± 0.05.
    /// e.g., [{"skill":"correctness","weight":0.6},{"skill":"design","weight":0.4}].
    /// Nullable until the S18-T2 backfill migrates the existing 21 tasks.</summary>
    public string? SkillTagsJson { get; set; }

    /// <summary>JSON object mapping skill → estimated learning gain (e.g., {"correctness":0.4,"design":0.2})
    /// reflecting how much progress this task delivers per skill on completion.
    /// Nullable until backfill.</summary>
    public string? LearningGainJson { get; set; }

    /// <summary>Provenance: Manual (original seed or hand-authored) vs AI (Task Generator).
    /// Default Manual to keep the existing 21 rows on the safe side post-migration.</summary>
    public TaskSource Source { get; set; } = TaskSource.Manual;

    /// <summary>Soft FK to AspNetUsers — set when an admin approved an AI-generated draft.</summary>
    public Guid? ApprovedById { get; set; }
    public DateTime? ApprovedAt { get; set; }

    /// <summary>1536-float JSON-encoded vector from text-embedding-3-small (S16-T3 / S18-T6).
    /// Used by S19's hybrid recall path generator. Nullable; populated by EmbedEntityJob&lt;TaskItem&gt;.</summary>
    public string? EmbeddingJson { get; set; }

    /// <summary>e.g., "generate_tasks_v1" — bumped when the prompt template is replaced.</summary>
    public string? PromptVersion { get; set; }
}

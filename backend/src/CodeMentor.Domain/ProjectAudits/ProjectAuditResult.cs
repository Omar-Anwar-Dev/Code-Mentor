namespace CodeMentor.Domain.ProjectAudits;

/// <summary>
/// S9-T1: persisted AI audit result for a <see cref="ProjectAudit"/>. One row per
/// audit (enforced by unique index on <see cref="AuditId"/>).
///
/// Architecture §5.1 Domain 6 columns: 6-category scores, strengths, three issue
/// severities, missing features, recommended improvements, tech-stack assessment,
/// inline annotations. Token{Input,Output} reflect the audit-specific caps in
/// ADR-034 (10k input / 3k output, larger than per-task review).
/// </summary>
public class ProjectAuditResult
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid AuditId { get; set; }

    /// <summary>
    /// JSON: 6-category breakdown — CodeQuality, Security, Performance,
    /// ArchitectureDesign, Maintainability, Completeness. Each 0-100.
    /// </summary>
    public string ScoresJson { get; set; } = "{}";

    public string StrengthsJson { get; set; } = "[]";
    public string CriticalIssuesJson { get; set; } = "[]";
    public string WarningsJson { get; set; } = "[]";
    public string SuggestionsJson { get; set; } = "[]";
    public string MissingFeaturesJson { get; set; } = "[]";

    /// <summary>JSON: top-5 prioritized actions, each with title + how-to.</summary>
    public string RecommendedImprovementsJson { get; set; } = "[]";

    /// <summary>Free-text multi-paragraph assessment of the user's chosen tech stack.</summary>
    public string TechStackAssessment { get; set; } = string.Empty;

    /// <summary>JSON: per-file / per-line annotations; same shape as Submissions feedback inline annotations.</summary>
    public string InlineAnnotationsJson { get; set; } = "[]";

    public string ModelUsed { get; set; } = string.Empty;
    public string PromptVersion { get; set; } = string.Empty;

    public int TokensInput { get; set; }
    public int TokensOutput { get; set; }

    public DateTime ProcessedAt { get; set; } = DateTime.UtcNow;

    public ProjectAudit? Audit { get; set; }
}

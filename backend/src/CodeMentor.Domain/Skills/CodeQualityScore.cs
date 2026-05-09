namespace CodeMentor.Domain.Skills;

/// <summary>
/// S7-T1 / ADR-028: per-user, per-category running average of AI-derived
/// code-quality scores. Updated on each successful AI review (first persistence
/// only — auto-retries that upsert the same submission's <c>AIAnalysisResult</c>
/// don't contribute again, since the row's existence is what gates the update).
/// </summary>
public class CodeQualityScore
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public CodeQualityCategory Category { get; set; }

    /// <summary>Running mean across <see cref="SampleCount"/> contributing submissions, 0–100.</summary>
    public decimal Score { get; set; }

    /// <summary>Number of distinct submissions whose AI scores have rolled into <see cref="Score"/>.</summary>
    public int SampleCount { get; set; }

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

namespace CodeMentor.Domain.Submissions;

/// <summary>
/// S6-T3: persisted AI review for a submission. One row per Submission
/// (enforced by unique index on <see cref="SubmissionId"/>).
///
/// Architecture §5.1 column set: OverallScore, FeedbackJson, StrengthsJson,
/// WeaknessesJson, ModelUsed, TokensUsed, ProcessedAt — plus PromptVersion
/// added in S6-T1 so feedback rows can be traced to the prompt template that
/// produced them.
/// </summary>
public class AIAnalysisResult
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid SubmissionId { get; set; }

    public int OverallScore { get; set; }

    /// <summary>
    /// Full feedback payload (the unified JSON that the FeedbackAggregator
    /// produces in S6-T5). For S6-T4 it carries the raw AI response so callers
    /// have a single place to read structured fields without re-querying the AI.
    /// </summary>
    public string FeedbackJson { get; set; } = "{}";

    /// <summary>Denormalized JSON array of brief strength strings.</summary>
    public string StrengthsJson { get; set; } = "[]";

    /// <summary>Denormalized JSON array of brief weakness strings.</summary>
    public string WeaknessesJson { get; set; } = "[]";

    public string ModelUsed { get; set; } = string.Empty;
    public int TokensUsed { get; set; }
    public string PromptVersion { get; set; } = string.Empty;

    public DateTime ProcessedAt { get; set; } = DateTime.UtcNow;

    public Submission? Submission { get; set; }
}

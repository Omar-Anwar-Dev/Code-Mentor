namespace CodeMentor.Application.CodeReview;

/// <summary>
/// S12 / F14 (ADR-040): aggregates the data scattered across
/// <c>CodeQualityScores</c>, <c>AIAnalysisResults</c>, <c>Submissions</c>,
/// <c>Tasks</c>, <c>SkillScores</c>, <c>PathTasks</c>, and Qdrant's
/// <c>feedback_history</c> collection into a single
/// <see cref="LearnerSnapshot"/> the <c>SubmissionAnalysisJob</c>
/// forwards to the AI service per-review.
/// </summary>
public interface ILearnerSnapshotService
{
    /// <summary>
    /// Build the snapshot for one in-progress submission. Handles cold-start
    /// (no prior submissions per ADR-042) and Qdrant fallback (profile-only
    /// per ADR-043) internally — callers always receive a usable snapshot.
    /// </summary>
    /// <param name="userId">Owner of the submission being analysed.</param>
    /// <param name="currentSubmissionId">The submission about to be reviewed; excluded from prior-submission aggregations.</param>
    /// <param name="currentTaskId">Task ID of the current submission; used to count <see cref="LearnerSnapshot.AttemptsOnCurrentTask"/>.</param>
    /// <param name="currentStaticFindingsJson">Optional JSON string from the just-completed static analysis phase, used as the RAG query anchor. When null/empty the RAG retrieval is skipped and the snapshot proceeds profile-only.</param>
    /// <param name="ct">Cancellation token; respected through DB + Qdrant calls.</param>
    Task<LearnerSnapshot> BuildAsync(
        Guid userId,
        Guid currentSubmissionId,
        Guid currentTaskId,
        string? currentStaticFindingsJson,
        CancellationToken ct = default);
}

/// <summary>
/// Tunable thresholds for <see cref="ILearnerSnapshotService"/>. Exposed via
/// the <c>LearnerSnapshot</c> configuration section so post-MVP tuning is a
/// single appsettings edit (ADR-041 calls these out explicitly).
/// </summary>
public sealed class LearnerSnapshotOptions
{
    public const string SectionName = "LearnerSnapshot";

    /// <summary>
    /// How many recent completed submissions to consider when computing
    /// <c>commonMistakes</c>, recent-submissions list, and improvement trend.
    /// Default 10.
    /// </summary>
    public int CommonMistakesLookback { get; set; } = 10;

    /// <summary>
    /// A weakness phrase is "recurring" when it appears in at least this
    /// many of the last <see cref="RecurringThresholdSampleSize"/>
    /// submissions. Per ADR-041 default 3 of 5 (60 %).
    /// </summary>
    public int RecurringThresholdCount { get; set; } = 3;

    /// <summary>
    /// Window size for the recurring-weakness check. Per ADR-041 default 5.
    /// </summary>
    public int RecurringThresholdSampleSize { get; set; } = 5;

    /// <summary>
    /// CodeQualityScore (0–100) below which a category is "weak". Per
    /// ADR-041 default 60.
    /// </summary>
    public int WeakAreaScoreThreshold { get; set; } = 60;

    /// <summary>
    /// CodeQualityScore (0–100) at or above which a category is "strong".
    /// Default 80.
    /// </summary>
    public int StrongAreaScoreThreshold { get; set; } = 80;

    /// <summary>
    /// Maximum number of RAG-retrieved prior-feedback chunks to include.
    /// Per ADR-040 default 5.
    /// </summary>
    public int RagTopK { get; set; } = 5;

    /// <summary>
    /// Maximum chars of <c>RecentSubmissionSummary.MainIssues</c> entries
    /// retained (truncates noisy long phrases). Default 200.
    /// </summary>
    public int MainIssueMaxChars { get; set; } = 200;
}

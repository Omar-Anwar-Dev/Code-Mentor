namespace CodeMentor.Application.CodeReview;

/// <summary>
/// S12 / F14 (ADR-040): the platform-aware view of a learner that informs the
/// AI's review of their current submission. Built by
/// <c>ILearnerSnapshotService</c> on every <c>SubmissionAnalysisJob</c> run
/// and forwarded to the AI service through the new optional Form fields on
/// <c>/api/analyze-zip</c>.
///
/// The snapshot is intentionally a flat aggregate — the AI service's
/// existing enhanced prompt (<c>CODE_REVIEW_PROMPT_ENHANCED</c> in
/// <c>ai-service/app/services/prompts.py</c>) consumes a structured profile
/// + history block; this snapshot maps onto those existing Pydantic schemas
/// at the transport boundary via <see cref="ToAiProfilePayload"/> and
/// <see cref="ToAiHistoryPayload"/>.
/// </summary>
public sealed record LearnerSnapshot
{
    /// <summary>User identifier. Drives RAG filtering + indexing keys.</summary>
    public required Guid UserId { get; init; }

    /// <summary>
    /// Beginner / Intermediate / Advanced, sourced from the user's latest
    /// completed <c>Assessment</c>. Defaults to "Intermediate" if no
    /// assessment exists yet (cold-start handling — ADR-042).
    /// </summary>
    public required string SkillLevel { get; init; }

    /// <summary>Count of <c>Submissions</c> with <c>Status=Completed</c> for this user.</summary>
    public required int CompletedSubmissionsCount { get; init; }

    /// <summary>
    /// Mean of <c>AIAnalysisResult.OverallScore</c> across the user's last
    /// <c>CommonMistakesLookback</c> completed submissions. Null if no
    /// submissions have completed AI review yet (cold-start).
    /// </summary>
    public required double? AverageOverallScore { get; init; }

    /// <summary>
    /// Per-category running averages, sourced from <c>CodeQualityScores</c>
    /// (ADR-028). Keys are the 5 PRD F6 names — Correctness, Readability,
    /// Security, Performance, Design.
    /// </summary>
    public required IReadOnlyDictionary<string, double> CodeQualityAverages { get; init; }

    /// <summary>
    /// Sample counts behind each <see cref="CodeQualityAverages"/> entry.
    /// Lets the AI prompt weight conclusions appropriately for thin data.
    /// </summary>
    public required IReadOnlyDictionary<string, int> CodeQualitySampleCounts { get; init; }

    /// <summary>
    /// Categories with <c>average &lt; WeakAreaScoreThreshold</c> (default 60)
    /// AND <c>sampleCount ≥ 1</c>, OR — when there are no AI samples yet — the
    /// assessment <c>SkillScores</c> categories below the same threshold
    /// (cold-start fallback per ADR-042).
    /// </summary>
    public required IReadOnlyList<string> WeakAreas { get; init; }

    /// <summary>
    /// Categories with <c>average ≥ StrongAreaScoreThreshold</c> (default 80).
    /// Falls back to assessment SkillScores for cold-start.
    /// </summary>
    public required IReadOnlyList<string> StrongAreas { get; init; }

    /// <summary>
    /// "improving" | "stable" | "declining" computed from the delta between
    /// the mean of the last 3 submissions' OverallScore vs the prior 3.
    /// Null when fewer than 4 completed submissions exist.
    /// </summary>
    public required string? ImprovementTrend { get; init; }

    /// <summary>
    /// Last N completed submissions in descending date order. N = options
    /// <c>CommonMistakesLookback</c> (default 10). Surfaced as
    /// <c>recentSubmissions</c> to the AI service.
    /// </summary>
    public required IReadOnlyList<RecentSubmissionSummary> RecentSubmissions { get; init; }

    /// <summary>
    /// Top-5 most-frequent weakness phrases across the last 10 submissions,
    /// frequency-ranked, ties broken by recency. Computed per ADR-041.
    /// </summary>
    public required IReadOnlyList<string> CommonMistakes { get; init; }

    /// <summary>
    /// Category names that meet the "recurring" gate per ADR-041:
    /// <c>average &lt; WeakAreaScoreThreshold</c> AND <c>sampleCount ≥
    /// RecurringThresholdSampleSize</c> (default 5). May be empty.
    /// </summary>
    public required IReadOnlyList<string> RecurringWeaknesses { get; init; }

    /// <summary>
    /// Top-k feedback chunks retrieved from the Qdrant <c>feedback_history</c>
    /// collection most similar to the current submission's static-analysis
    /// findings. Up to 5 chunks per ADR-040. Empty list when:
    ///   - User has no prior indexed feedback (cold-start, ADR-042), OR
    ///   - Qdrant query failed (profile-only fallback, ADR-043), OR
    ///   - Top-k similarity all below the relevance floor.
    /// </summary>
    public required IReadOnlyList<PriorFeedbackChunk> RagChunks { get; init; }

    /// <summary>
    /// Count of <c>Submissions</c> by this user against the *current* task —
    /// regardless of status. Lets the AI explicitly acknowledge "this is your
    /// Nth attempt at this task." Includes the current in-progress submission.
    /// </summary>
    public required int AttemptsOnCurrentTask { get; init; }

    /// <summary>
    /// True when the user has zero completed prior submissions. Drives the
    /// cold-start narrative in <see cref="ProgressNotes"/> (ADR-042) and the
    /// RAG short-circuit in <c>LearnerSnapshotService</c>.
    /// </summary>
    public required bool IsFirstReview { get; init; }

    /// <summary>
    /// Human-readable narrative the AI prompt's <c>progressNotes</c> field
    /// consumes verbatim. Composed by <c>LearnerSnapshotService</c> from a
    /// combination of the trend, recurring patterns, RAG chunks, and
    /// cold-start signal. May include the explicit fallback annotation when
    /// Qdrant is unavailable (ADR-043).
    /// </summary>
    public required string ProgressNotes { get; init; }

    /// <summary>
    /// Map this snapshot to the wire-shape <c>LearnerProfile</c> payload that
    /// matches the AI service's Pydantic schema field-for-field.
    /// </summary>
    public AiLearnerProfilePayload ToAiProfilePayload() => new(
        SkillLevel: SkillLevel,
        PreviousSubmissions: CompletedSubmissionsCount,
        AverageScore: AverageOverallScore,
        WeakAreas: WeakAreas,
        StrongAreas: StrongAreas,
        ImprovementTrend: ImprovementTrend);

    /// <summary>
    /// Map this snapshot to the wire-shape <c>LearnerHistory</c> payload that
    /// matches the AI service's Pydantic schema field-for-field. The
    /// <c>RagChunks</c> are folded into <c>ProgressNotes</c> as structured
    /// text so the existing AI prompt picks them up without a schema
    /// extension on the AI side (ADR-040 keeps surface area minimal).
    /// </summary>
    public AiLearnerHistoryPayload ToAiHistoryPayload()
    {
        var recent = RecentSubmissions
            .Select(s => new AiRecentSubmissionPayload(
                TaskName: s.TaskName,
                Score: s.Score,
                Date: s.Date.ToString("O"),
                MainIssues: s.MainIssues))
            .ToList();

        return new AiLearnerHistoryPayload(
            RecentSubmissions: recent,
            CommonMistakes: CommonMistakes,
            RecurringWeaknesses: RecurringWeaknesses,
            ProgressNotes: ProgressNotes);
    }
}

/// <summary>
/// A condensed view of one completed prior submission. Carries enough
/// signal for the AI to reference it ("on your earlier 'REST API' task you
/// scored 65; this submission addresses the recurring input-validation
/// pattern...") without ballooning the prompt with full feedback JSON.
/// </summary>
public sealed record RecentSubmissionSummary(
    Guid SubmissionId,
    string TaskName,
    int Score,
    DateTime Date,
    IReadOnlyList<string> MainIssues);

/// <summary>
/// A single prior-feedback excerpt retrieved from Qdrant's
/// <c>feedback_history</c> collection. <see cref="Kind"/> distinguishes
/// "weakness" / "strength" / "recommendation" / "progress-analysis" so the
/// downstream prompt narrative can format them differently.
/// </summary>
public sealed record PriorFeedbackChunk(
    Guid SourceSubmissionId,
    string TaskName,
    string ChunkText,
    string Kind,
    double SimilarityScore,
    DateTime SourceDate);

/// <summary>
/// Wire-shape payload mirroring the AI service's <c>LearnerProfile</c>
/// Pydantic model in <c>ai-service/app/domain/schemas/requests.py</c>.
/// JSON property names are camelCase to align with the AI service's
/// CamelCase JSON config; the serializer in <c>AiReviewClient</c> stamps
/// the field names directly so this record's PascalCase fields don't leak.
/// </summary>
public sealed record AiLearnerProfilePayload(
    string SkillLevel,
    int PreviousSubmissions,
    double? AverageScore,
    IReadOnlyList<string> WeakAreas,
    IReadOnlyList<string> StrongAreas,
    string? ImprovementTrend);

/// <summary>
/// Wire-shape payload mirroring the AI service's <c>LearnerHistory</c>
/// Pydantic model. The Pydantic schema accepts <c>recentSubmissions</c> as
/// <c>List[dict]</c> with shape <c>{taskName, score, date, mainIssues}</c>;
/// we model it explicitly via <see cref="AiRecentSubmissionPayload"/> so
/// the contract is testable on the C# side.
/// </summary>
public sealed record AiLearnerHistoryPayload(
    IReadOnlyList<AiRecentSubmissionPayload> RecentSubmissions,
    IReadOnlyList<string> CommonMistakes,
    IReadOnlyList<string> RecurringWeaknesses,
    string? ProgressNotes);

/// <summary>
/// One row in <c>LearnerHistory.recentSubmissions</c>. Matches the AI
/// service's <c>format_recent_submissions</c> consumer shape in
/// <c>prompts.py</c>.
/// </summary>
public sealed record AiRecentSubmissionPayload(
    string TaskName,
    int Score,
    string Date,
    IReadOnlyList<string> MainIssues);

/// <summary>
/// Wire-shape payload mirroring the AI service's <c>ProjectContext</c>
/// Pydantic model. Built by <c>LearnerSnapshotService</c> from the
/// current task + path context so the AI prompt has the task framing
/// upfront (the existing <c>task_context</c> field in the legacy path is
/// less rich).
/// </summary>
public sealed record AiProjectContextPayload(
    string Name,
    string Description,
    string? LearningTrack,
    string Difficulty,
    IReadOnlyList<string> ExpectedOutcomes,
    IReadOnlyList<string> FocusAreas);

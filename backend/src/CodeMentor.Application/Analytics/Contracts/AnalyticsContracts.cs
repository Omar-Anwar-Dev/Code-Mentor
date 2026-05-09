namespace CodeMentor.Application.Analytics.Contracts;

/// <summary>
/// S8-T1: 12-week analytics aggregate. WeeklyTrend bins per-category code-quality
/// scores from completed submissions; WeeklySubmissions stacks counts by status;
/// KnowledgeSnapshot exposes the assessment-driven skill axis (per ADR-028, the
/// dual-axis story).
/// </summary>
public sealed record AnalyticsDto(
    DateTime WindowStart,
    DateTime WindowEnd,
    IReadOnlyList<WeeklyTrendPointDto> WeeklyTrend,
    IReadOnlyList<WeeklySubmissionsPointDto> WeeklySubmissions,
    IReadOnlyList<KnowledgeSnapshotItemDto> KnowledgeSnapshot);

public sealed record WeeklyTrendPointDto(
    DateTime WeekStart,
    int SampleCount,
    decimal? Correctness,
    decimal? Readability,
    decimal? Security,
    decimal? Performance,
    decimal? Design);

public sealed record WeeklySubmissionsPointDto(
    DateTime WeekStart,
    int Total,
    int Completed,
    int Failed,
    int Processing,
    int Pending);

public sealed record KnowledgeSnapshotItemDto(
    string Category,
    decimal Score,
    string Level,
    DateTime UpdatedAt);

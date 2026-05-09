using CodeMentor.Application.LearningPaths.Contracts;

namespace CodeMentor.Application.Dashboard.Contracts;

public sealed record SkillSnapshotItemDto(string Category, decimal Score, string Level, DateTime UpdatedAt);

public sealed record RecentSubmissionDto(
    Guid SubmissionId,
    Guid TaskId,
    string TaskTitle,
    string Status,
    decimal? OverallScore,
    DateTime CreatedAt);

public sealed record DashboardDto(
    LearningPathDto? ActivePath,
    IReadOnlyList<RecentSubmissionDto> RecentSubmissions,
    IReadOnlyList<SkillSnapshotItemDto> SkillSnapshot);

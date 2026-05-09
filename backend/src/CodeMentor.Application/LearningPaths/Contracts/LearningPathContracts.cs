namespace CodeMentor.Application.LearningPaths.Contracts;

public sealed record LearningPathDto(
    Guid PathId,
    Guid UserId,
    string Track,
    Guid? AssessmentId,
    bool IsActive,
    decimal ProgressPercent,
    DateTime GeneratedAt,
    IReadOnlyList<PathTaskDto> Tasks);

public sealed record PathTaskDto(
    Guid PathTaskId,
    int OrderIndex,
    string Status,
    DateTime? StartedAt,
    DateTime? CompletedAt,
    TaskSummaryDto Task);

public sealed record TaskSummaryDto(
    Guid TaskId,
    string Title,
    int Difficulty,
    string Category,
    string Track,
    string ExpectedLanguage,
    int EstimatedHours);

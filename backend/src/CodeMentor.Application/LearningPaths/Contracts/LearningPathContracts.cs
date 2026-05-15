namespace CodeMentor.Application.LearningPaths.Contracts;

public sealed record LearningPathDto(
    Guid PathId,
    Guid UserId,
    string Track,
    Guid? AssessmentId,
    bool IsActive,
    decimal ProgressPercent,
    DateTime GeneratedAt,
    IReadOnlyList<PathTaskDto> Tasks,
    // S19-T4 / F16 (ADR-052): provenance + audit. Defaulted so callers
    // pre-S19 don't need updating, but values are returned by the service.
    string Source = "TemplateFallback",
    string? GenerationReasoningText = null);

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

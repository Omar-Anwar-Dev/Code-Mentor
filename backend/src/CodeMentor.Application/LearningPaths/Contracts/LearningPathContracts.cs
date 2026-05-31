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

// S21-T3 / F16: response shape for GET /api/learning-paths/me/graduation.
// Before / After are per-category snapshots driving the radar chart;
// JourneySummary* is the AI-generated 3-paragraph copy from the user's Full
// reassessment AssessmentSummary (null when no Full has run yet, in which
// case NextPhaseEligible is also false).
public sealed record GraduationViewDto(
    Guid PathId,
    int Version,
    string Track,
    decimal ProgressPercent,
    DateTime GeneratedAt,
    IReadOnlyList<SkillSnapshotEntry> Before,
    IReadOnlyList<SkillSnapshotEntry> After,
    string? JourneySummaryStrengths,
    string? JourneySummaryWeaknesses,
    string? JourneySummaryNextSteps,
    bool NextPhaseEligible,
    Guid? FullReassessmentAssessmentId);

public sealed record SkillSnapshotEntry(string Category, decimal SmoothedScore);

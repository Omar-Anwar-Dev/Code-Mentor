namespace CodeMentor.Application.LearningPaths.Contracts;

/// <summary>S20-T5 / F16: wire DTOs for the path-adaptation HTTP endpoints.
/// Domain enums are stringified for FE consumption.</summary>
public sealed record PathAdaptationEventDto(
    Guid Id,
    Guid PathId,
    DateTime TriggeredAt,
    string Trigger,
    string SignalLevel,
    string LearnerDecision,
    DateTime? RespondedAt,
    string AIReasoningText,
    double ConfidenceScore,
    IReadOnlyList<PathAdaptationActionDto> Actions,
    string AIPromptVersion,
    int? TokensInput,
    int? TokensOutput);

/// <summary>Per-action shape. Matches the AI service's wire JSON.</summary>
public sealed record PathAdaptationActionDto(
    string Type,
    int TargetPosition,
    string? NewTaskId,
    int? NewOrderIndex,
    string Reason,
    double Confidence);

public sealed record PathAdaptationListResponse(
    IReadOnlyList<PathAdaptationEventDto> Pending,
    IReadOnlyList<PathAdaptationEventDto> History);

public sealed record PathAdaptationRespondRequest(string Decision);

public sealed record PathAdaptationRespondResponse(
    Guid EventId,
    string Decision,
    DateTime RespondedAt);

public sealed record PathAdaptationRefreshResponse(
    Guid PathId,
    string Status,
    string Message);

/// <summary>S20-T7 admin variant — same shape as the learner row + the UserId
/// (which the learner endpoint hides since it's implicit).</summary>
public sealed record AdminPathAdaptationEventDto(
    Guid Id,
    Guid PathId,
    Guid UserId,
    DateTime TriggeredAt,
    string Trigger,
    string SignalLevel,
    string LearnerDecision,
    DateTime? RespondedAt,
    string AIReasoningText,
    double ConfidenceScore,
    int ActionCount,
    string AIPromptVersion);

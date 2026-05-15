namespace CodeMentor.Application.Admin.Contracts;

/// <summary>S18-T4 / F16: admin task-generator request shape (FE → BE).</summary>
public sealed record GenerateTaskDraftsRequest(
    string Track,                          // "FullStack" | "Backend" | "Python"
    int Difficulty,                        // 1..5
    int Count,                             // 1..10
    IReadOnlyList<string> FocusSkills,     // one or more of correctness/readability/security/performance/design
    IReadOnlyList<string>? ExistingTitles  // dedup hints; null OK
);

/// <summary>S18-T4 / F16: response payload after the AI call + persistence.
/// Drafts are listed in the order returned by the AI; the caller can list
/// them again via <c>GET /api/admin/tasks/drafts/{batchId}</c>.</summary>
public sealed record GenerateTaskDraftsResponse(
    Guid BatchId,
    string PromptVersion,
    int TokensUsed,
    int RetryCount,
    IReadOnlyList<TaskDraftDto> Drafts);

/// <summary>S18-T4 / F16: per-draft view-model the FE drafts-table consumes.</summary>
public sealed record TaskDraftDto(
    Guid Id,
    int PositionInBatch,
    string Status,
    string Title,
    string Description,
    string? AcceptanceCriteria,
    string? Deliverables,
    int Difficulty,
    string Category,
    string Track,
    string ExpectedLanguage,
    int EstimatedHours,
    IReadOnlyList<string> Prerequisites,
    string SkillTagsJson,
    string LearningGainJson,
    string Rationale,
    string PromptVersion);

/// <summary>S18-T4 / F16: optional admin edits at approve time. Any null field
/// is unchanged from the AI draft. Mirrors <see cref="ApproveQuestionDraftRequest"/>
/// from S16-T4.</summary>
public sealed record ApproveTaskDraftRequest(
    string? Title,
    string? Description,
    string? AcceptanceCriteria,
    string? Deliverables,
    int? Difficulty,
    string? Category,
    string? Track,
    string? ExpectedLanguage,
    int? EstimatedHours,
    IReadOnlyList<string>? Prerequisites,
    string? SkillTagsJson,
    string? LearningGainJson);

public sealed record RejectTaskDraftRequest(string? Reason);

public sealed record ApproveTaskResponseDto(Guid TaskId);

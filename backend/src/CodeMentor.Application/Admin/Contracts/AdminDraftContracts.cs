using CodeMentor.Domain.Assessments;

namespace CodeMentor.Application.Admin.Contracts;

// S16 / F15 (ADR-049 / ADR-054): contracts for the AI Question Generator
// admin workflow — generate → review → approve/reject. The wire shape
// mirrors the AI service Pydantic schemas in
// ai-service/app/domain/schemas/generator.py.

/// <summary>One request the admin tool sends to POST /api/admin/questions/generate.
/// Mirrors <c>GenerateQuestionsRequest</c> on the AI service side.</summary>
public sealed record GenerateQuestionDraftsRequest(
    SkillCategory Category,
    int Difficulty,
    int Count,
    bool IncludeCode = false,
    string? Language = null);

/// <summary>Returned by the generate endpoint. Drafts are persisted and
/// the BatchId can be used to retrieve them via
/// <c>GET /api/admin/questions/drafts/{batchId}</c>.</summary>
public sealed record GenerateQuestionDraftsResponse(
    Guid BatchId,
    IReadOnlyList<QuestionDraftDto> Drafts,
    int TokensUsed,
    int RetryCount,
    string PromptVersion);

/// <summary>One draft as surfaced to the admin UI.</summary>
public sealed record QuestionDraftDto(
    Guid Id,
    Guid BatchId,
    int PositionInBatch,
    QuestionDraftStatus Status,
    string QuestionText,
    string? CodeSnippet,
    string? CodeLanguage,
    IReadOnlyList<string> Options,
    string CorrectAnswer,
    string? Explanation,
    double IrtA,
    double IrtB,
    string Rationale,
    SkillCategory Category,
    int Difficulty,
    string PromptVersion,
    DateTime GeneratedAt,
    Guid GeneratedById,
    Guid? DecidedById,
    DateTime? DecidedAt,
    string? RejectionReason,
    Guid? ApprovedQuestionId);

/// <summary>Optional admin edits applied at approve-time. All fields are
/// optional — null means "keep the AI's original value".</summary>
public sealed record ApproveQuestionDraftRequest(
    string? QuestionText = null,
    string? CodeSnippet = null,
    string? CodeLanguage = null,
    IReadOnlyList<string>? Options = null,
    string? CorrectAnswer = null,
    string? Explanation = null,
    double? IrtA = null,
    double? IrtB = null,
    int? Difficulty = null,
    SkillCategory? Category = null);

/// <summary>Reject reason is optional per S16 kickoff locked answer #4
/// (free-text optional; logged when supplied).</summary>
public sealed record RejectQuestionDraftRequest(string? Reason = null);

/// <summary>S16-T9: one row in the generator-quality sparkline. Surfaces on
/// the admin dashboard widget showing the last N batches' approve/reject
/// rates. Per ADR-056, R20 (generator quality risk) materializes as a
/// reject rate trending up — the widget gives admins early visibility.</summary>
public sealed record GeneratorBatchMetricDto(
    Guid BatchId,
    DateTime GeneratedAt,
    int TotalDrafts,
    int Approved,
    int Rejected,
    int StillPending,
    double RejectRatePct,
    string PromptVersion);

using System.Text.Json;
using CodeMentor.Domain.ProjectAudits;

namespace CodeMentor.Application.ProjectAudits.Contracts;

/// <summary>
/// S9-T3: structured project description payload accepted by <c>POST /api/audits</c>.
/// Persisted as JSON in <c>ProjectAudit.ProjectDescriptionJson</c> and forwarded
/// verbatim to the AI service's <c>/api/project-audit</c> prompt context.
/// </summary>
public record CreateAuditRequest(
    string ProjectName,
    string Summary,
    string Description,
    string ProjectType,
    IReadOnlyList<string> TechStack,
    IReadOnlyList<string> Features,
    string? TargetAudience,
    IReadOnlyList<string>? FocusAreas,
    string? KnownIssues,
    AuditSourceDto Source);

/// <summary>
/// Discriminated source for the audit. <see cref="Type"/> is "github" or "zip"
/// (case-insensitive). Exactly one of <see cref="RepositoryUrl"/> /
/// <see cref="BlobPath"/> must be set, matching the type.
/// </summary>
public record AuditSourceDto(
    string Type,
    string? RepositoryUrl,
    string? BlobPath);

public record AuditCreatedResponse(
    Guid AuditId,
    ProjectAuditStatus Status,
    int AttemptNumber);

public enum AuditErrorCode
{
    None = 0,
    InvalidRequest,
    InvalidProjectType,
    InvalidGitHubUrl,
    InvalidSourceType,
    BlobNotFound,
    NotFound,
    NotRetryable,
}

public record AuditOperationResult(
    bool Success,
    AuditCreatedResponse? Value,
    AuditErrorCode ErrorCode,
    string? ErrorMessage)
{
    public static AuditOperationResult Ok(AuditCreatedResponse value)
        => new(true, value, AuditErrorCode.None, null);

    public static AuditOperationResult Error(AuditErrorCode code, string message)
        => new(false, null, code, message);
}

/// <summary>S9-T5: single audit detail (status + scores + timestamps).</summary>
public record AuditDto(
    Guid AuditId,
    Guid UserId,
    string ProjectName,
    AuditSourceType SourceType,
    string? RepositoryUrl,
    string? BlobPath,
    ProjectAuditStatus Status,
    ProjectAuditAiStatus AiReviewStatus,
    int? OverallScore,
    string? Grade,
    string? ErrorMessage,
    int AttemptNumber,
    bool IsDeleted,
    DateTime CreatedAt,
    DateTime? StartedAt,
    DateTime? CompletedAt,
    // S10-T9 / F12: chat panel readiness gate (architecture §6.12; ADR-036).
    DateTime? MentorIndexedAt = null);

/// <summary>S9-T5: list-row item (lighter than <see cref="AuditDto"/>; no error / blob detail).</summary>
public record AuditListItemDto(
    Guid AuditId,
    string ProjectName,
    AuditSourceType SourceType,
    ProjectAuditStatus Status,
    ProjectAuditAiStatus AiReviewStatus,
    int? OverallScore,
    string? Grade,
    DateTime CreatedAt,
    DateTime? CompletedAt);

public record AuditListResponse(
    int Page,
    int Size,
    int TotalCount,
    IReadOnlyList<AuditListItemDto> Items);

/// <summary>S9-T5: query parameters for `/audits/me` (all optional except page/size).</summary>
public record AuditListQuery(
    int Page = 1,
    int Size = 20,
    DateTime? DateFrom = null,
    DateTime? DateTo = null,
    int? ScoreMin = null,
    int? ScoreMax = null);

/// <summary>
/// S9-T5: full 8-section audit report DTO. JSON columns from
/// <see cref="ProjectAuditResult"/> are exposed as <see cref="JsonElement"/> so the
/// controller can serialize them as nested JSON without a deserialize/re-serialize
/// round-trip. Only returned when the audit has reached
/// <see cref="ProjectAuditStatus.Completed"/> AND has an associated result row.
/// </summary>
public record AuditReportDto(
    Guid AuditId,
    string ProjectName,
    int OverallScore,
    string Grade,
    JsonElement Scores,
    JsonElement Strengths,
    JsonElement CriticalIssues,
    JsonElement Warnings,
    JsonElement Suggestions,
    JsonElement MissingFeatures,
    JsonElement RecommendedImprovements,
    string TechStackAssessment,
    JsonElement InlineAnnotations,
    string ModelUsed,
    string PromptVersion,
    int TokensInput,
    int TokensOutput,
    DateTime ProcessedAt,
    DateTime CompletedAt,
    string ExecutiveSummary = "",
    string ArchitectureNotes = "");

/// <summary>
/// Allowed values for <see cref="CreateAuditRequest.ProjectType"/>. Enforced
/// case-insensitively by the service. Owner-confirmed defaults from the Sprint 9
/// kickoff (per product-architect Phase 2 notes).
/// </summary>
public static class ProjectTypes
{
    public const string WebApp = "WebApp";
    public const string Mobile = "Mobile";
    public const string Cli = "CLI";
    public const string Library = "Library";
    public const string Api = "API";
    public const string Other = "Other";

    public static readonly IReadOnlyList<string> All = new[] { WebApp, Mobile, Cli, Library, Api, Other };

    public static bool IsValid(string? candidate)
        => candidate is not null
           && All.Any(p => string.Equals(p, candidate, StringComparison.OrdinalIgnoreCase));
}

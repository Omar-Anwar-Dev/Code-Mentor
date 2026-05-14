using CodeMentor.Domain.Assessments;
using CodeMentor.Domain.Tasks;

namespace CodeMentor.Application.Admin.Contracts;

// ----- Tasks ---------------------------------------------------------------

public sealed record AdminTaskDto(
    Guid Id,
    string Title,
    string Description,
    string? AcceptanceCriteria,
    string? Deliverables,
    int Difficulty,
    SkillCategory Category,
    Track Track,
    ProgrammingLanguage ExpectedLanguage,
    int EstimatedHours,
    IReadOnlyList<string> Prerequisites,
    bool IsActive,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public sealed record CreateTaskRequest(
    string Title,
    string Description,
    int Difficulty,
    SkillCategory Category,
    Track Track,
    ProgrammingLanguage ExpectedLanguage,
    int EstimatedHours,
    IReadOnlyList<string>? Prerequisites,
    string? AcceptanceCriteria = null,
    string? Deliverables = null);

public sealed record UpdateTaskRequest(
    string? Title,
    string? Description,
    int? Difficulty,
    SkillCategory? Category,
    Track? Track,
    ProgrammingLanguage? ExpectedLanguage,
    int? EstimatedHours,
    IReadOnlyList<string>? Prerequisites,
    bool? IsActive,
    string? AcceptanceCriteria = null,
    string? Deliverables = null);

// ----- Questions -----------------------------------------------------------

public sealed record AdminQuestionDto(
    Guid Id,
    string Content,
    int Difficulty,
    SkillCategory Category,
    IReadOnlyList<string> Options,
    string CorrectAnswer,
    string? Explanation,
    bool IsActive,
    DateTime CreatedAt);

public sealed record CreateQuestionRequest(
    string Content,
    int Difficulty,
    SkillCategory Category,
    IReadOnlyList<string> Options,
    string CorrectAnswer,
    string? Explanation);

public sealed record UpdateQuestionRequest(
    string? Content,
    int? Difficulty,
    SkillCategory? Category,
    IReadOnlyList<string>? Options,
    string? CorrectAnswer,
    string? Explanation,
    bool? IsActive);

// ----- Users ---------------------------------------------------------------

public sealed record AdminUserDto(
    Guid Id,
    string Email,
    string FullName,
    IReadOnlyList<string> Roles,
    bool IsActive,
    bool IsEmailVerified,
    DateTime CreatedAt,
    DateTime? LockoutEndUtc);

public sealed record UpdateUserRequest(
    bool? IsActive,
    string? Role); // "Learner" | "Admin"

public sealed record PagedResult<T>(
    IReadOnlyList<T> Items,
    int Page,
    int PageSize,
    int Total);

// ----- Admin dashboard summary --------------------------------------------
// Post-S14 follow-up: replaces the "Demo data — platform analytics endpoint
// pending" banner on /admin and /admin/analytics. Single-call DTO that
// powers both pages.

public sealed record AdminDashboardSummaryDto(
    AdminOverviewCardsDto Cards,
    IReadOnlyList<AdminUserGrowthPointDto> UserGrowth,
    IReadOnlyList<AdminTrackDistributionItemDto> TrackDistribution,
    IReadOnlyList<AdminTrackAiScoresDto> AiScoreByTrack,
    DateTime GeneratedAtUtc);

public sealed record AdminOverviewCardsDto(
    int TotalUsers,
    int NewUsersThisWeek,
    int ActiveToday,
    int TotalSubmissions,
    int SubmissionsThisWeek,
    int ActiveTasks,
    int PublishedQuestions,
    decimal AverageAiScore);

public sealed record AdminUserGrowthPointDto(
    string MonthLabel,         // "Dec", "Jan", ..., "May" — short month label for chart x-axis
    DateTime MonthStartUtc,    // first day of the month, midnight UTC
    int NewUsers,              // users whose CreatedAt falls in that month
    int CumulativeUsers);      // running total up to end of month

public sealed record AdminTrackDistributionItemDto(
    Track Track,               // FullStack / Backend / Python
    int UserCount,             // users whose latest completed Assessment is this track
    decimal Percentage);       // share of users with at least one completed assessment

public sealed record AdminTrackAiScoresDto(
    Track Track,
    decimal? Correctness,
    decimal? Readability,
    decimal? Security,
    decimal? Performance,
    decimal? Design,
    decimal? Average,          // unweighted mean of the 5 dimensions
    int SampleCount);          // number of submissions over the last-30-day window

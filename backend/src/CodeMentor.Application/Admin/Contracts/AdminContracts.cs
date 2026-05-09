using CodeMentor.Domain.Assessments;
using CodeMentor.Domain.Tasks;

namespace CodeMentor.Application.Admin.Contracts;

// ----- Tasks ---------------------------------------------------------------

public sealed record AdminTaskDto(
    Guid Id,
    string Title,
    string Description,
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
    IReadOnlyList<string>? Prerequisites);

public sealed record UpdateTaskRequest(
    string? Title,
    string? Description,
    int? Difficulty,
    SkillCategory? Category,
    Track? Track,
    ProgrammingLanguage? ExpectedLanguage,
    int? EstimatedHours,
    IReadOnlyList<string>? Prerequisites,
    bool? IsActive);

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

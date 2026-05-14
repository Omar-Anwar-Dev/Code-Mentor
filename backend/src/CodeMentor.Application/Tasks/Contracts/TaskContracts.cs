namespace CodeMentor.Application.Tasks.Contracts;

public sealed record TaskListItemDto(
    Guid Id,
    string Title,
    int Difficulty,
    string Category,
    string Track,
    string ExpectedLanguage,
    int EstimatedHours,
    IReadOnlyList<string> Prerequisites);

public sealed record TaskDetailDto(
    Guid Id,
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
    bool IsActive,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public sealed record TaskListResponse(
    int Page,
    int Size,
    int TotalCount,
    IReadOnlyList<TaskListItemDto> Items);

public sealed record TaskListFilter(
    string? Track,
    int? Difficulty,
    string? Category,
    string? Language,
    string? Search,
    int Page,
    int Size);

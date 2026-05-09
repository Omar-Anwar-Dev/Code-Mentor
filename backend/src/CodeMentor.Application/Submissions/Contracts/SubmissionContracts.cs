using CodeMentor.Domain.Submissions;

namespace CodeMentor.Application.Submissions.Contracts;

public record CreateSubmissionRequest(
    Guid TaskId,
    SubmissionType SubmissionType,
    string? RepositoryUrl,
    string? BlobPath);

public record SubmissionCreatedResponse(
    Guid SubmissionId,
    SubmissionStatus Status,
    int AttemptNumber);

public record SubmissionDto(
    Guid Id,
    Guid TaskId,
    string TaskTitle,
    SubmissionType SubmissionType,
    string? RepositoryUrl,
    string? BlobPath,
    SubmissionStatus Status,
    string? ErrorMessage,
    int AttemptNumber,
    DateTime CreatedAt,
    DateTime? StartedAt,
    DateTime? CompletedAt,
    // S10-T9 / F12: chat panel readiness gate (architecture §6.12; ADR-036).
    DateTime? MentorIndexedAt = null);

public record SubmissionListResponse(
    int Page,
    int Size,
    int TotalCount,
    IReadOnlyList<SubmissionDto> Items);

public enum SubmissionErrorCode
{
    None = 0,
    TaskNotFound,
    InvalidRequest,
    InvalidGitHubUrl,
    BlobNotFound,
    NotFound,
    NotRetryable,
}

public record SubmissionOperationResult(
    bool Success,
    SubmissionCreatedResponse? Value,
    SubmissionErrorCode ErrorCode,
    string? ErrorMessage)
{
    public static SubmissionOperationResult Ok(SubmissionCreatedResponse value)
        => new(true, value, SubmissionErrorCode.None, null);

    public static SubmissionOperationResult Error(SubmissionErrorCode code, string message)
        => new(false, null, code, message);
}

using CodeMentor.Application.Submissions.Contracts;

namespace CodeMentor.Application.Submissions;

public interface ISubmissionService
{
    Task<SubmissionOperationResult> CreateAsync(
        Guid userId,
        CreateSubmissionRequest request,
        CancellationToken ct = default);

    Task<SubmissionDto?> GetAsync(Guid userId, Guid submissionId, CancellationToken ct = default);

    Task<SubmissionListResponse> ListMineAsync(
        Guid userId,
        int page,
        int size,
        CancellationToken ct = default);

    Task<SubmissionOperationResult> RetryAsync(
        Guid userId,
        Guid submissionId,
        CancellationToken ct = default);
}

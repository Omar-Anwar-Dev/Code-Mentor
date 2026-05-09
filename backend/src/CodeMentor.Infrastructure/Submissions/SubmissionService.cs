using CodeMentor.Application.Storage;
using CodeMentor.Application.Submissions;
using CodeMentor.Application.Submissions.Contracts;
using CodeMentor.Domain.Submissions;
using CodeMentor.Domain.Tasks;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CodeMentor.Infrastructure.Submissions;

public class SubmissionService : ISubmissionService
{
    private readonly ApplicationDbContext _db;
    private readonly IBlobStorage _blobStorage;
    private readonly ISubmissionAnalysisScheduler _scheduler;

    public SubmissionService(
        ApplicationDbContext db,
        IBlobStorage blobStorage,
        ISubmissionAnalysisScheduler scheduler)
    {
        _db = db;
        _blobStorage = blobStorage;
        _scheduler = scheduler;
    }

    public async Task<SubmissionOperationResult> CreateAsync(
        Guid userId,
        CreateSubmissionRequest request,
        CancellationToken ct = default)
    {
        var validation = ValidateCreateRequest(request);
        if (validation is not null) return validation;

        var task = await _db.Tasks
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == request.TaskId && t.IsActive, ct);
        if (task is null)
            return SubmissionOperationResult.Error(
                SubmissionErrorCode.TaskNotFound,
                "Task not found or inactive.");

        if (request.SubmissionType == SubmissionType.Upload)
        {
            var exists = await _blobStorage.ExistsAsync(
                BlobContainers.Submissions, request.BlobPath!, ct);
            if (!exists)
                return SubmissionOperationResult.Error(
                    SubmissionErrorCode.BlobNotFound,
                    "Uploaded file not found. Request a new upload URL and try again.");
        }

        var attemptNumber = await _db.Submissions
            .CountAsync(s => s.UserId == userId && s.TaskId == request.TaskId, ct) + 1;

        var submission = new Submission
        {
            UserId = userId,
            TaskId = request.TaskId,
            SubmissionType = request.SubmissionType,
            RepositoryUrl = request.SubmissionType == SubmissionType.GitHub ? request.RepositoryUrl : null,
            BlobPath = request.SubmissionType == SubmissionType.Upload ? request.BlobPath : null,
            Status = SubmissionStatus.Pending,
            AttemptNumber = attemptNumber,
            CreatedAt = DateTime.UtcNow,
        };
        _db.Submissions.Add(submission);

        await ApplyPathSideEffectsAsync(userId, request.TaskId, ct);

        await _db.SaveChangesAsync(ct);

        // Enqueue the analysis job AFTER the transaction commits so the worker
        // can find the row immediately. If enqueue throws, the submission still
        // exists and can be retried via POST /submissions/{id}/retry.
        _scheduler.Schedule(submission.Id);

        return SubmissionOperationResult.Ok(new SubmissionCreatedResponse(
            submission.Id, submission.Status, submission.AttemptNumber));
    }

    public async Task<SubmissionDto?> GetAsync(Guid userId, Guid submissionId, CancellationToken ct = default)
    {
        return await _db.Submissions
            .AsNoTracking()
            .Where(s => s.Id == submissionId && s.UserId == userId)
            .Join(_db.Tasks.AsNoTracking(),
                s => s.TaskId, t => t.Id,
                (s, t) => new SubmissionDto(
                    s.Id, s.TaskId, t.Title,
                    s.SubmissionType, s.RepositoryUrl, s.BlobPath,
                    s.Status, s.ErrorMessage, s.AttemptNumber,
                    s.CreatedAt, s.StartedAt, s.CompletedAt,
                    s.MentorIndexedAt))
            .FirstOrDefaultAsync(ct);
    }

    public async Task<SubmissionListResponse> ListMineAsync(
        Guid userId,
        int page,
        int size,
        CancellationToken ct = default)
    {
        page = page < 1 ? 1 : page;
        size = size < 1 ? 20 : (size > 100 ? 100 : size);

        var baseQuery = _db.Submissions
            .AsNoTracking()
            .Where(s => s.UserId == userId);

        var total = await baseQuery.CountAsync(ct);

        var items = await baseQuery
            .OrderByDescending(s => s.CreatedAt)
            .Skip((page - 1) * size)
            .Take(size)
            .Join(_db.Tasks.AsNoTracking(),
                s => s.TaskId, t => t.Id,
                (s, t) => new SubmissionDto(
                    s.Id, s.TaskId, t.Title,
                    s.SubmissionType, s.RepositoryUrl, s.BlobPath,
                    s.Status, s.ErrorMessage, s.AttemptNumber,
                    s.CreatedAt, s.StartedAt, s.CompletedAt,
                    s.MentorIndexedAt))
            .ToListAsync(ct);

        return new SubmissionListResponse(page, size, total, items);
    }

    public async Task<SubmissionOperationResult> RetryAsync(
        Guid userId,
        Guid submissionId,
        CancellationToken ct = default)
    {
        var submission = await _db.Submissions
            .FirstOrDefaultAsync(s => s.Id == submissionId && s.UserId == userId, ct);

        if (submission is null)
            return SubmissionOperationResult.Error(
                SubmissionErrorCode.NotFound,
                "Submission not found.");

        if (submission.Status != SubmissionStatus.Failed)
            return SubmissionOperationResult.Error(
                SubmissionErrorCode.NotRetryable,
                $"Only Failed submissions can be retried. Current status: {submission.Status}.");

        submission.Status = SubmissionStatus.Pending;
        submission.ErrorMessage = null;
        submission.StartedAt = null;
        submission.CompletedAt = null;
        submission.AttemptNumber += 1;

        await _db.SaveChangesAsync(ct);

        _scheduler.Schedule(submission.Id);

        return SubmissionOperationResult.Ok(new SubmissionCreatedResponse(
            submission.Id, submission.Status, submission.AttemptNumber));
    }

    private static SubmissionOperationResult? ValidateCreateRequest(CreateSubmissionRequest request)
    {
        if (request.TaskId == Guid.Empty)
            return SubmissionOperationResult.Error(SubmissionErrorCode.InvalidRequest, "taskId is required.");

        switch (request.SubmissionType)
        {
            case SubmissionType.GitHub:
                if (string.IsNullOrWhiteSpace(request.RepositoryUrl))
                    return SubmissionOperationResult.Error(
                        SubmissionErrorCode.InvalidRequest,
                        "repositoryUrl is required when submissionType=GitHub.");
                if (!IsValidGitHubUrl(request.RepositoryUrl))
                    return SubmissionOperationResult.Error(
                        SubmissionErrorCode.InvalidGitHubUrl,
                        "repositoryUrl must be an HTTPS GitHub repo URL like https://github.com/owner/repo.");
                return null;

            case SubmissionType.Upload:
                if (string.IsNullOrWhiteSpace(request.BlobPath))
                    return SubmissionOperationResult.Error(
                        SubmissionErrorCode.InvalidRequest,
                        "blobPath is required when submissionType=Upload.");
                return null;

            default:
                return SubmissionOperationResult.Error(
                    SubmissionErrorCode.InvalidRequest,
                    "submissionType must be 'GitHub' or 'Upload'.");
        }
    }

    /// <summary>
    /// Structured path-update rules per Sprint 4 design (ADR-020):
    ///   - Task not in user's active path → no-op.
    ///   - Task in path, state NotStarted → transition to InProgress, set StartedAt.
    ///   - Task in path, state InProgress → no-op.
    ///   - Task in path, state Completed → no-op (re-submit allowed, doesn't reopen).
    /// </summary>
    private async Task ApplyPathSideEffectsAsync(Guid userId, Guid taskId, CancellationToken ct)
    {
        var pathTask = await _db.PathTasks
            .Where(pt => pt.TaskId == taskId && pt.Path!.UserId == userId && pt.Path.IsActive)
            .FirstOrDefaultAsync(ct);

        if (pathTask is null) return;
        if (pathTask.Status != PathTaskStatus.NotStarted) return;

        pathTask.Status = PathTaskStatus.InProgress;
        pathTask.StartedAt = DateTime.UtcNow;
    }

    private static bool IsValidGitHubUrl(string url)
    {
        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri)) return false;
        if (uri.Scheme != Uri.UriSchemeHttps) return false;
        if (!uri.Host.Equals("github.com", StringComparison.OrdinalIgnoreCase)) return false;
        var segments = uri.AbsolutePath.Trim('/').Split('/');
        if (segments.Length < 2) return false;
        if (string.IsNullOrWhiteSpace(segments[0]) || string.IsNullOrWhiteSpace(segments[1])) return false;
        return true;
    }
}

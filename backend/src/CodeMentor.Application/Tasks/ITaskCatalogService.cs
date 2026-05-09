using CodeMentor.Application.Tasks.Contracts;

namespace CodeMentor.Application.Tasks;

public interface ITaskCatalogService
{
    Task<TaskListResponse> ListAsync(TaskListFilter filter, CancellationToken ct = default);
    Task<TaskDetailDto?> GetByIdAsync(Guid id, CancellationToken ct = default);

    /// <summary>Drops all cached task list pages. Called from admin write paths (S3-T12 / S7-T12).</summary>
    Task InvalidateListCacheAsync(CancellationToken ct = default);
}

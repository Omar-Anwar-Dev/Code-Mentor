using CodeMentor.Application.Admin.Contracts;

namespace CodeMentor.Application.Admin;

public interface IAdminTaskService
{
    Task<PagedResult<AdminTaskDto>> ListAsync(int page, int pageSize, bool? isActive, CancellationToken ct = default);
    Task<AdminTaskDto> CreateAsync(CreateTaskRequest request, Guid actorUserId, CancellationToken ct = default);
    Task<AdminTaskDto?> UpdateAsync(Guid id, UpdateTaskRequest request, Guid actorUserId, CancellationToken ct = default);
    Task<bool> SoftDeleteAsync(Guid id, Guid actorUserId, CancellationToken ct = default);
}

public interface IAdminQuestionService
{
    Task<PagedResult<AdminQuestionDto>> ListAsync(int page, int pageSize, bool? isActive, CancellationToken ct = default);
    Task<AdminQuestionDto> CreateAsync(CreateQuestionRequest request, Guid actorUserId, CancellationToken ct = default);
    Task<AdminQuestionDto?> UpdateAsync(Guid id, UpdateQuestionRequest request, Guid actorUserId, CancellationToken ct = default);
    Task<bool> SoftDeleteAsync(Guid id, Guid actorUserId, CancellationToken ct = default);
}

public interface IAdminUserService
{
    Task<PagedResult<AdminUserDto>> ListAsync(int page, int pageSize, string? search, CancellationToken ct = default);
    Task<AdminUserDto?> UpdateAsync(Guid userId, UpdateUserRequest request, Guid actorUserId, CancellationToken ct = default);
}

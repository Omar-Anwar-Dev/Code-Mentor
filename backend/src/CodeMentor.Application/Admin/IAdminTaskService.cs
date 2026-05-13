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
    /// <param name="includeDeleted">
    /// S14-T9 / ADR-046: when false (default), soft-deleted users (in 30-day
    /// cooling-off) are hidden. Pass true to surface them for admin reporting.
    /// </param>
    Task<PagedResult<AdminUserDto>> ListAsync(int page, int pageSize, string? search, bool includeDeleted = false, CancellationToken ct = default);
    Task<AdminUserDto?> UpdateAsync(Guid userId, UpdateUserRequest request, Guid actorUserId, CancellationToken ct = default);
}

/// <summary>
/// Post-S14 follow-up: live aggregates for the admin dashboard + analytics
/// pages. Replaces the hardcoded demo data flagged by the amber banner.
/// </summary>
public interface IAdminDashboardSummaryService
{
    Task<AdminDashboardSummaryDto> GetSummaryAsync(CancellationToken ct = default);
}

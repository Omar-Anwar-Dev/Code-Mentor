using CodeMentor.Application.Admin;
using CodeMentor.Application.Admin.Contracts;
using CodeMentor.Application.Audit;
using CodeMentor.Application.Tasks;
using CodeMentor.Domain.Tasks;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CodeMentor.Infrastructure.Admin;

/// <summary>
/// S7-T9: admin Task CRUD. Soft-delete only — submissions and PathTasks
/// reference these rows by FK, so a hard delete would cascade aggressively
/// (and the demo CV's "verified projects" point at them). DELETE flips
/// <see cref="TaskItem.IsActive"/> to false and the Redis catalog cache is
/// busted via <see cref="ITaskCatalogService"/> (S7-T12 makes the bust hook
/// authoritative; the manual call here is the explicit dependency).
/// </summary>
public sealed class AdminTaskService : IAdminTaskService
{
    private readonly ApplicationDbContext _db;
    private readonly ITaskCatalogService _catalog;
    private readonly IAuditLogger _audit;

    public AdminTaskService(ApplicationDbContext db, ITaskCatalogService catalog, IAuditLogger audit)
    {
        _db = db;
        _catalog = catalog;
        _audit = audit;
    }

    public async Task<PagedResult<AdminTaskDto>> ListAsync(int page, int pageSize, bool? isActive, CancellationToken ct = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);
        IQueryable<TaskItem> q = _db.Tasks.AsNoTracking();
        if (isActive.HasValue) q = q.Where(t => t.IsActive == isActive.Value);
        var total = await q.CountAsync(ct);
        var rows = await q
            .OrderBy(t => t.Track).ThenBy(t => t.Title)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .ToListAsync(ct);
        return new PagedResult<AdminTaskDto>(rows.Select(Map).ToList(), page, pageSize, total);
    }

    public async Task<AdminTaskDto> CreateAsync(CreateTaskRequest request, Guid actorUserId, CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(request);
        var now = DateTime.UtcNow;
        var entity = new TaskItem
        {
            Title = request.Title,
            Description = request.Description,
            AcceptanceCriteria = NormalizeOptional(request.AcceptanceCriteria),
            Deliverables = NormalizeOptional(request.Deliverables),
            Difficulty = request.Difficulty,
            Category = request.Category,
            Track = request.Track,
            ExpectedLanguage = request.ExpectedLanguage,
            EstimatedHours = request.EstimatedHours,
            Prerequisites = request.Prerequisites?.ToList() ?? new List<string>(),
            CreatedBy = actorUserId,
            IsActive = true,
            CreatedAt = now,
            UpdatedAt = now,
        };
        _db.Tasks.Add(entity);
        await _db.SaveChangesAsync(ct);
        await _catalog.InvalidateListCacheAsync(ct);
        var dto = Map(entity);
        await _audit.LogAsync("CreateTask", "Task", entity.Id.ToString("N"),
            oldValue: null, newValue: dto, actorUserId, ct);
        return dto;
    }

    public async Task<AdminTaskDto?> UpdateAsync(Guid id, UpdateTaskRequest request, Guid actorUserId, CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(request);
        var entity = await _db.Tasks.FirstOrDefaultAsync(t => t.Id == id, ct);
        if (entity is null) return null;
        var before = Map(entity);

        if (request.Title is not null) entity.Title = request.Title;
        if (request.Description is not null) entity.Description = request.Description;
        if (request.AcceptanceCriteria is not null) entity.AcceptanceCriteria = NormalizeOptional(request.AcceptanceCriteria);
        if (request.Deliverables is not null) entity.Deliverables = NormalizeOptional(request.Deliverables);
        if (request.Difficulty.HasValue) entity.Difficulty = request.Difficulty.Value;
        if (request.Category.HasValue) entity.Category = request.Category.Value;
        if (request.Track.HasValue) entity.Track = request.Track.Value;
        if (request.ExpectedLanguage.HasValue) entity.ExpectedLanguage = request.ExpectedLanguage.Value;
        if (request.EstimatedHours.HasValue) entity.EstimatedHours = request.EstimatedHours.Value;
        if (request.Prerequisites is not null) entity.Prerequisites = request.Prerequisites.ToList();
        if (request.IsActive.HasValue) entity.IsActive = request.IsActive.Value;
        entity.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        await _catalog.InvalidateListCacheAsync(ct);
        var after = Map(entity);
        await _audit.LogAsync("UpdateTask", "Task", entity.Id.ToString("N"),
            oldValue: before, newValue: after, actorUserId, ct);
        return after;
    }

    public async Task<bool> SoftDeleteAsync(Guid id, Guid actorUserId, CancellationToken ct = default)
    {
        var entity = await _db.Tasks.FirstOrDefaultAsync(t => t.Id == id, ct);
        if (entity is null) return false;
        if (!entity.IsActive) return true; // idempotent
        var before = Map(entity);

        entity.IsActive = false;
        entity.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        await _catalog.InvalidateListCacheAsync(ct);
        await _audit.LogAsync("SoftDeleteTask", "Task", entity.Id.ToString("N"),
            oldValue: before, newValue: Map(entity), actorUserId, ct);
        return true;
    }

    private static AdminTaskDto Map(TaskItem t) => new(
        t.Id, t.Title, t.Description,
        t.AcceptanceCriteria, t.Deliverables,
        t.Difficulty, t.Category, t.Track,
        t.ExpectedLanguage, t.EstimatedHours, t.Prerequisites, t.IsActive,
        t.CreatedAt, t.UpdatedAt);

    private static string? NormalizeOptional(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}

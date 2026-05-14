using CodeMentor.Application.Tasks;
using CodeMentor.Application.Tasks.Contracts;
using CodeMentor.Domain.Assessments;
using CodeMentor.Domain.Tasks;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CodeMentor.Infrastructure.Tasks;

public sealed class TaskCatalogService : ITaskCatalogService
{
    public const int DefaultPageSize = 20;
    public const int MaxPageSize = 100;

    private readonly ApplicationDbContext _db;

    public TaskCatalogService(ApplicationDbContext db) => _db = db;

    public async Task<TaskListResponse> ListAsync(TaskListFilter filter, CancellationToken ct = default)
    {
        var page = Math.Max(1, filter.Page);
        var size = Math.Clamp(filter.Size <= 0 ? DefaultPageSize : filter.Size, 1, MaxPageSize);

        IQueryable<TaskItem> query = _db.Tasks.AsNoTracking().Where(t => t.IsActive);

        if (!string.IsNullOrWhiteSpace(filter.Track)
            && Enum.TryParse<Track>(filter.Track, ignoreCase: true, out var track))
            query = query.Where(t => t.Track == track);

        if (filter.Difficulty is int d && d is >= 1 and <= 5)
            query = query.Where(t => t.Difficulty == d);

        if (!string.IsNullOrWhiteSpace(filter.Category)
            && Enum.TryParse<SkillCategory>(filter.Category, ignoreCase: true, out var category))
            query = query.Where(t => t.Category == category);

        if (!string.IsNullOrWhiteSpace(filter.Language)
            && Enum.TryParse<ProgrammingLanguage>(filter.Language, ignoreCase: true, out var lang))
            query = query.Where(t => t.ExpectedLanguage == lang);

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            // SBF-1 / B5: broaden search to Title OR Description so learners can
            // find a task by topic keywords ("REST API", "binary search") even
            // when the title is generic ("Implement the algorithm").
            var needle = filter.Search.Trim();
            var pattern = $"%{needle}%";
            query = query.Where(t =>
                EF.Functions.Like(t.Title, pattern) ||
                EF.Functions.Like(t.Description, pattern));
        }

        var total = await query.CountAsync(ct);

        var items = await query
            .OrderBy(t => t.Track)
            .ThenBy(t => t.Difficulty)
            .ThenBy(t => t.Title)
            .Skip((page - 1) * size)
            .Take(size)
            .Select(t => new TaskListItemDto(
                t.Id, t.Title, t.Difficulty,
                t.Category.ToString(), t.Track.ToString(),
                t.ExpectedLanguage.ToString(), t.EstimatedHours,
                t.Prerequisites))
            .ToListAsync(ct);

        return new TaskListResponse(page, size, total, items);
    }

    public async Task<TaskDetailDto?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var task = await _db.Tasks.AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == id, ct);

        if (task is null) return null;

        return new TaskDetailDto(
            task.Id, task.Title, task.Description,
            task.AcceptanceCriteria, task.Deliverables,
            task.Difficulty, task.Category.ToString(),
            task.Track.ToString(), task.ExpectedLanguage.ToString(),
            task.EstimatedHours, task.Prerequisites,
            task.IsActive, task.CreatedAt, task.UpdatedAt);
    }

    public Task InvalidateListCacheAsync(CancellationToken ct = default) => Task.CompletedTask;
}

using CodeMentor.Application.Admin;
using CodeMentor.Application.Admin.Contracts;
using CodeMentor.Application.Audit;
using CodeMentor.Domain.Assessments;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CodeMentor.Infrastructure.Admin;

/// <summary>
/// S7-T9: admin Question CRUD. Like tasks, questions are soft-deleted via
/// <see cref="Question.IsActive"/> so prior <c>AssessmentResponse</c> rows
/// (which FK Restrict onto Question.Id) keep their answer history intact.
/// </summary>
public sealed class AdminQuestionService : IAdminQuestionService
{
    private readonly ApplicationDbContext _db;
    private readonly IAuditLogger _audit;

    public AdminQuestionService(ApplicationDbContext db, IAuditLogger audit)
    {
        _db = db;
        _audit = audit;
    }

    public async Task<PagedResult<AdminQuestionDto>> ListAsync(int page, int pageSize, bool? isActive, CancellationToken ct = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);
        IQueryable<Question> q = _db.Questions.AsNoTracking();
        if (isActive.HasValue) q = q.Where(qq => qq.IsActive == isActive.Value);
        var total = await q.CountAsync(ct);
        var rows = await q
            .OrderBy(qq => qq.Category).ThenBy(qq => qq.Difficulty)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .ToListAsync(ct);
        return new PagedResult<AdminQuestionDto>(rows.Select(Map).ToList(), page, pageSize, total);
    }

    public async Task<AdminQuestionDto> CreateAsync(CreateQuestionRequest request, Guid actorUserId, CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(request);
        ValidateOptionsAndAnswer(request.Options, request.CorrectAnswer);

        var entity = new Question
        {
            Content = request.Content,
            Difficulty = Math.Clamp(request.Difficulty, 1, 3),
            Category = request.Category,
            Options = request.Options.ToList(),
            CorrectAnswer = request.CorrectAnswer,
            Explanation = request.Explanation,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
        };
        _db.Questions.Add(entity);
        await _db.SaveChangesAsync(ct);
        var dto = Map(entity);
        await _audit.LogAsync("CreateQuestion", "Question", entity.Id.ToString("N"),
            oldValue: null, newValue: dto, actorUserId, ct);
        return dto;
    }

    public async Task<AdminQuestionDto?> UpdateAsync(Guid id, UpdateQuestionRequest request, Guid actorUserId, CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(request);
        var entity = await _db.Questions.FirstOrDefaultAsync(q => q.Id == id, ct);
        if (entity is null) return null;
        var before = Map(entity);

        if (request.Content is not null) entity.Content = request.Content;
        if (request.Difficulty.HasValue) entity.Difficulty = Math.Clamp(request.Difficulty.Value, 1, 3);
        if (request.Category.HasValue) entity.Category = request.Category.Value;
        if (request.Options is not null) entity.Options = request.Options.ToList();
        if (request.CorrectAnswer is not null) entity.CorrectAnswer = request.CorrectAnswer;
        if (request.Explanation is not null) entity.Explanation = request.Explanation;
        if (request.IsActive.HasValue) entity.IsActive = request.IsActive.Value;

        // Validate the resulting state — partial updates may have left options
        // and CorrectAnswer mutually inconsistent.
        ValidateOptionsAndAnswer(entity.Options, entity.CorrectAnswer);

        await _db.SaveChangesAsync(ct);
        var after = Map(entity);
        await _audit.LogAsync("UpdateQuestion", "Question", entity.Id.ToString("N"),
            oldValue: before, newValue: after, actorUserId, ct);
        return after;
    }

    public async Task<bool> SoftDeleteAsync(Guid id, Guid actorUserId, CancellationToken ct = default)
    {
        var entity = await _db.Questions.FirstOrDefaultAsync(q => q.Id == id, ct);
        if (entity is null) return false;
        if (!entity.IsActive) return true; // idempotent
        var before = Map(entity);
        entity.IsActive = false;
        await _db.SaveChangesAsync(ct);
        await _audit.LogAsync("SoftDeleteQuestion", "Question", entity.Id.ToString("N"),
            oldValue: before, newValue: Map(entity), actorUserId, ct);
        return true;
    }

    private static void ValidateOptionsAndAnswer(IReadOnlyList<string> options, string correctAnswer)
    {
        if (options is null || options.Count != 4)
            throw new ArgumentException("Question must have exactly 4 options.", nameof(options));
        if (string.IsNullOrWhiteSpace(correctAnswer)
            || correctAnswer.Length != 1
            || correctAnswer[0] is not (>= 'A' and <= 'D'))
            throw new ArgumentException("CorrectAnswer must be one of 'A', 'B', 'C', 'D'.", nameof(correctAnswer));
    }

    private static AdminQuestionDto Map(Question q) => new(
        q.Id, q.Content, q.Difficulty, q.Category, q.Options,
        q.CorrectAnswer, q.Explanation, q.IsActive, q.CreatedAt);
}

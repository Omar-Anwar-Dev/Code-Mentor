using CodeMentor.Application.LearningPaths;
using CodeMentor.Domain.Tasks;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CodeMentor.Infrastructure.LearningPaths;

/// <summary>
/// S20-T3 / F16 (ADR-053): EF-backed read implementation of
/// <see cref="IPathAdaptationEventRepository"/>. All queries use
/// <c>AsNoTracking</c> — the writes are owned by
/// <c>PathAdaptationJob</c> + the respond endpoint, which fetch via the
/// tracked path explicitly when they need to mutate.
/// </summary>
public sealed class PathAdaptationEventRepository : IPathAdaptationEventRepository
{
    private readonly ApplicationDbContext _db;

    public PathAdaptationEventRepository(ApplicationDbContext db) => _db = db;

    public async Task<IReadOnlyList<PathAdaptationEvent>> GetPendingForUserAsync(
        Guid userId, CancellationToken ct = default)
    {
        return await _db.PathAdaptationEvents
            .AsNoTracking()
            .Where(e => e.UserId == userId && e.LearnerDecision == PathAdaptationDecision.Pending)
            .OrderByDescending(e => e.TriggeredAt)
            .ToListAsync(ct);
    }

    public async Task<IReadOnlyList<PathAdaptationEvent>> GetTimelineForPathAsync(
        Guid pathId, CancellationToken ct = default)
    {
        return await _db.PathAdaptationEvents
            .AsNoTracking()
            .Where(e => e.PathId == pathId)
            .OrderByDescending(e => e.TriggeredAt)
            .ToListAsync(ct);
    }

    public async Task<IReadOnlyList<PathAdaptationEvent>> GetRecentAsync(
        int take, CancellationToken ct = default)
    {
        if (take <= 0) take = 50;
        return await _db.PathAdaptationEvents
            .AsNoTracking()
            .OrderByDescending(e => e.TriggeredAt)
            .Take(take)
            .ToListAsync(ct);
    }

    public async Task<PathAdaptationEvent?> GetByIdForUserAsync(
        Guid eventId, Guid userId, CancellationToken ct = default)
    {
        return await _db.PathAdaptationEvents
            .AsNoTracking()
            .FirstOrDefaultAsync(e => e.Id == eventId && e.UserId == userId, ct);
    }

    public async Task<PathAdaptationEvent?> GetByIdempotencyKeyAsync(
        string idempotencyKey, CancellationToken ct = default)
    {
        return await _db.PathAdaptationEvents
            .AsNoTracking()
            .FirstOrDefaultAsync(e => e.IdempotencyKey == idempotencyKey, ct);
    }
}

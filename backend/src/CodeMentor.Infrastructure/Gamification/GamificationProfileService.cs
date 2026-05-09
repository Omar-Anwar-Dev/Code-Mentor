using CodeMentor.Application.Gamification;
using CodeMentor.Application.Gamification.Contracts;
using CodeMentor.Domain.Gamification;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CodeMentor.Infrastructure.Gamification;

public sealed class GamificationProfileService : IGamificationProfileService
{
    private const int RecentTransactionsTake = 20;

    private readonly ApplicationDbContext _db;
    private readonly IXpService _xp;

    public GamificationProfileService(ApplicationDbContext db, IXpService xp)
    {
        _db = db;
        _xp = xp;
    }

    public async Task<GamificationProfileDto> GetMineAsync(Guid userId, CancellationToken ct = default)
    {
        var totalXp = await _xp.GetTotalAsync(userId, ct);
        var level = LevelFormula.LevelFor(totalXp);

        var earned = await _db.Set<UserBadge>().AsNoTracking()
            .Where(ub => ub.UserId == userId)
            .OrderByDescending(ub => ub.EarnedAt)
            .Join(_db.Set<Badge>().AsNoTracking(),
                ub => ub.BadgeId, b => b.Id,
                (ub, b) => new EarnedBadgeDto(
                    b.Key, b.Name, b.Description, b.IconUrl, b.Category, ub.EarnedAt))
            .ToListAsync(ct);

        var recent = await _db.Set<XpTransaction>().AsNoTracking()
            .Where(t => t.UserId == userId)
            .OrderByDescending(t => t.CreatedAt)
            .Take(RecentTransactionsTake)
            .Select(t => new XpTransactionDto(t.Amount, t.Reason, t.RelatedEntityId, t.CreatedAt))
            .ToListAsync(ct);

        return new GamificationProfileDto(
            TotalXp: totalXp,
            Level: level,
            XpForCurrentLevel: LevelFormula.XpForLevel(level),
            XpForNextLevel: LevelFormula.XpForLevel(level + 1),
            EarnedBadges: earned,
            RecentTransactions: recent);
    }

    public async Task<BadgeCatalogDto> GetCatalogAsync(Guid userId, CancellationToken ct = default)
    {
        var earnedByKey = await _db.Set<UserBadge>().AsNoTracking()
            .Where(ub => ub.UserId == userId)
            .Join(_db.Set<Badge>().AsNoTracking(),
                ub => ub.BadgeId, b => b.Id,
                (ub, b) => new { b.Key, ub.EarnedAt })
            .ToDictionaryAsync(x => x.Key, x => x.EarnedAt, ct);

        var catalog = await _db.Set<Badge>().AsNoTracking()
            .OrderBy(b => b.Category).ThenBy(b => b.Name)
            .ToListAsync(ct);

        var rows = catalog.Select(b =>
        {
            var earned = earnedByKey.TryGetValue(b.Key, out var at);
            return new CatalogBadgeDto(b.Key, b.Name, b.Description, b.IconUrl, b.Category,
                IsEarned: earned, EarnedAt: earned ? at : null);
        }).ToList();

        return new BadgeCatalogDto(rows);
    }
}

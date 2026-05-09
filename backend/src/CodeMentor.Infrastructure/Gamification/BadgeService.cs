using CodeMentor.Application.Gamification;
using CodeMentor.Domain.Gamification;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace CodeMentor.Infrastructure.Gamification;

public sealed class BadgeService : IBadgeService
{
    private readonly ApplicationDbContext _db;
    private readonly ILogger<BadgeService> _logger;

    public BadgeService(ApplicationDbContext db, ILogger<BadgeService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<bool> AwardIfEligibleAsync(
        Guid userId, string badgeKey, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(badgeKey))
            throw new ArgumentException("Badge key is required.", nameof(badgeKey));

        var badge = await _db.Set<Badge>().AsNoTracking()
            .FirstOrDefaultAsync(b => b.Key == badgeKey, ct)
            ?? throw new InvalidOperationException(
                $"Badge with key '{badgeKey}' not found. Was BadgeSeedData applied?");

        var alreadyHas = await _db.Set<UserBadge>().AsNoTracking()
            .AnyAsync(ub => ub.UserId == userId && ub.BadgeId == badge.Id, ct);
        if (alreadyHas) return false;

        _db.Set<UserBadge>().Add(new UserBadge
        {
            UserId = userId,
            BadgeId = badge.Id,
            EarnedAt = DateTime.UtcNow,
        });
        try
        {
            await _db.SaveChangesAsync(ct);
            _logger.LogInformation(
                "Badge awarded: user={UserId} key={Key}", userId, badgeKey);
            return true;
        }
        catch (DbUpdateException)
        {
            // Race: another concurrent caller awarded the same badge between
            // our check and write. Unique index caught it — treat as already-awarded.
            return false;
        }
    }
}

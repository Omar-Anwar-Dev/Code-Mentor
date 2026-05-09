using CodeMentor.Application.Gamification;
using CodeMentor.Domain.Gamification;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace CodeMentor.Infrastructure.Gamification;

public sealed class XpService : IXpService
{
    private readonly ApplicationDbContext _db;
    private readonly ILogger<XpService> _logger;

    public XpService(ApplicationDbContext db, ILogger<XpService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<int> AwardAsync(
        Guid userId,
        int amount,
        string reason,
        Guid? relatedEntityId,
        CancellationToken ct = default)
    {
        if (amount <= 0)
            throw new ArgumentOutOfRangeException(nameof(amount), "XP awards must be positive.");
        if (string.IsNullOrWhiteSpace(reason))
            throw new ArgumentException("Reason is required.", nameof(reason));

        _db.Set<XpTransaction>().Add(new XpTransaction
        {
            UserId = userId,
            Amount = amount,
            Reason = reason,
            RelatedEntityId = relatedEntityId,
            CreatedAt = DateTime.UtcNow,
        });
        await _db.SaveChangesAsync(ct);

        var total = await GetTotalAsync(userId, ct);
        _logger.LogInformation(
            "XP awarded: user={UserId} amount={Amount} reason={Reason} total={Total}",
            userId, amount, reason, total);
        return total;
    }

    public async Task<int> GetTotalAsync(Guid userId, CancellationToken ct = default)
    {
        var sum = await _db.Set<XpTransaction>().AsNoTracking()
            .Where(t => t.UserId == userId)
            .SumAsync(t => (int?)t.Amount, ct);
        return sum ?? 0;
    }
}

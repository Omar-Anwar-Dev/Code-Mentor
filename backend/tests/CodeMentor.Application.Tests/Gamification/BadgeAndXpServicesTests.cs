using CodeMentor.Domain.Gamification;
using CodeMentor.Infrastructure.Gamification;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace CodeMentor.Application.Tests.Gamification;

/// <summary>
/// S8-T3 unit tests:
///  - XpService: positive amount accumulates; total = sum of transactions.
///  - XpService: rejects non-positive and missing reason.
///  - BadgeService: first call awards; second call is no-op.
///  - BadgeService: unknown key throws.
/// </summary>
public class BadgeAndXpServicesTests
{
    private static ApplicationDbContext NewDb()
    {
        var db = new ApplicationDbContext(
            new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase($"gamif_{Guid.NewGuid():N}")
                .Options);
        BadgeSeedData.SeedAsync(db).GetAwaiter().GetResult();
        return db;
    }

    private static XpService NewXp(ApplicationDbContext db) =>
        new(db, NullLogger<XpService>.Instance);

    private static BadgeService NewBadges(ApplicationDbContext db) =>
        new(db, NullLogger<BadgeService>.Instance);

    [Fact]
    public async Task AwardAsync_Accumulates_Across_Multiple_Awards()
    {
        using var db = NewDb();
        var xp = NewXp(db);
        var user = Guid.NewGuid();

        var t1 = await xp.AwardAsync(user, 100, XpReasons.AssessmentCompleted, null, default);
        var t2 = await xp.AwardAsync(user, 50, XpReasons.SubmissionAccepted, null, default);
        var t3 = await xp.AwardAsync(user, 50, XpReasons.SubmissionAccepted, null, default);

        Assert.Equal(100, t1);
        Assert.Equal(150, t2);
        Assert.Equal(200, t3);
        Assert.Equal(200, await xp.GetTotalAsync(user));
        Assert.Equal(3, await db.XpTransactions.CountAsync(x => x.UserId == user));
    }

    [Fact]
    public async Task AwardAsync_RejectsNonPositive()
    {
        using var db = NewDb();
        var xp = NewXp(db);
        await Assert.ThrowsAsync<ArgumentOutOfRangeException>(
            () => xp.AwardAsync(Guid.NewGuid(), 0, "x", null));
        await Assert.ThrowsAsync<ArgumentOutOfRangeException>(
            () => xp.AwardAsync(Guid.NewGuid(), -5, "x", null));
    }

    [Fact]
    public async Task AwardAsync_RejectsEmptyReason()
    {
        using var db = NewDb();
        var xp = NewXp(db);
        await Assert.ThrowsAsync<ArgumentException>(
            () => xp.AwardAsync(Guid.NewGuid(), 10, "", null));
    }

    [Fact]
    public async Task GetTotalAsync_NoTransactions_ReturnsZero()
    {
        using var db = NewDb();
        var xp = NewXp(db);
        Assert.Equal(0, await xp.GetTotalAsync(Guid.NewGuid()));
    }

    [Fact]
    public async Task BadgeService_FirstAward_Returns_True_SecondReturns_False()
    {
        using var db = NewDb();
        var badges = NewBadges(db);
        var user = Guid.NewGuid();

        var first = await badges.AwardIfEligibleAsync(user, BadgeKeys.FirstSubmission);
        var second = await badges.AwardIfEligibleAsync(user, BadgeKeys.FirstSubmission);

        Assert.True(first);
        Assert.False(second);
        Assert.Equal(1, await db.UserBadges.CountAsync(ub => ub.UserId == user));
    }

    [Fact]
    public async Task BadgeService_Two_Different_Users_Each_Earn()
    {
        using var db = NewDb();
        var badges = NewBadges(db);
        var user1 = Guid.NewGuid();
        var user2 = Guid.NewGuid();

        Assert.True(await badges.AwardIfEligibleAsync(user1, BadgeKeys.HighQualitySubmission));
        Assert.True(await badges.AwardIfEligibleAsync(user2, BadgeKeys.HighQualitySubmission));
        Assert.Equal(2, await db.UserBadges.CountAsync());
    }

    [Fact]
    public async Task BadgeService_UnknownKey_Throws()
    {
        using var db = NewDb();
        var badges = NewBadges(db);
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => badges.AwardIfEligibleAsync(Guid.NewGuid(), "no-such-badge"));
    }

    [Fact]
    public async Task BadgeService_EmptyKey_Throws()
    {
        using var db = NewDb();
        var badges = NewBadges(db);
        await Assert.ThrowsAsync<ArgumentException>(
            () => badges.AwardIfEligibleAsync(Guid.NewGuid(), ""));
    }
}

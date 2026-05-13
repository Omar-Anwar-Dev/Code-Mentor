using CodeMentor.Application.LearningCV.Contracts;
using CodeMentor.Domain.Gamification;
using CodeMentor.Infrastructure.Gamification;
using CodeMentor.Infrastructure.Identity;
using CodeMentor.Infrastructure.LearningCV;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;

namespace CodeMentor.Application.Tests.LearningCV;

/// <summary>
/// S14-T6 / ADR-046 acceptance — three privacy toggles on UserSettings:
/// <list type="bullet">
///   <item><c>PublicCvDefault</c> applied at first CV creation only
///   (existing CVs unaffected).</item>
///   <item><c>ProfileDiscoverable</c> kill-switches the
///   <c>/api/public/cv/{slug}</c> endpoint, returning 404 even for explicitly-public CVs.</item>
///   <item><c>ShowInLeaderboard</c> persisted-only in MVP (no consumer yet).
///   Covered by T1's UserSettings entity round-trip — no separate T6 test.</item>
/// </list>
/// Owner's own GetMine is unaffected by ProfileDiscoverable (the kill switch
/// is for the public surface, not the user's own dashboard).
/// </summary>
public class LearningCVPrivacyTogglesTests
{
    private static (LearningCVService Service, ApplicationDbContext Db, ApplicationUser User) NewSubject()
    {
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddDbContext<ApplicationDbContext>(opts =>
            opts.UseInMemoryDatabase($"cv_privacy_{Guid.NewGuid():N}"));
        services.AddIdentityCore<ApplicationUser>()
            .AddRoles<ApplicationRole>()
            .AddEntityFrameworkStores<ApplicationDbContext>();
        var sp = services.BuildServiceProvider();

        var db = sp.GetRequiredService<ApplicationDbContext>();
        var users = sp.GetRequiredService<UserManager<ApplicationUser>>();

        var user = new ApplicationUser
        {
            UserName = $"privacy-{Guid.NewGuid():N}@test.local",
            Email = $"privacy-{Guid.NewGuid():N}@test.local",
            FullName = "Privacy Tester",
        };
        users.CreateAsync(user, "Strong_Pass_123!").GetAwaiter().GetResult();

        // Seed minimum-viable supporting rows so BuildAsync doesn't throw on null assessment data.
        // (LearningCVPrivacyTogglesTests focus on the CV row's privacy fields, not the aggregated DTO content.)

        var badges = new BadgeService(db, NullLogger<BadgeService>.Instance);
        // Seed the FirstLearningCVGenerated badge so AwardIfEligibleAsync has a row to match.
        db.Badges.Add(new Badge
        {
            Key = BadgeKeys.FirstLearningCVGenerated,
            Name = "First Learning CV",
            Description = "Published your first public CV.",
            Category = "cv",
        });
        db.SaveChanges();

        var service = new LearningCVService(db, users, badges);
        return (service, db, user);
    }

    // ====== PublicCvDefault on new CV ======

    [Fact]
    public async Task GetMine_NewUser_NoUserSettings_CreatesPrivateCv()
    {
        var (svc, db, user) = NewSubject();

        await svc.GetMineAsync(user.Id);

        var cv = await db.LearningCVs.AsNoTracking().SingleAsync();
        Assert.False(cv.IsPublic);
        Assert.Null(cv.PublicSlug);
    }

    [Fact]
    public async Task GetMine_NewUser_PublicCvDefaultFalse_CreatesPrivateCv()
    {
        var (svc, db, user) = NewSubject();
        db.UserSettings.Add(new Domain.Users.UserSettings { UserId = user.Id, PublicCvDefault = false });
        await db.SaveChangesAsync();

        await svc.GetMineAsync(user.Id);

        var cv = await db.LearningCVs.AsNoTracking().SingleAsync();
        Assert.False(cv.IsPublic);
        Assert.Null(cv.PublicSlug);
    }

    [Fact]
    public async Task GetMine_NewUser_PublicCvDefaultTrue_CreatesPublicCvWithSlug()
    {
        var (svc, db, user) = NewSubject();
        db.UserSettings.Add(new Domain.Users.UserSettings { UserId = user.Id, PublicCvDefault = true });
        await db.SaveChangesAsync();

        await svc.GetMineAsync(user.Id);

        var cv = await db.LearningCVs.AsNoTracking().SingleAsync();
        Assert.True(cv.IsPublic);
        Assert.False(string.IsNullOrEmpty(cv.PublicSlug));
    }

    [Fact]
    public async Task GetMine_NewUser_PublicCvDefaultTrue_AwardsFirstCvBadge()
    {
        var (svc, db, user) = NewSubject();
        db.UserSettings.Add(new Domain.Users.UserSettings { UserId = user.Id, PublicCvDefault = true });
        await db.SaveChangesAsync();

        await svc.GetMineAsync(user.Id);

        // Mirrors UpdateMineAsync's "first publish" badge behavior — see LearningCVService comments.
        var userBadge = await db.UserBadges.AsNoTracking()
            .Include(ub => ub.Badge)
            .FirstOrDefaultAsync(ub => ub.UserId == user.Id);
        Assert.NotNull(userBadge);
        Assert.Equal(BadgeKeys.FirstLearningCVGenerated, userBadge!.Badge!.Key);
    }

    [Fact]
    public async Task GetMine_OnSecondCall_DoesNotRecreateCv_WhenSettingsChange()
    {
        // PublicCvDefault applies ONCE at creation. Flipping the setting later doesn't
        // retroactively flip an existing CV's IsPublic. The explicit UpdateMineAsync path
        // is the only way to toggle an existing CV's IsPublic.
        var (svc, db, user) = NewSubject();
        // First call: no settings → private CV created.
        await svc.GetMineAsync(user.Id);

        // Now flip the setting on.
        db.UserSettings.Add(new Domain.Users.UserSettings { UserId = user.Id, PublicCvDefault = true });
        await db.SaveChangesAsync();

        // Second call: existing private CV stays private.
        await svc.GetMineAsync(user.Id);

        var cv = await db.LearningCVs.AsNoTracking().SingleAsync();
        Assert.False(cv.IsPublic);
        Assert.Null(cv.PublicSlug);
    }

    // ====== ProfileDiscoverable kill switch on public CV ======

    [Fact]
    public async Task GetPublic_ProfileDiscoverableFalse_Returns404EvenForPublicCv()
    {
        var (svc, db, user) = NewSubject();
        db.UserSettings.Add(new Domain.Users.UserSettings { UserId = user.Id, ProfileDiscoverable = false });
        db.LearningCVs.Add(new Domain.LearningCV.LearningCV
        {
            UserId = user.Id,
            IsPublic = true,
            PublicSlug = "killable-user",
        });
        await db.SaveChangesAsync();

        var dto = await svc.GetPublicAsync("killable-user", ipAddress: "1.2.3.4");

        Assert.Null(dto);
    }

    [Fact]
    public async Task GetPublic_ProfileDiscoverableTrue_ReturnsCv()
    {
        var (svc, db, user) = NewSubject();
        db.UserSettings.Add(new Domain.Users.UserSettings { UserId = user.Id, ProfileDiscoverable = true });
        db.LearningCVs.Add(new Domain.LearningCV.LearningCV
        {
            UserId = user.Id,
            IsPublic = true,
            PublicSlug = "discoverable-user",
        });
        await db.SaveChangesAsync();

        var dto = await svc.GetPublicAsync("discoverable-user", ipAddress: "1.2.3.4");

        Assert.NotNull(dto);
    }

    [Fact]
    public async Task GetPublic_NoSettingsRow_ReturnsCv()
    {
        // Existing CVs that pre-date the UserSettings rollout aren't surprise-hidden.
        // No settings row → treat as ProfileDiscoverable=true (default-on).
        var (svc, db, user) = NewSubject();
        db.LearningCVs.Add(new Domain.LearningCV.LearningCV
        {
            UserId = user.Id,
            IsPublic = true,
            PublicSlug = "legacy-user",
        });
        await db.SaveChangesAsync();

        var dto = await svc.GetPublicAsync("legacy-user", ipAddress: "1.2.3.4");

        Assert.NotNull(dto);
    }

    [Fact]
    public async Task ProfileDiscoverableFalse_DoesNotAffectOwnersGetMine()
    {
        // The kill switch is for the PUBLIC surface only — the owner can still load
        // their own CV via /api/learning-cv/me regardless of ProfileDiscoverable.
        var (svc, db, user) = NewSubject();
        db.UserSettings.Add(new Domain.Users.UserSettings { UserId = user.Id, ProfileDiscoverable = false });
        await db.SaveChangesAsync();

        var dto = await svc.GetMineAsync(user.Id);

        Assert.NotNull(dto);
    }
}

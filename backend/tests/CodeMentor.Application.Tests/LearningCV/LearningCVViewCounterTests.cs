using CodeMentor.Application.LearningCV.Contracts;
using CodeMentor.Domain.LearningCV;
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
/// S7-T4 acceptance: view counter increments at most once per IP per 24h.
///   - Different IPs → counter increments.
///   - Same IP within 24h → counter does not increment.
///   - Same IP after 24h → counter increments again (dedupe row "expires").
///   - Null/empty IP → no increment.
///   - Private CV → null (404 at the controller).
/// Uses the production service with EF InMemory + a stub UserManager.
/// </summary>
public class LearningCVViewCounterTests
{
    private static (LearningCVService Service, ApplicationDbContext Db, ApplicationUser User, Domain.LearningCV.LearningCV Cv) NewSubject(
        bool isPublic = true)
    {
        // Build a self-contained DI graph with EF InMemory + a UserManager backed
        // by the same DbContext so FindByIdAsync returns the seeded user.
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddDbContext<ApplicationDbContext>(opts =>
            opts.UseInMemoryDatabase($"cv_view_{Guid.NewGuid():N}"));
        services.AddIdentityCore<ApplicationUser>()
            .AddRoles<ApplicationRole>()
            .AddEntityFrameworkStores<ApplicationDbContext>();
        var sp = services.BuildServiceProvider();

        var db = sp.GetRequiredService<ApplicationDbContext>();
        var users = sp.GetRequiredService<UserManager<ApplicationUser>>();

        var user = new ApplicationUser
        {
            UserName = "viewer@cv.test",
            Email = "viewer@cv.test",
            FullName = "Viewer",
        };
        var createResult = users.CreateAsync(user, "Strong_Pass_123!").GetAwaiter().GetResult();
        Assert.True(createResult.Succeeded);

        var cv = new Domain.LearningCV.LearningCV
        {
            UserId = user.Id,
            PublicSlug = "viewer",
            IsPublic = isPublic,
        };
        db.LearningCVs.Add(cv);
        db.SaveChanges();

        var badges = new BadgeService(db, NullLogger<BadgeService>.Instance);
        return (new LearningCVService(db, users, badges), db, user, cv);
    }

    [Fact]
    public async Task GetPublic_DifferentIps_BothIncrementCounter()
    {
        var (svc, db, _, cv) = NewSubject();

        await svc.GetPublicAsync("viewer", "10.0.0.1");
        await svc.GetPublicAsync("viewer", "10.0.0.2");

        var reloaded = await db.LearningCVs.AsNoTracking().FirstAsync(c => c.Id == cv.Id);
        Assert.Equal(2, reloaded.ViewCount);
        Assert.Equal(2, db.LearningCVViews.AsNoTracking().Count());
    }

    [Fact]
    public async Task GetPublic_SameIp_TwoCalls_OnlyOneIncrement()
    {
        var (svc, db, _, cv) = NewSubject();

        await svc.GetPublicAsync("viewer", "10.0.0.5");
        await svc.GetPublicAsync("viewer", "10.0.0.5");

        var reloaded = await db.LearningCVs.AsNoTracking().FirstAsync(c => c.Id == cv.Id);
        Assert.Equal(1, reloaded.ViewCount);
    }

    [Fact]
    public async Task GetPublic_SameIp_AfterExpiry_IncrementsAgain()
    {
        var (svc, db, _, cv) = NewSubject();

        // Manually backdate a dedupe row past the 24h window — fresh hit should re-count.
        var oldHash = SeedExpiredView(db, cv.Id, "10.0.0.7");
        Assert.NotNull(oldHash);

        await svc.GetPublicAsync("viewer", "10.0.0.7");

        var reloaded = await db.LearningCVs.AsNoTracking().FirstAsync(c => c.Id == cv.Id);
        Assert.Equal(1, reloaded.ViewCount);
        // The new in-window row + the old expired row both exist for the same IP.
        Assert.Equal(2, db.LearningCVViews.AsNoTracking().Count(v => v.CVId == cv.Id));
    }

    [Fact]
    public async Task GetPublic_NullOrEmptyIp_NoIncrement()
    {
        var (svc, db, _, cv) = NewSubject();

        await svc.GetPublicAsync("viewer", null);
        await svc.GetPublicAsync("viewer", "   ");

        var reloaded = await db.LearningCVs.AsNoTracking().FirstAsync(c => c.Id == cv.Id);
        Assert.Equal(0, reloaded.ViewCount);
        Assert.Empty(db.LearningCVViews.AsNoTracking());
    }

    [Fact]
    public async Task GetPublic_PrivateCv_ReturnsNull_NoIncrement()
    {
        var (svc, db, _, cv) = NewSubject(isPublic: false);

        var result = await svc.GetPublicAsync("viewer", "10.0.0.9");

        Assert.Null(result);
        var reloaded = await db.LearningCVs.AsNoTracking().FirstAsync(c => c.Id == cv.Id);
        Assert.Equal(0, reloaded.ViewCount);
    }

    [Fact]
    public async Task GetPublic_RedactsEmail()
    {
        var (svc, _, user, _) = NewSubject();

        var result = await svc.GetPublicAsync("viewer", "10.0.0.10");

        Assert.NotNull(result);
        Assert.Equal(user.Id, result!.Profile.UserId);
        Assert.Null(result.Profile.Email);
    }

    private static string SeedExpiredView(ApplicationDbContext db, Guid cvId, string ipAddress)
    {
        // SHA-256 the IP exactly as the production code does so the dedupe matches
        // by hash on the next request.
        var hash = Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(
            System.Text.Encoding.UTF8.GetBytes(ipAddress)));
        db.LearningCVViews.Add(new LearningCVView
        {
            CVId = cvId,
            IpAddressHash = hash,
            ViewedAt = DateTime.UtcNow.AddHours(-25), // 1h past the 24h window
        });
        db.SaveChanges();
        return hash;
    }
}

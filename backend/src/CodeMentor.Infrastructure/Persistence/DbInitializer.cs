using CodeMentor.Infrastructure.Identity;
using CodeMentor.Infrastructure.Persistence.Seeds;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace CodeMentor.Infrastructure.Persistence;

public static class DbInitializer
{
    // Dev-only default admin. DO NOT rely on in production — use env-driven bootstrap instead.
    public const string DevAdminEmail = "admin@codementor.local";
    public const string DevAdminPassword = "Admin_Dev_123!";

    public static async Task EnsureDatabaseAsync(IServiceProvider services, CancellationToken ct = default)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<object>>();

        if (db.Database.IsRelational())
        {
            // Recover from "database exists but is empty" — happens when an earlier bootstrap
            // crashed after CREATE DATABASE but before any migration applied, leaving the DB
            // with no __EFMigrationsHistory table. MigrateAsync would then call CreateAsync
            // again and fail with SQL error 1801 (database already exists).
            var creator = db.GetService<IRelationalDatabaseCreator>();
            if (await creator.ExistsAsync(ct) && !await creator.HasTablesAsync(ct))
            {
                logger.LogWarning("Database exists but is empty; dropping so migrations can recreate it cleanly.");
                await creator.DeleteAsync(ct);
            }

            logger.LogInformation("Applying database migrations if any are pending...");
            await db.Database.MigrateAsync(ct);
        }
        else
        {
            logger.LogInformation("Non-relational provider detected (likely InMemory for tests); ensuring schema created.");
            await db.Database.EnsureCreatedAsync(ct);
        }
    }

    public static async Task SeedDevDataAsync(IServiceProvider services, CancellationToken ct = default)
    {
        using var scope = services.CreateScope();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<ApplicationRole>>();
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<object>>();

        foreach (var roleName in ApplicationRoles.All)
        {
            if (!await roleManager.RoleExistsAsync(roleName))
            {
                await roleManager.CreateAsync(new ApplicationRole(roleName));
                logger.LogInformation("Seeded role {Role}", roleName);
            }
        }

        var existing = await userManager.FindByEmailAsync(DevAdminEmail);
        if (existing is null)
        {
            var admin = new ApplicationUser
            {
                Id = Guid.NewGuid(),
                UserName = DevAdminEmail,
                Email = DevAdminEmail,
                FullName = "Code Mentor Admin (dev)",
                EmailConfirmed = true,
            };

            var result = await userManager.CreateAsync(admin, DevAdminPassword);
            if (!result.Succeeded)
            {
                var errors = string.Join("; ", result.Errors.Select(e => e.Description));
                logger.LogError("Failed to seed dev admin: {Errors}", errors);
                return;
            }

            await userManager.AddToRoleAsync(admin, ApplicationRoles.Admin);
            logger.LogInformation("Seeded dev admin {Email}", DevAdminEmail);
        }

        await SeedQuestionBankAsync(scope.ServiceProvider, logger);
        await SeedTaskLibraryAsync(scope.ServiceProvider, logger);
        await SeedBadgesAsync(scope.ServiceProvider, logger);
    }

    private static async Task SeedQuestionBankAsync(IServiceProvider services, ILogger logger)
    {
        var db = services.GetRequiredService<ApplicationDbContext>();
        if (await db.Questions.AnyAsync()) return;

        db.Questions.AddRange(QuestionSeedData.All);
        var count = await db.SaveChangesAsync();
        logger.LogInformation("Seeded {Count} assessment questions", count);
    }

    private static async Task SeedTaskLibraryAsync(IServiceProvider services, ILogger logger)
    {
        var db = services.GetRequiredService<ApplicationDbContext>();
        if (await db.Tasks.AnyAsync()) return;

        db.Tasks.AddRange(TaskSeedData.All);
        var count = await db.SaveChangesAsync();
        logger.LogInformation("Seeded {Count} learning tasks", count);
    }

    /// <summary>S8-T3: idempotent badge catalog seeding via shared helper.</summary>
    private static async Task SeedBadgesAsync(IServiceProvider services, ILogger logger)
    {
        var db = services.GetRequiredService<ApplicationDbContext>();
        var before = await db.Badges.CountAsync();
        await Gamification.BadgeSeedData.SeedAsync(db);
        var after = await db.Badges.CountAsync();
        if (after > before)
            logger.LogInformation("Seeded {Count} starter badges", after - before);
    }
}

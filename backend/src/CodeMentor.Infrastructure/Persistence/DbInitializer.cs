using CodeMentor.Infrastructure.Identity;
using CodeMentor.Infrastructure.Persistence.Seeds;
using Microsoft.AspNetCore.Identity;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
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
            // Wait for SQL Server to be fully ready before probing migrations.
            // Docker compose marks the container "healthy" via `SELECT 1` quite early,
            // but freshly-started SQL Server can return inconsistent answers from
            // sys.databases for ~30s while it re-attaches user databases from the
            // named volume. EF's IRelationalDatabaseCreator.ExistsAsync may return
            // false here, then a moment later MigrateAsync's internal CreateAsync
            // hits the now-attached DB and dies with SQL 1801.
            await WaitForSqlReadyAsync(db, logger, ct);

            // Recover from "database exists but has no __EFMigrationsHistory" — happens when:
            //  - an earlier bootstrap crashed after CREATE DATABASE but before any migration
            //    applied (DB is empty), OR
            //  - a stale named volume holds residual tables from a partially-failed run
            //    without the migrations history table.
            // In both cases MigrateAsync would internally call CreateAsync again (because
            // history is missing) and fail with SQL error 1801 (database already exists).
            // Detect via IHistoryRepository specifically, not HasTablesAsync, so any random
            // residual tables are also treated as "needs reset" rather than a healthy DB.
            var creator = db.GetService<IRelationalDatabaseCreator>();
            var historyRepo = db.GetService<IHistoryRepository>();
            if (await creator.ExistsAsync(ct) && !await historyRepo.ExistsAsync(ct))
            {
                logger.LogWarning("Database exists but has no __EFMigrationsHistory; dropping so migrations can recreate it cleanly.");
                await creator.DeleteAsync(ct);
            }

            logger.LogInformation("Applying database migrations if any are pending...");
            try
            {
                await db.Database.MigrateAsync(ct);
            }
            catch (SqlException ex) when (ex.Number == 1801)
            {
                // SQL 1801: 'Database <name> already exists' — race-condition fallout.
                // The container claimed the DB didn't exist when ExistsAsync ran a few ms
                // ago, but did by the time CreateAsync issued CREATE DATABASE. SQL Server
                // has now finished attaching the volume's DB. Retry MigrateAsync — the
                // second pass will see the DB and just apply any pending migrations.
                logger.LogWarning("SQL 1801 'database already exists' race detected; retrying MigrateAsync now that SQL Server has stabilised.");
                await db.Database.MigrateAsync(ct);
            }
        }
        else
        {
            logger.LogInformation("Non-relational provider detected (likely InMemory for tests); ensuring schema created.");
            await db.Database.EnsureCreatedAsync(ct);
        }
    }

    private static async Task WaitForSqlReadyAsync(ApplicationDbContext db, ILogger logger, CancellationToken ct)
    {
        const int maxAttempts = 30;
        const int delayMs = 1_000;
        for (var attempt = 1; attempt <= maxAttempts; attempt++)
        {
            try
            {
                await db.Database.OpenConnectionAsync(ct);
                await db.Database.CloseConnectionAsync();
                if (attempt > 1)
                {
                    logger.LogInformation("SQL Server reachable after {Attempts} attempts.", attempt);
                }
                return;
            }
            catch (SqlException ex) when (attempt < maxAttempts)
            {
                logger.LogDebug("SQL Server not ready (attempt {Attempt}/{Max}): {Message}", attempt, maxAttempts, ex.Message);
                await Task.Delay(delayMs, ct);
            }
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

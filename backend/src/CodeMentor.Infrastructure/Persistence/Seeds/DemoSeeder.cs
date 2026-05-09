using CodeMentor.Domain.Assessments;
using CodeMentor.Domain.Skills;
using CodeMentor.Domain.Tasks;
using CodeMentor.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace CodeMentor.Infrastructure.Persistence.Seeds;

/// <summary>
/// S11-T10 / F13 (ADR-038): demo-state seeder. Invoked from the API
/// project via <c>dotnet run --project src/CodeMentor.Api -- seed-demo</c>;
/// produces a deterministic baseline so the defense flow doesn't require
/// per-rehearsal hand-setup.
///
/// Idempotent: every step checks for existing rows and skips if present.
/// Safe to re-run after schema migrations.
///
/// Seeded state (deterministic part):
///   • Demo learner    — `learner@codementor.local` / <see cref="DemoLearnerPassword"/>
///   • Demo admin      — already exists from <see cref="DbInitializer.SeedDevDataAsync"/>;
///                       this seeder verifies presence (no-op if already there).
///   • Completed assessment for the learner with 5 SkillScore rows
///   • Active LearningPath with 3 PathTasks (1 Completed, 1 InProgress, 1 NotStarted)
///
/// Rich-history part (5 submissions with progression, 1 ProjectAudit,
/// 1 MentorChatSession with 4-6 turns) is **owner-generated through
/// the real UI** during demo prep — that exercises the actual flows end-
/// to-end and keeps the seeder bounded. The defense-script doc captures
/// the sequence to record this rich state once before each rehearsal.
/// </summary>
public static class DemoSeeder
{
    public const string DemoLearnerEmail = "learner@codementor.local";
    public const string DemoLearnerPassword = "Demo_Learner_123!";
    public const string DemoLearnerName = "Demo Learner";

    public static async Task SeedAsync(IServiceProvider services, CancellationToken ct = default)
    {
        using var scope = services.CreateScope();
        var sp = scope.ServiceProvider;
        var logger = sp.GetRequiredService<ILogger<object>>();
        var db = sp.GetRequiredService<ApplicationDbContext>();
        var userManager = sp.GetRequiredService<UserManager<ApplicationUser>>();

        logger.LogInformation("[seed-demo] starting");

        await EnsureRolesAsync(sp, logger, ct);
        var admin = await EnsureAdminAsync(userManager, logger);
        var learner = await EnsureLearnerAsync(userManager, logger);

        await EnsureAssessmentAndSkillsAsync(db, learner.Id, logger, ct);
        await EnsureActivePathAsync(db, learner.Id, logger, ct);

        logger.LogInformation(
            "[seed-demo] complete. Demo learner: {Email} / {Pwd}; admin: {AdminEmail} / {AdminPwd}",
            DemoLearnerEmail, DemoLearnerPassword,
            DbInitializer.DevAdminEmail, DbInitializer.DevAdminPassword);
    }

    private static async Task EnsureRolesAsync(
        IServiceProvider sp, ILogger logger, CancellationToken ct)
    {
        var roleManager = sp.GetRequiredService<RoleManager<ApplicationRole>>();
        foreach (var name in ApplicationRoles.All)
        {
            if (!await roleManager.RoleExistsAsync(name))
            {
                await roleManager.CreateAsync(new ApplicationRole(name));
                logger.LogInformation("[seed-demo] seeded role {Role}", name);
            }
        }
    }

    private static async Task<ApplicationUser> EnsureAdminAsync(
        UserManager<ApplicationUser> userManager, ILogger logger)
    {
        var existing = await userManager.FindByEmailAsync(DbInitializer.DevAdminEmail);
        if (existing is not null) return existing;

        var admin = new ApplicationUser
        {
            Id = Guid.NewGuid(),
            UserName = DbInitializer.DevAdminEmail,
            Email = DbInitializer.DevAdminEmail,
            FullName = "Code Mentor Admin (demo)",
            EmailConfirmed = true,
        };
        var result = await userManager.CreateAsync(admin, DbInitializer.DevAdminPassword);
        if (!result.Succeeded)
        {
            throw new InvalidOperationException(
                "Failed to create demo admin: " +
                string.Join("; ", result.Errors.Select(e => e.Description)));
        }
        await userManager.AddToRoleAsync(admin, ApplicationRoles.Admin);
        logger.LogInformation("[seed-demo] created admin {Email}", DbInitializer.DevAdminEmail);
        return admin;
    }

    private static async Task<ApplicationUser> EnsureLearnerAsync(
        UserManager<ApplicationUser> userManager, ILogger logger)
    {
        var existing = await userManager.FindByEmailAsync(DemoLearnerEmail);
        if (existing is not null) return existing;

        var learner = new ApplicationUser
        {
            Id = Guid.NewGuid(),
            UserName = DemoLearnerEmail,
            Email = DemoLearnerEmail,
            FullName = DemoLearnerName,
            EmailConfirmed = true,
        };
        var result = await userManager.CreateAsync(learner, DemoLearnerPassword);
        if (!result.Succeeded)
        {
            throw new InvalidOperationException(
                "Failed to create demo learner: " +
                string.Join("; ", result.Errors.Select(e => e.Description)));
        }
        await userManager.AddToRoleAsync(learner, ApplicationRoles.Learner);
        logger.LogInformation("[seed-demo] created learner {Email}", DemoLearnerEmail);
        return learner;
    }

    private static async Task EnsureAssessmentAndSkillsAsync(
        ApplicationDbContext db, Guid userId, ILogger logger, CancellationToken ct)
    {
        var hasAssessment = await db.Assessments
            .AnyAsync(a => a.UserId == userId && a.Status == AssessmentStatus.Completed, ct);
        if (hasAssessment)
        {
            logger.LogInformation("[seed-demo] assessment already exists; skipping");
            return;
        }

        var assessment = new Assessment
        {
            UserId = userId,
            Track = Track.FullStack,
            Status = AssessmentStatus.Completed,
            StartedAt = DateTime.UtcNow.AddMinutes(-35),
            CompletedAt = DateTime.UtcNow.AddMinutes(-5),
            DurationSec = 30 * 60,
            TotalScore = 72m,
            SkillLevel = SkillLevel.Intermediate,
        };
        db.Assessments.Add(assessment);

        // Per-category snapshot — Beginner/Intermediate/Advanced spread so the
        // dashboard radar chart looks realistic.
        var categoryScores = new[]
        {
            (SkillCategory.DataStructures, 78m, SkillLevel.Intermediate),
            (SkillCategory.Algorithms,     65m, SkillLevel.Intermediate),
            (SkillCategory.OOP,            85m, SkillLevel.Advanced),
            (SkillCategory.Databases,      58m, SkillLevel.Beginner),
            (SkillCategory.Security,       70m, SkillLevel.Intermediate),
        };
        foreach (var (category, score, level) in categoryScores)
        {
            var existingScore = await db.SkillScores
                .FirstOrDefaultAsync(s => s.UserId == userId && s.Category == category, ct);
            if (existingScore is null)
            {
                db.SkillScores.Add(new SkillScore
                {
                    UserId = userId,
                    Category = category,
                    Score = score,
                    Level = level,
                });
            }
        }

        await db.SaveChangesAsync(ct);
        logger.LogInformation(
            "[seed-demo] seeded Completed assessment + {Count} SkillScore rows",
            categoryScores.Length);
    }

    private static async Task EnsureActivePathAsync(
        ApplicationDbContext db, Guid userId, ILogger logger, CancellationToken ct)
    {
        var hasPath = await db.LearningPaths.AnyAsync(p => p.UserId == userId && p.IsActive, ct);
        if (hasPath)
        {
            logger.LogInformation("[seed-demo] active learning path already exists; skipping");
            return;
        }

        // Pick the first 3 active TaskItems matching the FullStack track. If
        // fewer than 3 are available the path simply uses what's there — the
        // task library seeds 21+ items so this is reliable.
        var taskIds = await db.Tasks
            .Where(t => t.IsActive && t.Track == Track.FullStack)
            .OrderBy(t => t.Difficulty)
            .Select(t => t.Id)
            .Take(3)
            .ToListAsync(ct);

        if (taskIds.Count == 0)
        {
            logger.LogWarning("[seed-demo] no active FullStack tasks found; skipping path seed");
            return;
        }

        var path = new LearningPath
        {
            UserId = userId,
            Track = Track.FullStack,
            IsActive = true,
        };
        db.LearningPaths.Add(path);

        for (int i = 0; i < taskIds.Count; i++)
        {
            // First Completed (so dashboard shows real progress), second
            // InProgress, rest NotStarted.
            var status = i switch
            {
                0 => PathTaskStatus.Completed,
                1 => PathTaskStatus.InProgress,
                _ => PathTaskStatus.NotStarted,
            };
            db.PathTasks.Add(new PathTask
            {
                PathId = path.Id,
                TaskId = taskIds[i],
                OrderIndex = i,
                Status = status,
                StartedAt = status != PathTaskStatus.NotStarted
                    ? DateTime.UtcNow.AddDays(-2)
                    : null,
                CompletedAt = status == PathTaskStatus.Completed
                    ? DateTime.UtcNow.AddDays(-1)
                    : null,
            });
        }

        path.ProgressPercent = Math.Round(100m / taskIds.Count, 2); // 1/N completed
        await db.SaveChangesAsync(ct);
        logger.LogInformation(
            "[seed-demo] seeded active LearningPath ({Progress}% progress) with {Count} PathTasks",
            path.ProgressPercent, taskIds.Count);
    }
}

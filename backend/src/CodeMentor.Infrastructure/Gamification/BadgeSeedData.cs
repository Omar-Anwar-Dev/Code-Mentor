using CodeMentor.Domain.Gamification;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CodeMentor.Infrastructure.Gamification;

/// <summary>
/// S8-T3: 5 starter badges seeded by <c>DbInitializer</c>. Keys are stable;
/// names + descriptions + icons can be tuned without code edits since they're
/// read from the table at the GET-catalog endpoint.
/// </summary>
public static class BadgeSeedData
{
    public static IReadOnlyList<Badge> All { get; } = new[]
    {
        new Badge
        {
            Key = BadgeKeys.FirstSubmission,
            Name = "First Steps",
            Description = "Submitted your very first code for review.",
            IconUrl = "/badges/first-submission.svg",
            Category = "starter",
        },
        new Badge
        {
            Key = BadgeKeys.FirstPathTaskCompleted,
            Name = "Path Pioneer",
            Description = "Completed your first task on your learning path.",
            IconUrl = "/badges/first-path-task.svg",
            Category = "milestone",
        },
        new Badge
        {
            Key = BadgeKeys.FirstPerfectCategoryScore,
            Name = "Perfect Pitch",
            Description = "Earned ≥90 in any code-quality category.",
            IconUrl = "/badges/perfect-category.svg",
            Category = "quality",
        },
        new Badge
        {
            Key = BadgeKeys.HighQualitySubmission,
            Name = "Quality Code",
            Description = "Earned an overall AI score of 80 or higher.",
            IconUrl = "/badges/high-quality.svg",
            Category = "quality",
        },
        new Badge
        {
            Key = BadgeKeys.FirstLearningCVGenerated,
            Name = "On the Map",
            Description = "Published your Learning CV — sharable to the world.",
            IconUrl = "/badges/first-cv.svg",
            Category = "milestone",
        },
    };

    /// <summary>Idempotent badge seeding (production + tests). Inserts only
    /// missing keys, leaves existing rows untouched.</summary>
    public static async Task SeedAsync(ApplicationDbContext db, CancellationToken ct = default)
    {
        var existing = await db.Badges.Select(b => b.Key).ToListAsync(ct);
        var toAdd = All.Where(b => !existing.Contains(b.Key)).ToList();
        if (toAdd.Count == 0) return;
        db.Badges.AddRange(toAdd);
        await db.SaveChangesAsync(ct);
    }
}

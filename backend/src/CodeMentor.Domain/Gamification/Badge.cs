namespace CodeMentor.Domain.Gamification;

/// <summary>
/// S8-T3: catalog row for an earnable badge. Seeded once via DbInitializer;
/// referenced by <see cref="BadgeKeys"/> in awarding paths so code never
/// hardcodes a Guid.
/// </summary>
public class Badge
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Stable, lowercase, hyphenated key. Unique.</summary>
    public string Key { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string IconUrl { get; set; } = string.Empty;

    /// <summary>Logical group: "starter", "milestone", "quality" etc.</summary>
    public string Category { get; set; } = "starter";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>Stable keys for the 5 starter badges (S8-T3, ADR-029).</summary>
public static class BadgeKeys
{
    public const string FirstSubmission = "first-submission";
    public const string FirstPathTaskCompleted = "first-path-task-completed";
    public const string FirstPerfectCategoryScore = "first-perfect-category-score";
    public const string HighQualitySubmission = "high-quality-submission";
    public const string FirstLearningCVGenerated = "first-learning-cv-generated";
}

namespace CodeMentor.Application.Gamification;

/// <summary>
/// S8-T3 / ADR-029: XP → level mapping for gamification.
/// Formula: <c>level = floor(sqrt(xp / 50)) + 1</c>.
/// Concrete thresholds — L1: 0 XP · L2: 50 · L3: 200 · L4: 450 · L5: 800 · L6: 1250 · L7: 1800.
/// Soft curve: early levels are quick wins (assessment alone = L2), then taper.
/// </summary>
public static class LevelFormula
{
    private const int Divisor = 50;

    public static int LevelFor(int totalXp)
    {
        if (totalXp <= 0) return 1;
        var v = Math.Floor(Math.Sqrt(totalXp / (double)Divisor)) + 1;
        return (int)v;
    }

    /// <summary>XP at the start of <paramref name="level"/> (inclusive).</summary>
    public static int XpForLevel(int level)
    {
        if (level <= 1) return 0;
        var floor = level - 1;
        return floor * floor * Divisor;
    }
}

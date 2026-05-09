using CodeMentor.Application.Gamification;

namespace CodeMentor.Application.Tests.Gamification;

/// <summary>
/// S8-T3 / ADR-029: <c>level = floor(sqrt(xp / 50)) + 1</c>.
/// Concrete thresholds — L1: 0 · L2: 50 · L3: 200 · L4: 450 · L5: 800.
/// </summary>
public class LevelFormulaTests
{
    [Theory]
    [InlineData(0, 1)]
    [InlineData(1, 1)]
    [InlineData(49, 1)]
    [InlineData(50, 2)]
    [InlineData(100, 2)]
    [InlineData(199, 2)]
    [InlineData(200, 3)]
    [InlineData(449, 3)]
    [InlineData(450, 4)]
    [InlineData(800, 5)]
    [InlineData(1250, 6)]
    public void LevelFor_Matches_Curve(int xp, int expectedLevel)
    {
        Assert.Equal(expectedLevel, LevelFormula.LevelFor(xp));
    }

    [Theory]
    [InlineData(1, 0)]
    [InlineData(2, 50)]
    [InlineData(3, 200)]
    [InlineData(4, 450)]
    [InlineData(5, 800)]
    public void XpForLevel_StartOfLevel_Matches(int level, int expectedXp)
    {
        Assert.Equal(expectedXp, LevelFormula.XpForLevel(level));
    }

    [Fact]
    public void LevelFor_NegativeXp_ReturnsLevel1()
    {
        Assert.Equal(1, LevelFormula.LevelFor(-100));
    }
}

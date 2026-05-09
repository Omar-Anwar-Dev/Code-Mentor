using CodeMentor.Domain.Assessments;
using CodeMentor.Infrastructure.Assessments;

namespace CodeMentor.Application.Tests.Assessments;

public class ScoringServiceTests
{
    private readonly ScoringService _scoring = new();

    private static AssessmentResponse R(SkillCategory c, int d, bool ok) => new()
    {
        Category = c, Difficulty = d, IsCorrect = ok, UserAnswer = ok ? "A" : "B",
    };

    [Fact]
    public void AllCorrect_Returns100_AndAdvancedLevel()
    {
        var responses = new List<AssessmentResponse>
        {
            R(SkillCategory.OOP, 2, true),
            R(SkillCategory.OOP, 3, true),
            R(SkillCategory.Algorithms, 2, true),
        };

        var outcome = _scoring.Score(responses);

        Assert.Equal(100m, outcome.OverallScore);
        Assert.Equal(SkillLevel.Advanced, outcome.Level);
    }

    [Fact]
    public void AllWrong_Returns0_AndBeginnerLevel()
    {
        var responses = new List<AssessmentResponse>
        {
            R(SkillCategory.OOP, 2, false),
            R(SkillCategory.Algorithms, 1, false),
        };
        var outcome = _scoring.Score(responses);

        Assert.Equal(0m, outcome.OverallScore);
        Assert.Equal(SkillLevel.Beginner, outcome.Level);
    }

    [Fact]
    public void PerCategoryScores_ComputedIndependently()
    {
        var responses = new List<AssessmentResponse>
        {
            R(SkillCategory.OOP, 2, true), // weight 1.5
            R(SkillCategory.OOP, 2, false), // weight 1.5 → OOP score = 1.5/3 = 50%
            R(SkillCategory.Security, 3, true), // weight 2.0 → Security = 100%
        };

        var outcome = _scoring.Score(responses);

        var oop = outcome.CategoryScores.Single(c => c.Category == "OOP");
        var sec = outcome.CategoryScores.Single(c => c.Category == "Security");
        Assert.Equal(50m, oop.Score);
        Assert.Equal(100m, sec.Score);
    }

    [Fact]
    public void HigherDifficultyCorrect_WeightsMore_ThanLowerWrong()
    {
        // 1 correct at d=3 (weight 2.0) + 1 wrong at d=1 (weight 1.0) = 2.0 / 3.0 = 66.67
        var responses = new List<AssessmentResponse>
        {
            R(SkillCategory.OOP, 3, true),
            R(SkillCategory.OOP, 1, false),
        };

        var outcome = _scoring.Score(responses);

        Assert.InRange(outcome.OverallScore, 66m, 67m);
        Assert.Equal(SkillLevel.Intermediate, outcome.Level);
    }
}

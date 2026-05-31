using CodeMentor.Domain.Assessments;
using CodeMentor.Infrastructure.Persistence.Seeds;

namespace CodeMentor.Application.Tests.Assessments;

/// <summary>
/// S15-T4 acceptance: every seeded Question must have IRT_B mapped from
/// Difficulty per the locked backfill rule (1 → -1.0, 2 → 0.0, 3 → +1.0)
/// and the rest of the new IRT/AI fields at their entity defaults
/// (IRT_A = 1.0, CalibrationSource = AI, Source = Manual).
/// </summary>
public class QuestionSeedIrtBackfillTests
{
    [Fact]
    public void Seed_Has_60_Questions_All_Manual_AI_Calibrated()
    {
        var all = QuestionSeedData.All;
        Assert.Equal(60, all.Count);
        Assert.All(all, q =>
        {
            Assert.Equal(1.0, q.IRT_A);
            Assert.Equal(QuestionSource.Manual, q.Source);
            Assert.Equal(CalibrationSource.AI, q.CalibrationSource);
            Assert.Null(q.ApprovedById);
            Assert.Null(q.ApprovedAt);
            Assert.Null(q.CodeSnippet);
            Assert.Null(q.CodeLanguage);
            Assert.Null(q.EmbeddingJson);
            Assert.Null(q.PromptVersion);
        });
    }

    [Theory]
    [InlineData(1, -1.0)]
    [InlineData(2,  0.0)]
    [InlineData(3,  1.0)]
    public void Seed_IRT_B_Mapped_From_Difficulty_Per_Backfill_Rule(int difficulty, double expectedIrtB)
    {
        var matching = QuestionSeedData.All.Where(q => q.Difficulty == difficulty).ToList();
        Assert.NotEmpty(matching);
        Assert.All(matching, q =>
            Assert.Equal(expectedIrtB, q.IRT_B));
    }

    [Fact]
    public void Seed_Has_Even_Distribution_Across_Difficulties()
    {
        // 60 questions / 3 difficulty levels = 20 per level (12 per category × 5 categories,
        // with each category having ~4-1-3 difficulty distribution; total per difficulty
        // varies a bit but should be close to balanced).
        var byDifficulty = QuestionSeedData.All
            .GroupBy(q => q.Difficulty)
            .ToDictionary(g => g.Key, g => g.Count());
        Assert.Contains(1, byDifficulty.Keys);
        Assert.Contains(2, byDifficulty.Keys);
        Assert.Contains(3, byDifficulty.Keys);
        // Each difficulty level should have at least 10 questions for the 30-question
        // assessment to have headroom for category balance + adaptive selection.
        Assert.All(byDifficulty.Values, count => Assert.True(count >= 10,
            $"Difficulty level under-represented in seed (count={count})."));
    }
}

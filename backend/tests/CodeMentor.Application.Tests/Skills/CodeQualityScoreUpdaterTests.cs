using CodeMentor.Application.CodeReview;
using CodeMentor.Domain.Skills;
using CodeMentor.Infrastructure.Persistence;
using CodeMentor.Infrastructure.Skills;
using Microsoft.EntityFrameworkCore;

namespace CodeMentor.Application.Tests.Skills;

/// <summary>
/// S7-T1 / ADR-028: CodeQualityScore is a per-user, per-category running mean
/// of AI-derived code-quality scores. Verifies:
///   - First contribution upserts a row for each of the 5 PRD F6 categories.
///   - Subsequent contributions roll into the running mean by sample count.
///   - Independent users don't share state.
///   - Out-of-range AI scores are clamped to [0, 100] before averaging.
/// </summary>
public class CodeQualityScoreUpdaterTests
{
    private static ApplicationDbContext NewDb() => new(
        new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase($"cqs_{Guid.NewGuid():N}")
            .Options);

    [Fact]
    public async Task RecordAiReviewAsync_FirstContribution_Creates_FiveCategoryRows()
    {
        using var db = NewDb();
        var updater = new CodeQualityScoreUpdater(db);
        var userId = Guid.NewGuid();

        await updater.RecordAiReviewAsync(userId, new AiReviewScores(80, 70, 90, 60, 75));

        var rows = db.CodeQualityScores.AsNoTracking().Where(s => s.UserId == userId).ToList();
        Assert.Equal(5, rows.Count);
        Assert.All(rows, r => Assert.Equal(1, r.SampleCount));
        Assert.Equal(80m, rows.First(r => r.Category == CodeQualityCategory.Correctness).Score);
        Assert.Equal(70m, rows.First(r => r.Category == CodeQualityCategory.Readability).Score);
        Assert.Equal(90m, rows.First(r => r.Category == CodeQualityCategory.Security).Score);
        Assert.Equal(60m, rows.First(r => r.Category == CodeQualityCategory.Performance).Score);
        Assert.Equal(75m, rows.First(r => r.Category == CodeQualityCategory.Design).Score);
    }

    [Fact]
    public async Task RecordAiReviewAsync_SecondContribution_RollsIntoRunningMean()
    {
        using var db = NewDb();
        var updater = new CodeQualityScoreUpdater(db);
        var userId = Guid.NewGuid();

        await updater.RecordAiReviewAsync(userId, new AiReviewScores(80, 60, 70, 50, 90));
        await updater.RecordAiReviewAsync(userId, new AiReviewScores(60, 80, 90, 90, 70));

        var rows = db.CodeQualityScores.AsNoTracking().Where(s => s.UserId == userId).ToList();
        Assert.Equal(5, rows.Count);
        Assert.All(rows, r => Assert.Equal(2, r.SampleCount));
        Assert.Equal(70m, rows.First(r => r.Category == CodeQualityCategory.Correctness).Score); // (80+60)/2
        Assert.Equal(70m, rows.First(r => r.Category == CodeQualityCategory.Readability).Score); // (60+80)/2
        Assert.Equal(80m, rows.First(r => r.Category == CodeQualityCategory.Security).Score);    // (70+90)/2
        Assert.Equal(70m, rows.First(r => r.Category == CodeQualityCategory.Performance).Score); // (50+90)/2
        Assert.Equal(80m, rows.First(r => r.Category == CodeQualityCategory.Design).Score);      // (90+70)/2
    }

    [Fact]
    public async Task RecordAiReviewAsync_ThreeContributions_ProducesExactRunningMean()
    {
        using var db = NewDb();
        var updater = new CodeQualityScoreUpdater(db);
        var userId = Guid.NewGuid();

        await updater.RecordAiReviewAsync(userId, new AiReviewScores(60, 60, 60, 60, 60));
        await updater.RecordAiReviewAsync(userId, new AiReviewScores(70, 70, 70, 70, 70));
        await updater.RecordAiReviewAsync(userId, new AiReviewScores(80, 80, 80, 80, 80));

        var correctness = db.CodeQualityScores.AsNoTracking()
            .First(s => s.UserId == userId && s.Category == CodeQualityCategory.Correctness);
        Assert.Equal(3, correctness.SampleCount);
        Assert.Equal(70m, correctness.Score); // (60+70+80)/3
    }

    [Fact]
    public async Task RecordAiReviewAsync_TwoUsers_AreIndependent()
    {
        using var db = NewDb();
        var updater = new CodeQualityScoreUpdater(db);
        var alice = Guid.NewGuid();
        var bob = Guid.NewGuid();

        await updater.RecordAiReviewAsync(alice, new AiReviewScores(90, 90, 90, 90, 90));
        await updater.RecordAiReviewAsync(bob, new AiReviewScores(50, 50, 50, 50, 50));

        var aliceCorrect = db.CodeQualityScores.AsNoTracking()
            .First(s => s.UserId == alice && s.Category == CodeQualityCategory.Correctness);
        var bobCorrect = db.CodeQualityScores.AsNoTracking()
            .First(s => s.UserId == bob && s.Category == CodeQualityCategory.Correctness);
        Assert.Equal(90m, aliceCorrect.Score);
        Assert.Equal(50m, bobCorrect.Score);
    }

    [Fact]
    public async Task RecordAiReviewAsync_OutOfRangeScore_IsClampedTo_0_100()
    {
        using var db = NewDb();
        var updater = new CodeQualityScoreUpdater(db);
        var userId = Guid.NewGuid();

        await updater.RecordAiReviewAsync(userId, new AiReviewScores(150, -10, 100, 0, 50));

        var rows = db.CodeQualityScores.AsNoTracking().Where(s => s.UserId == userId).ToList();
        Assert.Equal(100m, rows.First(r => r.Category == CodeQualityCategory.Correctness).Score);
        Assert.Equal(0m, rows.First(r => r.Category == CodeQualityCategory.Readability).Score);
        Assert.Equal(100m, rows.First(r => r.Category == CodeQualityCategory.Security).Score);
        Assert.Equal(0m, rows.First(r => r.Category == CodeQualityCategory.Performance).Score);
        Assert.Equal(50m, rows.First(r => r.Category == CodeQualityCategory.Design).Score);
    }
}

using CodeMentor.Domain.Assessments;
using CodeMentor.Infrastructure.Persistence;
using CodeMentor.Infrastructure.Persistence.Seeds;
using Microsoft.EntityFrameworkCore;

namespace CodeMentor.Application.Tests.Assessments;

/// <summary>
/// S2-T1 acceptance: EF configs for JSON columns (Options) validated with round-trip test.
/// </summary>
public class QuestionOptionsJsonRoundTripTests
{
    private static ApplicationDbContext NewDb()
    {
        var opts = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase($"JsonRoundTrip_{Guid.NewGuid():N}")
            .Options;
        return new ApplicationDbContext(opts);
    }

    [Fact]
    public async Task Options_RoundTrip_Preserves_FourStrings_In_Order()
    {
        using var db = NewDb();

        var original = new Question
        {
            Id = Guid.NewGuid(),
            Content = "Round-trip check",
            Category = SkillCategory.OOP,
            Difficulty = 2,
            Options = new[] { "A) alpha", "B) bravo", "C) charlie", "D) delta" },
            CorrectAnswer = "C",
            Explanation = "Bravo Charlie",
        };

        db.Questions.Add(original);
        await db.SaveChangesAsync();

        using var db2 = NewDb();
        // Re-open a fresh context using the SAME database name so we force EF to
        // hit the value-converter (not return the tracked in-memory instance).
        var sameDbOptions = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(db.Database.ProviderName ?? "fallback")
            .Options;

        // Actually use the same context's Database.ProviderName trick is flawed for InMemory;
        // instead, fetch via a fresh scope on the ORIGINAL DB via NoTracking.
        var fetched = await db.Questions.AsNoTracking().SingleAsync(q => q.Id == original.Id);

        Assert.Equal(original.Options.Count, fetched.Options.Count);
        Assert.Equal(original.Options, fetched.Options);
        Assert.Equal("C", fetched.CorrectAnswer);
        Assert.Equal(SkillCategory.OOP, fetched.Category);
    }

    [Fact]
    public async Task SeededQuestions_Have_FourNonEmpty_Options()
    {
        using var db = NewDb();
        db.Questions.AddRange(QuestionSeedData.All);
        await db.SaveChangesAsync();

        var sample = await db.Questions.AsNoTracking().Take(10).ToListAsync();
        Assert.All(sample, q =>
        {
            Assert.Equal(4, q.Options.Count);
            Assert.All(q.Options, o => Assert.False(string.IsNullOrWhiteSpace(o)));
            Assert.Contains(q.CorrectAnswer, new[] { "A", "B", "C", "D" });
        });
    }
}

using CodeMentor.Domain.Assessments;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CodeMentor.Application.Tests.Assessments;

/// <summary>
/// S15-T3 acceptance: round-trip the new IRT + AI columns added by the
/// AddIrtAndAiColumnsToQuestions migration. Verifies entity defaults,
/// value-converter behavior for the two new enums (CalibrationSource,
/// QuestionSource), and persistence of the optional fields (CodeSnippet,
/// CodeLanguage, EmbeddingJson, ApprovedById, ApprovedAt, PromptVersion).
/// </summary>
public class QuestionIrtColumnsRoundTripTests
{
    private static (ApplicationDbContext db, string dbName) NewDb()
    {
        var dbName = $"IrtRoundTrip_{Guid.NewGuid():N}";
        var opts = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(dbName)
            .Options;
        return (new ApplicationDbContext(opts), dbName);
    }

    [Fact]
    public async Task NewQuestion_Without_Explicit_Irt_Fields_Uses_Entity_Defaults()
    {
        var (db, _) = NewDb();
        using var _ = db;

        var q = new Question
        {
            Content = "What is the worst-case time complexity of bubble sort?",
            Category = SkillCategory.Algorithms,
            Difficulty = 1,
            Options = new[] { "A) O(n)", "B) O(n log n)", "C) O(n^2)", "D) O(2^n)" },
            CorrectAnswer = "C",
        };

        db.Questions.Add(q);
        await db.SaveChangesAsync();

        var fetched = await db.Questions.AsNoTracking().SingleAsync(x => x.Id == q.Id);
        Assert.Equal(1.0, fetched.IRT_A);
        Assert.Equal(0.0, fetched.IRT_B);
        Assert.Equal(CalibrationSource.AI, fetched.CalibrationSource);
        Assert.Equal(QuestionSource.Manual, fetched.Source);
        Assert.Null(fetched.ApprovedById);
        Assert.Null(fetched.ApprovedAt);
        Assert.Null(fetched.CodeSnippet);
        Assert.Null(fetched.CodeLanguage);
        Assert.Null(fetched.EmbeddingJson);
        Assert.Null(fetched.PromptVersion);
    }

    [Fact]
    public async Task Question_With_All_New_Fields_Populated_Round_Trips_Cleanly()
    {
        var (db, _) = NewDb();
        using var _ = db;

        var approvedById = Guid.NewGuid();
        var approvedAt = DateTime.UtcNow.AddMinutes(-30);
        var sampleCode = "def factorial(n):\n    return 1 if n <= 1 else n * factorial(n - 1)";
        var embedding = "[0.123,-0.456,0.789]";

        var q = new Question
        {
            Content = "Identify the recursion termination condition.",
            Category = SkillCategory.Algorithms,
            Difficulty = 2,
            Options = new[] { "A) n <= 1", "B) n > 0", "C) n == 0", "D) n != 1" },
            CorrectAnswer = "A",
            Explanation = "Base case stops recursion at n <= 1.",
            IRT_A = 1.7,
            IRT_B = -0.3,
            CalibrationSource = CalibrationSource.Empirical,
            Source = QuestionSource.AI,
            ApprovedById = approvedById,
            ApprovedAt = approvedAt,
            CodeSnippet = sampleCode,
            CodeLanguage = "python",
            EmbeddingJson = embedding,
            PromptVersion = "generate_questions_v1",
        };

        db.Questions.Add(q);
        await db.SaveChangesAsync();

        var fetched = await db.Questions.AsNoTracking().SingleAsync(x => x.Id == q.Id);
        Assert.Equal(1.7, fetched.IRT_A);
        Assert.Equal(-0.3, fetched.IRT_B);
        Assert.Equal(CalibrationSource.Empirical, fetched.CalibrationSource);
        Assert.Equal(QuestionSource.AI, fetched.Source);
        Assert.Equal(approvedById, fetched.ApprovedById);
        // InMemory provider stores DateTime as-is; round-trip should preserve UTC ticks.
        Assert.Equal(approvedAt, fetched.ApprovedAt);
        Assert.Equal(sampleCode, fetched.CodeSnippet);
        Assert.Equal("python", fetched.CodeLanguage);
        Assert.Equal(embedding, fetched.EmbeddingJson);
        Assert.Equal("generate_questions_v1", fetched.PromptVersion);
    }

    [Theory]
    [InlineData(CalibrationSource.AI)]
    [InlineData(CalibrationSource.Admin)]
    [InlineData(CalibrationSource.Empirical)]
    public async Task CalibrationSource_All_Enum_Values_Round_Trip(CalibrationSource source)
    {
        var (db, _) = NewDb();
        using var _ = db;

        var q = new Question
        {
            Content = "x", Category = SkillCategory.OOP, Difficulty = 1,
            Options = new[] { "A", "B", "C", "D" }, CorrectAnswer = "A",
            CalibrationSource = source,
        };
        db.Questions.Add(q);
        await db.SaveChangesAsync();

        var fetched = await db.Questions.AsNoTracking().SingleAsync(x => x.Id == q.Id);
        Assert.Equal(source, fetched.CalibrationSource);
    }

    [Theory]
    [InlineData(QuestionSource.Manual)]
    [InlineData(QuestionSource.AI)]
    public async Task QuestionSource_All_Enum_Values_Round_Trip(QuestionSource source)
    {
        var (db, _) = NewDb();
        using var _ = db;

        var q = new Question
        {
            Content = "x", Category = SkillCategory.OOP, Difficulty = 1,
            Options = new[] { "A", "B", "C", "D" }, CorrectAnswer = "A",
            Source = source,
        };
        db.Questions.Add(q);
        await db.SaveChangesAsync();

        var fetched = await db.Questions.AsNoTracking().SingleAsync(x => x.Id == q.Id);
        Assert.Equal(source, fetched.Source);
    }
}

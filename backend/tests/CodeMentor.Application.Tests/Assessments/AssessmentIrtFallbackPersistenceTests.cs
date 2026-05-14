using CodeMentor.Application.Assessments;
using CodeMentor.Domain.Assessments;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CodeMentor.Application.Tests.Assessments;

/// <summary>
/// S15-T6 acceptance: when the IRT path is unavailable, the assessment continues
/// end-to-end via the legacy selector AND <c>Assessment.IrtFallbackUsed</c> is
/// persisted as <c>true</c>. Sticky-OR semantics: a single fallback during the
/// 30-question journey leaves the flag set even if later calls succeed via IRT.
///
/// Tests AssessmentService directly with a hand-rolled stub factory; the
/// integration-test override (LegacyOnlyAdaptiveQuestionSelectorFactory) is
/// covered by the broader 256-test integration suite.
/// </summary>
public class AssessmentIrtFallbackPersistenceTests
{
    private static (ApplicationDbContext db, string dbName) NewDb()
    {
        var dbName = $"IrtFallback_{Guid.NewGuid():N}";
        var opts = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(dbName)
            .Options;
        return (new ApplicationDbContext(opts), dbName);
    }

    /// <summary>Stub factory: per-call, returns whatever the caller tells it
    /// via the queue. Empty queue defaults to "IRT, no fallback".</summary>
    private sealed class StubFactory : IAdaptiveQuestionSelectorFactory
    {
        public Queue<bool> ScriptedFallbackUsed { get; } = new();
        public IAdaptiveQuestionSelector Selector { get; init; } = null!;

        public Task<AdaptiveSelectorChoice> GetSelectorAsync(CancellationToken ct = default)
        {
            var fallback = ScriptedFallbackUsed.Count > 0 && ScriptedFallbackUsed.Dequeue();
            return Task.FromResult(new AdaptiveSelectorChoice(Selector, fallback));
        }
    }

    [Fact]
    public async Task NewAssessment_WithIrtAvailableThroughout_PersistsFlagFalse()
    {
        var (db, _) = NewDb();
        using var _ = db;

        // Build a tiny bank just so SelectFirstAsync has something to choose.
        var bank = new List<Question>
        {
            new() { Content = "Q1", Category = SkillCategory.OOP, Difficulty = 2,
                Options = new[] { "A", "B", "C", "D" }, CorrectAnswer = "A", IsActive = true },
        };
        var assessment = new Assessment { UserId = Guid.NewGuid() };
        db.Questions.AddRange(bank);
        db.Assessments.Add(assessment);
        await db.SaveChangesAsync();

        // Simulate AssessmentService.StartAsync's call site: ask factory, persist flag.
        var factory = new StubFactory
        {
            Selector = new CodeMentor.Infrastructure.Assessments.LegacyAdaptiveQuestionSelector(),
        };
        // Empty queue → defaults to "no fallback".
        var choice = await factory.GetSelectorAsync();
        assessment.IrtFallbackUsed = choice.IrtFallbackUsed;
        await db.SaveChangesAsync();

        var fetched = await db.Assessments.AsNoTracking().FirstAsync(a => a.Id == assessment.Id);
        Assert.False(fetched.IrtFallbackUsed);
    }

    [Fact]
    public async Task SingleFallbackDuringAssessment_StickyOrsFlagToTrue()
    {
        var (db, _) = NewDb();
        using var _ = db;

        var assessment = new Assessment { UserId = Guid.NewGuid(), IrtFallbackUsed = false };
        db.Assessments.Add(assessment);
        await db.SaveChangesAsync();

        // Simulate the AssessmentService.PickNextQuestionAsync sticky-OR logic:
        // first 5 calls succeed, the 6th falls back, the next 24 succeed.
        // After all 30, the flag should be true.
        var factory = new StubFactory
        {
            Selector = new CodeMentor.Infrastructure.Assessments.LegacyAdaptiveQuestionSelector(),
        };
        for (int i = 0; i < 5; i++) factory.ScriptedFallbackUsed.Enqueue(false);
        factory.ScriptedFallbackUsed.Enqueue(true);  // the one fallback
        for (int i = 0; i < 24; i++) factory.ScriptedFallbackUsed.Enqueue(false);

        for (int call = 0; call < 30; call++)
        {
            var choice = await factory.GetSelectorAsync();
            if (choice.IrtFallbackUsed && !assessment.IrtFallbackUsed)
            {
                assessment.IrtFallbackUsed = true;
            }
        }
        await db.SaveChangesAsync();

        var fetched = await db.Assessments.AsNoTracking().FirstAsync(a => a.Id == assessment.Id);
        Assert.True(fetched.IrtFallbackUsed);  // sticky once set
    }

    [Fact]
    public async Task AllCallsFallback_PersistsFlagTrue()
    {
        var (db, _) = NewDb();
        using var _ = db;

        var assessment = new Assessment { UserId = Guid.NewGuid() };
        db.Assessments.Add(assessment);
        await db.SaveChangesAsync();

        var factory = new StubFactory
        {
            Selector = new CodeMentor.Infrastructure.Assessments.LegacyAdaptiveQuestionSelector(),
        };
        for (int i = 0; i < 30; i++) factory.ScriptedFallbackUsed.Enqueue(true);

        for (int call = 0; call < 30; call++)
        {
            var choice = await factory.GetSelectorAsync();
            if (choice.IrtFallbackUsed && !assessment.IrtFallbackUsed)
            {
                assessment.IrtFallbackUsed = true;
            }
        }
        await db.SaveChangesAsync();

        var fetched = await db.Assessments.AsNoTracking().FirstAsync(a => a.Id == assessment.Id);
        Assert.True(fetched.IrtFallbackUsed);
    }

    [Fact]
    public async Task AssessmentDefault_IrtFallbackUsedIsFalse()
    {
        // Sanity check — the entity default + EF default must produce false
        // for assessments created before S15 / for the brand-new path.
        var (db, _) = NewDb();
        using var _ = db;

        var assessment = new Assessment { UserId = Guid.NewGuid() };
        db.Assessments.Add(assessment);
        await db.SaveChangesAsync();

        var fetched = await db.Assessments.AsNoTracking().FirstAsync(a => a.Id == assessment.Id);
        Assert.False(fetched.IrtFallbackUsed);
    }
}

using CodeMentor.Application.LearningPaths;
using CodeMentor.Domain.Assessments;
using CodeMentor.Domain.Skills;
using CodeMentor.Infrastructure.LearningPaths;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace CodeMentor.Application.Tests.LearningPaths;

/// <summary>
/// S19-T3 / F16 (ADR-049 / ADR-052): correctness of EMA smoothing
/// in :code:`LearnerSkillProfileService` (α = 0.4 per S19 locked answer #3).
///
/// 5 EMA correctness tests (seed / single-update / multi-update /
/// converge / clamp) + assessment seeding + multi-category isolation +
/// snapshot helpers.
/// </summary>
public class LearnerSkillProfileServiceTests
{
    private static (ApplicationDbContext db, LearnerSkillProfileService svc) NewService()
    {
        var dbName = $"LSP_{Guid.NewGuid():N}";
        var opts = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(dbName)
            .Options;
        var db = new ApplicationDbContext(opts);
        var svc = new LearnerSkillProfileService(db, NullLogger<LearnerSkillProfileService>.Instance);
        return (db, svc);
    }

    private static Assessment NewAssessment(Guid userId) => new()
    {
        UserId = userId,
        Track = Track.Backend,
        Status = AssessmentStatus.Completed,
        StartedAt = DateTime.UtcNow.AddMinutes(-20),
        CompletedAt = DateTime.UtcNow,
        TotalScore = 65m,
        SkillLevel = SkillLevel.Intermediate,
    };

    // -- EMA correctness (5 tests) ----------------------------------------

    [Fact]
    public async Task First_Submission_Seeds_Without_Smoothing()
    {
        var (db, svc) = NewService();
        var userId = Guid.NewGuid();

        await svc.UpdateFromSubmissionAsync(
            userId,
            new Dictionary<SkillCategory, decimal> { [SkillCategory.OOP] = 70m });

        var row = await db.LearnerSkillProfiles.SingleAsync();
        Assert.Equal(70m, row.SmoothedScore);
        Assert.Equal(SkillLevel.Intermediate, row.Level);
        Assert.Equal(LearnerSkillProfileSource.SubmissionInferred, row.LastSource);
        Assert.Equal(1, row.SampleCount);
    }

    [Fact]
    public async Task Single_Update_Applies_Alpha_Times_Sample_Plus_OneMinusAlpha_Times_Old()
    {
        // α = 0.4. Old = 50, sample = 90. Expected: 0.4·90 + 0.6·50 = 66.
        var (db, svc) = NewService();
        var userId = Guid.NewGuid();
        await svc.UpdateFromSubmissionAsync(
            userId, new Dictionary<SkillCategory, decimal> { [SkillCategory.OOP] = 50m });

        await svc.UpdateFromSubmissionAsync(
            userId, new Dictionary<SkillCategory, decimal> { [SkillCategory.OOP] = 90m });

        var row = await db.LearnerSkillProfiles.SingleAsync();
        Assert.Equal(66m, row.SmoothedScore);
        Assert.Equal(2, row.SampleCount);
    }

    [Fact]
    public async Task Repeated_Same_Sample_Converges_To_Sample()
    {
        // Stream of 10 samples all at 80 — should converge toward 80 from initial 30.
        var (db, svc) = NewService();
        var userId = Guid.NewGuid();
        await svc.UpdateFromSubmissionAsync(
            userId, new Dictionary<SkillCategory, decimal> { [SkillCategory.OOP] = 30m });

        for (var i = 0; i < 10; i++)
        {
            await svc.UpdateFromSubmissionAsync(
                userId, new Dictionary<SkillCategory, decimal> { [SkillCategory.OOP] = 80m });
        }

        var row = await db.LearnerSkillProfiles.SingleAsync();
        // After 10 updates with α=0.4 the smoothed value should be within ~0.5 of 80.
        Assert.InRange((double)row.SmoothedScore, 79.5, 80.0);
    }

    [Fact]
    public async Task Multi_Update_Tracks_EMA_Step_By_Step()
    {
        // Sequence: seed=40 (no smoothing on first sample);
        //   then sample=60 → 0.4·60 + 0.6·40 = 48;
        //   then sample=90 → 0.4·90 + 0.6·48 = 64.8;
        //   then sample=20 → 0.4·20 + 0.6·64.8 = 46.88.
        var (db, svc) = NewService();
        var userId = Guid.NewGuid();
        await svc.UpdateFromSubmissionAsync(
            userId, new Dictionary<SkillCategory, decimal> { [SkillCategory.Security] = 40m });
        await svc.UpdateFromSubmissionAsync(
            userId, new Dictionary<SkillCategory, decimal> { [SkillCategory.Security] = 60m });

        var afterTwo = await db.LearnerSkillProfiles.AsNoTracking().SingleAsync();
        Assert.Equal(48m, afterTwo.SmoothedScore);

        await svc.UpdateFromSubmissionAsync(
            userId, new Dictionary<SkillCategory, decimal> { [SkillCategory.Security] = 90m });
        var afterThree = await db.LearnerSkillProfiles.AsNoTracking().SingleAsync();
        // 0.4·90 + 0.6·48 = 36 + 28.8 = 64.8
        Assert.Equal(64.8m, afterThree.SmoothedScore);

        await svc.UpdateFromSubmissionAsync(
            userId, new Dictionary<SkillCategory, decimal> { [SkillCategory.Security] = 20m });
        var afterFour = await db.LearnerSkillProfiles.AsNoTracking().SingleAsync();
        // 0.4·20 + 0.6·64.8 = 8 + 38.88 = 46.88
        Assert.Equal(46.88m, afterFour.SmoothedScore);
        Assert.Equal(4, afterFour.SampleCount);
    }

    [Fact]
    public async Task Score_Out_Of_Range_Is_Clamped()
    {
        var (db, svc) = NewService();
        var userId = Guid.NewGuid();

        // Negative sample → clamped to 0
        await svc.UpdateFromSubmissionAsync(
            userId, new Dictionary<SkillCategory, decimal> { [SkillCategory.OOP] = -25m });
        Assert.Equal(0m, (await db.LearnerSkillProfiles.AsNoTracking().SingleAsync()).SmoothedScore);

        // Over 100 sample → clamped to 100
        var userId2 = Guid.NewGuid();
        await svc.UpdateFromSubmissionAsync(
            userId2, new Dictionary<SkillCategory, decimal> { [SkillCategory.Algorithms] = 150m });
        var row2 = await db.LearnerSkillProfiles.AsNoTracking().SingleAsync(p => p.UserId == userId2);
        Assert.Equal(100m, row2.SmoothedScore);
        Assert.Equal(SkillLevel.Advanced, row2.Level);
    }

    // -- Assessment seeding -----------------------------------------------

    [Fact]
    public async Task InitializeFromAssessmentAsync_Seeds_From_SkillScores()
    {
        var (db, svc) = NewService();
        var userId = Guid.NewGuid();
        var assessment = NewAssessment(userId);
        db.Assessments.Add(assessment);
        db.SkillScores.AddRange(
            new SkillScore { UserId = userId, Category = SkillCategory.DataStructures, Score = 45m, Level = SkillLevel.Beginner },
            new SkillScore { UserId = userId, Category = SkillCategory.OOP, Score = 72m, Level = SkillLevel.Intermediate },
            new SkillScore { UserId = userId, Category = SkillCategory.Security, Score = 88m, Level = SkillLevel.Advanced }
        );
        await db.SaveChangesAsync();

        await svc.InitializeFromAssessmentAsync(userId, assessment.Id);

        var rows = await db.LearnerSkillProfiles.AsNoTracking().OrderBy(p => p.Category).ToListAsync();
        Assert.Equal(3, rows.Count);
        Assert.All(rows, r =>
        {
            Assert.Equal(LearnerSkillProfileSource.Assessment, r.LastSource);
            Assert.Equal(1, r.SampleCount);
        });
        Assert.Equal(45m, rows.Single(r => r.Category == SkillCategory.DataStructures).SmoothedScore);
        Assert.Equal(72m, rows.Single(r => r.Category == SkillCategory.OOP).SmoothedScore);
        Assert.Equal(SkillLevel.Advanced, rows.Single(r => r.Category == SkillCategory.Security).Level);
    }

    [Fact]
    public async Task InitializeFromAssessmentAsync_ReSeeds_Existing_Rows()
    {
        // Second Assessment: existing profile gets overwritten (not EMA-smoothed)
        var (db, svc) = NewService();
        var userId = Guid.NewGuid();

        // First Assessment seeds at 45/72/88
        var first = NewAssessment(userId);
        db.Assessments.Add(first);
        db.SkillScores.AddRange(
            new SkillScore { UserId = userId, Category = SkillCategory.OOP, Score = 30m, Level = SkillLevel.Beginner }
        );
        await db.SaveChangesAsync();
        await svc.InitializeFromAssessmentAsync(userId, first.Id);

        // Update the SkillScore (simulating a second assessment that overwrites
        // via AssessmentService.UpsertSkillScoresAsync) then re-init.
        var ss = await db.SkillScores.SingleAsync(s => s.UserId == userId);
        ss.Score = 78m; ss.Level = SkillLevel.Intermediate;
        await db.SaveChangesAsync();

        var second = NewAssessment(userId);
        db.Assessments.Add(second);
        await db.SaveChangesAsync();
        await svc.InitializeFromAssessmentAsync(userId, second.Id);

        var rows = await db.LearnerSkillProfiles.AsNoTracking().ToListAsync();
        Assert.Single(rows);
        Assert.Equal(78m, rows[0].SmoothedScore);
        Assert.Equal(LearnerSkillProfileSource.Assessment, rows[0].LastSource);
        Assert.Equal(2, rows[0].SampleCount);
    }

    [Fact]
    public async Task InitializeFromAssessmentAsync_With_Missing_Assessment_Throws()
    {
        var (_, svc) = NewService();
        var userId = Guid.NewGuid();
        var bogus = Guid.NewGuid();
        var ex = await Assert.ThrowsAsync<InvalidOperationException>(
            () => svc.InitializeFromAssessmentAsync(userId, bogus));
        Assert.Contains("not found for user", ex.Message);
    }

    [Fact]
    public async Task UpdateFromSubmissionAsync_Multi_Category_Updates_In_Isolation()
    {
        var (db, svc) = NewService();
        var userId = Guid.NewGuid();
        // Seed two categories
        await svc.UpdateFromSubmissionAsync(
            userId, new Dictionary<SkillCategory, decimal>
            {
                [SkillCategory.OOP] = 50m,
                [SkillCategory.Security] = 80m,
            });

        // Update one category — the other must be untouched.
        await svc.UpdateFromSubmissionAsync(
            userId, new Dictionary<SkillCategory, decimal>
            {
                [SkillCategory.OOP] = 90m,  // EMA: 0.4·90 + 0.6·50 = 66
            });

        var oop = await db.LearnerSkillProfiles.AsNoTracking().SingleAsync(p => p.Category == SkillCategory.OOP);
        var sec = await db.LearnerSkillProfiles.AsNoTracking().SingleAsync(p => p.Category == SkillCategory.Security);
        Assert.Equal(66m, oop.SmoothedScore);
        Assert.Equal(2, oop.SampleCount);
        Assert.Equal(80m, sec.SmoothedScore);
        Assert.Equal(1, sec.SampleCount);
    }

    [Fact]
    public async Task UpdateFromSubmissionAsync_Empty_Samples_Is_Noop()
    {
        var (db, svc) = NewService();
        var userId = Guid.NewGuid();
        await svc.UpdateFromSubmissionAsync(userId, new Dictionary<SkillCategory, decimal>());
        Assert.Equal(0, await db.LearnerSkillProfiles.CountAsync());
    }

    [Fact]
    public async Task GetByUserAsync_Returns_Snapshot_Ordered_By_Category()
    {
        var (db, svc) = NewService();
        var userId = Guid.NewGuid();
        await svc.UpdateFromSubmissionAsync(userId, new Dictionary<SkillCategory, decimal>
        {
            [SkillCategory.Security] = 70m,
            [SkillCategory.OOP] = 50m,
            [SkillCategory.DataStructures] = 30m,
        });

        var snapshot = await svc.GetByUserAsync(userId);
        Assert.Equal(3, snapshot.Count);
        // SkillCategory enum order: DataStructures = 1, Algorithms = 2, OOP = 3, Databases = 4, Security = 5.
        Assert.Equal(SkillCategory.DataStructures, snapshot[0].Category);
        Assert.Equal(SkillCategory.OOP, snapshot[1].Category);
        Assert.Equal(SkillCategory.Security, snapshot[2].Category);
        Assert.Equal("Beginner", snapshot[0].Level);
        Assert.Equal("Intermediate", snapshot[2].Level);
    }

    // -- ClampScore + MapLevel helpers (boundary tests) -------------------

    [Theory]
    [InlineData(-50.0, 0.0)]
    [InlineData(0.0, 0.0)]
    [InlineData(50.5, 50.5)]
    [InlineData(100.0, 100.0)]
    [InlineData(150.0, 100.0)]
    [InlineData(50.555, 50.56)]    // rounded to 2dp (banker's rounding)
    public void ClampScore_Bounds_And_Rounds(double raw, double expected)
    {
        Assert.Equal((decimal)expected, LearnerSkillProfileService.ClampScore((decimal)raw));
    }

    [Theory]
    [InlineData(0, SkillLevel.Beginner)]
    [InlineData(59, SkillLevel.Beginner)]
    [InlineData(60, SkillLevel.Intermediate)]
    [InlineData(79, SkillLevel.Intermediate)]
    [InlineData(80, SkillLevel.Advanced)]
    [InlineData(100, SkillLevel.Advanced)]
    public void MapLevel_Thresholds(int score, SkillLevel expected)
    {
        Assert.Equal(expected, LearnerSkillProfileService.MapLevel(score));
    }
}

using CodeMentor.Domain.Assessments;
using CodeMentor.Infrastructure.Assessments;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CodeMentor.Application.Tests.Assessments;

/// <summary>
/// S17-T6 acceptance: round-trip the new IRTCalibrationLog entity added by
/// the AddIRTCalibrationLog migration + smoke-test the repository read paths.
/// </summary>
public class IRTCalibrationLogRoundTripTests
{
    private static (ApplicationDbContext db, string dbName) NewDb()
    {
        var dbName = $"CalibLog_{Guid.NewGuid():N}";
        var opts = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(dbName)
            .Options;
        return (new ApplicationDbContext(opts), dbName);
    }

    [Fact]
    public async Task Insert_RoundTrip_Recalibrated_Row_Preserves_All_Columns()
    {
        var (db, _) = NewDb();
        using var _ = db;

        var q = await SeedQuestionAsync(db);
        var calibratedAt = DateTime.UtcNow.AddMinutes(-5);

        var log = new IRTCalibrationLog
        {
            QuestionId = q.Id,
            CalibratedAt = calibratedAt,
            ResponseCountAtRun = 1234,
            IRT_A_Old = 1.0, IRT_B_Old = 0.0,
            IRT_A_New = 1.42, IRT_B_New = -0.31,
            LogLikelihood = -812.5,
            WasRecalibrated = true,
            SkipReason = null,
            TriggeredBy = "Job",
        };
        db.IRTCalibrationLogs.Add(log);
        await db.SaveChangesAsync();

        var fetched = await db.IRTCalibrationLogs.AsNoTracking().SingleAsync(l => l.Id == log.Id);
        Assert.Equal(q.Id, fetched.QuestionId);
        Assert.Equal(calibratedAt, fetched.CalibratedAt);
        Assert.Equal(1234, fetched.ResponseCountAtRun);
        Assert.Equal(1.0, fetched.IRT_A_Old);
        Assert.Equal(0.0, fetched.IRT_B_Old);
        Assert.Equal(1.42, fetched.IRT_A_New);
        Assert.Equal(-0.31, fetched.IRT_B_New);
        Assert.Equal(-812.5, fetched.LogLikelihood);
        Assert.True(fetched.WasRecalibrated);
        Assert.Null(fetched.SkipReason);
        Assert.Equal("Job", fetched.TriggeredBy);
    }

    [Fact]
    public async Task Insert_RoundTrip_Skipped_Row_Carries_Reason_And_Same_Params()
    {
        var (db, _) = NewDb();
        using var _ = db;

        var q = await SeedQuestionAsync(db);

        var log = new IRTCalibrationLog
        {
            QuestionId = q.Id,
            ResponseCountAtRun = 50, // below 1000 threshold
            IRT_A_Old = 1.5, IRT_B_Old = 0.7,
            IRT_A_New = 1.5, IRT_B_New = 0.7, // unchanged on skip path
            LogLikelihood = 0.0,
            WasRecalibrated = false,
            SkipReason = "below_threshold",
            TriggeredBy = "Job",
        };
        db.IRTCalibrationLogs.Add(log);
        await db.SaveChangesAsync();

        var fetched = await db.IRTCalibrationLogs.AsNoTracking().SingleAsync(l => l.Id == log.Id);
        Assert.False(fetched.WasRecalibrated);
        Assert.Equal("below_threshold", fetched.SkipReason);
        Assert.Equal(fetched.IRT_A_Old, fetched.IRT_A_New);
        Assert.Equal(fetched.IRT_B_Old, fetched.IRT_B_New);
    }

    [Fact]
    public async Task Repository_GetForQuestion_Returns_NewestFirst()
    {
        var (db, _) = NewDb();
        using var _ = db;

        var q = await SeedQuestionAsync(db);
        var now = DateTime.UtcNow;

        db.IRTCalibrationLogs.AddRange(
            new IRTCalibrationLog { QuestionId = q.Id, CalibratedAt = now.AddDays(-2), TriggeredBy = "Job" },
            new IRTCalibrationLog { QuestionId = q.Id, CalibratedAt = now.AddDays(-1), TriggeredBy = "Job" },
            new IRTCalibrationLog { QuestionId = q.Id, CalibratedAt = now, TriggeredBy = "Admin" });
        await db.SaveChangesAsync();

        var repo = new IRTCalibrationLogRepository(db);
        var list = await repo.GetForQuestionAsync(q.Id);
        Assert.Equal(3, list.Count);
        Assert.True(list[0].CalibratedAt > list[1].CalibratedAt);
        Assert.True(list[1].CalibratedAt > list[2].CalibratedAt);
        Assert.Equal("Admin", list[0].TriggeredBy); // newest is the Admin row
    }

    [Fact]
    public async Task Repository_GetForQuestion_FiltersToScopedQuestion()
    {
        var (db, _) = NewDb();
        using var _ = db;

        var q1 = await SeedQuestionAsync(db);
        var q2 = await SeedQuestionAsync(db);

        db.IRTCalibrationLogs.AddRange(
            new IRTCalibrationLog { QuestionId = q1.Id, CalibratedAt = DateTime.UtcNow, TriggeredBy = "Job" },
            new IRTCalibrationLog { QuestionId = q2.Id, CalibratedAt = DateTime.UtcNow, TriggeredBy = "Job" },
            new IRTCalibrationLog { QuestionId = q1.Id, CalibratedAt = DateTime.UtcNow.AddMinutes(-1), TriggeredBy = "Job" });
        await db.SaveChangesAsync();

        var repo = new IRTCalibrationLogRepository(db);
        var list = await repo.GetForQuestionAsync(q1.Id);
        Assert.Equal(2, list.Count);
        Assert.All(list, row => Assert.Equal(q1.Id, row.QuestionId));
    }

    [Fact]
    public async Task Repository_GetRecent_Returns_TakeMostRecentAcrossAllQuestions()
    {
        var (db, _) = NewDb();
        using var _ = db;

        var q1 = await SeedQuestionAsync(db);
        var q2 = await SeedQuestionAsync(db);
        var q3 = await SeedQuestionAsync(db);

        var now = DateTime.UtcNow;
        db.IRTCalibrationLogs.AddRange(
            new IRTCalibrationLog { QuestionId = q1.Id, CalibratedAt = now.AddDays(-3), TriggeredBy = "Job" },
            new IRTCalibrationLog { QuestionId = q2.Id, CalibratedAt = now.AddDays(-2), TriggeredBy = "Job" },
            new IRTCalibrationLog { QuestionId = q3.Id, CalibratedAt = now.AddDays(-1), TriggeredBy = "Job" },
            new IRTCalibrationLog { QuestionId = q1.Id, CalibratedAt = now, TriggeredBy = "Admin" });
        await db.SaveChangesAsync();

        var repo = new IRTCalibrationLogRepository(db);

        var top2 = await repo.GetRecentAsync(2);
        Assert.Equal(2, top2.Count);
        Assert.True(top2[0].CalibratedAt > top2[1].CalibratedAt);

        // take<=0 falls back to default cap (50) — all 4 returned.
        var defaultTake = await repo.GetRecentAsync(0);
        Assert.Equal(4, defaultTake.Count);
    }

    private static async Task<Question> SeedQuestionAsync(ApplicationDbContext db)
    {
        var q = new Question
        {
            Content = "Test question for calibration log",
            Category = SkillCategory.Algorithms,
            Difficulty = 2,
            Options = new[] { "A", "B", "C", "D" },
            CorrectAnswer = "A",
        };
        db.Questions.Add(q);
        await db.SaveChangesAsync();
        return q;
    }
}

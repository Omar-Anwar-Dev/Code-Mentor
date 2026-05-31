using CodeMentor.Domain.Assessments;
using CodeMentor.Infrastructure.Assessments;
using CodeMentor.Infrastructure.CodeReview;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace CodeMentor.Application.Tests.Assessments;

/// <summary>
/// S17-T5 acceptance: integration tests for <see cref="RecalibrateIRTJob"/>.
///
/// Per implementation-plan S17-T5 the headline acceptance is "Monte Carlo 50
/// trials × 1000 simulated responses per item, recalibration recovers params
/// within ±0.2 (a) and ±0.3 (b) in ≥95% of trials". The Monte Carlo *math*
/// is covered at the IRT engine level by S15-T1's
/// <c>tests/test_irt_engine.py::TestRecalibrateItem</c> (which cites ADR-055
/// directly). These tests cover the *job orchestration* — the C# side that
/// shepherds Questions, threshold-gates, calls the AI service, persists
/// updates, and writes the calibration log.
/// </summary>
public class RecalibrateIRTJobTests
{
    private static (ApplicationDbContext db, string dbName) NewDb()
    {
        var dbName = $"RecalibJob_{Guid.NewGuid():N}";
        var opts = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(dbName)
            .Options;
        return (new ApplicationDbContext(opts), dbName);
    }

    private static async Task<Guid> SeedAssessmentWithResponseAsync(
        ApplicationDbContext db, Guid userId, Guid questionId, bool correct, int orderIndex = 1,
        SkillCategory category = SkillCategory.Algorithms)
    {
        var assessment = new Assessment
        {
            UserId = userId,
            Track = Track.Backend,
            Status = AssessmentStatus.Completed,
            StartedAt = DateTime.UtcNow.AddMinutes(-15),
            CompletedAt = DateTime.UtcNow,
            DurationSec = 900,
        };
        db.Assessments.Add(assessment);
        var response = new AssessmentResponse
        {
            AssessmentId = assessment.Id,
            QuestionId = questionId,
            UserAnswer = correct ? "A" : "B",
            IsCorrect = correct,
            OrderIndex = orderIndex,
            Category = category,
            Difficulty = 2,
            TimeSpentSec = 5,
        };
        db.AssessmentResponses.Add(response);
        await db.SaveChangesAsync();
        return assessment.Id;
    }

    private static async Task<Question> SeedQuestionAsync(
        ApplicationDbContext db,
        double a = 1.0, double b = 0.0,
        CalibrationSource calibration = CalibrationSource.AI)
    {
        var q = new Question
        {
            Content = "Test question for recalibration",
            Category = SkillCategory.Algorithms,
            Difficulty = 2,
            Options = new[] { "A", "B", "C", "D" },
            CorrectAnswer = "A",
            IRT_A = a,
            IRT_B = b,
            CalibrationSource = calibration,
        };
        db.Questions.Add(q);
        await db.SaveChangesAsync();
        return q;
    }

    [Fact]
    public async Task HappyPath_QuestionAtThreshold_RecalibratedAndLogged()
    {
        var (db, _) = NewDb();
        using var _ = db;

        var q = await SeedQuestionAsync(db, a: 1.0, b: 0.0);

        // Seed exactly 5 responses (5 different assessments, each with 1 response).
        for (int i = 0; i < 5; i++)
        {
            var userId = Guid.NewGuid();
            await SeedAssessmentWithResponseAsync(db, userId, q.Id, correct: i % 2 == 0, orderIndex: 1);
        }

        var ai = new RecordingFakeIrtRefit { RecalibrateReturns = new IrtRecalibrateResponse(1.42, -0.31, -812.5, 5) };
        var job = new RecalibrateIRTJob(db, ai, NullLogger<RecalibrateIRTJob>.Instance);
        await job.RunAsync(recalibrationThreshold: 5, CancellationToken.None);

        // Question params updated + calibration source flipped to Empirical.
        var refreshed = await db.Questions.AsNoTracking().SingleAsync(x => x.Id == q.Id);
        Assert.Equal(1.42, refreshed.IRT_A);
        Assert.Equal(-0.31, refreshed.IRT_B);
        Assert.Equal(CalibrationSource.Empirical, refreshed.CalibrationSource);

        // Calibration log row written with WasRecalibrated=true and the right shape.
        var log = await db.IRTCalibrationLogs.AsNoTracking().SingleAsync(l => l.QuestionId == q.Id);
        Assert.True(log.WasRecalibrated);
        Assert.Null(log.SkipReason);
        Assert.Equal(5, log.ResponseCountAtRun);
        Assert.Equal(1.0, log.IRT_A_Old);
        Assert.Equal(0.0, log.IRT_B_Old);
        Assert.Equal(1.42, log.IRT_A_New);
        Assert.Equal(-0.31, log.IRT_B_New);
        Assert.Equal(-812.5, log.LogLikelihood);
        Assert.Equal("Job", log.TriggeredBy);

        // AI service was called for theta-estimation (5 assessments → 5 calls)
        // and once for recalibration.
        Assert.Equal(5, ai.EstimateThetaCalls.Count);
        Assert.Single(ai.RecalibrateCalls);
        Assert.Equal(5, ai.RecalibrateCalls[0].Responses.Count);
    }

    [Fact]
    public async Task BelowThreshold_QuestionLeftUnchanged_LoggedAsSkipped()
    {
        var (db, _) = NewDb();
        using var _ = db;

        var q = await SeedQuestionAsync(db, a: 1.0, b: 0.0);

        // Only 3 responses — below the test threshold of 5.
        for (int i = 0; i < 3; i++)
        {
            var userId = Guid.NewGuid();
            await SeedAssessmentWithResponseAsync(db, userId, q.Id, correct: true);
        }

        var ai = new RecordingFakeIrtRefit();
        var job = new RecalibrateIRTJob(db, ai, NullLogger<RecalibrateIRTJob>.Instance);
        await job.RunAsync(recalibrationThreshold: 5, CancellationToken.None);

        // Question params unchanged.
        var refreshed = await db.Questions.AsNoTracking().SingleAsync(x => x.Id == q.Id);
        Assert.Equal(1.0, refreshed.IRT_A);
        Assert.Equal(0.0, refreshed.IRT_B);
        Assert.Equal(CalibrationSource.AI, refreshed.CalibrationSource);

        // Skip log row written.
        var log = await db.IRTCalibrationLogs.AsNoTracking().SingleAsync(l => l.QuestionId == q.Id);
        Assert.False(log.WasRecalibrated);
        Assert.Equal("below_threshold", log.SkipReason);
        Assert.Equal(3, log.ResponseCountAtRun);
        // Skip-path keeps the params unchanged on the log row too.
        Assert.Equal(log.IRT_A_Old, log.IRT_A_New);
        Assert.Equal(log.IRT_B_Old, log.IRT_B_New);

        // AI service was NOT called.
        Assert.Empty(ai.EstimateThetaCalls);
        Assert.Empty(ai.RecalibrateCalls);
    }

    [Fact]
    public async Task AdminLocked_NeverRecalibrates_LoggedAsSkipped()
    {
        var (db, _) = NewDb();
        using var _ = db;

        // CalibrationSource = Admin. Should be skipped even with 1000+ responses.
        var q = await SeedQuestionAsync(db, a: 2.0, b: 1.5, calibration: CalibrationSource.Admin);
        for (int i = 0; i < 10; i++)
        {
            var userId = Guid.NewGuid();
            await SeedAssessmentWithResponseAsync(db, userId, q.Id, correct: true);
        }

        var ai = new RecordingFakeIrtRefit();
        var job = new RecalibrateIRTJob(db, ai, NullLogger<RecalibrateIRTJob>.Instance);
        await job.RunAsync(recalibrationThreshold: 5, CancellationToken.None);

        // Question params PRESERVED — admin override is sacred per S17 hard rule + ADR-055.
        var refreshed = await db.Questions.AsNoTracking().SingleAsync(x => x.Id == q.Id);
        Assert.Equal(2.0, refreshed.IRT_A);
        Assert.Equal(1.5, refreshed.IRT_B);
        Assert.Equal(CalibrationSource.Admin, refreshed.CalibrationSource);

        // Skip log row written with the admin-locked reason.
        var log = await db.IRTCalibrationLogs.AsNoTracking().SingleAsync(l => l.QuestionId == q.Id);
        Assert.False(log.WasRecalibrated);
        Assert.Equal("admin_locked", log.SkipReason);
        // Even response counting is short-circuited when admin-locked (no need to read the DB).
        Assert.Equal(0, log.ResponseCountAtRun);

        // AI service was NOT called.
        Assert.Empty(ai.EstimateThetaCalls);
        Assert.Empty(ai.RecalibrateCalls);
    }

    [Fact]
    public async Task AiServiceDown_LogsSkipAndContinuesPass()
    {
        // Per the job's resilience contract: an AI failure on ONE question should
        // not stop the whole pass. Other questions still get processed.
        var (db, _) = NewDb();
        using var _ = db;

        var failingQ = await SeedQuestionAsync(db);
        var goodQ = await SeedQuestionAsync(db);

        // Both at threshold.
        for (int i = 0; i < 5; i++)
        {
            var u1 = Guid.NewGuid();
            await SeedAssessmentWithResponseAsync(db, u1, failingQ.Id, correct: true);
            var u2 = Guid.NewGuid();
            await SeedAssessmentWithResponseAsync(db, u2, goodQ.Id, correct: false);
        }

        var ai = new RecordingFakeIrtRefit
        {
            RecalibrateReturns = new IrtRecalibrateResponse(1.5, 0.5, -100.0, 5),
            ThrowOnRecalibrateForQuestionsContaining = failingQ.Id.ToString("N")[..6],
        };

        var job = new RecalibrateIRTJob(db, ai, NullLogger<RecalibrateIRTJob>.Instance);
        await job.RunAsync(recalibrationThreshold: 5, CancellationToken.None);

        // The failing Question is unchanged + a skip log with ai_service_unavailable.
        var failingRow = await db.Questions.AsNoTracking().SingleAsync(x => x.Id == failingQ.Id);
        Assert.Equal(1.0, failingRow.IRT_A);
        Assert.Equal(CalibrationSource.AI, failingRow.CalibrationSource);
        var failingLog = await db.IRTCalibrationLogs.AsNoTracking().SingleAsync(l => l.QuestionId == failingQ.Id);
        Assert.False(failingLog.WasRecalibrated);
        Assert.Equal("ai_service_unavailable", failingLog.SkipReason);

        // The good Question is recalibrated + log shows success.
        var goodRow = await db.Questions.AsNoTracking().SingleAsync(x => x.Id == goodQ.Id);
        Assert.Equal(1.5, goodRow.IRT_A);
        Assert.Equal(0.5, goodRow.IRT_B);
        Assert.Equal(CalibrationSource.Empirical, goodRow.CalibrationSource);
        var goodLog = await db.IRTCalibrationLogs.AsNoTracking().SingleAsync(l => l.QuestionId == goodQ.Id);
        Assert.True(goodLog.WasRecalibrated);
    }

    [Fact]
    public async Task MultipleQuestions_AllInspectedInOnePass_OneLogPerQuestion()
    {
        var (db, _) = NewDb();
        using var _ = db;

        var qBelow = await SeedQuestionAsync(db);
        var qAdmin = await SeedQuestionAsync(db, calibration: CalibrationSource.Admin);
        var qHappy = await SeedQuestionAsync(db);

        // qBelow gets 1 response; qAdmin gets 5 (but skipped); qHappy gets 5.
        var u = Guid.NewGuid();
        await SeedAssessmentWithResponseAsync(db, u, qBelow.Id, correct: true);
        for (int i = 0; i < 5; i++)
        {
            await SeedAssessmentWithResponseAsync(db, Guid.NewGuid(), qAdmin.Id, correct: true);
            await SeedAssessmentWithResponseAsync(db, Guid.NewGuid(), qHappy.Id, correct: false);
        }

        var ai = new RecordingFakeIrtRefit { RecalibrateReturns = new IrtRecalibrateResponse(0.9, 1.1, -50.0, 5) };
        var job = new RecalibrateIRTJob(db, ai, NullLogger<RecalibrateIRTJob>.Instance);
        await job.RunAsync(recalibrationThreshold: 5, CancellationToken.None);

        // Each question has exactly one log row from this pass.
        Assert.Equal(3, await db.IRTCalibrationLogs.CountAsync());
        Assert.Equal("below_threshold",
            (await db.IRTCalibrationLogs.AsNoTracking().SingleAsync(l => l.QuestionId == qBelow.Id)).SkipReason);
        Assert.Equal("admin_locked",
            (await db.IRTCalibrationLogs.AsNoTracking().SingleAsync(l => l.QuestionId == qAdmin.Id)).SkipReason);
        Assert.True(
            (await db.IRTCalibrationLogs.AsNoTracking().SingleAsync(l => l.QuestionId == qHappy.Id)).WasRecalibrated);
    }

    /// <summary>Hand-rolled IIrtRefit fake. Records calls + supports an
    /// optional throw-on-recalibrate trigger keyed on a substring of the
    /// correlation id (which contains the questionId).</summary>
    private sealed class RecordingFakeIrtRefit : IIrtRefit
    {
        public List<IrtEstimateThetaRequest> EstimateThetaCalls { get; } = new();
        public List<IrtRecalibrateRequest> RecalibrateCalls { get; } = new();
        public IrtRecalibrateResponse RecalibrateReturns { get; set; } =
            new(1.0, 0.0, 0.0, 0);
        public string? ThrowOnRecalibrateForQuestionsContaining { get; set; }

        public Task<IrtSelectNextResponse> SelectNextAsync(
            IrtSelectNextRequest body, string correlationId, CancellationToken ct)
            => throw new NotImplementedException("not used by RecalibrateIRTJob tests");

        public Task<IrtRecalibrateResponse> RecalibrateAsync(
            IrtRecalibrateRequest body, string correlationId, CancellationToken ct)
        {
            if (ThrowOnRecalibrateForQuestionsContaining is { } substring
                && correlationId.Contains(substring, StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException("simulated AI service failure");
            }
            RecalibrateCalls.Add(body);
            return Task.FromResult(RecalibrateReturns);
        }

        public Task<IrtEstimateThetaResponse> EstimateThetaAsync(
            IrtEstimateThetaRequest body, string correlationId, CancellationToken ct)
        {
            EstimateThetaCalls.Add(body);
            // Deterministic theta — value irrelevant since the recalibrate fake
            // returns canned (a, b) regardless of input.
            return Task.FromResult(new IrtEstimateThetaResponse(0.7, body.Responses.Count));
        }
    }
}

using CodeMentor.Domain.Assessments;
using CodeMentor.Infrastructure.CodeReview;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace CodeMentor.Infrastructure.Assessments;

/// <summary>
/// S17-T5 / F15 (ADR-049 / ADR-055): weekly Hangfire job that empirically
/// recalibrates the IRT (a, b) parameters for Questions that have crossed
/// the response-count threshold.
///
/// Scheduled at <c>"0 2 * * 1"</c> (Mondays 02:00 UTC) via a recurring-job
/// registration in <c>Program.cs</c>. The cron choice is dead-time across
/// all reasonable timezones and never collides with M3 supervisor
/// rehearsal windows.
///
/// Per ADR-055 the production threshold is &gt;= 1000 responses; pre-defense
/// dogfood scale is ~50 respondents per item, so NO item will recalibrate
/// pre-defense — the infrastructure ships ready for post-defense scale-up,
/// and EVERY pass writes a per-Question audit row to <see cref="IRTCalibrationLog"/>
/// (with <c>WasRecalibrated=false</c> + <c>SkipReason="below_threshold"</c>
/// on the skip path).
///
/// Pipeline per Question:
///   1. If <c>CalibrationSource == Admin</c> → log skip (<c>"admin_locked"</c>) + continue.
///   2. Count responses; if &lt; threshold → log skip (<c>"below_threshold"</c>) + continue.
///   3. For each Assessment that includes a response to this Question:
///      a. Build (a, b, correct) tuples for ALL responses in the assessment.
///      b. Call AI service <c>/api/irt/estimate-theta</c> → assessment's final theta.
///      c. For each response in this assessment that targets THIS Question,
///         append (theta, isCorrect) to the per-Question response matrix.
///   4. Call AI service <c>/api/irt/recalibrate</c> with the response matrix.
///   5. Update Question.IRT_A / IRT_B / CalibrationSource = Empirical.
///   6. Write IRTCalibrationLog row with WasRecalibrated=true + before/after
///      params + log-likelihood + responseCountAtRun.
/// </summary>
public sealed class RecalibrateIRTJob
{
    /// <summary>Per ADR-055 the production threshold for joint MLE recalibration is 1000 responses.</summary>
    public const int DefaultRecalibrationThreshold = 1000;

    private readonly ApplicationDbContext _db;
    private readonly IIrtRefit _ai;
    private readonly ILogger<RecalibrateIRTJob> _log;

    public RecalibrateIRTJob(
        ApplicationDbContext db,
        IIrtRefit ai,
        ILogger<RecalibrateIRTJob> log)
    {
        _db = db;
        _ai = ai;
        _log = log;
    }

    /// <summary>The Hangfire entry-point. <paramref name="recalibrationThreshold"/>
    /// defaults to <see cref="DefaultRecalibrationThreshold"/>; tests override
    /// it via the secondary <see cref="RunAsync"/> overload to exercise the
    /// recalibration path with much smaller seeded data.</summary>
    public Task ExecuteAsync(CancellationToken ct = default)
        => RunAsync(DefaultRecalibrationThreshold, ct);

    public async Task RunAsync(int recalibrationThreshold, CancellationToken ct)
    {
        var startedAt = DateTime.UtcNow;
        _log.LogInformation(
            "RecalibrateIRTJob start: threshold={Threshold}, startedAt={StartedAt:o}",
            recalibrationThreshold, startedAt);

        var questions = await _db.Questions
            .Where(q => q.IsActive)
            .ToListAsync(ct);

        var inspected = 0;
        var recalibrated = 0;
        var skippedBelowThreshold = 0;
        var skippedAdminLocked = 0;
        var failed = 0;

        foreach (var question in questions)
        {
            ct.ThrowIfCancellationRequested();
            inspected++;

            // Step 1 — admin-lock guard.
            if (question.CalibrationSource == CalibrationSource.Admin)
            {
                _db.IRTCalibrationLogs.Add(MakeSkipLog(question, 0, "admin_locked"));
                skippedAdminLocked++;
                continue;
            }

            // Step 2 — response-count threshold.
            var responseCount = await _db.AssessmentResponses
                .CountAsync(r => r.QuestionId == question.Id, ct);
            if (responseCount < recalibrationThreshold)
            {
                _db.IRTCalibrationLogs.Add(MakeSkipLog(question, responseCount, "below_threshold"));
                skippedBelowThreshold++;
                continue;
            }

            // Step 3 — assemble response matrix per assessment.
            try
            {
                var responseMatrix = await BuildResponseMatrixAsync(question.Id, ct);

                // Step 4 — joint MLE recalibration.
                var correlationId = $"recalibrate-{question.Id:N}";
                var recal = await _ai.RecalibrateAsync(
                    new IrtRecalibrateRequest(
                        responseMatrix
                            .Select(t => new IrtItemResponse(t.Theta, t.Correct))
                            .ToList()),
                    correlationId,
                    ct);

                // Step 5 — apply.
                var aOld = question.IRT_A;
                var bOld = question.IRT_B;
                question.IRT_A = recal.A;
                question.IRT_B = recal.B;
                question.CalibrationSource = CalibrationSource.Empirical;

                // Step 6 — log success.
                _db.IRTCalibrationLogs.Add(new IRTCalibrationLog
                {
                    QuestionId = question.Id,
                    CalibratedAt = DateTime.UtcNow,
                    ResponseCountAtRun = responseCount,
                    IRT_A_Old = aOld,
                    IRT_B_Old = bOld,
                    IRT_A_New = recal.A,
                    IRT_B_New = recal.B,
                    LogLikelihood = recal.LogLikelihood,
                    WasRecalibrated = true,
                    SkipReason = null,
                    TriggeredBy = "Job",
                });
                recalibrated++;
            }
            catch (OperationCanceledException)
            {
                throw;
            }
            catch (Exception ex)
            {
                // AI service unavailable / network glitch / model bug — log and continue
                // so one failure doesn't take down the whole pass. Hangfire will run
                // again next Monday; the unaffected items still get fresh entries.
                _log.LogWarning(ex,
                    "RecalibrateIRTJob: question {QuestionId} recalibration failed; logging skip and continuing.",
                    question.Id);
                _db.IRTCalibrationLogs.Add(MakeSkipLog(question, responseCount, "ai_service_unavailable"));
                failed++;
            }
        }

        await _db.SaveChangesAsync(ct);

        _log.LogInformation(
            "RecalibrateIRTJob done in {DurationMs}ms: inspected={Inspected} recalibrated={Recalibrated} " +
            "skipped_threshold={SkippedThreshold} skipped_admin={SkippedAdmin} failed={Failed}",
            (int)(DateTime.UtcNow - startedAt).TotalMilliseconds,
            inspected, recalibrated, skippedBelowThreshold, skippedAdminLocked, failed);
    }

    /// <summary>Build the recalibration matrix for one Question by walking its
    /// responses, grouping them by assessment, computing the assessment-final
    /// theta via <c>/api/irt/estimate-theta</c>, and pairing that theta with
    /// each response to the target Question.</summary>
    private async Task<List<(double Theta, bool Correct)>> BuildResponseMatrixAsync(
        Guid targetQuestionId, CancellationToken ct)
    {
        // Find every assessment that has a response targeting this question.
        var assessmentIds = await _db.AssessmentResponses
            .Where(r => r.QuestionId == targetQuestionId)
            .Select(r => r.AssessmentId)
            .Distinct()
            .ToListAsync(ct);

        // For each assessment, pull all responses + each response's question (a, b)
        // so we can hand the full history to /api/irt/estimate-theta.
        var matrix = new List<(double Theta, bool Correct)>(capacity: assessmentIds.Count * 2);

        foreach (var assessmentId in assessmentIds)
        {
            ct.ThrowIfCancellationRequested();

            var responses = await _db.AssessmentResponses
                .Where(r => r.AssessmentId == assessmentId)
                .Join(
                    _db.Questions,
                    r => r.QuestionId,
                    q => q.Id,
                    (r, q) => new
                    {
                        r.QuestionId,
                        r.IsCorrect,
                        QuestionA = q.IRT_A,
                        QuestionB = q.IRT_B,
                    })
                .ToListAsync(ct);

            if (responses.Count == 0) continue;

            // Estimate the assessment's final theta from its full response history.
            var estimateRequest = new IrtEstimateThetaRequest(
                responses.Select(r => new IrtPriorResponseDto(r.QuestionA, r.QuestionB, r.IsCorrect)).ToList());
            var thetaResponse = await _ai.EstimateThetaAsync(
                estimateRequest,
                $"estimate-theta-{assessmentId:N}",
                ct);
            var assessmentTheta = thetaResponse.Theta;

            // For each response in this assessment that targets the recalibrated
            // question, append (assessmentTheta, isCorrect) to the matrix.
            foreach (var r in responses.Where(r => r.QuestionId == targetQuestionId))
            {
                matrix.Add((assessmentTheta, r.IsCorrect));
            }
        }

        return matrix;
    }

    private static IRTCalibrationLog MakeSkipLog(Question question, int responseCount, string reason) =>
        new IRTCalibrationLog
        {
            QuestionId = question.Id,
            CalibratedAt = DateTime.UtcNow,
            ResponseCountAtRun = responseCount,
            IRT_A_Old = question.IRT_A,
            IRT_B_Old = question.IRT_B,
            // On the skip path the params don't change.
            IRT_A_New = question.IRT_A,
            IRT_B_New = question.IRT_B,
            LogLikelihood = 0.0,
            WasRecalibrated = false,
            SkipReason = reason,
            TriggeredBy = "Job",
        };
}

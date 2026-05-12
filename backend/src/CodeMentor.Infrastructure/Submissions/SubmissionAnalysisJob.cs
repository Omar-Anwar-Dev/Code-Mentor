using System.Diagnostics;
using System.Text.Json;
using CodeMentor.Application.CodeReview;
using CodeMentor.Application.Gamification;
using CodeMentor.Application.MentorChat;
using CodeMentor.Application.Skills;
using CodeMentor.Application.Submissions;
using CodeMentor.Domain.Gamification;
using CodeMentor.Domain.Submissions;
using CodeMentor.Domain.Tasks;
using CodeMentor.Infrastructure.Persistence;
using Hangfire;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace CodeMentor.Infrastructure.Submissions;

/// <summary>
/// Sprint 5 (S5-T3): full submission-analysis pipeline.
///   1. Pending → Processing
///   2. Fetch code as ZIP (blob download OR GitHub tarball → repackaged)
///   3. Call the AI service /api/analyze-zip
///   4. Persist one StaticAnalysisResult row per tool in the response
///   5. Processing → Completed (or Failed with ErrorMessage)
///
/// Retry + timeout metadata preserved from Sprint 4 (S4-T6):
///   3 retries with 10/60/300s backoff, 10-minute hard timeout.
///
/// S5-T5 (graceful degradation for AI outage), S5-T10 (correlation-id header),
/// and S5-T11 (per-phase duration logging) build on this scaffold.
/// </summary>
public class SubmissionAnalysisJob
{
    /// <summary>S5-T5: delay before re-running the pipeline after an AI outage.</summary>
    public static readonly TimeSpan AiRetryDelay = TimeSpan.FromMinutes(15);

    /// <summary>
    /// S5-T5: after this many total attempts (initial + retries), stop
    /// auto-retrying on AI-unavailable and let the learner manually retry.
    /// </summary>
    public const int MaxAutoRetryAttempts = 2;

    /// <summary>
    /// S6-T4: minimum AI overallScore that auto-marks the corresponding active
    /// PathTask as Completed and recomputes <see cref="LearningPath.ProgressPercent"/>.
    /// Documented in ADR-026 (PRD F3 path-progress automation).
    /// </summary>
    public const int PassingScoreThreshold = 70;

    private readonly ApplicationDbContext _db;
    private readonly ISubmissionCodeLoader _codeLoader;
    private readonly IAiReviewClient _aiClient;
    private readonly IAiReviewModeProvider _modeProvider;
    private readonly IStaticToolSelector _toolSelector;
    private readonly ISubmissionAnalysisScheduler _scheduler;
    private readonly IFeedbackAggregator _feedbackAggregator;
    private readonly ICodeQualityScoreUpdater _codeQualityUpdater;
    private readonly IXpService _xp;
    private readonly IBadgeService _badges;
    private readonly IMentorChatIndexScheduler _mentorIndexScheduler;
    // S12-T8 / F14 (ADR-040): nullable so existing tests + dev paths that don't
    // configure F14 can still construct the job (the snapshot phase is a no-op
    // when null). Production DI registers a real implementation.
    private readonly ILearnerSnapshotService? _snapshotService;
    private readonly ILogger<SubmissionAnalysisJob> _logger;

    public SubmissionAnalysisJob(
        ApplicationDbContext db,
        ISubmissionCodeLoader codeLoader,
        IAiReviewClient aiClient,
        IAiReviewModeProvider modeProvider,
        IStaticToolSelector toolSelector,
        ISubmissionAnalysisScheduler scheduler,
        IFeedbackAggregator feedbackAggregator,
        ICodeQualityScoreUpdater codeQualityUpdater,
        IXpService xp,
        IBadgeService badges,
        IMentorChatIndexScheduler mentorIndexScheduler,
        ILogger<SubmissionAnalysisJob> logger,
        ILearnerSnapshotService? snapshotService = null)
    {
        _db = db;
        _codeLoader = codeLoader;
        _aiClient = aiClient;
        _modeProvider = modeProvider;
        _toolSelector = toolSelector;
        _scheduler = scheduler;
        _feedbackAggregator = feedbackAggregator;
        _codeQualityUpdater = codeQualityUpdater;
        _xp = xp;
        _badges = badges;
        _mentorIndexScheduler = mentorIndexScheduler;
        _snapshotService = snapshotService;
        _logger = logger;
    }

    [AutomaticRetry(Attempts = 3, DelaysInSeconds = new[] { 10, 60, 300 })]
    [DisableConcurrentExecution(timeoutInSeconds: 600)]
    public async Task RunAsync(Guid submissionId, CancellationToken ct = default)
    {
        var submission = await _db.Submissions.FirstOrDefaultAsync(s => s.Id == submissionId, ct);
        if (submission is null)
        {
            _logger.LogWarning("SubmissionAnalysisJob: submission {SubmissionId} not found", submissionId);
            return;
        }

        // S5-T5: allow re-entry for scheduled AI retries (submission stays Completed
        // during the wait, only AiAnalysisStatus=Pending signals a retry is due).
        var isFirstRun = submission.Status == SubmissionStatus.Pending;
        var isAiRetry = submission.Status == SubmissionStatus.Completed
                     && submission.AiAnalysisStatus == AiAnalysisStatus.Pending;

        if (!isFirstRun && !isAiRetry)
        {
            _logger.LogInformation(
                "SubmissionAnalysisJob: submission {SubmissionId} is {Status}/{AiStatus}, skipping",
                submissionId, submission.Status, submission.AiAnalysisStatus);
            return;
        }

        var correlationId = submission.Id.ToString("N");
        using var scope = _logger.BeginScope("submission-analysis {SubmissionId} corr={CorrelationId}", submissionId, correlationId);

        await TransitionToProcessingAsync(submission, ct);

        var totalStopwatch = Stopwatch.StartNew();

        try
        {
            // ── Fetch phase ──
            var fetchStopwatch = Stopwatch.StartNew();
            var loadResult = await _codeLoader.LoadAsZipStreamAsync(submission, ct);
            fetchStopwatch.Stop();
            LogPhase("fetch", fetchStopwatch.ElapsedMilliseconds, success: loadResult.Success);

            if (!loadResult.Success)
            {
                await FailAsync(submission, $"Fetch failed: {loadResult.ErrorCode} — {loadResult.ErrorMessage}", ct);
                return;
            }

            // ── Profile phase ── (S12-T8 / F14, ADR-040)
            // Build the history-aware LearnerSnapshot before the AI call. The
            // service handles cold-start (no prior submissions) + RAG fallback
            // (Qdrant unreachable) internally — we always receive a usable
            // snapshot or null when the service isn't registered (back-compat
            // for legacy DI configs).
            LearnerSnapshot? snapshot = null;
            if (_snapshotService is not null)
            {
                var profileStopwatch = Stopwatch.StartNew();
                try
                {
                    // The static-analysis anchor for RAG retrieval is computed
                    // post-AI today (we only have it after `/api/analyze-zip`
                    // returns). For F14 v1 we anchor on the task + submission
                    // identifiers instead — the RAG retriever's empty-anchor
                    // short-circuit handles the case where snapshot service
                    // has nothing useful to retrieve. A future iteration may
                    // hoist the static analyzer call out of the AI service so
                    // we can anchor on real findings; out of scope for v1.
                    var ragAnchor = $"task:{submission.TaskId:N} attempt:{submission.AttemptNumber}";
                    snapshot = await _snapshotService.BuildAsync(
                        userId: submission.UserId,
                        currentSubmissionId: submission.Id,
                        currentTaskId: submission.TaskId,
                        currentStaticFindingsJson: ragAnchor,
                        ct: ct);
                    profileStopwatch.Stop();
                    LogPhase("profile", profileStopwatch.ElapsedMilliseconds, success: true,
                        extra: ("FirstReview", snapshot.IsFirstReview),
                        extra2: ("RagChunks", snapshot.RagChunks.Count));
                }
                catch (Exception ex)
                {
                    // Profile build must NOT take down the analysis pipeline.
                    // Log + fall through with snapshot=null (legacy F6/F13
                    // behaviour). The defensive catch keeps F14 a strict
                    // additive enhancement.
                    profileStopwatch.Stop();
                    _logger.LogWarning(ex,
                        "F14 LearnerSnapshot build failed for submission {SubmissionId}; falling back to history-blind review.",
                        submissionId);
                    LogPhase("profile", profileStopwatch.ElapsedMilliseconds, success: false);
                    snapshot = null;
                }
            }

            // ── AI phase ──
            // S11-T4 / F13 (ADR-037): dispatch on AI_REVIEW_MODE.
            // Default `single` (AnalyzeZipAsync → /api/analyze-zip).
            // `multi` routes to AnalyzeZipMultiAsync → /api/analyze-zip-multi
            // which runs the three specialist agents in parallel.
            // S12-T8 / F14 (ADR-040): the snapshot built above flows uniformly
            // into both modes — single-prompt enhanced + multi-agent both pick
            // up the learner context.
            var reviewMode = _modeProvider.Current;
            AiCombinedResponse aiResponse;
            await using (loadResult.ZipStream)
            {
                var aiStopwatch = Stopwatch.StartNew();
                aiResponse = reviewMode == AiReviewMode.Multi
                    ? await _aiClient.AnalyzeZipMultiAsync(
                        loadResult.ZipStream!, loadResult.FileName, correlationId, snapshot, ct)
                    : await _aiClient.AnalyzeZipAsync(
                        loadResult.ZipStream!, loadResult.FileName, correlationId, snapshot, ct);
                aiStopwatch.Stop();
                LogPhase("ai", aiStopwatch.ElapsedMilliseconds, success: true,
                    extra: ("OverallScore", aiResponse.OverallScore),
                    extra2: ("ReviewMode", reviewMode.ToString().ToLowerInvariant()));
            }

            // ── Persist static analysis per-tool rows ──
            var persistStopwatch = Stopwatch.StartNew();
            var persisted = await PersistStaticResultsAsync(submission, aiResponse, ct);
            persistStopwatch.Stop();
            LogPhase("persist", persistStopwatch.ElapsedMilliseconds, success: true,
                extra: ("Rows", persisted));

            // S5-T5: AI portion availability drives AiAnalysisStatus independently
            // of the overall submission status.
            var aiAvailable = aiResponse.AiReview?.Available == true;
            AIAnalysisResult? aiRow = null;
            var aiWasFirstWrite = false;
            if (aiAvailable)
            {
                submission.AiAnalysisStatus = AiAnalysisStatus.Available;
                (aiRow, aiWasFirstWrite) = await PersistAiResultAsync(submission, aiResponse.AiReview!, ct);
                // S11-T5 / F13 (ADR-037): cost-dashboard log line. `LlmCostSeries`
                // is the single discriminator field local Seq dashboards group on
                // to chart the three token series side-by-side.
                var llmCostSeries = reviewMode == AiReviewMode.Multi ? "ai-review-multi" : "ai-review";
                _logger.LogInformation(
                    "AI review persisted: SubmissionId={SubmissionId} Score={Score} Tokens={Tokens} PromptVersion={PromptVersion} ReviewMode={ReviewMode} LlmCostSeries={LlmCostSeries} FirstWrite={FirstWrite}",
                    submission.Id, aiRow.OverallScore, aiRow.TokensUsed, aiRow.PromptVersion,
                    reviewMode.ToString().ToLowerInvariant(), llmCostSeries, aiWasFirstWrite);
            }
            else
            {
                submission.AiAnalysisStatus = AiAnalysisStatus.Unavailable;
                _logger.LogWarning(
                    "AI review unavailable for {SubmissionId}: {Error}",
                    submission.Id, aiResponse.AiReview?.Error ?? "no AiReview payload");
            }

            // ── Completed ──
            submission.Status = SubmissionStatus.Completed;
            submission.CompletedAt = DateTime.UtcNow;
            submission.ErrorMessage = null;
            await _db.SaveChangesAsync(ct);

            // S6-T4: auto-complete the matching PathTask + recompute path progress
            // when the AI overallScore is at or above the passing threshold and the
            // task is on the user's active path. ADR-026 motivates the rule.
            if (aiRow is not null)
            {
                await TryAutoCompletePathTaskAsync(submission, aiRow.OverallScore, ct);
            }

            // S7-T1 / ADR-028: feed the AI per-category scores into the user's
            // CodeQualityScore running average — but only on first persistence
            // for this submission. Replacements (manual retry, auto AI-retry)
            // don't re-contribute, so each submission carries weight = 1 sample.
            if (aiAvailable && aiWasFirstWrite)
            {
                await _codeQualityUpdater.RecordAiReviewAsync(
                    submission.UserId, aiResponse.AiReview!.Scores, ct);

                // S8-T3: award XP + check quality badges. Same first-write gate
                // so retries don't double-award.
                await AwardSubmissionXpAndBadgesAsync(submission, aiRow!, ct);
            }

            // S6-T5: build the unified feedback payload + write Recommendations,
            // Resources, and FeedbackReady notification. Idempotent on retry.
            if (aiAvailable)
            {
                await _feedbackAggregator.AggregateAsync(submission, aiResponse, ct);
            }

            // S10-T4 / F12 (ADR-036): once feedback is written, enqueue mentor-chat
            // indexing. Gated on AI availability — a submission without AI feedback
            // would chunk only code, which still works for retrieval but is less
            // valuable; the AI-retry path will re-enter this method on success and
            // re-enqueue (deterministic point IDs make the second upsert a no-op
            // refresh, not a duplicate write).
            if (aiAvailable)
            {
                _mentorIndexScheduler.EnqueueSubmissionIndex(submission.Id);
            }

            // S5-T5: if AI portion was unavailable but static succeeded, schedule a
            // one-shot retry in 15 min. The submission is already in the learner's
            // hands as Completed-with-partial — the retry just upgrades the AI portion.
            if (!aiAvailable)
            {
                ScheduleRetryForAiReview(submission);
            }

            totalStopwatch.Stop();
            LogPhase("total", totalStopwatch.ElapsedMilliseconds, success: true,
                extra: ("PerToolRows", persisted));
        }
        catch (AiServiceUnavailableException ex)
        {
            // S5-T5: full AI-service outage. We have NO results (the combined
            // endpoint is the only path). Mark submission Completed with
            // AiAnalysisStatus=Unavailable + error message, and schedule a
            // single retry 15min later. If the retry also fails we keep it
            // Completed but stop scheduling further retries.
            _logger.LogWarning(ex, "AI service unavailable for {SubmissionId}", submissionId);
            submission.Status = SubmissionStatus.Completed;
            submission.CompletedAt = DateTime.UtcNow;
            submission.AiAnalysisStatus = AiAnalysisStatus.Unavailable;
            submission.ErrorMessage = $"AI service unavailable: {ex.Message}";
            await _db.SaveChangesAsync(ct);

            ScheduleRetryForAiReview(submission);
        }
        catch (AiServiceBadRequestException ex)
        {
            // B-035: 4xx from the AI service means the submitted payload is
            // structurally invalid (oversized ZIP, non-zip file, malformed
            // F14 form-field JSON). Auto-retrying with the same payload would
            // fail identically — Hangfire's `[AutomaticRetry]` would burn 3
            // attempts producing the same error. Mark Failed with the
            // FastAPI detail in ErrorMessage and do NOT throw, so Hangfire
            // sees the job as completed-with-no-retry. The learner must
            // change their submission to recover; manual retry is still
            // available via `POST /api/submissions/{id}/retry`.
            _logger.LogWarning(ex,
                "AI service rejected submission payload with {Status} for {SubmissionId}: {Detail}",
                ex.StatusCode, submissionId, ex.Message);
            await FailAsync(submission, ex.Message, ct);
            // Intentional: no `throw` — auto-retry on 4xx is wasteful.
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "SubmissionAnalysisJob: unexpected failure for {SubmissionId}", submissionId);
            await FailAsync(submission, $"Analysis failed: {ex.Message}", ct);
            throw; // Let Hangfire see the failure for retry bookkeeping.
        }
    }

    private async Task TransitionToProcessingAsync(Submission submission, CancellationToken ct)
    {
        submission.Status = SubmissionStatus.Processing;
        submission.StartedAt = DateTime.UtcNow;
        submission.ErrorMessage = null;
        await _db.SaveChangesAsync(ct);
        _logger.LogInformation("SubmissionAnalysisJob: {SubmissionId} → Processing", submission.Id);
    }

    private void ScheduleRetryForAiReview(Submission submission)
    {
        // Cap auto-retries independently of AttemptNumber (which counts manual user retries).
        if (submission.AiAutoRetryCount >= MaxAutoRetryAttempts - 1)
        {
            _logger.LogInformation(
                "Submission {SubmissionId} at max auto-retry count ({Count}); no further auto-retry. Learner can manually retry.",
                submission.Id, submission.AiAutoRetryCount);
            return;
        }

        submission.AiAutoRetryCount++;
        submission.AiAnalysisStatus = AiAnalysisStatus.Pending; // signals the scheduled retry to run
        _db.SaveChanges();
        _scheduler.ScheduleAfter(submission.Id, AiRetryDelay);
        _logger.LogInformation(
            "Scheduled AI-retry for {SubmissionId} in {Delay} (AutoRetryCount={Count})",
            submission.Id, AiRetryDelay, submission.AiAutoRetryCount);
    }

    private async Task FailAsync(Submission submission, string errorMessage, CancellationToken ct)
    {
        submission.Status = SubmissionStatus.Failed;
        submission.CompletedAt = DateTime.UtcNow;
        submission.ErrorMessage = errorMessage.Length > 2000 ? errorMessage[..2000] : errorMessage;
        await _db.SaveChangesAsync(ct);
        _logger.LogWarning("SubmissionAnalysisJob: {SubmissionId} → Failed: {Message}", submission.Id, errorMessage);
    }

    private static readonly JsonSerializerOptions PersistSerializerOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false,
    };

    private async Task<int> PersistStaticResultsAsync(Submission submission, AiCombinedResponse response, CancellationToken ct)
    {
        if (response.StaticAnalysis?.PerTool is not { Count: > 0 } perTool)
        {
            _logger.LogInformation("No per-tool static results for {SubmissionId} — recording empty placeholder if language expects any",
                submission.Id);
            return 0;
        }

        var rows = 0;
        foreach (var block in perTool)
        {
            if (!TryParseTool(block.Tool, out var toolEnum)) continue;

            var existing = await _db.StaticAnalysisResults
                .FirstOrDefaultAsync(r => r.SubmissionId == submission.Id && r.Tool == toolEnum, ct);

            var issuesJson = JsonSerializer.Serialize(block.Issues, PersistSerializerOptions);
            var metricsJson = JsonSerializer.Serialize(block.Summary, PersistSerializerOptions);

            if (existing is null)
            {
                _db.StaticAnalysisResults.Add(new StaticAnalysisResult
                {
                    SubmissionId = submission.Id,
                    Tool = toolEnum,
                    IssuesJson = issuesJson,
                    MetricsJson = metricsJson,
                    ExecutionTimeMs = block.ExecutionTimeMs,
                    ProcessedAt = DateTime.UtcNow,
                });
            }
            else
            {
                // Replace prior result on retry so the row is authoritative for the latest run.
                existing.IssuesJson = issuesJson;
                existing.MetricsJson = metricsJson;
                existing.ExecutionTimeMs = block.ExecutionTimeMs;
                existing.ProcessedAt = DateTime.UtcNow;
            }
            rows++;
        }

        await _db.SaveChangesAsync(ct);
        return rows;
    }

    /// <summary>
    /// S5-T11: single structured log line per pipeline phase with a consistent
    /// shape so Seq / Application Insights can filter on Phase + DurationMs.
    /// Property names are PascalCase (Serilog convention).
    /// </summary>
    private void LogPhase(
        string phase,
        long durationMs,
        bool success,
        (string name, object? value)? extra = null,
        (string name, object? value)? extra2 = null)
    {
        if (extra is null && extra2 is null)
        {
            _logger.LogInformation(
                "submission-analysis phase Phase={Phase} DurationMs={DurationMs} Success={Success}",
                phase, durationMs, success);
        }
        else if (extra is not null && extra2 is null)
        {
            _logger.LogInformation(
                "submission-analysis phase Phase={Phase} DurationMs={DurationMs} Success={Success} " + extra.Value.name + "={" + extra.Value.name + "}",
                phase, durationMs, success, extra.Value.value);
        }
        else if (extra is not null && extra2 is not null)
        {
            _logger.LogInformation(
                "submission-analysis phase Phase={Phase} DurationMs={DurationMs} Success={Success} " + extra.Value.name + "={" + extra.Value.name + "} " + extra2.Value.name + "={" + extra2.Value.name + "}",
                phase, durationMs, success, extra.Value.value, extra2.Value.value);
        }
    }

    private static bool TryParseTool(string name, out StaticAnalysisTool tool)
    {
        switch (name?.ToLowerInvariant())
        {
            case "eslint":   tool = StaticAnalysisTool.ESLint; return true;
            case "bandit":   tool = StaticAnalysisTool.Bandit; return true;
            case "cppcheck": tool = StaticAnalysisTool.Cppcheck; return true;
            case "phpstan":  tool = StaticAnalysisTool.PHPStan; return true;
            case "pmd":      tool = StaticAnalysisTool.PMD; return true;
            case "roslyn":   tool = StaticAnalysisTool.Roslyn; return true;
            default: tool = default; return false;
        }
    }

    /// <summary>
    /// S6-T4: persist (or upsert on retry) the AI portion of the response into
    /// <see cref="AIAnalysisResult"/>. The full payload is stored in
    /// <see cref="AIAnalysisResult.FeedbackJson"/> so callers can re-render
    /// scores/strengths/weaknesses/recommendations without re-querying the AI.
    /// FeedbackJson is rewritten by the FeedbackAggregator in S6-T5 with the
    /// unified static + AI shape; for now it carries the raw AI payload.
    /// </summary>
    private async Task<(AIAnalysisResult Row, bool WasFirstWrite)> PersistAiResultAsync(
        Submission submission,
        AiReviewResponse aiReview,
        CancellationToken ct)
    {
        var feedbackPayload = new
        {
            overallScore = aiReview.OverallScore,
            scores = aiReview.Scores,
            strengths = aiReview.Strengths,
            weaknesses = aiReview.Weaknesses,
            recommendations = aiReview.Recommendations,
            summary = aiReview.Summary,
        };

        var feedbackJson = JsonSerializer.Serialize(feedbackPayload, PersistSerializerOptions);
        var strengthsJson = JsonSerializer.Serialize(aiReview.Strengths, PersistSerializerOptions);
        var weaknessesJson = JsonSerializer.Serialize(aiReview.Weaknesses, PersistSerializerOptions);

        var existing = await _db.AIAnalysisResults
            .FirstOrDefaultAsync(r => r.SubmissionId == submission.Id, ct);

        if (existing is null)
        {
            var row = new AIAnalysisResult
            {
                SubmissionId = submission.Id,
                OverallScore = aiReview.OverallScore,
                FeedbackJson = feedbackJson,
                StrengthsJson = strengthsJson,
                WeaknessesJson = weaknessesJson,
                ModelUsed = aiReview.ModelUsed ?? string.Empty,
                TokensUsed = aiReview.TokensUsed,
                PromptVersion = aiReview.PromptVersion ?? string.Empty,
                ProcessedAt = DateTime.UtcNow,
            };
            _db.AIAnalysisResults.Add(row);
            await _db.SaveChangesAsync(ct);
            return (row, true);
        }

        existing.OverallScore = aiReview.OverallScore;
        existing.FeedbackJson = feedbackJson;
        existing.StrengthsJson = strengthsJson;
        existing.WeaknessesJson = weaknessesJson;
        existing.ModelUsed = aiReview.ModelUsed ?? string.Empty;
        existing.TokensUsed = aiReview.TokensUsed;
        existing.PromptVersion = aiReview.PromptVersion ?? string.Empty;
        existing.ProcessedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return (existing, false);
    }

    /// <summary>
    /// S6-T4 / ADR-026: when an AI overallScore is at or above
    /// <see cref="PassingScoreThreshold"/> and the task sits on the user's
    /// active path, mark the matching PathTask Completed and recompute the
    /// owning path's <see cref="LearningPath.ProgressPercent"/>.
    /// Off-path submissions are silent no-ops; already-completed path tasks
    /// are not touched. Path side effects remain transactional.
    /// </summary>
    private async Task TryAutoCompletePathTaskAsync(Submission submission, int aiOverallScore, CancellationToken ct)
    {
        if (aiOverallScore < PassingScoreThreshold)
        {
            return;
        }

        var pathTask = await _db.PathTasks
            .Include(pt => pt.Path)
            .FirstOrDefaultAsync(pt =>
                pt.TaskId == submission.TaskId &&
                pt.Path != null &&
                pt.Path.UserId == submission.UserId &&
                pt.Path.IsActive, ct);

        if (pathTask is null || pathTask.Status == PathTaskStatus.Completed)
        {
            return;
        }

        pathTask.Status = PathTaskStatus.Completed;
        pathTask.CompletedAt = DateTime.UtcNow;

        var path = await _db.LearningPaths
            .Include(p => p.Tasks)
            .FirstAsync(p => p.Id == pathTask.PathId, ct);
        path.RecomputeProgress();

        await _db.SaveChangesAsync(ct);

        _logger.LogInformation(
            "PathTask {PathTaskId} auto-completed (AI score={Score}); LearningPath {PathId} progress now {Progress}%",
            pathTask.Id, aiOverallScore, path.Id, path.ProgressPercent);

        // S8-T3: first PathTask completion (idempotent — only the first call writes).
        await _badges.AwardIfEligibleAsync(submission.UserId, BadgeKeys.FirstPathTaskCompleted, ct);
    }

    /// <summary>
    /// S8-T3: per-submission XP + quality badges. Gated on first-AI-write so
    /// manual or auto-retries don't double-grant. "First Submission" badge is
    /// awarded here too — the first AI-completed submission is the cleanest
    /// signal that the user actually reached the feedback loop.
    /// </summary>
    private async Task AwardSubmissionXpAndBadgesAsync(
        Submission submission, AIAnalysisResult aiRow, CancellationToken ct)
    {
        await _xp.AwardAsync(
            submission.UserId,
            XpAmounts.SubmissionAccepted,
            XpReasons.SubmissionAccepted,
            submission.Id,
            ct);

        await _badges.AwardIfEligibleAsync(submission.UserId, BadgeKeys.FirstSubmission, ct);

        if (aiRow.OverallScore >= 80)
        {
            await _badges.AwardIfEligibleAsync(submission.UserId, BadgeKeys.HighQualitySubmission, ct);
        }

        var perfect = HasPerfectCategoryScore(aiRow.FeedbackJson);
        if (perfect)
        {
            await _badges.AwardIfEligibleAsync(submission.UserId, BadgeKeys.FirstPerfectCategoryScore, ct);
        }
    }

    private static bool HasPerfectCategoryScore(string feedbackJson)
    {
        if (string.IsNullOrWhiteSpace(feedbackJson)) return false;
        try
        {
            using var doc = JsonDocument.Parse(feedbackJson);
            if (!doc.RootElement.TryGetProperty("scores", out var scores)
                || scores.ValueKind != JsonValueKind.Object) return false;
            foreach (var prop in scores.EnumerateObject())
            {
                if (prop.Value.TryGetInt32(out var v) && v >= 90) return true;
            }
            return false;
        }
        catch (JsonException)
        {
            return false;
        }
    }
}

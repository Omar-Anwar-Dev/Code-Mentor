using System.Diagnostics;
using System.Text.Json;
using CodeMentor.Application.CodeReview;
using CodeMentor.Application.MentorChat;
using CodeMentor.Application.ProjectAudits;
using CodeMentor.Domain.ProjectAudits;
using CodeMentor.Domain.Submissions;
using CodeMentor.Infrastructure.Persistence;
using Hangfire;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace CodeMentor.Infrastructure.ProjectAudits;

/// <summary>
/// S9-T4: full Project Audit pipeline. Mirrors <c>SubmissionAnalysisJob</c>
/// (S5-T3 + S5-T5 + S6-T4) but on the audit-specific surface:
///   1. Pending → Processing
///   2. Fetch code as ZIP (blob download OR GitHub tarball → repackaged)
///   3. Call <c>POST /api/project-audit</c> (combined static + LLM audit per ADR-034)
///   4. Persist one <see cref="AuditStaticAnalysisResult"/> row per tool in the response
///   5. Persist the <see cref="ProjectAuditResult"/> row + set audit OverallScore + Grade
///   6. Processing → Completed (or Failed with ErrorMessage)
///
/// Retry + concurrency: 3 retries with 10/60/300s backoff; 12-min hard
/// concurrency lock (slightly higher than submissions' 10 min — audit
/// pipelines tend to run longer per architecture §4.4).
///
/// Graceful degradation (mirrors S5-T5): if the AI service is fully down,
/// the audit still completes with <see cref="ProjectAuditAiStatus.Unavailable"/>
/// and an auto-retry is scheduled 15 min later. Capped at one auto-retry —
/// further retries require manual user action via POST /audits/{id}/retry (S9-T5).
/// </summary>
public class ProjectAuditJob
{
    /// <summary>S5-T5 carried into F11: delay before re-running after AI outage.</summary>
    public static readonly TimeSpan AiRetryDelay = TimeSpan.FromMinutes(15);

    /// <summary>
    /// Stop auto-retrying after this many total attempts (initial + retries).
    /// Mirrors <c>SubmissionAnalysisJob.MaxAutoRetryAttempts</c>.
    /// </summary>
    public const int MaxAutoRetryAttempts = 2;

    private readonly ApplicationDbContext _db;
    private readonly IProjectAuditCodeLoader _codeLoader;
    private readonly IProjectAuditAiClient _aiClient;
    private readonly IProjectAuditScheduler _scheduler;
    private readonly IMentorChatIndexScheduler _mentorIndexScheduler;
    private readonly ILogger<ProjectAuditJob> _logger;

    public ProjectAuditJob(
        ApplicationDbContext db,
        IProjectAuditCodeLoader codeLoader,
        IProjectAuditAiClient aiClient,
        IProjectAuditScheduler scheduler,
        IMentorChatIndexScheduler mentorIndexScheduler,
        ILogger<ProjectAuditJob> logger)
    {
        _db = db;
        _codeLoader = codeLoader;
        _aiClient = aiClient;
        _scheduler = scheduler;
        _mentorIndexScheduler = mentorIndexScheduler;
        _logger = logger;
    }

    [AutomaticRetry(Attempts = 3, DelaysInSeconds = new[] { 10, 60, 300 })]
    [DisableConcurrentExecution(timeoutInSeconds: 720)]
    public async Task RunAsync(Guid auditId, CancellationToken ct = default)
    {
        var audit = await _db.ProjectAudits.FirstOrDefaultAsync(a => a.Id == auditId, ct);
        if (audit is null)
        {
            _logger.LogWarning("ProjectAuditJob: audit {AuditId} not found", auditId);
            return;
        }

        // Allow re-entry for scheduled AI retries (audit stays Completed during the wait,
        // only AiReviewStatus=Pending signals a retry is due — mirrors S5-T5).
        var isFirstRun = audit.Status == ProjectAuditStatus.Pending;
        var isAiRetry = audit.Status == ProjectAuditStatus.Completed
                     && audit.AiReviewStatus == ProjectAuditAiStatus.Pending;

        if (!isFirstRun && !isAiRetry)
        {
            _logger.LogInformation(
                "ProjectAuditJob: audit {AuditId} state {Status}/{AiStatus}, skipping",
                auditId, audit.Status, audit.AiReviewStatus);
            return;
        }

        var correlationId = audit.Id.ToString("N");
        using var scope = _logger.BeginScope("project-audit {AuditId} corr={CorrelationId}", auditId, correlationId);

        await TransitionToProcessingAsync(audit, ct);
        var totalSw = Stopwatch.StartNew();

        try
        {
            // ── Fetch phase ──
            var fetchSw = Stopwatch.StartNew();
            var loadResult = await _codeLoader.LoadAsZipStreamAsync(audit, ct);
            fetchSw.Stop();
            LogPhase("fetch", fetchSw.ElapsedMilliseconds, loadResult.Success);

            if (!loadResult.Success)
            {
                await FailAsync(audit, $"Fetch failed: {loadResult.ErrorCode} — {loadResult.ErrorMessage}", ct);
                return;
            }

            // ── AI audit phase (combined static + LLM in one call per ADR-034) ──
            AiAuditCombinedResponse aiResponse;
            await using (loadResult.ZipStream)
            {
                var aiSw = Stopwatch.StartNew();
                aiResponse = await _aiClient.AuditProjectAsync(
                    loadResult.ZipStream!, loadResult.FileName,
                    audit.ProjectDescriptionJson, correlationId, ct);
                aiSw.Stop();
                LogPhase("ai", aiSw.ElapsedMilliseconds, success: true,
                    extra: ("OverallScore", aiResponse.OverallScore),
                    extra2: ("AuditAvailable", aiResponse.AiAudit?.Available ?? false));
            }

            // ── Persist static analysis per-tool rows ──
            var persistStaticSw = Stopwatch.StartNew();
            var staticPersisted = await PersistStaticResultsAsync(audit, aiResponse, ct);
            persistStaticSw.Stop();
            LogPhase("persist-static", persistStaticSw.ElapsedMilliseconds, success: true,
                extra: ("Rows", staticPersisted));

            // ── Persist audit result (when AI portion is available) ──
            var auditAvailable = aiResponse.AiAudit?.Available == true;
            if (auditAvailable)
            {
                var aiAudit = aiResponse.AiAudit!;
                audit.AiReviewStatus = ProjectAuditAiStatus.Available;
                await PersistAuditResultAsync(audit, aiAudit, ct);
                audit.OverallScore = aiAudit.OverallScore;
                audit.Grade = aiAudit.Grade;

                // S11-T5 / F13 (ADR-037): cost-dashboard discriminator — `LlmCostSeries=project-audit`
                // sits alongside `ai-review` and `ai-review-multi` in local Seq dashboards.
                _logger.LogInformation(
                    "Project audit persisted: AuditId={AuditId} Score={Score} Grade={Grade} TokensIn={TokensIn} TokensOut={TokensOut} PromptVersion={PromptVersion} LlmCostSeries={LlmCostSeries}",
                    audit.Id, audit.OverallScore, audit.Grade,
                    aiAudit.TokensInput, aiAudit.TokensOutput,
                    aiAudit.PromptVersion, "project-audit");
            }
            else
            {
                audit.AiReviewStatus = ProjectAuditAiStatus.Unavailable;
                _logger.LogWarning(
                    "Project audit AI unavailable for {AuditId}: {Error}",
                    audit.Id, aiResponse.AiAudit?.Error ?? "no AiAudit payload");
            }

            // ── Completed ──
            audit.Status = ProjectAuditStatus.Completed;
            audit.CompletedAt = DateTime.UtcNow;
            audit.ErrorMessage = null;
            await _db.SaveChangesAsync(ct);

            // S10-T4 / F12 (ADR-036): once feedback is written, enqueue mentor-chat
            // indexing. Same gating as SubmissionAnalysisJob — only when AI feedback
            // is available, since chunking only the code without the audit context
            // produces materially less useful retrieval. AI-retry path will re-enter
            // and re-enqueue (deterministic point IDs make second upsert a no-op refresh).
            if (auditAvailable)
            {
                _mentorIndexScheduler.EnqueueAuditIndex(audit.Id);
            }

            // S5-T5 carried into F11: schedule one-shot retry if AI portion was unavailable.
            if (!auditAvailable)
            {
                ScheduleRetryForAi(audit);
            }

            totalSw.Stop();
            LogPhase("total", totalSw.ElapsedMilliseconds, success: true,
                extra: ("StaticRows", staticPersisted));
        }
        catch (AiServiceUnavailableException ex)
        {
            // Full AI-service outage. We have no static results either (the
            // combined endpoint is the only path). Mark audit Completed with
            // AiReviewStatus=Unavailable + error message; schedule a single
            // retry 15 min later (capped by MaxAutoRetryAttempts).
            _logger.LogWarning(ex, "AI service unavailable for audit {AuditId}", auditId);
            audit.Status = ProjectAuditStatus.Completed;
            audit.CompletedAt = DateTime.UtcNow;
            audit.AiReviewStatus = ProjectAuditAiStatus.Unavailable;
            audit.ErrorMessage = $"AI service unavailable: {ex.Message}";
            await _db.SaveChangesAsync(ct);

            ScheduleRetryForAi(audit);
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "ProjectAuditJob: unexpected failure for {AuditId}", auditId);
            await FailAsync(audit, $"Audit failed: {ex.Message}", ct);
            throw; // Let Hangfire see the failure for retry bookkeeping.
        }
    }

    private async Task TransitionToProcessingAsync(ProjectAudit audit, CancellationToken ct)
    {
        audit.Status = ProjectAuditStatus.Processing;
        audit.StartedAt = DateTime.UtcNow;
        audit.ErrorMessage = null;
        await _db.SaveChangesAsync(ct);
        _logger.LogInformation("ProjectAuditJob: {AuditId} → Processing", audit.Id);
    }

    private void ScheduleRetryForAi(ProjectAudit audit)
    {
        if (audit.AiAutoRetryCount >= MaxAutoRetryAttempts - 1)
        {
            _logger.LogInformation(
                "Audit {AuditId} at max auto-retry count ({Count}); no further auto-retry. Learner can manually retry via POST /audits/{{id}}/retry.",
                audit.Id, audit.AiAutoRetryCount);
            return;
        }

        audit.AiAutoRetryCount++;
        audit.AiReviewStatus = ProjectAuditAiStatus.Pending;
        _db.SaveChanges();
        _scheduler.ScheduleAfter(audit.Id, AiRetryDelay);
        _logger.LogInformation(
            "Scheduled AI-retry for audit {AuditId} in {Delay} (AutoRetryCount={Count})",
            audit.Id, AiRetryDelay, audit.AiAutoRetryCount);
    }

    private async Task FailAsync(ProjectAudit audit, string errorMessage, CancellationToken ct)
    {
        audit.Status = ProjectAuditStatus.Failed;
        audit.CompletedAt = DateTime.UtcNow;
        audit.ErrorMessage = errorMessage.Length > 2000 ? errorMessage[..2000] : errorMessage;
        await _db.SaveChangesAsync(ct);
        _logger.LogWarning("ProjectAuditJob: {AuditId} → Failed: {Message}", audit.Id, errorMessage);
    }

    private static readonly JsonSerializerOptions PersistSerializerOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false,
    };

    private async Task<int> PersistStaticResultsAsync(
        ProjectAudit audit, AiAuditCombinedResponse response, CancellationToken ct)
    {
        if (response.StaticAnalysis?.PerTool is not { Count: > 0 } perTool)
        {
            _logger.LogInformation("No per-tool static results for audit {AuditId}", audit.Id);
            return 0;
        }

        var rows = 0;
        foreach (var block in perTool)
        {
            if (!TryParseTool(block.Tool, out var toolEnum)) continue;

            var existing = await _db.AuditStaticAnalysisResults
                .FirstOrDefaultAsync(r => r.AuditId == audit.Id && r.Tool == toolEnum, ct);

            var issuesJson = JsonSerializer.Serialize(block.Issues, PersistSerializerOptions);
            var metricsJson = JsonSerializer.Serialize(block.Summary, PersistSerializerOptions);

            if (existing is null)
            {
                _db.AuditStaticAnalysisResults.Add(new AuditStaticAnalysisResult
                {
                    AuditId = audit.Id,
                    Tool = toolEnum,
                    IssuesJson = issuesJson,
                    MetricsJson = metricsJson,
                    ExecutionTimeMs = block.ExecutionTimeMs,
                    ProcessedAt = DateTime.UtcNow,
                });
            }
            else
            {
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

    private async Task PersistAuditResultAsync(
        ProjectAudit audit, AiAuditResponse aiAudit, CancellationToken ct)
    {
        var existing = await _db.ProjectAuditResults
            .FirstOrDefaultAsync(r => r.AuditId == audit.Id, ct);

        var scoresJson = JsonSerializer.Serialize(aiAudit.Scores, PersistSerializerOptions);
        var strengthsJson = JsonSerializer.Serialize(aiAudit.Strengths, PersistSerializerOptions);
        var criticalIssuesJson = JsonSerializer.Serialize(aiAudit.CriticalIssues, PersistSerializerOptions);
        var warningsJson = JsonSerializer.Serialize(aiAudit.Warnings, PersistSerializerOptions);
        var suggestionsJson = JsonSerializer.Serialize(aiAudit.Suggestions, PersistSerializerOptions);
        var missingFeaturesJson = JsonSerializer.Serialize(aiAudit.MissingFeatures, PersistSerializerOptions);
        var recommendedImprovementsJson = JsonSerializer.Serialize(aiAudit.RecommendedImprovements, PersistSerializerOptions);
        var inlineAnnotationsJson = JsonSerializer.Serialize(
            aiAudit.InlineAnnotations ?? Array.Empty<AiDetailedIssue>(),
            PersistSerializerOptions);

        if (existing is null)
        {
            _db.ProjectAuditResults.Add(new ProjectAuditResult
            {
                AuditId = audit.Id,
                ScoresJson = scoresJson,
                StrengthsJson = strengthsJson,
                CriticalIssuesJson = criticalIssuesJson,
                WarningsJson = warningsJson,
                SuggestionsJson = suggestionsJson,
                MissingFeaturesJson = missingFeaturesJson,
                RecommendedImprovementsJson = recommendedImprovementsJson,
                TechStackAssessment = aiAudit.TechStackAssessment ?? string.Empty,
                ExecutiveSummary = aiAudit.ExecutiveSummary ?? string.Empty,
                ArchitectureNotes = aiAudit.ArchitectureNotes ?? string.Empty,
                InlineAnnotationsJson = inlineAnnotationsJson,
                ModelUsed = aiAudit.ModelUsed,
                PromptVersion = aiAudit.PromptVersion,
                TokensInput = aiAudit.TokensInput,
                TokensOutput = aiAudit.TokensOutput,
                ProcessedAt = DateTime.UtcNow,
            });
        }
        else
        {
            existing.ScoresJson = scoresJson;
            existing.StrengthsJson = strengthsJson;
            existing.CriticalIssuesJson = criticalIssuesJson;
            existing.WarningsJson = warningsJson;
            existing.SuggestionsJson = suggestionsJson;
            existing.MissingFeaturesJson = missingFeaturesJson;
            existing.RecommendedImprovementsJson = recommendedImprovementsJson;
            existing.TechStackAssessment = aiAudit.TechStackAssessment ?? string.Empty;
            existing.ExecutiveSummary = aiAudit.ExecutiveSummary ?? string.Empty;
            existing.ArchitectureNotes = aiAudit.ArchitectureNotes ?? string.Empty;
            existing.InlineAnnotationsJson = inlineAnnotationsJson;
            existing.ModelUsed = aiAudit.ModelUsed;
            existing.PromptVersion = aiAudit.PromptVersion;
            existing.TokensInput = aiAudit.TokensInput;
            existing.TokensOutput = aiAudit.TokensOutput;
            existing.ProcessedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync(ct);
    }

    private void LogPhase(
        string phase,
        long elapsedMs,
        bool success,
        (string Key, object? Value)? extra = null,
        (string Key, object? Value)? extra2 = null)
    {
        if (extra is null && extra2 is null)
        {
            _logger.LogInformation(
                "ProjectAuditJob phase={Phase} elapsed_ms={Elapsed} success={Success}",
                phase, elapsedMs, success);
        }
        else if (extra2 is null)
        {
            _logger.LogInformation(
                "ProjectAuditJob phase={Phase} elapsed_ms={Elapsed} success={Success} {ExtraKey}={ExtraValue}",
                phase, elapsedMs, success, extra!.Value.Key, extra.Value.Value);
        }
        else
        {
            _logger.LogInformation(
                "ProjectAuditJob phase={Phase} elapsed_ms={Elapsed} success={Success} {ExtraKey}={ExtraValue} {Extra2Key}={Extra2Value}",
                phase, elapsedMs, success,
                extra!.Value.Key, extra.Value.Value,
                extra2!.Value.Key, extra2.Value.Value);
        }
    }

    private static bool TryParseTool(string toolName, out StaticAnalysisTool tool)
    {
        // Same alias normalization as Submissions: case-insensitive, accept short
        // names + canonical names. The set of tools is shared between pipelines (ADR-031).
        if (Enum.TryParse(toolName, ignoreCase: true, out tool)) return true;

        switch (toolName?.ToLowerInvariant())
        {
            case "eslint": tool = StaticAnalysisTool.ESLint; return true;
            case "bandit": tool = StaticAnalysisTool.Bandit; return true;
            case "cppcheck": tool = StaticAnalysisTool.Cppcheck; return true;
            case "phpstan": tool = StaticAnalysisTool.PHPStan; return true;
            case "pmd": tool = StaticAnalysisTool.PMD; return true;
            case "roslyn": tool = StaticAnalysisTool.Roslyn; return true;
            default: tool = default; return false;
        }
    }
}

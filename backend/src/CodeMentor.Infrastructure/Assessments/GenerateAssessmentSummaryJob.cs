using System.Diagnostics;
using CodeMentor.Application.Assessments;
using CodeMentor.Application.Assessments.Contracts;
using CodeMentor.Application.Auth;
using CodeMentor.Domain.Assessments;
using CodeMentor.Infrastructure.CodeReview;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Refit;

namespace CodeMentor.Infrastructure.Assessments;

/// <summary>
/// S17-T2 / F15 (ADR-049): Hangfire job that generates and persists the
/// post-assessment AI summary for one Completed assessment.
///
/// Pipeline:
///   1. Resolve the Assessment by id; idempotency-gate against existing
///      summary row (Hangfire retry safety) + status-gate to Completed
///      only (covers AssessmentNotCompleted + mini-reassessment-no-trigger
///      in one place).
///   2. Materialize the per-category breakdown via the same
///      <see cref="IAssessmentService.GetByIdAsync"/> path the FE
///      consumes — one source of truth for category scoring.
///   3. POST <c>/api/assessment-summary</c> with the structured snapshot.
///   4. Persist <see cref="AssessmentSummary"/> + emit an info log line
///      including measured latency for the p95 ≤ 8 s SLO.
///
/// AI service down → ApiException bubbles → Hangfire retries per its
/// retention policy. Per S17 locked answer #5 the token cap (4k input +
/// 800 output) is enforced AI-side; this job just forwards the request.
/// </summary>
public sealed class GenerateAssessmentSummaryJob
{
    private readonly ApplicationDbContext _db;
    private readonly IAssessmentSummaryRefit _ai;
    private readonly IAssessmentService _assessments;
    private readonly ILogger<GenerateAssessmentSummaryJob> _log;

    public GenerateAssessmentSummaryJob(
        ApplicationDbContext db,
        IAssessmentSummaryRefit ai,
        IAssessmentService assessments,
        ILogger<GenerateAssessmentSummaryJob> log)
    {
        _db = db;
        _ai = ai;
        _assessments = assessments;
        _log = log;
    }

    public async Task ExecuteAsync(Guid userId, Guid assessmentId, CancellationToken ct = default)
    {
        // Idempotency gate — Hangfire-level retry safety.
        var existing = await _db.Set<AssessmentSummary>()
            .AnyAsync(s => s.AssessmentId == assessmentId, ct);
        if (existing)
        {
            _log.LogInformation(
                "GenerateAssessmentSummaryJob: assessment {AssessmentId} already has a summary, skipping.",
                assessmentId);
            return;
        }

        var assessment = await _db.Assessments
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == assessmentId, ct);
        if (assessment is null)
        {
            _log.LogWarning(
                "GenerateAssessmentSummaryJob: assessment {AssessmentId} not found, skipping.",
                assessmentId);
            return;
        }

        // Status gate — only generate for full Completed assessments. Catches
        // both "Assessment-not-Completed" + "mini-reassessment-no-trigger" in
        // one place. Mini-reassessments (S20) won't reach Status=Completed via
        // this enqueue site (their own scheduler will gate separately).
        if (assessment.Status != AssessmentStatus.Completed)
        {
            _log.LogInformation(
                "GenerateAssessmentSummaryJob: assessment {AssessmentId} status={Status}, not Completed — skipping.",
                assessmentId, assessment.Status);
            return;
        }

        // Single source of truth for per-category breakdown — same shape the FE consumes.
        var dtoResult = await _assessments.GetByIdAsync(userId, assessmentId, ct);
        if (!dtoResult.Success || dtoResult.Value is null)
        {
            _log.LogWarning(
                "GenerateAssessmentSummaryJob: failed to materialize AssessmentResultDto for {AssessmentId} (code={Code}), skipping.",
                assessmentId, dtoResult.ErrorCode);
            return;
        }
        var dto = dtoResult.Value;

        var request = new AssessmentSummaryRequestDto(
            Track: dto.Track,
            SkillLevel: dto.SkillLevel ?? "Beginner",
            TotalScore: (double)(dto.TotalScore ?? 0m),
            DurationSec: dto.DurationSec,
            CategoryScores: dto.CategoryScores
                .Select(c => new CategoryScoreInputDto(
                    Category: c.Category,
                    Score: (double)c.Score,
                    TotalAnswered: c.TotalAnswered,
                    CorrectCount: c.CorrectCount))
                .ToList());

        var correlationId = $"summary-{assessmentId:N}";
        var sw = Stopwatch.StartNew();
        AssessmentSummaryResponseDto response;
        try
        {
            response = await _ai.SummarizeAsync(request, correlationId, ct);
        }
        catch (ApiException ex)
        {
            _log.LogWarning(ex,
                "GenerateAssessmentSummaryJob: /api/assessment-summary returned {StatusCode} for {AssessmentId}; Hangfire will retry.",
                (int)ex.StatusCode, assessmentId);
            throw;  // surface to Hangfire retry machinery
        }
        catch (Exception ex)
        {
            _log.LogWarning(ex,
                "GenerateAssessmentSummaryJob: /api/assessment-summary failed for {AssessmentId}; Hangfire will retry.",
                assessmentId);
            throw;
        }
        sw.Stop();

        // Race re-check after the network call — concurrent retries are unlikely
        // with Hangfire's invisibility window, but the unique index on AssessmentId
        // is the ultimate guard.
        var raceCheck = await _db.Set<AssessmentSummary>()
            .AnyAsync(s => s.AssessmentId == assessmentId, ct);
        if (raceCheck)
        {
            _log.LogInformation(
                "GenerateAssessmentSummaryJob: race detected — another worker persisted summary for {AssessmentId} during the AI call. Discarding.",
                assessmentId);
            return;
        }

        var summary = new AssessmentSummary
        {
            AssessmentId = assessmentId,
            UserId = userId,
            StrengthsParagraph = response.StrengthsParagraph,
            WeaknessesParagraph = response.WeaknessesParagraph,
            PathGuidanceParagraph = response.PathGuidanceParagraph,
            PromptVersion = response.PromptVersion,
            TokensUsed = response.TokensUsed,
            RetryCount = response.RetryCount,
            LatencyMs = (int)sw.ElapsedMilliseconds,
            GeneratedAt = DateTime.UtcNow,
        };
        _db.Set<AssessmentSummary>().Add(summary);
        await _db.SaveChangesAsync(ct);

        _log.LogInformation(
            "GenerateAssessmentSummaryJob: assessment={AssessmentId} user={UserId} tokens={Tokens} retry={Retry} latencyMs={Latency}.",
            assessmentId, userId, response.TokensUsed, response.RetryCount, sw.ElapsedMilliseconds);
    }
}

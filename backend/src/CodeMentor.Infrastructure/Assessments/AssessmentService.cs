using CodeMentor.Application.Assessments;
using CodeMentor.Application.Assessments.Contracts;
using CodeMentor.Application.Auth;
using CodeMentor.Application.Gamification;
using CodeMentor.Application.LearningPaths;
using CodeMentor.Domain.Assessments;
using CodeMentor.Domain.Gamification;
using CodeMentor.Domain.Skills;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace CodeMentor.Infrastructure.Assessments;

public sealed class AssessmentService : IAssessmentService
{
    private const int ReattemptCooldownDays = 30;

    private readonly ApplicationDbContext _db;
    private readonly IAdaptiveQuestionSelectorFactory _selectorFactory;
    private readonly IScoringService _scoring;
    private readonly ILearningPathScheduler _pathScheduler;
    private readonly IAssessmentSummaryScheduler _summaryScheduler;
    private readonly IXpService _xp;
    private readonly ILearnerSkillProfileService _profileService;
    private readonly ILogger<AssessmentService> _logger;

    public AssessmentService(
        ApplicationDbContext db,
        IAdaptiveQuestionSelectorFactory selectorFactory,
        IScoringService scoring,
        ILearningPathScheduler pathScheduler,
        IAssessmentSummaryScheduler summaryScheduler,
        IXpService xp,
        ILearnerSkillProfileService profileService,
        ILogger<AssessmentService> logger)
    {
        _db = db;
        _selectorFactory = selectorFactory;
        _scoring = scoring;
        _pathScheduler = pathScheduler;
        _summaryScheduler = summaryScheduler;
        _xp = xp;
        _profileService = profileService;
        _logger = logger;
    }

    public Task<AuthResult<StartAssessmentResponse>> StartAsync(
        Guid userId, StartAssessmentRequest req, CancellationToken ct = default)
        => StartInternalAsync(
            userId, req.Track, AssessmentVariant.Initial,
            thetaSeed: null, excludeAlreadyAnsweredQuestions: false,
            bypassCooldown: false, ct);

    /// <summary>
    /// S21-T1 / F16: start a 10-question mini-reassessment for the user's
    /// active path (must be ≥ 50% complete, no prior Mini for this path).
    /// Bypasses the 30-day cooldown; filters Question pool to items NOT in
    /// any prior <c>AssessmentResponses</c> for this user; seeds IRT theta
    /// from the user's <c>LearnerSkillProfile</c> average ability.
    /// </summary>
    public async Task<AuthResult<StartAssessmentResponse>> StartMiniReassessmentAsync(
        Guid userId, CancellationToken ct = default)
    {
        // Must have an active path at ≥50% with no Mini-variant yet for this path.
        var path = await _db.LearningPaths
            .Where(p => p.UserId == userId && p.IsActive)
            .OrderByDescending(p => p.GeneratedAt)
            .FirstOrDefaultAsync(ct);
        if (path is null)
        {
            return AuthResult<StartAssessmentResponse>.Fail(
                AuthErrorCode.ValidationError,
                "No active learning path. Complete the initial assessment first.");
        }
        if (path.ProgressPercent < 50m)
        {
            return AuthResult<StartAssessmentResponse>.Fail(
                AuthErrorCode.ValidationError,
                $"Mini-reassessment unlocks at 50% path progress (currently {path.ProgressPercent:0}%).");
        }

        // "For this path" = Mini variant Assessment started after the path's
        // GeneratedAt timestamp. Same userId, of any Status (InProgress / Completed /
        // TimedOut all count — only one Mini per path lifecycle).
        var hasMini = await _db.Assessments
            .AnyAsync(a => a.UserId == userId
                           && a.Variant == AssessmentVariant.Mini
                           && a.StartedAt >= path.GeneratedAt, ct);
        if (hasMini)
        {
            return AuthResult<StartAssessmentResponse>.Fail(
                AuthErrorCode.ValidationError,
                "A mini-reassessment already exists for the current path.");
        }

        return await StartInternalAsync(
            userId, path.Track, AssessmentVariant.Mini,
            thetaSeed: await ComputeThetaSeedAsync(userId, ct),
            excludeAlreadyAnsweredQuestions: true,
            bypassCooldown: true, ct);
    }

    /// <summary>
    /// S21-T1 / F16: start a 30-question full reassessment after path 100%.
    /// Bypasses the 30-day cooldown; uses the full question bank (no
    /// exclusion); re-anchors LearnerSkillProfile on completion. One Full
    /// per active path; cannot start if a Completed Full already exists for
    /// the path.
    /// </summary>
    public async Task<AuthResult<StartAssessmentResponse>> StartFullReassessmentAsync(
        Guid userId, CancellationToken ct = default)
    {
        var path = await _db.LearningPaths
            .Where(p => p.UserId == userId && p.IsActive)
            .OrderByDescending(p => p.GeneratedAt)
            .FirstOrDefaultAsync(ct);
        if (path is null)
        {
            return AuthResult<StartAssessmentResponse>.Fail(
                AuthErrorCode.ValidationError,
                "No active learning path. Complete the initial assessment first.");
        }
        if (path.ProgressPercent < 100m)
        {
            return AuthResult<StartAssessmentResponse>.Fail(
                AuthErrorCode.ValidationError,
                $"Full reassessment unlocks at 100% path progress (currently {path.ProgressPercent:0}%).");
        }

        // Prevent re-taking a Full for the same path if it already completed.
        var existingFull = await _db.Assessments
            .AnyAsync(a => a.UserId == userId
                           && a.Variant == AssessmentVariant.Full
                           && a.Status == AssessmentStatus.Completed
                           && a.StartedAt >= path.GeneratedAt, ct);
        if (existingFull)
        {
            return AuthResult<StartAssessmentResponse>.Fail(
                AuthErrorCode.ValidationError,
                "Full reassessment already completed for this path.");
        }

        return await StartInternalAsync(
            userId, path.Track, AssessmentVariant.Full,
            thetaSeed: null, excludeAlreadyAnsweredQuestions: false,
            bypassCooldown: true, ct);
    }

    /// <inheritdoc/>
    public async Task<bool> IsMiniReassessmentEligibleAsync(
        Guid userId, CancellationToken ct = default)
    {
        var path = await _db.LearningPaths
            .Where(p => p.UserId == userId && p.IsActive && p.ProgressPercent >= 50m)
            .OrderByDescending(p => p.GeneratedAt)
            .FirstOrDefaultAsync(ct);
        if (path is null) return false;

        var hasMini = await _db.Assessments
            .AnyAsync(a => a.UserId == userId
                           && a.Variant == AssessmentVariant.Mini
                           && a.StartedAt >= path.GeneratedAt, ct);
        return !hasMini;
    }

    private async Task<AuthResult<StartAssessmentResponse>> StartInternalAsync(
        Guid userId,
        Track track,
        AssessmentVariant variant,
        double? thetaSeed,
        bool excludeAlreadyAnsweredQuestions,
        bool bypassCooldown,
        CancellationToken ct)
    {
        // 30-day reattempt policy (S2-T8): only enforced for Initial assessments.
        // Reassessments (Mini / Full) explicitly bypass — they're gated by path
        // progress, not by time.
        if (!bypassCooldown)
        {
            var cutoff = DateTime.UtcNow.AddDays(-ReattemptCooldownDays);
            var recentCompleted = await _db.Assessments
                .Where(a => a.UserId == userId
                            && a.Variant == AssessmentVariant.Initial
                            && a.Status == AssessmentStatus.Completed
                            && a.CompletedAt >= cutoff)
                .OrderByDescending(a => a.CompletedAt)
                .FirstOrDefaultAsync(ct);

            if (recentCompleted is not null)
            {
                return AuthResult<StartAssessmentResponse>.Fail(
                    AuthErrorCode.ValidationError,
                    $"You can retake the assessment after {recentCompleted.CompletedAt!.Value.AddDays(ReattemptCooldownDays):yyyy-MM-dd}.");
            }
        }

        // Abort any stale in-progress assessments for this user (replaced by the new one).
        var oldInProgress = await _db.Assessments
            .Where(a => a.UserId == userId && a.Status == AssessmentStatus.InProgress)
            .ToListAsync(ct);
        foreach (var old in oldInProgress)
        {
            old.Status = AssessmentStatus.Abandoned;
            old.CompletedAt = DateTime.UtcNow;
        }

        // Eligible bank: active items + (for Mini) exclude question IDs the user has
        // ever answered before across any prior assessment.
        IQueryable<Question> bankQuery = _db.Questions.Where(q => q.IsActive);
        if (excludeAlreadyAnsweredQuestions)
        {
            var answeredIds = await _db.AssessmentResponses
                .Where(r => r.Assessment!.UserId == userId)
                .Select(r => r.QuestionId)
                .Distinct()
                .ToListAsync(ct);
            if (answeredIds.Count > 0)
            {
                bankQuery = bankQuery.Where(q => !answeredIds.Contains(q.Id));
            }
        }
        var bank = await bankQuery.ToListAsync(ct);

        var required = Assessment.GetTotalQuestionsForVariant(variant);
        if (bank.Count < required)
        {
            return AuthResult<StartAssessmentResponse>.Fail(
                AuthErrorCode.ValidationError,
                $"Question bank has {bank.Count} eligible questions for this {variant} variant; need at least {required}.");
        }

        var choice = await _selectorFactory.GetSelectorAsync(ct);
        var first = thetaSeed.HasValue
            ? await choice.Selector.SelectFirstWithThetaAsync(bank, thetaSeed, ct)
            : await choice.Selector.SelectFirstAsync(bank, ct);

        var assessment = new Assessment
        {
            UserId = userId,
            Track = track,
            Variant = variant,
            Status = AssessmentStatus.InProgress,
            StartedAt = DateTime.UtcNow,
            IrtFallbackUsed = choice.IrtFallbackUsed,
        };
        _db.Assessments.Add(assessment);
        await _db.SaveChangesAsync(ct);

        return AuthResult<StartAssessmentResponse>.Ok(new StartAssessmentResponse(
            assessment.Id,
            MapQuestion(first, 1, required, IrtDebug(choice.Selector)),
            Variant: variant.ToString(),
            TimeoutMinutes: Assessment.GetTimeoutMinutesForVariant(variant)));
    }

    /// <summary>
    /// S21-T1 / F16: compute the IRT theta seed for a Mini reassessment from
    /// the user's <see cref="LearnerSkillProfile"/>. Average smoothed score
    /// across all category rows, mapped from [0, 100] → [-3, +3] via a linear
    /// transform (50 → 0; 0 → -3; 100 → +3). Returns 0 when no profile
    /// exists yet (defensive — shouldn't happen since Mini requires path
    /// existence, and path creation seeds the profile).
    /// </summary>
    private async Task<double> ComputeThetaSeedAsync(Guid userId, CancellationToken ct)
    {
        var profiles = await _profileService.GetByUserAsync(userId, ct);
        if (profiles.Count == 0) return 0.0;
        var avg = (double)profiles.Average(p => p.SmoothedScore);
        // Linear: 50 -> 0; 0 -> -3; 100 -> +3. (avg - 50) / 16.67 ≈ (avg - 50) * 0.06.
        var theta = (avg - 50.0) / 16.67;
        // Clamp to engine-supported [-3, +3] range.
        return Math.Clamp(theta, -3.0, 3.0);
    }

    public async Task<AuthResult<AnswerResult>> SubmitAnswerAsync(
        Guid userId, Guid assessmentId, AnswerRequest req, string? idempotencyKey, CancellationToken ct = default)
    {
        var assessment = await _db.Assessments
            .Include(a => a.Responses)
            .FirstOrDefaultAsync(a => a.Id == assessmentId && a.UserId == userId, ct);

        if (assessment is null)
            return AuthResult<AnswerResult>.Fail(AuthErrorCode.UserNotFound, "Assessment not found.");

        // Idempotency: if key already present, return the previously-computed next question.
        if (!string.IsNullOrWhiteSpace(idempotencyKey))
        {
            var prior = assessment.Responses.FirstOrDefault(r => r.IdempotencyKey == idempotencyKey);
            if (prior is not null)
            {
                if (assessment.Status == AssessmentStatus.Completed)
                    return AuthResult<AnswerResult>.Ok(new AnswerResult(true, null, assessment.Id));

                var (replayNext, replayDebug) = await PickNextQuestionWithDebugAsync(assessment, ct);
                return AuthResult<AnswerResult>.Ok(new AnswerResult(false,
                    replayNext is null ? null : MapQuestion(replayNext, assessment.Responses.Count + 1, Assessment.TotalQuestions, replayDebug),
                    assessment.Id));
            }
        }

        if (assessment.Status != AssessmentStatus.InProgress)
            return AuthResult<AnswerResult>.Fail(AuthErrorCode.ValidationError, "Assessment is no longer in progress.");

        if (assessment.IsExpired())
        {
            await CompleteAsTimedOutAsync(assessment, ct);
            return AuthResult<AnswerResult>.Ok(new AnswerResult(true, null, assessment.Id));
        }

        var question = await _db.Questions.FirstOrDefaultAsync(q => q.Id == req.QuestionId, ct);
        if (question is null)
            return AuthResult<AnswerResult>.Fail(AuthErrorCode.ValidationError, "Question not found.");

        if (assessment.Responses.Any(r => r.QuestionId == question.Id))
            return AuthResult<AnswerResult>.Fail(AuthErrorCode.ValidationError, "This question was already answered.");

        var isCorrect = string.Equals(question.CorrectAnswer, req.UserAnswer, StringComparison.OrdinalIgnoreCase);
        var response = new AssessmentResponse
        {
            AssessmentId = assessment.Id,
            QuestionId = question.Id,
            OrderIndex = assessment.Responses.Count + 1,
            UserAnswer = req.UserAnswer?.Trim() ?? string.Empty,
            IsCorrect = isCorrect,
            TimeSpentSec = Math.Clamp(req.TimeSpentSec, 0, 60 * 30),
            Category = question.Category,
            Difficulty = question.Difficulty,
            IdempotencyKey = string.IsNullOrWhiteSpace(idempotencyKey) ? null : idempotencyKey,
        };
        // Add via the DbSet only — EF will associate through the FK. Adding to both the
        // DbSet and the navigation collection causes InMemory provider to double-count.
        _db.AssessmentResponses.Add(response);
        await _db.SaveChangesAsync(ct);

        var answeredCount = await _db.AssessmentResponses
            .CountAsync(r => r.AssessmentId == assessment.Id, ct);

        var totalForVariant = assessment.TotalQuestionsForVariant;
        if (answeredCount >= totalForVariant)
        {
            await CompleteAsFinishedAsync(assessment, ct);
            return AuthResult<AnswerResult>.Ok(new AnswerResult(true, null, assessment.Id));
        }

        var (next, nextDebug) = await PickNextQuestionWithDebugAsync(assessment, ct);
        if (next is null)
        {
            await CompleteAsFinishedAsync(assessment, ct);
            return AuthResult<AnswerResult>.Ok(new AnswerResult(true, null, assessment.Id));
        }

        return AuthResult<AnswerResult>.Ok(new AnswerResult(false,
            MapQuestion(next, answeredCount + 1, totalForVariant, nextDebug),
            assessment.Id));
    }

    public async Task<AuthResult<AssessmentResultDto>> GetByIdAsync(
        Guid userId, Guid assessmentId, CancellationToken ct = default)
    {
        var assessment = await _db.Assessments
            .Include(a => a.Responses)
            .FirstOrDefaultAsync(a => a.Id == assessmentId && a.UserId == userId, ct);

        if (assessment is null)
            return AuthResult<AssessmentResultDto>.Fail(AuthErrorCode.UserNotFound, "Assessment not found.");

        if (assessment.Status == AssessmentStatus.InProgress && assessment.IsExpired())
            await CompleteAsTimedOutAsync(assessment, ct);

        return AuthResult<AssessmentResultDto>.Ok(MapAssessment(assessment));
    }

    public async Task<AuthResult<AssessmentResultDto?>> GetLatestAsync(Guid userId, CancellationToken ct = default)
    {
        var assessment = await _db.Assessments
            .Include(a => a.Responses)
            .Where(a => a.UserId == userId)
            .OrderByDescending(a => a.StartedAt)
            .FirstOrDefaultAsync(ct);

        if (assessment is null) return AuthResult<AssessmentResultDto?>.Ok(null);

        if (assessment.Status == AssessmentStatus.InProgress && assessment.IsExpired())
            await CompleteAsTimedOutAsync(assessment, ct);

        return AuthResult<AssessmentResultDto?>.Ok(MapAssessment(assessment));
    }

    public async Task<AuthResult<AssessmentResultDto>> AbandonAsync(
        Guid userId, Guid assessmentId, CancellationToken ct = default)
    {
        var assessment = await _db.Assessments
            .Include(a => a.Responses)
            .FirstOrDefaultAsync(a => a.Id == assessmentId && a.UserId == userId, ct);

        if (assessment is null)
            return AuthResult<AssessmentResultDto>.Fail(AuthErrorCode.UserNotFound, "Assessment not found.");

        if (assessment.Status == AssessmentStatus.InProgress)
        {
            assessment.Status = AssessmentStatus.Abandoned;
            assessment.CompletedAt = DateTime.UtcNow;
            assessment.DurationSec = (int)(assessment.CompletedAt.Value - assessment.StartedAt).TotalSeconds;
            await _db.SaveChangesAsync(ct);
        }

        return AuthResult<AssessmentResultDto>.Ok(MapAssessment(assessment));
    }

    public async Task<AuthResult<AssessmentSummaryDto?>> GetSummaryAsync(
        Guid userId, Guid assessmentId, CancellationToken ct = default)
    {
        // Existence + ownership check first — fail fast with 404 semantics on either miss.
        var owned = await _db.Assessments
            .AsNoTracking()
            .AnyAsync(a => a.Id == assessmentId && a.UserId == userId, ct);
        if (!owned)
        {
            return AuthResult<AssessmentSummaryDto?>.Fail(
                AuthErrorCode.UserNotFound, "Assessment not found.");
        }

        var summary = await _db.AssessmentSummaries
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.AssessmentId == assessmentId, ct);
        if (summary is null)
        {
            // Row not yet present — Ok(null) maps to HTTP 409 Conflict on the controller side.
            // The FE polls this endpoint at 1.5s cadence (S17-T4) and converts 409 → "still generating".
            return AuthResult<AssessmentSummaryDto?>.Ok(null);
        }

        var dto = new AssessmentSummaryDto(
            AssessmentId: summary.AssessmentId,
            StrengthsParagraph: summary.StrengthsParagraph,
            WeaknessesParagraph: summary.WeaknessesParagraph,
            PathGuidanceParagraph: summary.PathGuidanceParagraph,
            PromptVersion: summary.PromptVersion,
            TokensUsed: summary.TokensUsed,
            RetryCount: summary.RetryCount,
            LatencyMs: summary.LatencyMs,
            GeneratedAt: summary.GeneratedAt);

        return AuthResult<AssessmentSummaryDto?>.Ok(dto);
    }

    // -------- helpers --------

    private async Task<(Question? Question, IrtDebugSnapshot Debug)> PickNextQuestionWithDebugAsync(
        Assessment assessment, CancellationToken ct)
    {
        var bank = await _db.Questions.Where(q => q.IsActive).ToListAsync(ct);
        var history = await _db.AssessmentResponses
            .Where(r => r.AssessmentId == assessment.Id)
            .OrderBy(r => r.OrderIndex)
            .ToListAsync(ct);
        var choice = await _selectorFactory.GetSelectorAsync(ct);
        // Sticky-OR the per-call fallback flag onto the assessment row. The
        // caller (SubmitAnswerAsync) saves once at the end of the request, so
        // we don't need to call SaveChangesAsync here. EF tracks the change
        // automatically since `assessment` is already attached.
        if (choice.IrtFallbackUsed && !assessment.IrtFallbackUsed)
        {
            assessment.IrtFallbackUsed = true;
        }
        var next = await choice.Selector.SelectNextAsync(history, bank, assessment.TotalQuestionsForVariant, ct);
        return (next, IrtDebug(choice.Selector));
    }

    private async Task<Question?> PickNextQuestionAsync(Assessment assessment, CancellationToken ct)
        => (await PickNextQuestionWithDebugAsync(assessment, ct)).Question;

    /// <summary>S15-T8: read the IRT side-channel from the selector if it's
    /// the IRT impl. Legacy returns the empty snapshot.</summary>
    private static IrtDebugSnapshot IrtDebug(IAdaptiveQuestionSelector selector)
    {
        if (selector is IrtAdaptiveQuestionSelector irt)
            return new IrtDebugSnapshot(irt.LastTheta, irt.LastItemInfo);
        return new IrtDebugSnapshot(null, null);
    }

    private readonly record struct IrtDebugSnapshot(double? Theta, double? ItemInfo);

    private async Task<IReadOnlyList<AssessmentResponse>> LoadResponsesAsync(Guid assessmentId, CancellationToken ct)
    {
        return await _db.AssessmentResponses
            .Where(r => r.AssessmentId == assessmentId)
            .OrderBy(r => r.OrderIndex)
            .ToListAsync(ct);
    }

    private async Task CompleteAsFinishedAsync(Assessment assessment, CancellationToken ct)
    {
        var responses = await LoadResponsesAsync(assessment.Id, ct);
        var outcome = _scoring.Score(responses);
        assessment.Status = AssessmentStatus.Completed;
        assessment.CompletedAt = DateTime.UtcNow;
        assessment.DurationSec = (int)(assessment.CompletedAt.Value - assessment.StartedAt).TotalSeconds;
        assessment.TotalScore = outcome.OverallScore;
        assessment.SkillLevel = outcome.Level;

        // S21-T1 / F16: Mini variant does NOT touch SkillScores (lightweight
        // sample feeds LearnerSkillProfile only). Initial + Full both update
        // SkillScores (the canonical 5-category snapshot the Learning CV reads).
        if (assessment.Variant != AssessmentVariant.Mini)
        {
            await UpsertSkillScoresAsync(assessment, outcome, ct);
        }
        await _db.SaveChangesAsync(ct);
        _logger.LogInformation(
            "Assessment {AssessmentId} ({Variant}) completed: score={Score}, level={Level}",
            assessment.Id, assessment.Variant, outcome.OverallScore, outcome.Level);

        // S21-T1 / F16: variant-specific side effects.
        switch (assessment.Variant)
        {
            case AssessmentVariant.Mini:
                // EMA-fold the Mini outcome into the existing profile rows
                // (does NOT overwrite — Mini is a 10-question sample, not a
                // re-anchor). Skip path generation (mid-path) + skip AI summary
                // (per AssessmentSummary.cs:18-21 design rule) + skip XP grant.
                {
                    var samples = outcome.CategoryScores
                        .Where(c => Enum.TryParse<SkillCategory>(c.Category, out _))
                        .ToDictionary(
                            c => (SkillCategory)Enum.Parse(typeof(SkillCategory), c.Category),
                            c => c.Score);
                    if (samples.Count > 0)
                    {
                        await _profileService.UpdateFromSubmissionAsync(assessment.UserId, samples, ct);
                    }
                }
                break;

            case AssessmentVariant.Full:
                // Re-anchor: overwrite the LearnerSkillProfile (treats the
                // 30-question Full as a holistic re-measurement, same shape
                // as the Initial seed). Skip path generation (gated by
                // POST /api/learning-paths/me/next-phase per S21-T4) BUT
                // do enqueue the AI summary (the Graduation page reads it).
                await _profileService.InitializeFromAssessmentAsync(
                    assessment.UserId, assessment.Id, ct);
                _summaryScheduler.EnqueueGeneration(assessment.UserId, assessment.Id);
                break;

            case AssessmentVariant.Initial:
            default:
                // Original S15-S19 behavior: seed profile + grant 100 XP +
                // enqueue path generation + enqueue AI summary.
                await _profileService.InitializeFromAssessmentAsync(
                    assessment.UserId, assessment.Id, ct);
                await _xp.AwardAsync(
                    assessment.UserId,
                    XpAmounts.AssessmentCompleted,
                    XpReasons.AssessmentCompleted,
                    assessment.Id,
                    ct);
                _pathScheduler.EnqueueGeneration(assessment.UserId, assessment.Id);
                _summaryScheduler.EnqueueGeneration(assessment.UserId, assessment.Id);
                break;
        }
    }

    private async Task CompleteAsTimedOutAsync(Assessment assessment, CancellationToken ct)
    {
        var responses = await LoadResponsesAsync(assessment.Id, ct);
        var outcome = _scoring.Score(responses);
        assessment.Status = AssessmentStatus.TimedOut;
        assessment.CompletedAt = DateTime.UtcNow;
        assessment.DurationSec = (int)(assessment.CompletedAt.Value - assessment.StartedAt).TotalSeconds;
        assessment.TotalScore = outcome.OverallScore;
        assessment.SkillLevel = outcome.Level;

        // S21-T1 / F16: same Mini-skips-SkillScores rule on the TimedOut path.
        if (assessment.Variant != AssessmentVariant.Mini)
        {
            await UpsertSkillScoresAsync(assessment, outcome, ct);
        }
        await _db.SaveChangesAsync(ct);
        _logger.LogInformation(
            "Assessment {AssessmentId} ({Variant}) timed out.",
            assessment.Id, assessment.Variant);

        // S19-T3 / F16: seed LearnerSkillProfile from the timed-out scoring
        // outcome too — F16 path generation runs on TimedOut as well (see
        // LearningPathService.GeneratePathAsync gate at line 30) so the
        // profile must be ready. S21: still applies to Initial + Full; Mini
        // timed-out keeps the existing profile untouched (no EMA on partial
        // data — partial timed-out mini is essentially noise).
        if (assessment.Variant != AssessmentVariant.Mini)
        {
            await _profileService.InitializeFromAssessmentAsync(
                assessment.UserId, assessment.Id, ct);
        }
    }

    private async Task UpsertSkillScoresAsync(Assessment assessment, ScoringOutcome outcome, CancellationToken ct)
    {
        foreach (var cat in outcome.CategoryScores)
        {
            if (!Enum.TryParse<SkillCategory>(cat.Category, out var categoryEnum)) continue;

            var existing = await _db.SkillScores
                .FirstOrDefaultAsync(s => s.UserId == assessment.UserId && s.Category == categoryEnum, ct);

            var level = cat.Score switch
            {
                >= 80 => SkillLevel.Advanced,
                >= 60 => SkillLevel.Intermediate,
                _ => SkillLevel.Beginner,
            };

            if (existing is null)
            {
                _db.SkillScores.Add(new SkillScore
                {
                    UserId = assessment.UserId,
                    Category = categoryEnum,
                    Score = cat.Score,
                    Level = level,
                });
            }
            else
            {
                existing.Score = cat.Score;
                existing.Level = level;
                existing.UpdatedAt = DateTime.UtcNow;
            }
        }
    }

    private static AssessmentResultDto MapAssessment(Assessment a)
    {
        var responses = a.Responses.OrderBy(r => r.OrderIndex)
            .GroupBy(r => r.Id).Select(g => g.First()) // dedupe InMemory-provider quirks
            .ToList();

        // Difficulty-weighted per-category score — matches ScoringService / SkillScores writeback.
        var perCategory = responses
            .GroupBy(r => r.Category)
            .Select(g =>
            {
                var totalWeight = g.Sum(r => DifficultyWeight(r.Difficulty));
                var earned = g.Where(r => r.IsCorrect).Sum(r => DifficultyWeight(r.Difficulty));
                var pct = totalWeight == 0 ? 0 : Math.Round(earned / totalWeight * 100, 2);
                return new CategoryScoreDto(
                    g.Key.ToString(),
                    pct,
                    g.Count(),
                    g.Count(r => r.IsCorrect));
            })
            .OrderBy(s => s.Category)
            .ToList();

        return new AssessmentResultDto(
            a.Id, a.Track.ToString(), a.Status.ToString(),
            a.StartedAt, a.CompletedAt, a.DurationSec,
            a.TotalScore, a.SkillLevel?.ToString(),
            responses.Count,
            Assessment.GetTotalQuestionsForVariant(a.Variant),
            perCategory,
            a.Variant.ToString());
    }

    private static decimal DifficultyWeight(int difficulty) => difficulty switch
    {
        1 => 1.0m,
        2 => 1.5m,
        3 => 2.0m,
        _ => 1.0m,
    };

    private static QuestionDto MapQuestion(Question q, int orderIndex, int total) => new(
        q.Id, orderIndex, total, q.Content, q.Options, q.Difficulty, q.Category.ToString(),
        CodeSnippet: q.CodeSnippet,
        CodeLanguage: q.CodeLanguage);

    private static QuestionDto MapQuestion(Question q, int orderIndex, int total, IrtDebugSnapshot debug) => new(
        q.Id, orderIndex, total, q.Content, q.Options, q.Difficulty, q.Category.ToString(),
        CodeSnippet: q.CodeSnippet,
        CodeLanguage: q.CodeLanguage,
        DebugTheta: debug.Theta,
        DebugItemInfo: debug.ItemInfo);
}

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
    private readonly IAdaptiveQuestionSelector _selector;
    private readonly IScoringService _scoring;
    private readonly ILearningPathScheduler _pathScheduler;
    private readonly IXpService _xp;
    private readonly ILogger<AssessmentService> _logger;

    public AssessmentService(
        ApplicationDbContext db,
        IAdaptiveQuestionSelector selector,
        IScoringService scoring,
        ILearningPathScheduler pathScheduler,
        IXpService xp,
        ILogger<AssessmentService> logger)
    {
        _db = db;
        _selector = selector;
        _scoring = scoring;
        _pathScheduler = pathScheduler;
        _xp = xp;
        _logger = logger;
    }

    public async Task<AuthResult<StartAssessmentResponse>> StartAsync(
        Guid userId, StartAssessmentRequest req, CancellationToken ct = default)
    {
        // 30-day reattempt policy (S2-T8): block if a completed assessment exists in the window.
        var cutoff = DateTime.UtcNow.AddDays(-ReattemptCooldownDays);
        var recentCompleted = await _db.Assessments
            .Where(a => a.UserId == userId
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

        // Abort any stale in-progress assessments for this user (replaced by the new one).
        var oldInProgress = await _db.Assessments
            .Where(a => a.UserId == userId && a.Status == AssessmentStatus.InProgress)
            .ToListAsync(ct);
        foreach (var old in oldInProgress)
        {
            old.Status = AssessmentStatus.Abandoned;
            old.CompletedAt = DateTime.UtcNow;
        }

        var bank = await _db.Questions.Where(q => q.IsActive).ToListAsync(ct);
        if (bank.Count < Assessment.TotalQuestions)
        {
            return AuthResult<StartAssessmentResponse>.Fail(
                AuthErrorCode.ValidationError,
                $"Question bank has {bank.Count} active questions; need at least {Assessment.TotalQuestions}.");
        }

        var first = _selector.SelectFirst(bank);
        var assessment = new Assessment
        {
            UserId = userId,
            Track = req.Track,
            Status = AssessmentStatus.InProgress,
            StartedAt = DateTime.UtcNow,
        };
        _db.Assessments.Add(assessment);
        await _db.SaveChangesAsync(ct);

        return AuthResult<StartAssessmentResponse>.Ok(new StartAssessmentResponse(
            assessment.Id, MapQuestion(first, 1, Assessment.TotalQuestions)));
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

                var replayNext = await PickNextQuestionAsync(assessment, ct);
                return AuthResult<AnswerResult>.Ok(new AnswerResult(false,
                    replayNext is null ? null : MapQuestion(replayNext, assessment.Responses.Count + 1, Assessment.TotalQuestions),
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

        if (answeredCount >= Assessment.TotalQuestions)
        {
            await CompleteAsFinishedAsync(assessment, ct);
            return AuthResult<AnswerResult>.Ok(new AnswerResult(true, null, assessment.Id));
        }

        var next = await PickNextQuestionAsync(assessment, ct);
        if (next is null)
        {
            await CompleteAsFinishedAsync(assessment, ct);
            return AuthResult<AnswerResult>.Ok(new AnswerResult(true, null, assessment.Id));
        }

        return AuthResult<AnswerResult>.Ok(new AnswerResult(false,
            MapQuestion(next, answeredCount + 1, Assessment.TotalQuestions),
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

    // -------- helpers --------

    private async Task<Question?> PickNextQuestionAsync(Assessment assessment, CancellationToken ct)
    {
        var bank = await _db.Questions.Where(q => q.IsActive).ToListAsync(ct);
        var history = await _db.AssessmentResponses
            .Where(r => r.AssessmentId == assessment.Id)
            .OrderBy(r => r.OrderIndex)
            .ToListAsync(ct);
        return _selector.SelectNext(history, bank, Assessment.TotalQuestions);
    }

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

        await UpsertSkillScoresAsync(assessment, outcome, ct);
        await _db.SaveChangesAsync(ct);
        _logger.LogInformation(
            "Assessment {AssessmentId} completed: score={Score}, level={Level}",
            assessment.Id, outcome.OverallScore, outcome.Level);

        // S8-T3: completing an assessment grants 100 XP. Granted only on the
        // proper-finish path (not the timed-out path) — only a fully-answered
        // session reflects effort worth rewarding.
        await _xp.AwardAsync(
            assessment.UserId,
            XpAmounts.AssessmentCompleted,
            XpReasons.AssessmentCompleted,
            assessment.Id,
            ct);

        _pathScheduler.EnqueueGeneration(assessment.UserId, assessment.Id);
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

        await UpsertSkillScoresAsync(assessment, outcome, ct);
        await _db.SaveChangesAsync(ct);
        _logger.LogInformation("Assessment {AssessmentId} timed out.", assessment.Id);
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
            responses.Count, Assessment.TotalQuestions, perCategory);
    }

    private static decimal DifficultyWeight(int difficulty) => difficulty switch
    {
        1 => 1.0m,
        2 => 1.5m,
        3 => 2.0m,
        _ => 1.0m,
    };

    private static QuestionDto MapQuestion(Question q, int orderIndex, int total) => new(
        q.Id, orderIndex, total, q.Content, q.Options, q.Difficulty, q.Category.ToString());
}

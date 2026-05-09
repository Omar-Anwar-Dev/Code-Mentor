using CodeMentor.Application.LearningPaths;
using CodeMentor.Application.LearningPaths.Contracts;
using CodeMentor.Domain.Assessments;
using CodeMentor.Domain.Skills;
using CodeMentor.Domain.Submissions;
using CodeMentor.Domain.Tasks;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace CodeMentor.Infrastructure.LearningPaths;

public sealed class LearningPathService : ILearningPathService
{
    private readonly ApplicationDbContext _db;
    private readonly ILogger<LearningPathService> _logger;

    public LearningPathService(ApplicationDbContext db, ILogger<LearningPathService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<LearningPathDto> GeneratePathAsync(Guid userId, Guid assessmentId, CancellationToken ct = default)
    {
        var assessment = await _db.Assessments
            .FirstOrDefaultAsync(a => a.Id == assessmentId && a.UserId == userId, ct)
            ?? throw new InvalidOperationException($"Assessment {assessmentId} not found for user {userId}.");

        if (assessment.Status != AssessmentStatus.Completed && assessment.Status != AssessmentStatus.TimedOut)
            throw new InvalidOperationException(
                $"Cannot generate path: assessment status is {assessment.Status}.");

        var level = assessment.SkillLevel ?? SkillLevel.Beginner;
        var pathLength = DesiredPathLength(level);

        var trackTasks = await _db.Tasks
            .Where(t => t.Track == assessment.Track && t.IsActive)
            .ToListAsync(ct);

        if (trackTasks.Count == 0)
            throw new InvalidOperationException($"No active tasks seeded for track {assessment.Track}.");

        var skillScores = await _db.SkillScores
            .Where(s => s.UserId == userId)
            .ToListAsync(ct);

        var selected = SelectTasks(trackTasks, skillScores, level, pathLength);

        // Deactivate old active paths for this user.
        var existingActive = await _db.LearningPaths
            .Where(p => p.UserId == userId && p.IsActive)
            .ToListAsync(ct);
        foreach (var old in existingActive) old.IsActive = false;

        var newPath = new LearningPath
        {
            UserId = userId,
            Track = assessment.Track,
            AssessmentId = assessment.Id,
            IsActive = true,
            GeneratedAt = DateTime.UtcNow,
        };
        _db.LearningPaths.Add(newPath);

        for (var i = 0; i < selected.Count; i++)
        {
            _db.PathTasks.Add(new PathTask
            {
                PathId = newPath.Id,
                TaskId = selected[i].Id,
                OrderIndex = i + 1,
                Status = PathTaskStatus.NotStarted,
            });
        }

        await _db.SaveChangesAsync(ct);

        _logger.LogInformation(
            "Generated LearningPath {PathId} for user {UserId} ({Track}, level {Level}): {Count} tasks",
            newPath.Id, userId, assessment.Track, level, selected.Count);

        return await GetActiveAsync(userId, ct) ?? throw new InvalidOperationException("Path vanished after insert.");
    }

    public async Task<LearningPathDto?> GetActiveAsync(Guid userId, CancellationToken ct = default)
    {
        var path = await _db.LearningPaths
            .Where(p => p.UserId == userId && p.IsActive)
            .Include(p => p.Tasks.OrderBy(t => t.OrderIndex))
                .ThenInclude(pt => pt.Task)
            .FirstOrDefaultAsync(ct);

        return path is null ? null : MapPath(path);
    }

    public async Task<StartPathTaskResult> StartTaskAsync(Guid userId, Guid pathTaskId, CancellationToken ct = default)
    {
        var pathTask = await _db.PathTasks
            .Include(pt => pt.Path)
            .FirstOrDefaultAsync(pt => pt.Id == pathTaskId, ct);

        if (pathTask is null || pathTask.Path is null || pathTask.Path.UserId != userId)
            return StartPathTaskResult.NotFound;

        return pathTask.Status switch
        {
            PathTaskStatus.InProgress => StartPathTaskResult.AlreadyStarted,
            PathTaskStatus.Completed => StartPathTaskResult.AlreadyCompleted,
            _ => await DoStartAsync(pathTask, ct),
        };
    }

    private async Task<StartPathTaskResult> DoStartAsync(PathTask pt, CancellationToken ct)
    {
        pt.Status = PathTaskStatus.InProgress;
        pt.StartedAt = DateTime.UtcNow;
        pt.Path?.RecomputeProgress();
        await _db.SaveChangesAsync(ct);
        return StartPathTaskResult.Started;
    }

    public async Task<AddRecommendationResult> AddTaskFromRecommendationAsync(
        Guid userId, Guid recommendationId, CancellationToken ct = default)
    {
        // Recommendation ownership flows through Submission.UserId — verify
        // ownership without pulling Submission into the change tracker so
        // SaveChanges doesn't try to update a row we never modified.
        var ownerCheck = await _db.Recommendations.AsNoTracking()
            .Where(r => r.Id == recommendationId)
            .Join(_db.Submissions.AsNoTracking(),
                r => r.SubmissionId, s => s.Id,
                (r, s) => new { OwnerUserId = s.UserId, r.TaskId, r.IsAdded })
            .FirstOrDefaultAsync(ct);

        if (ownerCheck is null || ownerCheck.OwnerUserId != userId)
            return AddRecommendationResult.NotFound;

        if (ownerCheck.TaskId is null)
            return AddRecommendationResult.RecommendationHasNoTaskId;

        if (ownerCheck.IsAdded)
            return AddRecommendationResult.AlreadyAdded;

        var taskId = ownerCheck.TaskId.Value;

        // Active-path lookup, then per-task & ordering computed via direct
        // PathTasks queries (not the path's nav collection) so the change
        // tracker only sees the rows we actually want to modify.
        var pathInfo = await _db.LearningPaths.AsNoTracking()
            .Where(p => p.UserId == userId && p.IsActive)
            .Select(p => new { p.Id })
            .FirstOrDefaultAsync(ct);

        if (pathInfo is null) return AddRecommendationResult.NoActivePath;

        var pathId = pathInfo.Id;
        var existingTasks = await _db.PathTasks.AsNoTracking()
            .Where(pt => pt.PathId == pathId)
            .Select(pt => new { pt.TaskId, pt.OrderIndex, pt.Status })
            .ToListAsync(ct);

        if (existingTasks.Any(pt => pt.TaskId == taskId))
            return AddRecommendationResult.TaskAlreadyOnPath;

        var maxOrder = existingTasks.Count == 0 ? 0 : existingTasks.Max(pt => pt.OrderIndex);
        var totalAfter = existingTasks.Count + 1;
        var completedAfter = existingTasks.Count(pt => pt.Status == PathTaskStatus.Completed);
        var newProgressPercent = Math.Round((decimal)completedAfter / totalAfter * 100, 2);

        _db.PathTasks.Add(new PathTask
        {
            PathId = pathId,
            TaskId = taskId,
            OrderIndex = maxOrder + 1,
            Status = PathTaskStatus.NotStarted,
        });

        var pathRow = await _db.LearningPaths.FirstAsync(p => p.Id == pathId, ct);
        pathRow.ProgressPercent = newProgressPercent;

        var rec = await _db.Recommendations.FirstAsync(r => r.Id == recommendationId, ct);
        rec.IsAdded = true;

        await _db.SaveChangesAsync(ct);
        _logger.LogInformation(
            "Recommendation {RecId} added as PathTask on path {PathId} (order={Order})",
            rec.Id, pathId, maxOrder + 1);
        return AddRecommendationResult.Added;
    }

    // -------- selection algorithm (public for testability) --------

    /// <summary>
    /// Selects and orders tasks: weakest-category-first, with difficulty tuned to the user's level.
    /// Deterministic for a given input (important for tests + demo stability).
    /// </summary>
    public static IReadOnlyList<TaskItem> SelectTasks(
        IReadOnlyList<TaskItem> available,
        IReadOnlyList<SkillScore> scores,
        SkillLevel level,
        int pathLength)
    {
        var scoreByCategory = scores.ToDictionary(s => s.Category, s => s.Score);
        var idealDifficulty = IdealDifficulty(level);

        return available
            .OrderBy(t => CategoryPriority(t.Category, scoreByCategory))
            .ThenBy(t => Math.Abs(t.Difficulty - idealDifficulty))
            .ThenBy(t => t.Difficulty)
            .ThenBy(t => t.Title, StringComparer.Ordinal) // tie-break deterministic
            .Take(Math.Min(pathLength, available.Count))
            .ToList();
    }

    private static int CategoryPriority(SkillCategory cat, Dictionary<SkillCategory, decimal> scores)
        => scores.TryGetValue(cat, out var score) ? (int)score : 50;

    private static int DesiredPathLength(SkillLevel level) => level switch
    {
        SkillLevel.Beginner => 5,
        SkillLevel.Intermediate => 6,
        SkillLevel.Advanced => 7,
        _ => 5,
    };

    private static int IdealDifficulty(SkillLevel level) => level switch
    {
        SkillLevel.Beginner => 2,
        SkillLevel.Intermediate => 3,
        SkillLevel.Advanced => 4,
        _ => 2,
    };

    private static LearningPathDto MapPath(LearningPath p) => new(
        p.Id, p.UserId, p.Track.ToString(), p.AssessmentId, p.IsActive,
        p.ProgressPercent, p.GeneratedAt,
        p.Tasks
            .OrderBy(t => t.OrderIndex)
            .Select(t => new PathTaskDto(
                t.Id, t.OrderIndex, t.Status.ToString(), t.StartedAt, t.CompletedAt,
                t.Task is null
                    ? new TaskSummaryDto(t.TaskId, "(missing)", 0, "", "", "", 0)
                    : new TaskSummaryDto(
                        t.Task.Id, t.Task.Title, t.Task.Difficulty,
                        t.Task.Category.ToString(), t.Task.Track.ToString(),
                        t.Task.ExpectedLanguage.ToString(), t.Task.EstimatedHours)))
            .ToList());
}

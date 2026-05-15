using CodeMentor.Application.LearningPaths;
using CodeMentor.Application.LearningPaths.Contracts;
using CodeMentor.Domain.Assessments;
using CodeMentor.Domain.Skills;
using CodeMentor.Domain.Submissions;
using CodeMentor.Domain.Tasks;
using CodeMentor.Infrastructure.CodeReview;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Refit;

namespace CodeMentor.Infrastructure.LearningPaths;

public sealed class LearningPathService : ILearningPathService
{
    /// <summary>S19 locked answer #1: AI-generated paths target 8 tasks.</summary>
    public const int AiTargetLength = 8;

    /// <summary>S19 locked answer #2: top-K candidates after embedding recall.</summary>
    public const int AiRecallTopK = 20;

    private readonly ApplicationDbContext _db;
    private readonly ILearnerSkillProfileService _profiles;
    private readonly IPathGeneratorRefit _pathGen;
    private readonly ILogger<LearningPathService> _logger;

    public LearningPathService(
        ApplicationDbContext db,
        ILearnerSkillProfileService profiles,
        IPathGeneratorRefit pathGen,
        ILogger<LearningPathService> logger)
    {
        _db = db;
        _profiles = profiles;
        _pathGen = pathGen;
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
        var templateLength = DesiredPathLength(level);

        var trackTasks = await _db.Tasks
            .Where(t => t.Track == assessment.Track && t.IsActive)
            .ToListAsync(ct);

        if (trackTasks.Count == 0)
            throw new InvalidOperationException($"No active tasks seeded for track {assessment.Track}.");

        var skillScores = await _db.SkillScores
            .Where(s => s.UserId == userId)
            .ToListAsync(ct);

        var completedTaskIds = await _db.PathTasks
            .Where(pt => pt.Path != null && pt.Path.UserId == userId && pt.Status == PathTaskStatus.Completed)
            .Select(pt => pt.TaskId.ToString())
            .ToListAsync(ct);

        // S19-T4 / F16: try AI generation first; fall back to template on
        // any failure (AI unavailable, schema/topology fail after retries,
        // or insufficient candidates).
        var aiOutcome = await TryGenerateViaAiAsync(
            userId, assessment, trackTasks, skillScores, completedTaskIds, ct);

        IReadOnlyList<TaskItem> selected;
        LearningPathSource source;
        string? reasoning;

        if (aiOutcome is not null)
        {
            selected = aiOutcome.Value.OrderedTasks;
            source = LearningPathSource.AIGenerated;
            reasoning = aiOutcome.Value.OverallReasoning;
        }
        else
        {
            selected = SelectTasks(trackTasks, skillScores, level, templateLength);
            source = LearningPathSource.TemplateFallback;
            reasoning = null;
        }

        // Deactivate old active paths for this user (preserved from pre-S19 behaviour).
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
            Source = source,
            GenerationReasoningText = reasoning,
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
            "Generated LearningPath {PathId} for user {UserId} ({Track}, level {Level}, source={Source}): {Count} tasks",
            newPath.Id, userId, assessment.Track, level, source, selected.Count);

        return await GetActiveAsync(userId, ct) ?? throw new InvalidOperationException("Path vanished after insert.");
    }

    private async Task<(IReadOnlyList<TaskItem> OrderedTasks, string OverallReasoning)?>
        TryGenerateViaAiAsync(
            Guid userId,
            Assessment assessment,
            IReadOnlyList<TaskItem> trackTasks,
            IReadOnlyList<SkillScore> skillScores,
            IReadOnlyList<string> completedTaskIds,
            CancellationToken ct)
    {
        var profile = await _profiles.GetByUserAsync(userId, ct);
        if (profile.Count == 0)
        {
            _logger.LogWarning(
                "TryGenerateViaAiAsync: empty LearnerSkillProfile for user {UserId} — falling back to template.",
                userId);
            return null;
        }

        // Build the skillProfile dict (string keys for the AI service wire shape).
        var skillProfile = profile.ToDictionary(p => p.Category.ToString(), p => p.SmoothedScore);

        // Build inline candidates from trackTasks. We send them along so the
        // AI service doesn't have to depend on a populated in-memory cache.
        // Filter out tasks the learner has already completed; cap at 50 to
        // keep the prompt size bounded.
        var completedSet = new HashSet<string>(completedTaskIds, StringComparer.Ordinal);
        var candidates = trackTasks
            .Where(t => !completedSet.Contains(t.Id.ToString()))
            .Take(50)
            .Select(BuildCandidate)
            .Where(c => c is not null)
            .Cast<PCandidateTask>()
            .ToList();

        if (candidates.Count < AiTargetLength)
        {
            _logger.LogWarning(
                "TryGenerateViaAiAsync: only {Count} candidates available (target={Target}) — falling back to template.",
                candidates.Count, AiTargetLength);
            return null;
        }

        // Look up the latest AssessmentSummary text if any — provides extra
        // grounding for the rerank prompt.
        string? summaryText = null;
        var summary = await _db.AssessmentSummaries
            .Where(s => s.AssessmentId == assessment.Id)
            .Select(s => new
            {
                s.StrengthsParagraph,
                s.WeaknessesParagraph,
                s.PathGuidanceParagraph,
            })
            .FirstOrDefaultAsync(ct);
        if (summary is not null)
        {
            summaryText = string.Join(
                "\n\n",
                summary.StrengthsParagraph,
                summary.WeaknessesParagraph,
                summary.PathGuidanceParagraph);
        }

        var request = new PGenerateRequest(
            SkillProfile: skillProfile,
            Track: assessment.Track.ToString(),
            CompletedTaskIds: completedTaskIds,
            AssessmentSummaryText: summaryText,
            TargetLength: AiTargetLength,
            RecallTopK: AiRecallTopK,
            CandidateTasks: candidates);

        PGenerateResponse response;
        try
        {
            response = await _pathGen.GenerateAsync(
                request, correlationId: assessment.Id.ToString(), ct);
        }
        catch (ApiException ex)
        {
            _logger.LogWarning(
                ex,
                "AI path generator returned {Status} for assessment {AssessmentId} — falling back to template.",
                (int)ex.StatusCode, assessment.Id);
            return null;
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(
                ex,
                "AI path generator transport failure for assessment {AssessmentId} — falling back to template.",
                assessment.Id);
            return null;
        }
        catch (TaskCanceledException ex) when (!ct.IsCancellationRequested)
        {
            _logger.LogWarning(
                ex,
                "AI path generator timed out for assessment {AssessmentId} — falling back to template.",
                assessment.Id);
            return null;
        }

        // Map the response back to TaskItems in the order the AI proposed.
        var trackTasksById = trackTasks.ToDictionary(t => t.Id.ToString(), t => t);
        var ordered = new List<TaskItem>(response.PathTasks.Count);
        foreach (var entry in response.PathTasks.OrderBy(p => p.OrderIndex))
        {
            if (!trackTasksById.TryGetValue(entry.TaskId, out var task))
            {
                _logger.LogWarning(
                    "AI path generator returned unknown taskId {TaskId} for assessment {AssessmentId} — falling back to template.",
                    entry.TaskId, assessment.Id);
                return null;
            }
            ordered.Add(task);
        }

        return (ordered, response.OverallReasoning);
    }

    private static PCandidateTask? BuildCandidate(TaskItem task)
    {
        // Truncate description for the prompt budget.
        var summary = task.Description ?? string.Empty;
        if (summary.Length > 800)
            summary = summary.Substring(0, 797).TrimEnd() + "...";

        // Default skill tag when SkillTagsJson isn't set yet (pre-backfill).
        // Single-skill mapping from the task's Category keeps the AI service
        // contract satisfied without sending a malformed list.
        IReadOnlyList<PSkillTag> tags;
        Dictionary<string, decimal> learningGain;

        if (!string.IsNullOrWhiteSpace(task.SkillTagsJson))
        {
            try
            {
                var parsedTags = System.Text.Json.JsonSerializer.Deserialize<List<PSkillTag>>(task.SkillTagsJson);
                tags = parsedTags?.Count > 0
                    ? parsedTags
                    : DefaultSkillTags(task.Category);
            }
            catch (System.Text.Json.JsonException)
            {
                tags = DefaultSkillTags(task.Category);
            }
        }
        else
        {
            tags = DefaultSkillTags(task.Category);
        }

        if (!string.IsNullOrWhiteSpace(task.LearningGainJson))
        {
            try
            {
                learningGain = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, decimal>>(task.LearningGainJson)
                               ?? new Dictionary<string, decimal>();
            }
            catch (System.Text.Json.JsonException)
            {
                learningGain = DefaultLearningGain(task.Category);
            }
        }
        else
        {
            learningGain = DefaultLearningGain(task.Category);
        }

        // Prerequisites is already an IReadOnlyList<string> on the entity
        // (configured as a JSON column by EF). Pass through; capping handled
        // by the AI-service Pydantic schema.
        var prereqs = task.Prerequisites?.ToArray() ?? Array.Empty<string>();

        return new PCandidateTask(
            TaskId: task.Id.ToString(),
            Title: task.Title,
            DescriptionSummary: summary,
            SkillTags: tags,
            LearningGain: learningGain,
            Difficulty: task.Difficulty,
            Prerequisites: prereqs,
            Track: task.Track.ToString(),
            ExpectedLanguage: task.ExpectedLanguage.ToString(),
            Category: task.Category.ToString(),
            EstimatedHours: task.EstimatedHours);
    }

    private static IReadOnlyList<PSkillTag> DefaultSkillTags(SkillCategory category) =>
        category switch
        {
            SkillCategory.Security      => new[] { new PSkillTag("security", 0.7m), new PSkillTag("correctness", 0.3m) },
            SkillCategory.OOP           => new[] { new PSkillTag("design", 0.6m), new PSkillTag("readability", 0.4m) },
            SkillCategory.Algorithms    => new[] { new PSkillTag("correctness", 0.7m), new PSkillTag("performance", 0.3m) },
            SkillCategory.DataStructures => new[] { new PSkillTag("correctness", 0.6m), new PSkillTag("performance", 0.4m) },
            SkillCategory.Databases     => new[] { new PSkillTag("correctness", 0.5m), new PSkillTag("performance", 0.3m), new PSkillTag("design", 0.2m) },
            _                            => new[] { new PSkillTag("correctness", 1.0m) },
        };

    private static Dictionary<string, decimal> DefaultLearningGain(SkillCategory category) =>
        DefaultSkillTags(category).ToDictionary(t => t.Skill, t => Math.Min(t.Weight, 0.8m));

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

    // -------- template selection algorithm (preserved for fallback) --------

    /// <summary>
    /// S3-T4 template logic, preserved as the AI-unavailable fallback per
    /// ADR-052. Selects + orders tasks by weakest-category-first with
    /// difficulty tuned to the user's level. Deterministic for a given
    /// input (matters for tests + demo stability).
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
            .ThenBy(t => t.Title, StringComparer.Ordinal)
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
            .ToList(),
        p.Source.ToString(),
        p.GenerationReasoningText);
}

using System.Text.Json;
using CodeMentor.Application.LearningPaths;
using CodeMentor.Domain.Skills;
using CodeMentor.Domain.Tasks;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace CodeMentor.Infrastructure.LearningPaths;

/// <summary>
/// S19-T6 / F16: cache-aware implementation of
/// <see cref="ITaskFramingService"/>.
/// </summary>
public sealed class TaskFramingService : ITaskFramingService
{
    /// <summary>Suppression window — re-lookups within N seconds of an enqueue
    /// don't fire another job (prevents flood on FE polling).</summary>
    private static readonly TimeSpan EnqueueSuppression = TimeSpan.FromSeconds(30);

    private readonly ApplicationDbContext _db;
    private readonly IGenerateTaskFramingScheduler _scheduler;
    private readonly ILogger<TaskFramingService> _logger;

    public TaskFramingService(
        ApplicationDbContext db,
        IGenerateTaskFramingScheduler scheduler,
        ILogger<TaskFramingService> logger)
    {
        _db = db;
        _scheduler = scheduler;
        _logger = logger;
    }

    public async Task<TaskFramingLookupResult> GetFramingAsync(
        Guid userId,
        Guid taskId,
        CancellationToken ct = default)
    {
        var task = await _db.Tasks
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == taskId && t.IsActive, ct);
        if (task is null)
            return new TaskFramingLookupResult(TaskFramingStatus.TaskNotFound);

        var now = DateTime.UtcNow;
        var existing = await _db.TaskFramings
            .AsNoTracking()
            .FirstOrDefaultAsync(f => f.UserId == userId && f.TaskId == taskId, ct);

        if (existing is not null && existing.ExpiresAt > now)
        {
            return new TaskFramingLookupResult(
                TaskFramingStatus.Ready,
                Payload: MapDto(existing));
        }

        // Cache miss / expired — enqueue regeneration unless one was recently kicked.
        var recentlyEnqueued = existing is not null
            && (now - existing.GeneratedAt) < EnqueueSuppression
            && existing.ExpiresAt <= now;
        if (!recentlyEnqueued)
        {
            _scheduler.EnqueueGeneration(userId, taskId);
            _logger.LogInformation(
                "TaskFramingService.GetFramingAsync: enqueued GenerateTaskFramingJob for user {UserId} task {TaskId}",
                userId, taskId);
        }
        else
        {
            _logger.LogInformation(
                "TaskFramingService.GetFramingAsync: re-enqueue suppressed (recent generate already in flight) for user {UserId} task {TaskId}",
                userId, taskId);
        }

        // If the scheduler is inline (tests) the job has already run + the
        // row is fresh. Re-read once and return Ready in that case. Under
        // Hangfire production the job runs out-of-band so this re-read
        // returns the still-stale snapshot → 409 as expected.
        var maybeFresh = await _db.TaskFramings
            .AsNoTracking()
            .FirstOrDefaultAsync(f => f.UserId == userId && f.TaskId == taskId, ct);
        if (maybeFresh is not null && maybeFresh.ExpiresAt > now)
        {
            return new TaskFramingLookupResult(
                TaskFramingStatus.Ready,
                Payload: MapDto(maybeFresh));
        }

        return new TaskFramingLookupResult(
            TaskFramingStatus.Generating,
            RetryAfterHint: "Retry in 3-6 seconds.");
    }

    private static TaskFramingDto MapDto(TaskFraming f)
    {
        IReadOnlyList<string> focus = TryParseList(f.FocusAreasJson) ?? Array.Empty<string>();
        IReadOnlyList<string> pitfalls = TryParseList(f.CommonPitfallsJson) ?? Array.Empty<string>();
        return new TaskFramingDto(
            TaskId: f.TaskId,
            WhyThisMatters: f.WhyThisMatters,
            FocusAreas: focus,
            CommonPitfalls: pitfalls,
            GeneratedAt: f.GeneratedAt,
            ExpiresAt: f.ExpiresAt,
            PromptVersion: f.PromptVersion);
    }

    private static IReadOnlyList<string>? TryParseList(string json)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;
        try
        {
            return JsonSerializer.Deserialize<List<string>>(json);
        }
        catch (JsonException)
        {
            return null;
        }
    }
}

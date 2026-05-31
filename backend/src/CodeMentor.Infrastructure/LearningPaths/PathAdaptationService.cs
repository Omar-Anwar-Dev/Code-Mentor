using System.Text.Json;
using CodeMentor.Application.LearningPaths;
using CodeMentor.Application.LearningPaths.Contracts;
using CodeMentor.Domain.Tasks;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace CodeMentor.Infrastructure.LearningPaths;

/// <summary>
/// S20-T5 / F16 (ADR-053): wraps the read repository + scheduler + EF
/// context for the learner + admin adaptation endpoints.
/// </summary>
public sealed class PathAdaptationService : IPathAdaptationService
{
    private readonly ApplicationDbContext _db;
    private readonly IPathAdaptationEventRepository _repo;
    private readonly IPathAdaptationScheduler _scheduler;
    private readonly ILogger<PathAdaptationService> _logger;

    public PathAdaptationService(
        ApplicationDbContext db,
        IPathAdaptationEventRepository repo,
        IPathAdaptationScheduler scheduler,
        ILogger<PathAdaptationService> logger)
    {
        _db = db;
        _repo = repo;
        _scheduler = scheduler;
        _logger = logger;
    }

    public async Task<PathAdaptationListResponse> ListForUserAsync(
        Guid userId, CancellationToken ct = default)
    {
        var allForUser = await _db.PathAdaptationEvents
            .AsNoTracking()
            .Where(e => e.UserId == userId)
            .OrderByDescending(e => e.TriggeredAt)
            .ToListAsync(ct);

        var pending = allForUser
            .Where(e => e.LearnerDecision == PathAdaptationDecision.Pending)
            .Select(ToDto)
            .ToList();
        var history = allForUser
            .Where(e => e.LearnerDecision != PathAdaptationDecision.Pending)
            .Select(ToDto)
            .ToList();
        return new PathAdaptationListResponse(pending, history);
    }

    public async Task<RespondAdaptationResult> RespondAsync(
        Guid userId, Guid eventId, string decision, CancellationToken ct = default)
    {
        var normalized = (decision ?? string.Empty).Trim().ToLowerInvariant();
        if (normalized is not ("approved" or "rejected"))
        {
            return new RespondAdaptationResult(false,
                "Decision must be 'approved' or 'rejected'.", null);
        }

        var ev = await _db.PathAdaptationEvents.FirstOrDefaultAsync(
            e => e.Id == eventId, ct);
        if (ev is null) return new RespondAdaptationResult(false, "not-found", null);
        if (ev.UserId != userId) return new RespondAdaptationResult(false, "forbidden", null);
        if (ev.LearnerDecision != PathAdaptationDecision.Pending)
        {
            return new RespondAdaptationResult(false,
                $"Event is not pending (current decision: {ev.LearnerDecision}).", null);
        }

        var now = DateTime.UtcNow;
        if (normalized == "approved")
        {
            await ApplyActionsTransactionalAsync(ev, ct);
            ev.LearnerDecision = PathAdaptationDecision.Approved;
        }
        else
        {
            ev.LearnerDecision = PathAdaptationDecision.Rejected;
        }
        ev.RespondedAt = now;
        await _db.SaveChangesAsync(ct);

        return new RespondAdaptationResult(true, null,
            new PathAdaptationRespondResponse(ev.Id, ev.LearnerDecision.ToString(), now));
    }

    public async Task<RefreshAdaptationResult> EnqueueRefreshAsync(
        Guid userId, CancellationToken ct = default)
    {
        var path = await _db.LearningPaths
            .Where(p => p.UserId == userId && p.IsActive)
            .OrderByDescending(p => p.GeneratedAt)
            .FirstOrDefaultAsync(ct);
        if (path is null)
        {
            return new RefreshAdaptationResult(false,
                "No active learning path. Take the assessment to generate one.", null);
        }

        _scheduler.EnqueueOnDemand(path.Id, userId, PathAdaptationSignalLevel.Medium);

        return new RefreshAdaptationResult(true, null,
            new PathAdaptationRefreshResponse(
                PathId: path.Id,
                Status: "enqueued",
                Message: "Adaptation cycle enqueued. Check /api/learning-paths/me/adaptations for the result shortly."));
    }

    public async Task<IReadOnlyList<AdminPathAdaptationEventDto>> ListForAdminAsync(
        Guid? userIdFilter, Guid? pathIdFilter, int take, CancellationToken ct = default)
    {
        if (take <= 0) take = 50;
        var q = _db.PathAdaptationEvents.AsNoTracking();
        if (userIdFilter is not null) q = q.Where(e => e.UserId == userIdFilter);
        if (pathIdFilter is not null) q = q.Where(e => e.PathId == pathIdFilter);

        var rows = await q
            .OrderByDescending(e => e.TriggeredAt)
            .Take(take)
            .ToListAsync(ct);

        return rows.Select(e =>
        {
            var actionCount = CountActions(e.ActionsJson);
            return new AdminPathAdaptationEventDto(
                Id: e.Id,
                PathId: e.PathId,
                UserId: e.UserId,
                TriggeredAt: e.TriggeredAt,
                Trigger: e.Trigger.ToString(),
                SignalLevel: e.SignalLevel.ToString(),
                LearnerDecision: e.LearnerDecision.ToString(),
                RespondedAt: e.RespondedAt,
                AIReasoningText: e.AIReasoningText,
                ConfidenceScore: e.ConfidenceScore,
                ActionCount: actionCount,
                AIPromptVersion: e.AIPromptVersion);
        }).ToList();
    }

    private static int CountActions(string actionsJson)
    {
        try
        {
            var parsed = JsonSerializer.Deserialize<List<JsonElement>>(actionsJson);
            return parsed?.Count ?? 0;
        }
        catch (JsonException)
        {
            return 0;
        }
    }

    // ────────────────────────────────────────────────────────────────────
    // helpers
    // ────────────────────────────────────────────────────────────────────

    private async Task ApplyActionsTransactionalAsync(
        PathAdaptationEvent ev, CancellationToken ct)
    {
        // Deserialize the stored action list.
        List<PathAdaptationActionWriteModel> actions;
        try
        {
            actions = JsonSerializer
                .Deserialize<List<PathAdaptationActionWriteModel>>(ev.ActionsJson)
                ?? new();
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex,
                "PathAdaptationService.RespondAsync: failed to deserialize ActionsJson for event {EventId}",
                ev.Id);
            actions = new();
        }
        if (actions.Count == 0) return;

        // Load the path with tasks for in-memory mutation.
        var path = await _db.LearningPaths
            .Include(p => p.Tasks).ThenInclude(t => t.Task)
            .FirstOrDefaultAsync(p => p.Id == ev.PathId, ct);
        if (path is null) return;

        PathAdaptationJob.ApplyActions(path, actions);
        // After applying, update AfterStateJson to reflect the new ordering —
        // the audit log should record the final state.
        ev.AfterStateJson = BuildSnapshot(path);
    }

    private static string BuildSnapshot(LearningPath path)
    {
        var snapshot = path.Tasks
            .OrderBy(t => t.OrderIndex)
            .Select(t => new
            {
                pathTaskId = t.Id.ToString(),
                taskId = t.TaskId.ToString(),
                orderIndex = t.OrderIndex,
                status = t.Status.ToString(),
            })
            .ToList();
        return JsonSerializer.Serialize(snapshot);
    }

    private static PathAdaptationEventDto ToDto(PathAdaptationEvent e)
    {
        List<PathAdaptationActionDto> actions;
        try
        {
            actions = JsonSerializer
                .Deserialize<List<PathAdaptationActionDto>>(e.ActionsJson)
                ?? new();
        }
        catch (JsonException)
        {
            actions = new();
        }
        return new PathAdaptationEventDto(
            Id: e.Id,
            PathId: e.PathId,
            TriggeredAt: e.TriggeredAt,
            Trigger: e.Trigger.ToString(),
            SignalLevel: e.SignalLevel.ToString(),
            LearnerDecision: e.LearnerDecision.ToString(),
            RespondedAt: e.RespondedAt,
            AIReasoningText: e.AIReasoningText,
            ConfidenceScore: e.ConfidenceScore,
            Actions: actions,
            AIPromptVersion: e.AIPromptVersion,
            TokensInput: e.TokensInput,
            TokensOutput: e.TokensOutput);
    }
}

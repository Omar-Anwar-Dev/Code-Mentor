using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using CodeMentor.Application.LearningPaths;
using CodeMentor.Application.Notifications;
using CodeMentor.Domain.Skills;
using CodeMentor.Domain.Tasks;
using CodeMentor.Infrastructure.CodeReview;
using CodeMentor.Infrastructure.Persistence;
using Hangfire;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Refit;

namespace CodeMentor.Infrastructure.LearningPaths;

/// <summary>
/// S20-T4 / F16 (ADR-053): Hangfire-invokable job. Runs one full adaptation
/// cycle for one (path, user):
///
/// 1. Idempotency check via <c>IdempotencyKey</c> = SHA256-truncated-8 of
///    <c>{trigger}:{submissionId/guid}:{hourBucket}</c>. Re-enqueues with the
///    same key hit the unique index and short-circuit.
/// 2. Build the AI service request from the path snapshot + submission
///    history + LearnerSkillProfile + CodeQualityScores.
/// 3. Call AI service <c>/api/adapt-path</c>. On any failure → write a
///    PathAdaptationEvents row with LearnerDecision=Expired + empty actions
///    + reason text "AI service unavailable; adaptation deferred." No
///    notification is raised in that path.
/// 4. Per action: auto-apply 3-of-3 rule (type=reorder AND confidence&gt;0.8
///    AND intra-skill-area) → apply transactionally. Otherwise stage all
///    actions as Pending.
/// 5. Write the audit row + update LearningPath.LastAdaptedAt.
/// 6. If at least one action is Pending → raise the
///    PathAdaptationPending notification (pref-aware).
///
/// Retry policy: Hangfire <c>[AutomaticRetry]</c> 3 attempts (10/60/300s).
/// <c>[DisableConcurrentExecution]</c> serializes per-path adaptations.
/// </summary>
public sealed class PathAdaptationJob
{
    public const double AutoApplyConfidenceThreshold = 0.80;
    public const int PendingExpiryDays = 7;

    private readonly ApplicationDbContext _db;
    private readonly IPathAdaptationRefit _refit;
    private readonly INotificationService _notifications;
    private readonly ILogger<PathAdaptationJob> _logger;

    public PathAdaptationJob(
        ApplicationDbContext db,
        IPathAdaptationRefit refit,
        INotificationService notifications,
        ILogger<PathAdaptationJob> logger)
    {
        _db = db;
        _refit = refit;
        _notifications = notifications;
        _logger = logger;
    }

    [AutomaticRetry(Attempts = 3, DelaysInSeconds = new[] { 10, 60, 300 })]
    [DisableConcurrentExecution(timeoutInSeconds: 300)]
    public async Task ExecuteAsync(
        Guid pathId,
        Guid userId,
        PathAdaptationTrigger trigger,
        PathAdaptationSignalLevel signalLevel,
        Guid submissionId,
        CancellationToken ct = default)
    {
        _logger.LogInformation(
            "PathAdaptationJob start: path={PathId} user={UserId} trigger={Trigger} signal={Signal} submission={SubmissionId}",
            pathId, userId, trigger, signalLevel, submissionId);

        var path = await _db.LearningPaths
            .Include(p => p.Tasks).ThenInclude(t => t.Task)
            .FirstOrDefaultAsync(p => p.Id == pathId, ct);
        if (path is null)
        {
            _logger.LogWarning("PathAdaptationJob: path {PathId} not found — skipping", pathId);
            return;
        }
        if (path.UserId != userId)
        {
            _logger.LogWarning(
                "PathAdaptationJob: path {PathId} belongs to {Owner}, not {UserId} — skipping",
                pathId, path.UserId, userId);
            return;
        }

        var triggeredAt = DateTime.UtcNow;
        var idempotencyKey = BuildIdempotencyKey(pathId, trigger, submissionId, triggeredAt);

        // Idempotency: short-circuit if a row with this key already exists.
        var existing = await _db.PathAdaptationEvents
            .AsNoTracking()
            .FirstOrDefaultAsync(e => e.IdempotencyKey == idempotencyKey, ct);
        if (existing is not null)
        {
            _logger.LogInformation(
                "PathAdaptationJob: idempotency hit for key {Key} (existing event {EventId}) — short-circuiting",
                idempotencyKey, existing.Id);
            return;
        }

        // Defensive cooldown re-check (the evaluator gates it, but a retried job
        // could re-enter after a successful run already updated LastAdaptedAt).
        // Completion100 + OnDemand bypass cooldown.
        if (trigger is not PathAdaptationTrigger.Completion100 and not PathAdaptationTrigger.OnDemand
            && path.LastAdaptedAt is not null
            && (triggeredAt - path.LastAdaptedAt.Value) < PathAdaptationTriggerEvaluator.CooldownWindow)
        {
            _logger.LogInformation(
                "PathAdaptationJob: cooldown still active for path {PathId} (LastAdaptedAt={LastAdaptedAt}); writing no-op event",
                pathId, path.LastAdaptedAt);
            await WriteEventAsync(
                pathId, userId, trigger, PathAdaptationSignalLevel.NoAction, triggeredAt,
                idempotencyKey, BuildBeforeStateJson(path), BuildBeforeStateJson(path),
                "Cooldown active; adaptation skipped.", actions: Array.Empty<PathAdaptationActionWriteModel>(),
                promptVersion: string.Empty, tokensIn: null, tokensOut: null,
                decision: PathAdaptationDecision.Expired, ct);
            return;
        }

        var beforeStateJson = BuildBeforeStateJson(path);

        // ── Fast-path: NoAction signal skips the LLM call entirely. ──────
        if (signalLevel == PathAdaptationSignalLevel.NoAction)
        {
            await WriteEventAsync(
                pathId, userId, trigger, signalLevel, triggeredAt, idempotencyKey,
                beforeStateJson, beforeStateJson,
                "Signal level evaluated as no_action: no edits warranted.",
                actions: Array.Empty<PathAdaptationActionWriteModel>(),
                promptVersion: string.Empty, tokensIn: null, tokensOut: null,
                decision: PathAdaptationDecision.AutoApplied, ct);
            await SetLastAdaptedAsync(path, triggeredAt, ct);
            return;
        }

        // ── Call AI service. ─────────────────────────────────────────────
        PAdaptPathResponse? aiResponse = null;
        try
        {
            var request = await BuildRequestAsync(path, signalLevel, submissionId, ct);
            aiResponse = await _refit.AdaptAsync(request, pathId.ToString(), ct);
        }
        catch (ApiException ex)
        {
            _logger.LogWarning(ex,
                "PathAdaptationJob: AI service returned {Status} for path {PathId}", (int)ex.StatusCode, pathId);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex, "PathAdaptationJob: transport failure for path {PathId}", pathId);
        }
        catch (TaskCanceledException) when (!ct.IsCancellationRequested)
        {
            _logger.LogWarning("PathAdaptationJob: AI service timed out for path {PathId}", pathId);
        }

        if (aiResponse is null)
        {
            // AI down → write Expired row, no notification.
            await WriteEventAsync(
                pathId, userId, trigger, signalLevel, triggeredAt, idempotencyKey,
                beforeStateJson, beforeStateJson,
                "AI service unavailable; adaptation deferred.",
                actions: Array.Empty<PathAdaptationActionWriteModel>(),
                promptVersion: string.Empty, tokensIn: null, tokensOut: null,
                decision: PathAdaptationDecision.Expired, ct);
            await SetLastAdaptedAsync(path, triggeredAt, ct);
            return;
        }

        // ── Decide auto-apply vs Pending. ────────────────────────────────
        var actions = aiResponse.Actions.Select(a => new PathAdaptationActionWriteModel(
            Type: a.Type,
            TargetPosition: a.TargetPosition,
            NewTaskId: a.NewTaskId,
            NewOrderIndex: a.NewOrderIndex,
            Reason: a.Reason,
            Confidence: (double)a.Confidence)).ToList();

        var allAutoApplicable = actions.Count > 0 && actions.All(a => CanAutoApply(a, path));
        var afterStateJson = beforeStateJson;
        PathAdaptationDecision decision;

        if (actions.Count == 0)
        {
            // Empty action list — record + finish.
            decision = PathAdaptationDecision.AutoApplied;
        }
        else if (allAutoApplicable)
        {
            // Apply transactionally.
            ApplyActions(path, actions);
            afterStateJson = BuildBeforeStateJson(path);
            decision = PathAdaptationDecision.AutoApplied;
        }
        else
        {
            // Stage all as Pending — learner must approve.
            decision = PathAdaptationDecision.Pending;
        }

        var avgConfidence = actions.Count == 0
            ? 0.0
            : actions.Average(a => a.Confidence);

        await WriteEventAsync(
            pathId, userId, trigger, signalLevel, triggeredAt, idempotencyKey,
            beforeStateJson, afterStateJson,
            aiResponse.OverallReasoning,
            actions,
            aiResponse.PromptVersion,
            tokensIn: null, // PAdaptPathResponse only carries the total — split into in/out is TBD
            tokensOut: aiResponse.TokensUsed,
            decision,
            ct,
            confidenceScore: avgConfidence);

        await SetLastAdaptedAsync(path, triggeredAt, ct);

        // Raise notification if Pending (auto-applied small reorders surface as
        // a toast on the path page only; no notification, per UX spec).
        if (decision == PathAdaptationDecision.Pending)
        {
            await _notifications.RaisePathAdaptationPendingAsync(
                userId,
                new PathAdaptationPendingEvent(
                    PathId: pathId,
                    PathAdaptationEventId: Guid.Empty, // filled by FE after fetch; not on the wire here
                    PendingActionCount: actions.Count,
                    PathRelativePath: "/path"),
                ct);
        }

        _logger.LogInformation(
            "PathAdaptationJob complete: path={PathId} decision={Decision} actions={Count} tokens={Tokens}",
            pathId, decision, actions.Count, aiResponse.TokensUsed);
    }

    // ────────────────────────────────────────────────────────────────────
    // Idempotency key
    // ────────────────────────────────────────────────────────────────────

    /// <summary>
    /// Build the deterministic idempotency key:
    /// <c>PathAdaptationJob:{pathId}:{triggerHash}:{hourBucket}</c>
    /// where <c>triggerHash</c> = SHA256-trunc-8 of <c>{trigger}:{sourceId}</c>.
    /// For OnDemand with submissionId=Guid.Empty, we substitute pathId+hourBucket
    /// so each Refresh click within the same hour collapses into one event;
    /// callers wanting full uniqueness should pass a fresh GUID at the call site.
    /// </summary>
    public static string BuildIdempotencyKey(
        Guid pathId,
        PathAdaptationTrigger trigger,
        Guid submissionId,
        DateTime triggeredAt)
    {
        var hourBucket = triggeredAt.Ticks / TimeSpan.FromHours(1).Ticks;
        var sourceId = submissionId == Guid.Empty
            ? $"{pathId}@{hourBucket}"
            : submissionId.ToString();
        var triggerInput = $"{trigger}:{sourceId}";
        using var sha = SHA256.Create();
        var bytes = sha.ComputeHash(Encoding.UTF8.GetBytes(triggerInput));
        var triggerHash = Convert.ToHexString(bytes, 0, 4).ToLowerInvariant(); // 8 chars
        return $"PathAdaptationJob:{pathId}:{triggerHash}:{hourBucket}";
    }

    // ────────────────────────────────────────────────────────────────────
    // Auto-apply policy + action application
    // ────────────────────────────────────────────────────────────────────

    /// <summary>
    /// 3-of-3 auto-apply rule per ADR-053:
    /// <c>type == reorder AND confidence &gt; 0.8 AND intra-skill-area</c>.
    /// Intra-skill-area = the task at <c>targetPosition</c> shares at least
    /// one skill tag with the task at <c>newOrderIndex</c>.
    /// </summary>
    public static bool CanAutoApply(
        PathAdaptationActionWriteModel action,
        LearningPath path)
    {
        if (action.Type != "reorder") return false;
        if (action.Confidence <= AutoApplyConfidenceThreshold) return false;
        if (action.NewOrderIndex is null) return false;

        var src = path.Tasks.FirstOrDefault(t => t.OrderIndex == action.TargetPosition);
        var dst = path.Tasks.FirstOrDefault(t => t.OrderIndex == action.NewOrderIndex.Value);
        if (src is null || dst is null) return false;

        var srcSkills = SkillTagsFor(src);
        var dstSkills = SkillTagsFor(dst);
        return srcSkills.Overlaps(dstSkills);
    }

    private static HashSet<string> SkillTagsFor(PathTask pt)
    {
        // Best-effort: parse Tasks.SkillTagsJson into a set of skill axes.
        // Fallback: empty set (intra-skill-area check fails → can't auto-apply).
        if (pt.Task is null || string.IsNullOrWhiteSpace(pt.Task.SkillTagsJson))
            return new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        try
        {
            var parsed = JsonSerializer.Deserialize<List<SkillTagWire>>(pt.Task.SkillTagsJson);
            return parsed is null
                ? new HashSet<string>(StringComparer.OrdinalIgnoreCase)
                : new HashSet<string>(parsed.Select(t => t.Skill), StringComparer.OrdinalIgnoreCase);
        }
        catch (JsonException)
        {
            return new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        }
    }

    /// <summary>
    /// Apply the approved actions to the path's <see cref="PathTask"/>
    /// collection in-memory. The DbContext tracks the changes; the caller
    /// commits via <c>SaveChangesAsync</c>.
    ///
    /// Reorder: move the entry at <c>targetPosition</c> to <c>newOrderIndex</c>;
    /// shift the displaced entries to fill the gap.
    /// Swap: replace the entry's TaskId at <c>targetPosition</c> with
    /// <c>newTaskId</c>; OrderIndex stays the same.
    /// </summary>
    public static void ApplyActions(
        LearningPath path,
        IReadOnlyList<PathAdaptationActionWriteModel> actions)
    {
        foreach (var action in actions)
        {
            if (action.Type == "swap")
            {
                if (string.IsNullOrEmpty(action.NewTaskId)) continue;
                var entry = path.Tasks.FirstOrDefault(t => t.OrderIndex == action.TargetPosition);
                if (entry is null) continue;
                if (!Guid.TryParse(action.NewTaskId, out var newTaskId)) continue;
                entry.TaskId = newTaskId;
                // Task navigation reload is the caller's job (FE refetches).
            }
            else if (action.Type == "reorder")
            {
                if (action.NewOrderIndex is null) continue;
                var src = path.Tasks.FirstOrDefault(t => t.OrderIndex == action.TargetPosition);
                if (src is null) continue;
                MoveOrderIndex(path, src, action.NewOrderIndex.Value);
            }
        }
    }

    private static void MoveOrderIndex(LearningPath path, PathTask src, int newIndex)
    {
        if (src.OrderIndex == newIndex) return;
        if (src.OrderIndex < newIndex)
        {
            foreach (var t in path.Tasks.Where(t =>
                t != src && t.OrderIndex > src.OrderIndex && t.OrderIndex <= newIndex))
            {
                t.OrderIndex -= 1;
            }
        }
        else
        {
            foreach (var t in path.Tasks.Where(t =>
                t != src && t.OrderIndex < src.OrderIndex && t.OrderIndex >= newIndex))
            {
                t.OrderIndex += 1;
            }
        }
        src.OrderIndex = newIndex;
    }

    // ────────────────────────────────────────────────────────────────────
    // AI request builder
    // ────────────────────────────────────────────────────────────────────

    private async Task<PAdaptPathRequest> BuildRequestAsync(
        LearningPath path,
        PathAdaptationSignalLevel signalLevel,
        Guid submissionId,
        CancellationToken ct)
    {
        // Current path snapshot (ordered, with skill tags).
        var currentPath = path.Tasks
            .OrderBy(t => t.OrderIndex)
            .Select(t => new PAdaptCurrentPathEntry(
                PathTaskId: t.Id.ToString(),
                TaskId: t.TaskId.ToString(),
                Title: t.Task?.Title ?? "(unknown task)",
                OrderIndex: t.OrderIndex,
                Status: t.Status.ToString(),
                SkillTags: ParseTagsForWire(t.Task?.SkillTagsJson)))
            .ToList();

        // Recent submissions (up to last 3, ordered most-recent first). Per-category
        // scores live on the AI service response, not on AIAnalysisResult — for v1
        // we send the OverallScore + a single "overall" entry for scoresPerCategory.
        // S21 can broaden this when SubmissionScores normalization lands.
        var recent = await _db.Submissions
            .Where(s => s.UserId == path.UserId
                && s.AiAnalysisStatus == Domain.Submissions.AiAnalysisStatus.Available
                && s.TaskId != Guid.Empty)
            .OrderByDescending(s => s.CreatedAt)
            .Take(3)
            .Join(_db.AIAnalysisResults, s => s.Id, a => a.SubmissionId, (s, a) => new
            {
                s.TaskId,
                a.OverallScore,
            })
            .ToListAsync(ct);

        var submissions = recent.Select(r => new PAdaptRecentSubmission(
            TaskId: r.TaskId.ToString(),
            OverallScore: r.OverallScore,
            ScoresPerCategory: new Dictionary<string, decimal> { ["overall"] = r.OverallScore },
            SummaryText: null)).ToList();

        // Skill profile = LearnerSkillProfile (assessment-axes) ∪ CodeQualityScore (submission-axes).
        var skillProfile = new Dictionary<string, decimal>(StringComparer.OrdinalIgnoreCase);
        var profile = await _db.LearnerSkillProfiles
            .Where(p => p.UserId == path.UserId)
            .ToListAsync(ct);
        foreach (var row in profile)
            skillProfile[row.Category.ToString()] = row.SmoothedScore;
        var quality = await _db.CodeQualityScores
            .Where(q => q.UserId == path.UserId)
            .ToListAsync(ct);
        foreach (var row in quality)
            skillProfile[row.Category.ToString().ToLowerInvariant()] = (decimal)row.Score;

        // Candidate replacements: empty for v1. Backend would normally call AI
        // service to recall top-K candidates, but the adapt endpoint only needs
        // them for `swap` actions and the v1 demo emphasises reorders.
        // S21+ can wire a recall pass via /api/embeddings or task_embeddings_cache.
        var candidates = new List<PAdaptCandidateReplacement>();

        var completedTaskIds = path.Tasks
            .Where(t => t.Status == PathTaskStatus.Completed && t.TaskId != Guid.Empty)
            .Select(t => t.TaskId.ToString())
            .Distinct()
            .ToList();

        return new PAdaptPathRequest(
            CurrentPath: currentPath,
            RecentSubmissions: submissions,
            SignalLevel: SignalToWire(signalLevel),
            SkillProfile: skillProfile,
            CandidateReplacements: candidates,
            CompletedTaskIds: completedTaskIds,
            Track: path.Track.ToString());
    }

    private static IReadOnlyList<PAdaptSkillTag> ParseTagsForWire(string? skillTagsJson)
    {
        if (string.IsNullOrWhiteSpace(skillTagsJson))
        {
            return new[] { new PAdaptSkillTag("correctness", 1.0m) };
        }
        try
        {
            var parsed = JsonSerializer.Deserialize<List<SkillTagWire>>(skillTagsJson);
            return parsed is null || parsed.Count == 0
                ? new[] { new PAdaptSkillTag("correctness", 1.0m) }
                : parsed.Select(t => new PAdaptSkillTag(t.Skill, t.Weight)).ToList();
        }
        catch (JsonException)
        {
            return new[] { new PAdaptSkillTag("correctness", 1.0m) };
        }
    }

    private static string SignalToWire(PathAdaptationSignalLevel level) => level switch
    {
        PathAdaptationSignalLevel.NoAction => "no_action",
        PathAdaptationSignalLevel.Small    => "small",
        PathAdaptationSignalLevel.Medium   => "medium",
        PathAdaptationSignalLevel.Large    => "large",
        _ => "no_action",
    };

    // ────────────────────────────────────────────────────────────────────
    // Event write + state-snapshot
    // ────────────────────────────────────────────────────────────────────

    private async Task WriteEventAsync(
        Guid pathId, Guid userId,
        PathAdaptationTrigger trigger, PathAdaptationSignalLevel signalLevel,
        DateTime triggeredAt, string idempotencyKey,
        string beforeStateJson, string afterStateJson,
        string reasoningText,
        IReadOnlyList<PathAdaptationActionWriteModel> actions,
        string promptVersion, int? tokensIn, int? tokensOut,
        PathAdaptationDecision decision,
        CancellationToken ct,
        double confidenceScore = 0.0)
    {
        var ev = new PathAdaptationEvent
        {
            PathId = pathId,
            UserId = userId,
            TriggeredAt = triggeredAt,
            Trigger = trigger,
            SignalLevel = signalLevel,
            BeforeStateJson = beforeStateJson,
            AfterStateJson = afterStateJson,
            AIReasoningText = string.IsNullOrEmpty(reasoningText)
                ? "(no reasoning recorded)"
                : reasoningText,
            ConfidenceScore = confidenceScore,
            ActionsJson = JsonSerializer.Serialize(actions),
            LearnerDecision = decision,
            RespondedAt = decision is PathAdaptationDecision.AutoApplied or PathAdaptationDecision.Expired
                ? triggeredAt
                : null,
            AIPromptVersion = promptVersion ?? string.Empty,
            TokensInput = tokensIn,
            TokensOutput = tokensOut,
            IdempotencyKey = idempotencyKey,
        };
        _db.PathAdaptationEvents.Add(ev);
        await _db.SaveChangesAsync(ct);
    }

    private async Task SetLastAdaptedAsync(LearningPath path, DateTime triggeredAt, CancellationToken ct)
    {
        path.LastAdaptedAt = triggeredAt;
        await _db.SaveChangesAsync(ct);
    }

    private static string BuildBeforeStateJson(LearningPath path)
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

    private sealed record SkillTagWire(string Skill, decimal Weight);
}

/// <summary>
/// S20-T4 / F16: write-side action model used by <c>PathAdaptationJob</c>
/// to apply actions + persist them as JSON inside
/// <see cref="PathAdaptationEvent.ActionsJson"/>.
/// </summary>
public sealed record PathAdaptationActionWriteModel(
    string Type,
    int TargetPosition,
    string? NewTaskId,
    int? NewOrderIndex,
    string Reason,
    double Confidence);

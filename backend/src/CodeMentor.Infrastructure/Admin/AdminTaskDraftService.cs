using System.Text.Json;
using CodeMentor.Application.Admin;
using CodeMentor.Application.Admin.Contracts;
using CodeMentor.Domain.Assessments;
using CodeMentor.Domain.Tasks;
using CodeMentor.Infrastructure.CodeReview;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Refit;

namespace CodeMentor.Infrastructure.Admin;

/// <summary>
/// S18-T4 / F16: orchestrates the admin AI-task-draft workflow. Mirrors
/// <see cref="AdminQuestionDraftService"/> from S16-T4 with the task shape.
/// </summary>
public sealed class AdminTaskDraftService : IAdminTaskDraftService
{
    private readonly ApplicationDbContext _db;
    private readonly ITaskGeneratorRefit _ai;
    private readonly IEmbedEntityScheduler _embedScheduler;
    private readonly ILogger<AdminTaskDraftService> _log;

    private const int ExistingTitlesHintCap = 50;

    public AdminTaskDraftService(
        ApplicationDbContext db,
        ITaskGeneratorRefit ai,
        IEmbedEntityScheduler embedScheduler,
        ILogger<AdminTaskDraftService> log)
    {
        _db = db;
        _ai = ai;
        _embedScheduler = embedScheduler;
        _log = log;
    }

    // -----------------------------------------------------------------
    // GENERATE
    // -----------------------------------------------------------------

    public async Task<GenerateTaskDraftsResponse> GenerateAsync(
        GenerateTaskDraftsRequest request,
        Guid actorUserId,
        CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(request);

        // Pull existing titles from the same Track for dedup hints.
        var existingTitles = await _db.Tasks
            .AsNoTracking()
            .Where(t => t.Track == ParseTrack(request.Track) && t.IsActive)
            .OrderByDescending(t => t.CreatedAt)
            .Select(t => t.Title)
            .Take(ExistingTitlesHintCap)
            .ToListAsync(ct);

        var allTitles = (request.ExistingTitles ?? Array.Empty<string>())
            .Concat(existingTitles)
            .Distinct()
            .Take(ExistingTitlesHintCap)
            .ToList();

        var correlationId = $"task-draft-{Guid.NewGuid():N}"[..24];

        TGenerateResponse aiBatch;
        try
        {
            aiBatch = await _ai.GenerateAsync(
                new TGenerateRequest(
                    Track: request.Track,
                    Difficulty: request.Difficulty,
                    Count: request.Count,
                    FocusSkills: request.FocusSkills,
                    ExistingTitles: allTitles),
                correlationId,
                ct);
        }
        catch (ApiException ex)
        {
            _log.LogWarning(ex,
                "AdminTaskDraftService: AI service returned {StatusCode}",
                (int)ex.StatusCode);
            throw new InvalidOperationException(
                $"AI task generator failed: HTTP {(int)ex.StatusCode}", ex);
        }

        var batchId = Guid.NewGuid();
        var now = DateTime.UtcNow;
        var drafts = new List<TaskDraft>(aiBatch.Drafts.Count);
        for (var i = 0; i < aiBatch.Drafts.Count; i++)
        {
            var d = aiBatch.Drafts[i];
            var draft = new TaskDraft
            {
                BatchId = batchId,
                PositionInBatch = i,
                Status = TaskDraftStatus.Draft,
                Title = d.Title,
                Description = d.Description,
                AcceptanceCriteria = d.AcceptanceCriteria,
                Deliverables = d.Deliverables,
                Difficulty = Math.Clamp(d.Difficulty, 1, 5),
                Category = ParseCategory(d.Category),
                Track = ParseTrack(d.Track),
                ExpectedLanguage = ParseLanguage(d.ExpectedLanguage),
                EstimatedHours = Math.Clamp(d.EstimatedHours, 1, 40),
                Prerequisites = d.Prerequisites.ToList(),
                SkillTagsJson = JsonSerializer.Serialize(d.SkillTags),
                LearningGainJson = JsonSerializer.Serialize(d.LearningGain),
                Rationale = d.Rationale,
                PromptVersion = aiBatch.PromptVersion,
                GeneratedAt = now,
                GeneratedById = actorUserId,
                OriginalDraftJson = JsonSerializer.Serialize(d),
            };
            drafts.Add(draft);
        }
        _db.TaskDrafts.AddRange(drafts);
        await _db.SaveChangesAsync(ct);

        return new GenerateTaskDraftsResponse(
            BatchId: batchId,
            PromptVersion: aiBatch.PromptVersion,
            TokensUsed: aiBatch.TokensUsed,
            RetryCount: aiBatch.RetryCount,
            Drafts: drafts.Select(MapToDto).ToList());
    }

    // -----------------------------------------------------------------
    // GET BATCH
    // -----------------------------------------------------------------

    public async Task<IReadOnlyList<TaskDraftDto>?> GetBatchAsync(
        Guid batchId, CancellationToken ct = default)
    {
        var rows = await _db.TaskDrafts
            .AsNoTracking()
            .Where(d => d.BatchId == batchId)
            .OrderBy(d => d.PositionInBatch)
            .ToListAsync(ct);
        return rows.Count == 0 ? null : rows.Select(MapToDto).ToList();
    }

    // -----------------------------------------------------------------
    // APPROVE — atomic: status→Approved + Tasks insert + EmbedEntityJob enqueue
    // -----------------------------------------------------------------

    public async Task<Guid?> ApproveAsync(
        Guid draftId,
        ApproveTaskDraftRequest? edits,
        Guid actorUserId,
        CancellationToken ct = default)
    {
        var draft = await _db.TaskDrafts.FirstOrDefaultAsync(d => d.Id == draftId, ct);
        if (draft is null) return null;

        if (draft.Status != TaskDraftStatus.Draft)
        {
            throw new DraftAlreadyDecidedException(draftId, draft.Status.ToString());
        }

        // Apply optional admin edits.
        var title = edits?.Title ?? draft.Title;
        var description = edits?.Description ?? draft.Description;
        var acceptance = edits?.AcceptanceCriteria ?? draft.AcceptanceCriteria;
        var deliverables = edits?.Deliverables ?? draft.Deliverables;
        var difficulty = edits?.Difficulty ?? draft.Difficulty;
        var category = edits?.Category is { } c ? ParseCategory(c) : draft.Category;
        var track = edits?.Track is { } tr ? ParseTrack(tr) : draft.Track;
        var lang = edits?.ExpectedLanguage is { } lg ? ParseLanguage(lg) : draft.ExpectedLanguage;
        var hours = edits?.EstimatedHours ?? draft.EstimatedHours;
        var prereqs = edits?.Prerequisites ?? draft.Prerequisites;
        var skillTagsJson = edits?.SkillTagsJson ?? draft.SkillTagsJson;
        var learningGainJson = edits?.LearningGainJson ?? draft.LearningGainJson;

        var task = new TaskItem
        {
            Title = title,
            Description = description,
            AcceptanceCriteria = acceptance,
            Deliverables = deliverables,
            Difficulty = Math.Clamp(difficulty, 1, 5),
            Category = category,
            Track = track,
            ExpectedLanguage = lang,
            EstimatedHours = Math.Clamp(hours, 1, 40),
            Prerequisites = prereqs.ToList(),
            CreatedBy = actorUserId,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            SkillTagsJson = skillTagsJson,
            LearningGainJson = learningGainJson,
            Source = TaskSource.AI,
            ApprovedById = actorUserId,
            ApprovedAt = DateTime.UtcNow,
            PromptVersion = draft.PromptVersion,
        };

        draft.Status = TaskDraftStatus.Approved;
        draft.DecidedById = actorUserId;
        draft.DecidedAt = DateTime.UtcNow;
        draft.ApprovedTaskId = task.Id;

        _db.Tasks.Add(task);
        await _db.SaveChangesAsync(ct);

        // Fire-and-forget embed (production = Hangfire; tests = inline scheduler swallows exceptions).
        _embedScheduler.EnqueueTaskEmbed(task.Id);

        return task.Id;
    }

    // -----------------------------------------------------------------
    // REJECT
    // -----------------------------------------------------------------

    public async Task<bool> RejectAsync(
        Guid draftId,
        string? reason,
        Guid actorUserId,
        CancellationToken ct = default)
    {
        var draft = await _db.TaskDrafts.FirstOrDefaultAsync(d => d.Id == draftId, ct);
        if (draft is null) return false;
        if (draft.Status != TaskDraftStatus.Draft)
        {
            throw new DraftAlreadyDecidedException(draftId, draft.Status.ToString());
        }

        draft.Status = TaskDraftStatus.Rejected;
        draft.DecidedById = actorUserId;
        draft.DecidedAt = DateTime.UtcNow;
        draft.RejectionReason = string.IsNullOrWhiteSpace(reason) ? null : reason.Trim();
        await _db.SaveChangesAsync(ct);
        return true;
    }

    // -----------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------

    private static SkillCategory ParseCategory(string s) =>
        Enum.TryParse<SkillCategory>(s, ignoreCase: true, out var v) ? v : SkillCategory.Algorithms;

    private static Track ParseTrack(string s) =>
        Enum.TryParse<Track>(s, ignoreCase: true, out var v) ? v : Track.Backend;

    private static ProgrammingLanguage ParseLanguage(string s) =>
        Enum.TryParse<ProgrammingLanguage>(s, ignoreCase: true, out var v) ? v : ProgrammingLanguage.Python;

    private static TaskDraftDto MapToDto(TaskDraft d) => new(
        Id: d.Id,
        PositionInBatch: d.PositionInBatch,
        Status: d.Status.ToString(),
        Title: d.Title,
        Description: d.Description,
        AcceptanceCriteria: d.AcceptanceCriteria,
        Deliverables: d.Deliverables,
        Difficulty: d.Difficulty,
        Category: d.Category.ToString(),
        Track: d.Track.ToString(),
        ExpectedLanguage: d.ExpectedLanguage.ToString(),
        EstimatedHours: d.EstimatedHours,
        Prerequisites: d.Prerequisites.ToList(),
        SkillTagsJson: d.SkillTagsJson,
        LearningGainJson: d.LearningGainJson,
        Rationale: d.Rationale,
        PromptVersion: d.PromptVersion);
}

using System.Text.Json;
using CodeMentor.Application.Admin;
using CodeMentor.Application.Admin.Contracts;
using CodeMentor.Application.Audit;
using CodeMentor.Domain.Assessments;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace CodeMentor.Infrastructure.Admin;

/// <summary>
/// S16-T4 / F15: orchestrates the admin AI-question-draft workflow.
///
/// Generate: forwards to the AI service via <see cref="IAiQuestionGenerator"/>,
/// persists one <see cref="QuestionDraft"/> per returned draft, returns
/// the new <c>BatchId</c>.
///
/// Approve: atomic — flips status to Approved, inserts a <see cref="Question"/>
/// row populated from the draft (with optional admin edits applied),
/// enqueues <c>EmbedEntityJob</c>. All three happen inside one
/// <c>SaveChangesAsync</c> so a failure leaves no half-state.
///
/// Reject: status → Rejected, optional reason logged.
/// </summary>
public sealed class AdminQuestionDraftService : IAdminQuestionDraftService
{
    private readonly ApplicationDbContext _db;
    private readonly IAiQuestionGenerator _generator;
    private readonly IEmbedEntityScheduler _embedScheduler;
    private readonly IAuditLogger _audit;
    private readonly ILogger<AdminQuestionDraftService> _log;

    private const int ExistingSnippetsHintCap = 40;
    private const int ExistingSnippetHintLen = 200;

    public AdminQuestionDraftService(
        ApplicationDbContext db,
        IAiQuestionGenerator generator,
        IEmbedEntityScheduler embedScheduler,
        IAuditLogger audit,
        ILogger<AdminQuestionDraftService> log)
    {
        _db = db;
        _generator = generator;
        _embedScheduler = embedScheduler;
        _audit = audit;
        _log = log;
    }

    // -----------------------------------------------------------------
    // GENERATE
    // -----------------------------------------------------------------

    public async Task<GenerateQuestionDraftsResponse> GenerateAsync(
        GenerateQuestionDraftsRequest request,
        Guid actorUserId,
        CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(request);
        ValidateGenerateRequest(request);

        // Pull short hint-snippets for existing questions in the same
        // category — feeds the AI service's dedup prompt block.
        var hints = await _db.Questions
            .AsNoTracking()
            .Where(q => q.Category == request.Category && q.IsActive)
            .OrderByDescending(q => q.CreatedAt)
            .Select(q => q.Content)
            .Take(ExistingSnippetsHintCap)
            .ToListAsync(ct);
        var trimmedHints = hints.Select(h => h.Length > ExistingSnippetHintLen
            ? h[..ExistingSnippetHintLen].TrimEnd() + "..."
            : h).ToList();

        var correlationId = $"draft-batch-{Guid.NewGuid():N}".Substring(0, 24);
        var aiBatch = await _generator.GenerateAsync(
            request.Category,
            request.Difficulty,
            request.Count,
            request.IncludeCode,
            request.Language,
            trimmedHints,
            correlationId,
            ct);

        var batchId = Guid.NewGuid();
        var now = DateTime.UtcNow;
        var drafts = new List<QuestionDraft>(aiBatch.Drafts.Count);
        for (var i = 0; i < aiBatch.Drafts.Count; i++)
        {
            var d = aiBatch.Drafts[i];
            var draft = new QuestionDraft
            {
                BatchId = batchId,
                PositionInBatch = i,
                Status = QuestionDraftStatus.Draft,
                QuestionText = d.QuestionText,
                CodeSnippet = d.CodeSnippet,
                CodeLanguage = d.CodeLanguage,
                Options = d.Options.ToList(),
                CorrectAnswer = d.CorrectAnswer,
                Explanation = d.Explanation,
                IRT_A = ClampA(d.IrtA),
                IRT_B = ClampB(d.IrtB),
                Rationale = d.Rationale,
                Category = d.Category,
                Difficulty = Math.Clamp(d.Difficulty, 1, 3),
                PromptVersion = aiBatch.PromptVersion,
                GeneratedAt = now,
                GeneratedById = actorUserId,
                OriginalDraftJson = JsonSerializer.Serialize(d),
            };
            drafts.Add(draft);
        }
        _db.QuestionDrafts.AddRange(drafts);
        await _db.SaveChangesAsync(ct);

        await _audit.LogAsync(
            "GenerateQuestionDraftsBatch",
            "QuestionDraftBatch",
            batchId.ToString("N"),
            oldValue: null,
            newValue: new
            {
                category = request.Category.ToString(),
                difficulty = request.Difficulty,
                count = aiBatch.Drafts.Count,
                tokens = aiBatch.TokensUsed,
                retry = aiBatch.RetryCount,
                promptVersion = aiBatch.PromptVersion,
            },
            actorUserId,
            ct);

        return new GenerateQuestionDraftsResponse(
            BatchId: batchId,
            Drafts: drafts.Select(Map).ToList(),
            TokensUsed: aiBatch.TokensUsed,
            RetryCount: aiBatch.RetryCount,
            PromptVersion: aiBatch.PromptVersion);
    }

    // -----------------------------------------------------------------
    // LIST BY BATCH
    // -----------------------------------------------------------------

    public async Task<IReadOnlyList<QuestionDraftDto>?> GetBatchAsync(
        Guid batchId,
        CancellationToken ct = default)
    {
        var rows = await _db.QuestionDrafts
            .AsNoTracking()
            .Where(d => d.BatchId == batchId)
            .OrderBy(d => d.PositionInBatch)
            .ToListAsync(ct);
        if (rows.Count == 0) return null;
        return rows.Select(Map).ToList();
    }

    // -----------------------------------------------------------------
    // APPROVE — atomic: status + Questions insert + embed-job enqueue
    // -----------------------------------------------------------------

    public async Task<Guid?> ApproveAsync(
        Guid draftId,
        ApproveQuestionDraftRequest? edits,
        Guid actorUserId,
        CancellationToken ct = default)
    {
        var draft = await _db.QuestionDrafts.FirstOrDefaultAsync(d => d.Id == draftId, ct);
        if (draft is null) return null;
        if (draft.Status != QuestionDraftStatus.Draft)
            throw new DraftAlreadyDecidedException(draftId, draft.Status.ToString());

        // Apply edits (if any) — copy from draft + override fields the admin touched.
        var finalText = edits?.QuestionText ?? draft.QuestionText;
        var finalSnippet = edits?.CodeSnippet ?? draft.CodeSnippet;
        var finalLanguage = edits?.CodeLanguage ?? draft.CodeLanguage;
        var finalOptions = edits?.Options is { Count: > 0 } eo
            ? eo.ToList()
            : draft.Options.ToList();
        var finalCorrect = edits?.CorrectAnswer ?? draft.CorrectAnswer;
        var finalExplanation = edits?.Explanation ?? draft.Explanation;
        var finalIrtA = edits?.IrtA ?? draft.IRT_A;
        var finalIrtB = edits?.IrtB ?? draft.IRT_B;
        var finalDifficulty = edits?.Difficulty ?? draft.Difficulty;
        var finalCategory = edits?.Category ?? draft.Category;

        // Re-validate the resulting state — admin's edits may have invalidated it.
        ValidateOptionsAndAnswer(finalOptions, finalCorrect);

        // Snippet + language coherence — both null OR both present.
        if (!string.IsNullOrWhiteSpace(finalSnippet) && string.IsNullOrWhiteSpace(finalLanguage))
            throw new ArgumentException("codeLanguage is required when codeSnippet is set.");
        if (!string.IsNullOrWhiteSpace(finalLanguage) && string.IsNullOrWhiteSpace(finalSnippet))
            throw new ArgumentException("codeSnippet is required when codeLanguage is set.");

        var newQuestion = new Question
        {
            Content = finalText,
            CodeSnippet = string.IsNullOrWhiteSpace(finalSnippet) ? null : finalSnippet,
            CodeLanguage = string.IsNullOrWhiteSpace(finalLanguage) ? null : finalLanguage,
            Options = finalOptions,
            CorrectAnswer = finalCorrect,
            Explanation = finalExplanation,
            Difficulty = Math.Clamp(finalDifficulty, 1, 3),
            Category = finalCategory,
            IRT_A = ClampA(finalIrtA),
            IRT_B = ClampB(finalIrtB),
            CalibrationSource = CalibrationSource.AI,
            Source = QuestionSource.AI,
            ApprovedById = actorUserId,
            ApprovedAt = DateTime.UtcNow,
            PromptVersion = draft.PromptVersion,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
        };

        _db.Questions.Add(newQuestion);

        draft.Status = QuestionDraftStatus.Approved;
        draft.DecidedById = actorUserId;
        draft.DecidedAt = DateTime.UtcNow;
        draft.ApprovedQuestionId = newQuestion.Id;

        await _db.SaveChangesAsync(ct);

        await _audit.LogAsync(
            "ApproveQuestionDraft",
            "QuestionDraft",
            draftId.ToString("N"),
            oldValue: new { status = "Draft" },
            newValue: new
            {
                status = "Approved",
                questionId = newQuestion.Id,
                wasEdited = edits is not null,
            },
            actorUserId,
            ct);

        // Fire-and-forget embed AFTER the DB transaction commits so a
        // Hangfire crash doesn't leave a half-state. The job re-reads
        // the question row and ignores it if it doesn't exist.
        _embedScheduler.EnqueueQuestionEmbed(newQuestion.Id);

        _log.LogInformation(
            "AdminQuestionDraftService: draft {DraftId} approved by {ActorUserId} → question {QuestionId}",
            draftId, actorUserId, newQuestion.Id);

        return newQuestion.Id;
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
        var draft = await _db.QuestionDrafts.FirstOrDefaultAsync(d => d.Id == draftId, ct);
        if (draft is null) return false;
        if (draft.Status != QuestionDraftStatus.Draft)
            throw new DraftAlreadyDecidedException(draftId, draft.Status.ToString());

        draft.Status = QuestionDraftStatus.Rejected;
        draft.DecidedById = actorUserId;
        draft.DecidedAt = DateTime.UtcNow;
        draft.RejectionReason = string.IsNullOrWhiteSpace(reason) ? null : reason.Trim();

        await _db.SaveChangesAsync(ct);

        await _audit.LogAsync(
            "RejectQuestionDraft",
            "QuestionDraft",
            draftId.ToString("N"),
            oldValue: new { status = "Draft" },
            newValue: new { status = "Rejected", reason = draft.RejectionReason },
            actorUserId,
            ct);

        return true;
    }

    // -----------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------

    private static void ValidateGenerateRequest(GenerateQuestionDraftsRequest req)
    {
        if (req.Count is < 1 or > 20)
            throw new ArgumentException("count must be between 1 and 20.");
        if (req.Difficulty is < 1 or > 3)
            throw new ArgumentException("difficulty must be 1, 2, or 3.");
        if (req.IncludeCode && string.IsNullOrWhiteSpace(req.Language))
            throw new ArgumentException("language is required when includeCode is true.");
    }

    private static void ValidateOptionsAndAnswer(IReadOnlyList<string> options, string correctAnswer)
    {
        if (options is null || options.Count != 4)
            throw new ArgumentException("Question must have exactly 4 options.");
        if (options.Any(string.IsNullOrWhiteSpace))
            throw new ArgumentException("Option strings must be non-empty.");
        var letter = (correctAnswer ?? "").Trim().ToUpperInvariant();
        if (letter is not ("A" or "B" or "C" or "D"))
            throw new ArgumentException("correctAnswer must be one of 'A', 'B', 'C', 'D'.");
    }

    private static double ClampA(double a) => Math.Clamp(a, 0.5, 2.5);
    private static double ClampB(double b) => Math.Clamp(b, -3.0, 3.0);

    public async Task<IReadOnlyList<GeneratorBatchMetricDto>> GetRecentBatchMetricsAsync(
        int limit, CancellationToken ct = default)
    {
        if (limit < 1) limit = 1;
        if (limit > 50) limit = 50;

        // Group QuestionDrafts by BatchId; project per-batch totals; order by the
        // batch's earliest GeneratedAt (descending = newest first). The "earliest
        // GeneratedAt" is the de-facto batch timestamp since all drafts in a
        // batch are persisted in the same SaveChanges call.
        var raw = await _db.QuestionDrafts
            .AsNoTracking()
            .GroupBy(d => d.BatchId)
            .Select(g => new
            {
                BatchId = g.Key,
                BatchTimestamp = g.Min(d => d.GeneratedAt),
                Total = g.Count(),
                Approved = g.Count(d => d.Status == QuestionDraftStatus.Approved),
                Rejected = g.Count(d => d.Status == QuestionDraftStatus.Rejected),
                Pending = g.Count(d => d.Status == QuestionDraftStatus.Draft),
                PromptVersion = g.OrderBy(d => d.PositionInBatch).Select(d => d.PromptVersion).FirstOrDefault() ?? "unknown",
            })
            .OrderByDescending(b => b.BatchTimestamp)
            .Take(limit)
            .ToListAsync(ct);

        return raw.Select(b => new GeneratorBatchMetricDto(
            BatchId: b.BatchId,
            GeneratedAt: b.BatchTimestamp,
            TotalDrafts: b.Total,
            Approved: b.Approved,
            Rejected: b.Rejected,
            StillPending: b.Pending,
            // Reject rate excludes Pending drafts: a draft that's still under review
            // shouldn't count toward "rejected by reviewers". Once all drafts have
            // a verdict, decided == Total and the calc matches the report files.
            RejectRatePct: (b.Approved + b.Rejected) == 0
                ? 0.0
                : ((double)b.Rejected / (b.Approved + b.Rejected)) * 100.0,
            PromptVersion: b.PromptVersion)).ToList();
    }

    private static QuestionDraftDto Map(QuestionDraft d) => new(
        Id: d.Id,
        BatchId: d.BatchId,
        PositionInBatch: d.PositionInBatch,
        Status: d.Status,
        QuestionText: d.QuestionText,
        CodeSnippet: d.CodeSnippet,
        CodeLanguage: d.CodeLanguage,
        Options: d.Options,
        CorrectAnswer: d.CorrectAnswer,
        Explanation: d.Explanation,
        IrtA: d.IRT_A,
        IrtB: d.IRT_B,
        Rationale: d.Rationale,
        Category: d.Category,
        Difficulty: d.Difficulty,
        PromptVersion: d.PromptVersion,
        GeneratedAt: d.GeneratedAt,
        GeneratedById: d.GeneratedById,
        DecidedById: d.DecidedById,
        DecidedAt: d.DecidedAt,
        RejectionReason: d.RejectionReason,
        ApprovedQuestionId: d.ApprovedQuestionId);
}

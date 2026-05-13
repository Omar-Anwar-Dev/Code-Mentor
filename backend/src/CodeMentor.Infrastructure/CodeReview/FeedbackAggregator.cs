using System.Text.Json;
using CodeMentor.Application.CodeReview;
using CodeMentor.Application.Notifications;
using CodeMentor.Domain.Notifications;
using CodeMentor.Domain.Submissions;
using CodeMentor.Domain.Tasks;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace CodeMentor.Infrastructure.CodeReview;

/// <summary>
/// S6-T5 implementation. Single-responsibility aggregator: turn an
/// <see cref="AiCombinedResponse"/> into the unified feedback shape PRD F6
/// requires, write side-effect rows (Recommendations / Resources / Notifications),
/// and persist the unified shape into <see cref="AIAnalysisResult.FeedbackJson"/>.
///
/// Caps applied (PRD F6 "3-5 each"):
///   - max 5 recommendations
///   - max 5 resources (flattened from learningResources[].resources[])
/// </summary>
public sealed class FeedbackAggregator : IFeedbackAggregator
{
    public const int MaxRecommendations = 5;
    public const int MaxResources = 5;
    public const int MaxInlineAnnotations = 50;

    private static readonly JsonSerializerOptions FeedbackJsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false,
        DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull,
    };

    private readonly ApplicationDbContext _db;
    private readonly INotificationService _notifications;
    private readonly ILogger<FeedbackAggregator> _logger;

    public FeedbackAggregator(
        ApplicationDbContext db,
        INotificationService notifications,
        ILogger<FeedbackAggregator> logger)
    {
        _db = db;
        _notifications = notifications;
        _logger = logger;
    }

    public async Task AggregateAsync(Submission submission, AiCombinedResponse aiResponse, CancellationToken ct = default)
    {
        var aiReview = aiResponse.AiReview;
        if (aiReview is null || !aiReview.Available)
        {
            _logger.LogInformation("FeedbackAggregator: AI portion unavailable for {SubmissionId}; skipping aggregation.", submission.Id);
            return;
        }

        // ── 1. Idempotency: clear prior Recommendation/Resource rows for this submission. ──
        var oldRecs = await _db.Recommendations.Where(r => r.SubmissionId == submission.Id).ToListAsync(ct);
        var oldResources = await _db.Resources.Where(r => r.SubmissionId == submission.Id).ToListAsync(ct);
        if (oldRecs.Count > 0) _db.Recommendations.RemoveRange(oldRecs);
        if (oldResources.Count > 0) _db.Resources.RemoveRange(oldResources);

        // ── 2. Build Recommendations (cap at MaxRecommendations). ──
        // Optional best-effort taskId match: try matching the recommendation text
        // against active seeded Task titles; null TaskId is OK (text-only suggestion).
        var activeTasks = await _db.Tasks
            .Where(t => t.IsActive)
            .Select(t => new { t.Id, TitleLower = t.Title.ToLower() })
            .ToListAsync(ct);

        var newRecs = (aiReview.Recommendations ?? Array.Empty<AiRecommendation>())
            .Take(MaxRecommendations)
            .Select(r => new Recommendation
            {
                SubmissionId = submission.Id,
                Reason = Truncate(r.Message ?? string.Empty, 1000),
                Priority = MapPriority(r.Priority),
                TaskId = TryMatchTaskId(activeTasks, r.Message),
                Topic = string.IsNullOrWhiteSpace(r.Category) ? null : r.Category,
                IsAdded = false,
                CreatedAt = DateTime.UtcNow,
            })
            .ToList();

        // ── 3. Build Resources (flattened from learningResources blocks; cap MaxResources). ──
        var newResources = new List<Resource>();
        foreach (var block in aiReview.LearningResources ?? Array.Empty<AiWeaknessWithResources>())
        {
            foreach (var res in block.Resources ?? Array.Empty<AiLearningResource>())
            {
                if (newResources.Count >= MaxResources) break;
                if (string.IsNullOrWhiteSpace(res.Url)) continue;

                newResources.Add(new Resource
                {
                    SubmissionId = submission.Id,
                    Title = Truncate(res.Title ?? "(untitled)", 200),
                    Url = Truncate(res.Url, 500),
                    Type = MapResourceType(res.Type),
                    Topic = Truncate(block.Weakness ?? string.Empty, 200),
                    CreatedAt = DateTime.UtcNow,
                });
            }
            if (newResources.Count >= MaxResources) break;
        }

        if (newRecs.Count > 0) _db.Recommendations.AddRange(newRecs);
        if (newResources.Count > 0) _db.Resources.AddRange(newResources);

        // ── 4. Build the unified payload + persist into AIAnalysisResult.FeedbackJson. ──
        // (Notification raise moved AFTER the SaveChanges below so the email/in-app aren't
        //  shipped before the feedback is actually persisted — S14-T5 / ADR-046.)
        var aiRow = await _db.AIAnalysisResults.FirstOrDefaultAsync(r => r.SubmissionId == submission.Id, ct);
        if (aiRow is null)
        {
            // Caller contract violation — log + save recs/resources still + skip notif.
            _logger.LogWarning("FeedbackAggregator: AIAnalysisResult missing for {SubmissionId} — payload not persisted; notification skipped.", submission.Id);
            await _db.SaveChangesAsync(ct);
            return;
        }

        var unifiedPayload = BuildUnifiedPayload(submission, aiResponse, newRecs, newResources);
        aiRow.FeedbackJson = JsonSerializer.Serialize(unifiedPayload, FeedbackJsonOptions);

        await _db.SaveChangesAsync(ct);

        // ── 5. Notification: tell the learner feedback is ready (pref-aware via NotificationService). ──
        // Best-effort task-title lookup; falls back to a generic label if the task row went away.
        var taskTitle = await _db.Tasks
            .Where(t => t.Id == submission.TaskId)
            .Select(t => t.Title)
            .FirstOrDefaultAsync(ct) ?? "your task";

        // S14-T9: anonymized submissions (UserId nulled by hard-delete cascade) skip the
        // notification — the user is gone, no one to notify. Active submissions always
        // have a non-null UserId at this point so .Value is safe.
        if (submission.UserId is Guid notifyUserId)
        {
            await _notifications.RaiseFeedbackReadyAsync(
                notifyUserId,
                new FeedbackReadyEvent(
                    TaskTitle: taskTitle,
                    OverallScore: aiReview.OverallScore,
                    SubmissionRelativePath: $"/submissions/{submission.Id}"),
                ct);
        }

        _logger.LogInformation(
            "FeedbackAggregator: {SubmissionId} → {Recs} recs, {Resources} resources, unified payload {Bytes}B (notification raised via NotificationService)",
            submission.Id, newRecs.Count, newResources.Count, aiRow.FeedbackJson.Length);
    }

    /// <summary>
    /// Public helper so <c>GET /api/submissions/{id}/feedback</c> (S6-T7) can build
    /// the same shape from already-persisted rows when the row's stored payload
    /// is older than current Recommendations/Resources rows.
    /// </summary>
    public static object BuildUnifiedPayload(
        Submission submission,
        AiCombinedResponse aiResponse,
        IReadOnlyList<Recommendation> recommendations,
        IReadOnlyList<Resource> resources)
    {
        var aiReview = aiResponse.AiReview!;
        var inlineAnnotations = (aiReview.DetailedIssues ?? Array.Empty<AiDetailedIssue>())
            .Take(MaxInlineAnnotations)
            .Select(i => new
            {
                file = i.File,
                line = i.Line,
                endLine = i.EndLine,
                severity = NormalizeSeverity(i.Severity),
                category = NormalizeCategory(i.IssueType),
                title = i.Title,
                message = i.Message,
                explanation = i.Explanation,
                suggestedFix = i.SuggestedFix,
                codeSnippet = i.CodeSnippet,
                codeExample = i.CodeExample,
                isRepeatedMistake = i.IsRepeatedMistake,
            })
            .ToList();

        var staticIssuesByTool = (aiResponse.StaticAnalysis?.PerTool ?? Array.Empty<AiPerToolResult>())
            .ToDictionary(
                t => t.Tool,
                t => new
                {
                    summary = t.Summary,
                    issueCount = t.Issues?.Count ?? 0,
                    executionTimeMs = t.ExecutionTimeMs,
                });

        // S12 / F14 (ADR-040): true when the AI's enhanced-prompt path produced
        // a non-empty `progressAnalysis` paragraph. Acts as the frontend's
        // "this review used history-aware mode" signal — drives the
        // "Personalized for your learning journey" chip on the feedback panel.
        var historyAware = !string.IsNullOrWhiteSpace(aiReview.ProgressAnalysis);

        return new
        {
            submissionId = submission.Id,
            status = submission.Status.ToString(),
            aiAnalysisStatus = submission.AiAnalysisStatus.ToString(),
            overallScore = aiReview.OverallScore,
            scores = new
            {
                correctness = aiReview.Scores.Correctness,
                readability = aiReview.Scores.Readability,
                security = aiReview.Scores.Security,
                performance = aiReview.Scores.Performance,
                design = aiReview.Scores.Design,
            },
            strengths = aiReview.Strengths,
            weaknesses = aiReview.Weaknesses,
            summary = aiReview.Summary,
            inlineAnnotations,
            recommendations = recommendations.Select(r => new
            {
                id = r.Id,
                taskId = r.TaskId,
                topic = r.Topic,
                reason = r.Reason,
                priority = r.Priority,
                isAdded = r.IsAdded,
            }),
            resources = resources.Select(r => new
            {
                id = r.Id,
                title = r.Title,
                url = r.Url,
                type = r.Type.ToString(),
                topic = r.Topic,
            }),
            staticAnalysis = new
            {
                toolsUsed = aiResponse.StaticAnalysis?.ToolsUsed ?? Array.Empty<string>(),
                issuesByTool = staticIssuesByTool,
            },
            // S12 / F14 (ADR-040): the executive + progress paragraphs from the
            // enhanced prompt path. Null when the legacy F6 prompt produced the
            // review (no snapshot was forwarded). FE uses `progressAnalysis`
            // presence as the "show personalized chip" signal.
            executiveSummary = aiReview.ExecutiveSummary,
            progressAnalysis = aiReview.ProgressAnalysis,
            historyAware,
            metadata = new
            {
                modelUsed = aiReview.ModelUsed,
                tokensUsed = aiReview.TokensUsed,
                promptVersion = aiReview.PromptVersion,
                completedAt = submission.CompletedAt,
            },
        };
    }

    private static int MapPriority(string? priority) => (priority ?? "medium").ToLowerInvariant() switch
    {
        "high" or "critical" => 1,
        "medium" => 3,
        "low" => 5,
        _ => 3,
    };

    private static ResourceType MapResourceType(string? type) => (type ?? "article").ToLowerInvariant() switch
    {
        "documentation" or "docs" => ResourceType.Documentation,
        "video" => ResourceType.Video,
        "tutorial" => ResourceType.Tutorial,
        "course" => ResourceType.Course,
        _ => ResourceType.Article,
    };

    private static string NormalizeSeverity(string? severity) => (severity ?? "info").ToLowerInvariant() switch
    {
        "critical" or "high" => "error",
        "medium" => "warning",
        "low" => "info",
        // Already-normalized values pass through.
        "error" => "error",
        "warning" => "warning",
        "info" => "info",
        _ => "info",
    };

    private static string NormalizeCategory(string? category)
    {
        var lower = (category ?? "design").ToLowerInvariant();
        return lower switch
        {
            "correctness" or "readability" or "security" or "performance" or "design" => lower,
            // Legacy aliases the model occasionally still emits.
            "functionality" => "correctness",
            "bestpractices" or "best_practices" => "design",
            _ => "design",
        };
    }

    private static Guid? TryMatchTaskId(
        IReadOnlyList<dynamic> activeTasks,
        string? recommendationText)
    {
        if (string.IsNullOrWhiteSpace(recommendationText)) return null;
        var lower = recommendationText.ToLowerInvariant();
        foreach (var t in activeTasks)
        {
            string title = t.TitleLower;
            if (title.Length > 4 && lower.Contains(title))
            {
                return (Guid)t.Id;
            }
        }
        return null;
    }

    private static string Truncate(string s, int max) =>
        string.IsNullOrEmpty(s) ? string.Empty : (s.Length <= max ? s : s[..max]);
}

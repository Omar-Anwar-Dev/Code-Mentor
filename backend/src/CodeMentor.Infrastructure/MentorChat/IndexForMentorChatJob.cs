using System.IO.Compression;
using System.Text;
using System.Text.Json;
using CodeMentor.Application.CodeReview;
using CodeMentor.Application.MentorChat;
using CodeMentor.Application.ProjectAudits;
using CodeMentor.Application.Submissions;
using CodeMentor.Domain.ProjectAudits;
using CodeMentor.Domain.Submissions;
using CodeMentor.Infrastructure.Persistence;
using Hangfire;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace CodeMentor.Infrastructure.MentorChat;

/// <summary>
/// S10-T4 / F12: indexes a freshly Completed submission or audit for RAG
/// retrieval. Calls the AI service's <c>POST /api/embeddings/upsert</c> with
/// the resource's code + feedback content, then stamps
/// <c>MentorIndexedAt = UtcNow</c> on the source row so the FE chat panel can
/// flip out of its "Preparing mentor…" state (architecture §6.12; ADR-036).
///
/// Hangfire decoration:
/// * <see cref="AutomaticRetryAttribute.Attempts"/> = <c>1</c> matches the
///   S10-T4 acceptance — "one auto-retry on transient failure". A subsequent
///   failure is propagated to Hangfire as Failed; the FE shows a "indexing
///   failed, retry" CTA gated on <c>MentorIndexedAt is null</c>.
/// * <see cref="DisableConcurrentExecutionAttribute"/> 5-minute timeout keeps
///   a runaway upsert from blocking the worker pool.
/// </summary>
public class IndexForMentorChatJob
{
    private const int MaxFileCount = 50;
    private const int MaxFileBytes = 100 * 1024; // 100 KB per file

    private readonly ApplicationDbContext _db;
    private readonly ISubmissionCodeLoader _submissionLoader;
    private readonly IProjectAuditCodeLoader _auditLoader;
    private readonly IEmbeddingsClient _embeddings;
    private readonly ILogger<IndexForMentorChatJob> _logger;

    public IndexForMentorChatJob(
        ApplicationDbContext db,
        ISubmissionCodeLoader submissionLoader,
        IProjectAuditCodeLoader auditLoader,
        IEmbeddingsClient embeddings,
        ILogger<IndexForMentorChatJob> logger)
    {
        _db = db;
        _submissionLoader = submissionLoader;
        _auditLoader = auditLoader;
        _embeddings = embeddings;
        _logger = logger;
    }

    [AutomaticRetry(Attempts = 1)]
    [DisableConcurrentExecution(timeoutInSeconds: 300)]
    public async Task IndexSubmissionAsync(Guid submissionId, CancellationToken ct = default)
    {
        var submission = await _db.Submissions.FirstOrDefaultAsync(s => s.Id == submissionId, ct);
        if (submission is null)
        {
            _logger.LogWarning("MentorChat index: submission {SubmissionId} not found", submissionId);
            return;
        }
        if (submission.Status != SubmissionStatus.Completed)
        {
            _logger.LogInformation(
                "MentorChat index: submission {SubmissionId} is {Status}, skipping",
                submissionId, submission.Status);
            return;
        }

        var aiRow = await _db.AIAnalysisResults
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.SubmissionId == submissionId, ct);

        var feedback = ParseFeedback(aiRow?.FeedbackJson);

        var loadResult = await _submissionLoader.LoadAsZipStreamAsync(submission, ct);
        if (!loadResult.Success || loadResult.ZipStream is null)
        {
            _logger.LogWarning(
                "MentorChat index: code load failed for submission {SubmissionId} ({ErrorCode})",
                submissionId, loadResult.ErrorCode);
            return;
        }
        IReadOnlyList<EmbeddingsCodeFileDto> codeFiles;
        await using (loadResult.ZipStream)
        {
            codeFiles = ExtractTextFiles(loadResult.ZipStream);
        }

        // S12 / F14 (ADR-040): enrich the upsert payload with userId/taskId/
        // taskName so cross-submission RAG retrieval can filter by learner +
        // surface task context in the prompt without a DB round-trip. Look
        // up the task title once; harmless if the task was soft-deleted
        // (TitleOrFallback is non-throwing).
        var taskTitle = await _db.Tasks
            .AsNoTracking()
            .Where(t => t.Id == submission.TaskId)
            .Select(t => t.Title)
            .FirstOrDefaultAsync(ct);

        var request = new EmbeddingsUpsertRequest(
            Scope: "submission",
            ScopeId: submissionId.ToString("N"),
            CodeFiles: codeFiles,
            FeedbackSummary: feedback.Summary,
            Strengths: feedback.Strengths,
            Weaknesses: feedback.Weaknesses,
            Recommendations: feedback.Recommendations,
            Annotations: feedback.Annotations,
            UserId: submission.UserId.ToString("N"),
            TaskId: submission.TaskId.ToString("N"),
            TaskName: taskTitle);

        var correlationId = $"mentor-idx-{submissionId:N}";
        var result = await _embeddings.UpsertAsync(request, correlationId, ct);

        submission.MentorIndexedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation(
            "MentorChat indexed submission {SubmissionId}: {Indexed} chunks in {Duration}ms (collection={Collection})",
            submissionId, result.Indexed, result.DurationMs, result.Collection);
    }

    [AutomaticRetry(Attempts = 1)]
    [DisableConcurrentExecution(timeoutInSeconds: 300)]
    public async Task IndexAuditAsync(Guid auditId, CancellationToken ct = default)
    {
        var audit = await _db.ProjectAudits.FirstOrDefaultAsync(a => a.Id == auditId, ct);
        if (audit is null)
        {
            _logger.LogWarning("MentorChat index: audit {AuditId} not found", auditId);
            return;
        }
        if (audit.Status != ProjectAuditStatus.Completed)
        {
            _logger.LogInformation(
                "MentorChat index: audit {AuditId} is {Status}, skipping", auditId, audit.Status);
            return;
        }

        var resultRow = await _db.ProjectAuditResults
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.AuditId == auditId, ct);

        var feedback = ParseAuditFeedback(resultRow);

        var loadResult = await _auditLoader.LoadAsZipStreamAsync(audit, ct);
        if (!loadResult.Success || loadResult.ZipStream is null)
        {
            _logger.LogWarning(
                "MentorChat index: code load failed for audit {AuditId} ({ErrorCode})",
                auditId, loadResult.ErrorCode);
            return;
        }
        IReadOnlyList<EmbeddingsCodeFileDto> codeFiles;
        await using (loadResult.ZipStream)
        {
            codeFiles = ExtractTextFiles(loadResult.ZipStream);
        }

        var request = new EmbeddingsUpsertRequest(
            Scope: "audit",
            ScopeId: auditId.ToString("N"),
            CodeFiles: codeFiles,
            FeedbackSummary: feedback.Summary,
            Strengths: feedback.Strengths,
            Weaknesses: feedback.Weaknesses,
            Recommendations: feedback.Recommendations,
            Annotations: feedback.Annotations,
            // S12 / F14: audits don't belong to a Task, so TaskId/TaskName
            // are intentionally null. UserId still set so audit feedback
            // participates in the learner's history-aware RAG corpus —
            // a Project Audit catches the same kind of recurring patterns
            // F14 wants to surface in the next code review.
            UserId: audit.UserId.ToString("N"),
            TaskId: null,
            TaskName: audit.ProjectName);

        var correlationId = $"mentor-idx-{auditId:N}";
        var result = await _embeddings.UpsertAsync(request, correlationId, ct);

        audit.MentorIndexedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation(
            "MentorChat indexed audit {AuditId}: {Indexed} chunks in {Duration}ms (collection={Collection})",
            auditId, result.Indexed, result.DurationMs, result.Collection);
    }

    // ------------------------------------------------------------------
    // helpers
    // ------------------------------------------------------------------

    private static readonly HashSet<string> _binaryExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".exe", ".dll", ".so", ".dylib", ".class", ".jar", ".pyc", ".pyo",
        ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".bmp", ".pdf",
        ".zip", ".tar", ".gz", ".7z", ".mp3", ".mp4", ".wav", ".woff", ".woff2",
    };

    private static List<EmbeddingsCodeFileDto> ExtractTextFiles(Stream zipStream)
    {
        var files = new List<EmbeddingsCodeFileDto>();
        if (zipStream.CanSeek) zipStream.Position = 0;

        using var archive = new ZipArchive(zipStream, ZipArchiveMode.Read, leaveOpen: true);
        foreach (var entry in archive.Entries)
        {
            if (files.Count >= MaxFileCount) break;
            if (string.IsNullOrEmpty(entry.Name)) continue; // directory entry
            if (entry.Length == 0) continue;

            var ext = Path.GetExtension(entry.FullName);
            if (_binaryExtensions.Contains(ext)) continue;

            // Skip oversize entries; embedding-quality drops on huge files anyway
            // and we already have a per-file cap to enforce.
            using var reader = new StreamReader(entry.Open(), Encoding.UTF8, detectEncodingFromByteOrderMarks: true);
            var buffer = new char[MaxFileBytes];
            var read = reader.Read(buffer, 0, buffer.Length);
            if (read <= 0) continue;
            var content = new string(buffer, 0, read);

            files.Add(new EmbeddingsCodeFileDto(
                FilePath: NormalizePath(entry.FullName),
                Content: content));
        }
        return files;
    }

    private static string NormalizePath(string path) =>
        path.Replace('\\', '/').TrimStart('/');

    private record FeedbackParts(
        string? Summary,
        IReadOnlyList<string> Strengths,
        IReadOnlyList<string> Weaknesses,
        IReadOnlyList<string> Recommendations,
        IReadOnlyList<EmbeddingsAnnotationDto> Annotations);

    private static readonly FeedbackParts EmptyFeedback = new(null,
        Array.Empty<string>(), Array.Empty<string>(), Array.Empty<string>(),
        Array.Empty<EmbeddingsAnnotationDto>());

    private static FeedbackParts ParseFeedback(string? feedbackJson)
    {
        if (string.IsNullOrWhiteSpace(feedbackJson)) return EmptyFeedback;
        try
        {
            using var doc = JsonDocument.Parse(feedbackJson);
            var root = doc.RootElement;
            return new FeedbackParts(
                Summary: ReadString(root, "summary"),
                Strengths: ReadStringList(root, "strengths"),
                Weaknesses: ReadStringList(root, "weaknesses"),
                Recommendations: ReadRecommendationStrings(root),
                Annotations: ReadAnnotations(root, "inlineAnnotations"));
        }
        catch (JsonException)
        {
            return EmptyFeedback;
        }
    }

    private static FeedbackParts ParseAuditFeedback(ProjectAuditResult? result)
    {
        if (result is null) return EmptyFeedback;
        var strengths = ParseJsonStringList(result.StrengthsJson);
        var recs = ParseRecommendationsFromJson(result.RecommendedImprovementsJson);
        var weaknessesFromCritical = ParseTitlesFromIssueList(result.CriticalIssuesJson);
        var weaknessesFromWarnings = ParseTitlesFromIssueList(result.WarningsJson);
        var annotations = ParseAuditAnnotations(result.InlineAnnotationsJson);

        var combinedWeaknesses = new List<string>(weaknessesFromCritical.Count + weaknessesFromWarnings.Count);
        combinedWeaknesses.AddRange(weaknessesFromCritical);
        combinedWeaknesses.AddRange(weaknessesFromWarnings);

        return new FeedbackParts(
            Summary: result.TechStackAssessment,
            Strengths: strengths,
            Weaknesses: combinedWeaknesses,
            Recommendations: recs,
            Annotations: annotations);
    }

    // -- JSON helpers --------------------------------------------------------

    private static string? ReadString(JsonElement el, string name)
    {
        if (!el.TryGetProperty(name, out var v) || v.ValueKind != JsonValueKind.String) return null;
        return v.GetString();
    }

    private static IReadOnlyList<string> ReadStringList(JsonElement el, string name)
    {
        if (!el.TryGetProperty(name, out var v) || v.ValueKind != JsonValueKind.Array) return Array.Empty<string>();
        var list = new List<string>(v.GetArrayLength());
        foreach (var item in v.EnumerateArray())
        {
            if (item.ValueKind == JsonValueKind.String)
            {
                var s = item.GetString();
                if (!string.IsNullOrWhiteSpace(s)) list.Add(s);
            }
            else if (item.ValueKind == JsonValueKind.Object && item.TryGetProperty("text", out var textProp))
            {
                var s = textProp.GetString();
                if (!string.IsNullOrWhiteSpace(s)) list.Add(s);
            }
        }
        return list;
    }

    private static IReadOnlyList<string> ReadRecommendationStrings(JsonElement root)
    {
        if (!root.TryGetProperty("recommendations", out var v) || v.ValueKind != JsonValueKind.Array)
            return Array.Empty<string>();
        var list = new List<string>(v.GetArrayLength());
        foreach (var item in v.EnumerateArray())
        {
            if (item.ValueKind == JsonValueKind.String)
            {
                var s = item.GetString();
                if (!string.IsNullOrWhiteSpace(s)) list.Add(s);
            }
            else if (item.ValueKind == JsonValueKind.Object)
            {
                var msg = item.TryGetProperty("message", out var m) ? m.GetString()
                         : item.TryGetProperty("topic", out var t) ? t.GetString()
                         : null;
                if (!string.IsNullOrWhiteSpace(msg)) list.Add(msg!);
            }
        }
        return list;
    }

    private static IReadOnlyList<EmbeddingsAnnotationDto> ReadAnnotations(JsonElement root, string name)
    {
        if (!root.TryGetProperty(name, out var v) || v.ValueKind != JsonValueKind.Array)
            return Array.Empty<EmbeddingsAnnotationDto>();
        var list = new List<EmbeddingsAnnotationDto>(v.GetArrayLength());
        foreach (var item in v.EnumerateArray())
        {
            if (item.ValueKind != JsonValueKind.Object) continue;
            list.Add(new EmbeddingsAnnotationDto(
                File: ReadStringProp(item, "file"),
                FilePath: ReadStringProp(item, "filePath"),
                Line: ReadIntProp(item, "line"),
                LineNumber: ReadIntProp(item, "lineNumber"),
                Title: ReadStringProp(item, "title"),
                Severity: ReadStringProp(item, "severity"),
                Message: ReadStringProp(item, "message"),
                Description: ReadStringProp(item, "description")));
        }
        return list;
    }

    private static IReadOnlyList<string> ParseJsonStringList(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return Array.Empty<string>();
        try
        {
            using var doc = JsonDocument.Parse(json);
            if (doc.RootElement.ValueKind != JsonValueKind.Array) return Array.Empty<string>();
            var list = new List<string>();
            foreach (var item in doc.RootElement.EnumerateArray())
            {
                if (item.ValueKind == JsonValueKind.String)
                {
                    var s = item.GetString();
                    if (!string.IsNullOrWhiteSpace(s)) list.Add(s);
                }
                else if (item.ValueKind == JsonValueKind.Object && item.TryGetProperty("text", out var tp))
                {
                    var s = tp.GetString();
                    if (!string.IsNullOrWhiteSpace(s)) list.Add(s);
                }
            }
            return list;
        }
        catch (JsonException)
        {
            return Array.Empty<string>();
        }
    }

    /// <remarks>
    /// Audit Strengths/CriticalIssues etc are stored as bare top-level JSON
    /// arrays. The inner helper expects a named property — this fast-path
    /// just iterates the array directly.
    /// </remarks>
    private static IReadOnlyList<string> ParseTitlesFromIssueList(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return Array.Empty<string>();
        try
        {
            using var doc = JsonDocument.Parse(json);
            if (doc.RootElement.ValueKind != JsonValueKind.Array) return Array.Empty<string>();
            var list = new List<string>();
            foreach (var item in doc.RootElement.EnumerateArray())
            {
                var title = item.ValueKind == JsonValueKind.Object
                    ? ReadStringProp(item, "title") ?? ReadStringProp(item, "message")
                    : item.ValueKind == JsonValueKind.String ? item.GetString() : null;
                if (!string.IsNullOrWhiteSpace(title)) list.Add(title!);
            }
            return list;
        }
        catch (JsonException)
        {
            return Array.Empty<string>();
        }
    }

    private static IReadOnlyList<string> ParseRecommendationsFromJson(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return Array.Empty<string>();
        try
        {
            using var doc = JsonDocument.Parse(json);
            if (doc.RootElement.ValueKind != JsonValueKind.Array) return Array.Empty<string>();
            var list = new List<string>();
            foreach (var item in doc.RootElement.EnumerateArray())
            {
                if (item.ValueKind == JsonValueKind.String)
                {
                    var s = item.GetString();
                    if (!string.IsNullOrWhiteSpace(s)) list.Add(s);
                }
                else if (item.ValueKind == JsonValueKind.Object)
                {
                    var s = ReadStringProp(item, "title")
                         ?? ReadStringProp(item, "howTo")
                         ?? ReadStringProp(item, "message");
                    if (!string.IsNullOrWhiteSpace(s)) list.Add(s!);
                }
            }
            return list;
        }
        catch (JsonException)
        {
            return Array.Empty<string>();
        }
    }

    private static IReadOnlyList<EmbeddingsAnnotationDto> ParseAuditAnnotations(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return Array.Empty<EmbeddingsAnnotationDto>();
        try
        {
            using var doc = JsonDocument.Parse(json);
            if (doc.RootElement.ValueKind != JsonValueKind.Array) return Array.Empty<EmbeddingsAnnotationDto>();
            var list = new List<EmbeddingsAnnotationDto>();
            foreach (var item in doc.RootElement.EnumerateArray())
            {
                if (item.ValueKind != JsonValueKind.Object) continue;
                list.Add(new EmbeddingsAnnotationDto(
                    File: ReadStringProp(item, "file"),
                    FilePath: ReadStringProp(item, "filePath"),
                    Line: ReadIntProp(item, "line"),
                    LineNumber: ReadIntProp(item, "lineNumber"),
                    Title: ReadStringProp(item, "title"),
                    Severity: ReadStringProp(item, "severity"),
                    Message: ReadStringProp(item, "message"),
                    Description: ReadStringProp(item, "description")));
            }
            return list;
        }
        catch (JsonException)
        {
            return Array.Empty<EmbeddingsAnnotationDto>();
        }
    }

    private static string? ReadStringProp(JsonElement el, string name) =>
        el.TryGetProperty(name, out var v) && v.ValueKind == JsonValueKind.String ? v.GetString() : null;

    private static int? ReadIntProp(JsonElement el, string name) =>
        el.TryGetProperty(name, out var v) && v.TryGetInt32(out var n) ? n : null;
}

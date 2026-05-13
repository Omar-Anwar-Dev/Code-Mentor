using System.Text.Json;
using CodeMentor.Application.ProjectAudits;
using CodeMentor.Application.ProjectAudits.Contracts;
using CodeMentor.Application.Storage;
using CodeMentor.Domain.ProjectAudits;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CodeMentor.Infrastructure.ProjectAudits;

/// <summary>
/// S9-T3: Project Audit creation pipeline. Validates the structured description
/// + source, persists a <see cref="ProjectAudit"/> row in Pending state, and
/// enqueues <see cref="ProjectAuditJob"/> for async analysis.
///
/// Validation is inline (matches existing <c>SubmissionService</c> convention,
/// not FluentValidation) — see ADR-031 for module separation rationale and
/// progress.md S9-T3 note for the FluentValidation deviation.
/// </summary>
public class ProjectAuditService : IProjectAuditService
{
    private readonly ApplicationDbContext _db;
    private readonly IBlobStorage _blobStorage;
    private readonly IProjectAuditScheduler _scheduler;

    private const int MaxProjectNameLength = 200;
    private const int MaxSummaryLength = 200;
    private const int MaxDescriptionLength = 5000;
    private const int MaxTechStackEntries = 30;
    private const int MaxFeatureEntries = 30;
    private const int MaxFeatureLength = 200;

    public ProjectAuditService(
        ApplicationDbContext db,
        IBlobStorage blobStorage,
        IProjectAuditScheduler scheduler)
    {
        _db = db;
        _blobStorage = blobStorage;
        _scheduler = scheduler;
    }

    public async Task<AuditOperationResult> CreateAsync(
        Guid userId,
        CreateAuditRequest request,
        CancellationToken ct = default)
    {
        var validation = ValidateRequest(request);
        if (validation is not null) return validation;

        var sourceTypeRaw = request.Source.Type.Trim();
        var sourceType = ParseSourceType(sourceTypeRaw);
        if (sourceType is null)
            return AuditOperationResult.Error(
                AuditErrorCode.InvalidSourceType,
                "source.type must be 'github' or 'zip'.");

        if (sourceType == AuditSourceType.Upload)
        {
            var exists = await _blobStorage.ExistsAsync(
                BlobContainers.Audits, request.Source.BlobPath!, ct);
            if (!exists)
                return AuditOperationResult.Error(
                    AuditErrorCode.BlobNotFound,
                    "Uploaded file not found. Request a new upload URL and try again.");
        }

        var description = BuildDescriptionPayload(request);

        var audit = new ProjectAudit
        {
            UserId = userId,
            ProjectName = request.ProjectName.Trim(),
            ProjectDescriptionJson = JsonSerializer.Serialize(description),
            SourceType = sourceType.Value,
            RepositoryUrl = sourceType == AuditSourceType.GitHub ? request.Source.RepositoryUrl : null,
            BlobPath = sourceType == AuditSourceType.Upload ? request.Source.BlobPath : null,
            Status = ProjectAuditStatus.Pending,
            AiReviewStatus = ProjectAuditAiStatus.NotAttempted,
            AttemptNumber = 1,
            CreatedAt = DateTime.UtcNow,
        };
        _db.ProjectAudits.Add(audit);
        await _db.SaveChangesAsync(ct);

        // Enqueue after the row is committed so the worker can find it immediately.
        // Mirrors SubmissionService ordering — if enqueue throws, the row exists
        // and can be retried via POST /audits/{id}/retry (S9-T5).
        _scheduler.Schedule(audit.Id);

        return AuditOperationResult.Ok(new AuditCreatedResponse(
            audit.Id, audit.Status, audit.AttemptNumber));
    }

    public async Task<AuditDto?> GetAsync(Guid userId, Guid auditId, CancellationToken ct = default)
    {
        return await _db.ProjectAudits
            .AsNoTracking()
            .Where(a => a.Id == auditId && a.UserId == userId && !a.IsDeleted)
            .Select(a => new AuditDto(
                // S14-T9: row was filtered by a.UserId == userId upstream, so it's never anonymized here.
                a.Id, a.UserId ?? Guid.Empty, a.ProjectName, a.SourceType,
                a.RepositoryUrl, a.BlobPath,
                a.Status, a.AiReviewStatus,
                a.OverallScore, a.Grade,
                a.ErrorMessage, a.AttemptNumber,
                a.IsDeleted,
                a.CreatedAt, a.StartedAt, a.CompletedAt,
                a.MentorIndexedAt))
            .FirstOrDefaultAsync(ct);
    }

    public async Task<AuditReportDto?> GetReportAsync(Guid userId, Guid auditId, CancellationToken ct = default)
    {
        var row = await _db.ProjectAudits
            .AsNoTracking()
            .Where(a => a.Id == auditId
                     && a.UserId == userId
                     && !a.IsDeleted
                     && a.Status == ProjectAuditStatus.Completed)
            .Join(_db.ProjectAuditResults.AsNoTracking(),
                a => a.Id,
                r => r.AuditId,
                (a, r) => new
                {
                    a.Id,
                    a.ProjectName,
                    OverallScore = a.OverallScore ?? 0,
                    Grade = a.Grade ?? string.Empty,
                    a.CompletedAt,
                    r.ScoresJson,
                    r.StrengthsJson,
                    r.CriticalIssuesJson,
                    r.WarningsJson,
                    r.SuggestionsJson,
                    r.MissingFeaturesJson,
                    r.RecommendedImprovementsJson,
                    r.TechStackAssessment,
                    r.InlineAnnotationsJson,
                    r.ModelUsed,
                    r.PromptVersion,
                    r.TokensInput,
                    r.TokensOutput,
                    r.ProcessedAt,
                })
            .FirstOrDefaultAsync(ct);

        if (row is null) return null;

        // Parse each JSON column to a JsonElement so the controller can serialize
        // them as nested JSON (no string-quoted blobs). Documents are kept on a
        // long-lived owner so JsonElement references stay valid through serialization.
        var jsonOwner = new ReportJsonOwner();
        return new AuditReportDto(
            AuditId: row.Id,
            ProjectName: row.ProjectName,
            OverallScore: row.OverallScore,
            Grade: row.Grade,
            Scores: jsonOwner.Parse(row.ScoresJson),
            Strengths: jsonOwner.Parse(row.StrengthsJson),
            CriticalIssues: jsonOwner.Parse(row.CriticalIssuesJson),
            Warnings: jsonOwner.Parse(row.WarningsJson),
            Suggestions: jsonOwner.Parse(row.SuggestionsJson),
            MissingFeatures: jsonOwner.Parse(row.MissingFeaturesJson),
            RecommendedImprovements: jsonOwner.Parse(row.RecommendedImprovementsJson),
            TechStackAssessment: row.TechStackAssessment,
            InlineAnnotations: jsonOwner.Parse(row.InlineAnnotationsJson),
            ModelUsed: row.ModelUsed,
            PromptVersion: row.PromptVersion,
            TokensInput: row.TokensInput,
            TokensOutput: row.TokensOutput,
            ProcessedAt: row.ProcessedAt,
            CompletedAt: row.CompletedAt ?? row.ProcessedAt);
    }

    public async Task<AuditListResponse> ListMineAsync(
        Guid userId,
        AuditListQuery query,
        CancellationToken ct = default)
    {
        var page = query.Page < 1 ? 1 : query.Page;
        var size = query.Size < 1 ? 20 : (query.Size > 100 ? 100 : query.Size);

        var baseQuery = _db.ProjectAudits
            .AsNoTracking()
            .Where(a => a.UserId == userId && !a.IsDeleted);

        if (query.DateFrom.HasValue)
            baseQuery = baseQuery.Where(a => a.CreatedAt >= query.DateFrom.Value);
        if (query.DateTo.HasValue)
            baseQuery = baseQuery.Where(a => a.CreatedAt <= query.DateTo.Value);
        if (query.ScoreMin.HasValue)
            baseQuery = baseQuery.Where(a => a.OverallScore >= query.ScoreMin.Value);
        if (query.ScoreMax.HasValue)
            baseQuery = baseQuery.Where(a => a.OverallScore <= query.ScoreMax.Value);

        var total = await baseQuery.CountAsync(ct);

        var items = await baseQuery
            .OrderByDescending(a => a.CreatedAt)
            .Skip((page - 1) * size)
            .Take(size)
            .Select(a => new AuditListItemDto(
                a.Id, a.ProjectName, a.SourceType,
                a.Status, a.AiReviewStatus,
                a.OverallScore, a.Grade,
                a.CreatedAt, a.CompletedAt))
            .ToListAsync(ct);

        return new AuditListResponse(page, size, total, items);
    }

    public async Task<AuditOperationResult> SoftDeleteAsync(
        Guid userId,
        Guid auditId,
        CancellationToken ct = default)
    {
        var audit = await _db.ProjectAudits
            .FirstOrDefaultAsync(a => a.Id == auditId && a.UserId == userId, ct);

        if (audit is null || audit.IsDeleted)
            return AuditOperationResult.Error(
                AuditErrorCode.NotFound,
                "Audit not found.");

        audit.IsDeleted = true;
        await _db.SaveChangesAsync(ct);

        return AuditOperationResult.Ok(new AuditCreatedResponse(
            audit.Id, audit.Status, audit.AttemptNumber));
    }

    public async Task<AuditOperationResult> RetryAsync(
        Guid userId,
        Guid auditId,
        CancellationToken ct = default)
    {
        var audit = await _db.ProjectAudits
            .FirstOrDefaultAsync(a => a.Id == auditId && a.UserId == userId && !a.IsDeleted, ct);

        if (audit is null)
            return AuditOperationResult.Error(
                AuditErrorCode.NotFound,
                "Audit not found.");

        if (audit.Status != ProjectAuditStatus.Failed)
            return AuditOperationResult.Error(
                AuditErrorCode.NotRetryable,
                $"Only Failed audits can be retried. Current status: {audit.Status}.");

        audit.Status = ProjectAuditStatus.Pending;
        audit.AiReviewStatus = ProjectAuditAiStatus.NotAttempted;
        audit.ErrorMessage = null;
        audit.StartedAt = null;
        audit.CompletedAt = null;
        audit.AttemptNumber += 1;
        // AiAutoRetryCount intentionally NOT reset — counts only AI-down auto retries
        // since first creation; mirrors SubmissionService.RetryAsync behavior.

        await _db.SaveChangesAsync(ct);

        _scheduler.Schedule(audit.Id);

        return AuditOperationResult.Ok(new AuditCreatedResponse(
            audit.Id, audit.Status, audit.AttemptNumber));
    }

    /// <summary>
    /// Holds parsed <see cref="JsonDocument"/> instances so the
    /// <see cref="JsonElement"/> references in the returned DTO remain valid through
    /// the controller's serialization pass. Disposed when the DTO is no longer
    /// referenced (the JsonElement values capture the document indirectly).
    /// </summary>
    private sealed class ReportJsonOwner
    {
        private readonly List<JsonDocument> _documents = new();

        public JsonElement Parse(string json)
        {
            var doc = JsonDocument.Parse(string.IsNullOrWhiteSpace(json) ? "null" : json);
            _documents.Add(doc);
            return doc.RootElement;
        }
    }

    private static AuditOperationResult? ValidateRequest(CreateAuditRequest request)
    {
        if (request is null)
            return AuditOperationResult.Error(AuditErrorCode.InvalidRequest, "Request body is required.");

        if (string.IsNullOrWhiteSpace(request.ProjectName) || request.ProjectName.Length > MaxProjectNameLength)
            return AuditOperationResult.Error(AuditErrorCode.InvalidRequest,
                $"projectName is required (≤ {MaxProjectNameLength} chars).");

        if (string.IsNullOrWhiteSpace(request.Summary) || request.Summary.Length > MaxSummaryLength)
            return AuditOperationResult.Error(AuditErrorCode.InvalidRequest,
                $"summary is required (≤ {MaxSummaryLength} chars).");

        if (string.IsNullOrWhiteSpace(request.Description) || request.Description.Length > MaxDescriptionLength)
            return AuditOperationResult.Error(AuditErrorCode.InvalidRequest,
                $"description is required (≤ {MaxDescriptionLength} chars).");

        if (!ProjectTypes.IsValid(request.ProjectType))
            return AuditOperationResult.Error(AuditErrorCode.InvalidProjectType,
                $"projectType must be one of: {string.Join(", ", ProjectTypes.All)}.");

        if (request.TechStack is null || request.TechStack.Count == 0)
            return AuditOperationResult.Error(AuditErrorCode.InvalidRequest, "techStack must contain at least one entry.");
        if (request.TechStack.Count > MaxTechStackEntries)
            return AuditOperationResult.Error(AuditErrorCode.InvalidRequest,
                $"techStack must contain at most {MaxTechStackEntries} entries.");

        if (request.Features is null || request.Features.Count == 0)
            return AuditOperationResult.Error(AuditErrorCode.InvalidRequest, "features must contain at least one entry.");
        if (request.Features.Count > MaxFeatureEntries)
            return AuditOperationResult.Error(AuditErrorCode.InvalidRequest,
                $"features must contain at most {MaxFeatureEntries} entries.");
        if (request.Features.Any(f => string.IsNullOrWhiteSpace(f) || f.Length > MaxFeatureLength))
            return AuditOperationResult.Error(AuditErrorCode.InvalidRequest,
                $"each feature must be non-empty and ≤ {MaxFeatureLength} chars.");

        if (request.Source is null)
            return AuditOperationResult.Error(AuditErrorCode.InvalidRequest, "source is required.");

        var sourceType = ParseSourceType(request.Source.Type);
        switch (sourceType)
        {
            case AuditSourceType.GitHub:
                if (string.IsNullOrWhiteSpace(request.Source.RepositoryUrl))
                    return AuditOperationResult.Error(AuditErrorCode.InvalidRequest,
                        "source.repositoryUrl is required when source.type='github'.");
                if (!IsValidGitHubUrl(request.Source.RepositoryUrl))
                    return AuditOperationResult.Error(AuditErrorCode.InvalidGitHubUrl,
                        "source.repositoryUrl must be an HTTPS GitHub repo URL like https://github.com/owner/repo.");
                return null;

            case AuditSourceType.Upload:
                if (string.IsNullOrWhiteSpace(request.Source.BlobPath))
                    return AuditOperationResult.Error(AuditErrorCode.InvalidRequest,
                        "source.blobPath is required when source.type='zip'.");
                return null;

            default:
                // Empty / unrecognized type — surfaced as InvalidSourceType in CreateAsync after validation.
                return null;
        }
    }

    private static AuditSourceType? ParseSourceType(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return null;
        if (raw.Equals("github", StringComparison.OrdinalIgnoreCase)) return AuditSourceType.GitHub;
        if (raw.Equals("zip", StringComparison.OrdinalIgnoreCase)) return AuditSourceType.Upload;
        if (raw.Equals("upload", StringComparison.OrdinalIgnoreCase)) return AuditSourceType.Upload;
        return null;
    }

    private static object BuildDescriptionPayload(CreateAuditRequest request) => new
    {
        summary = request.Summary.Trim(),
        description = request.Description,
        projectType = request.ProjectType.Trim(),
        techStack = request.TechStack,
        features = request.Features,
        targetAudience = request.TargetAudience,
        focusAreas = request.FocusAreas ?? Array.Empty<string>(),
        knownIssues = request.KnownIssues,
    };

    private static bool IsValidGitHubUrl(string url)
    {
        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri)) return false;
        if (uri.Scheme != Uri.UriSchemeHttps) return false;
        if (!uri.Host.Equals("github.com", StringComparison.OrdinalIgnoreCase)) return false;
        var segments = uri.AbsolutePath.Trim('/').Split('/');
        if (segments.Length < 2) return false;
        if (string.IsNullOrWhiteSpace(segments[0]) || string.IsNullOrWhiteSpace(segments[1])) return false;
        return true;
    }
}

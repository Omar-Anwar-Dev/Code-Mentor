using System.Text.Json;
using CodeMentor.Application.MentorChat;
using CodeMentor.Application.MentorChat.Contracts;
using CodeMentor.Domain.MentorChat;
using CodeMentor.Domain.ProjectAudits;
using CodeMentor.Domain.Submissions;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace CodeMentor.Infrastructure.MentorChat;

/// <summary>
/// S10-T6 / F12: backend service for the mentor-chat HTTP API
/// (architecture §6.12; ADR-036). Handles ownership + readiness gates,
/// session lazy-creation, and message persistence around the SSE proxy
/// the controller streams through to the AI service.
/// </summary>
public sealed class MentorChatService : IMentorChatService
{
    /// <summary>Last N turns of history sent to the AI service per turn — matches PRD F12 cap.</summary>
    public const int HistoryLimit = 10;

    private readonly ApplicationDbContext _db;
    private readonly ILogger<MentorChatService> _logger;

    public MentorChatService(ApplicationDbContext db, ILogger<MentorChatService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<MentorChatOperationResult<MentorChatHistoryResponse>> GetOrCreateAndLoadAsync(
        Guid sessionId, Guid userId, CancellationToken ct = default)
    {
        var session = await _db.MentorChatSessions
            .FirstOrDefaultAsync(s => s.Id == sessionId, ct);
        if (session is null)
        {
            return MentorChatOperationResult<MentorChatHistoryResponse>.Fail(MentorChatErrorCode.NotFound);
        }
        if (session.UserId != userId)
        {
            return MentorChatOperationResult<MentorChatHistoryResponse>.Fail(MentorChatErrorCode.NotOwned);
        }

        var isReady = await IsResourceIndexedAsync(session.Scope, session.ScopeId, ct);

        var messages = await _db.MentorChatMessages
            .AsNoTracking()
            .Where(m => m.SessionId == sessionId)
            .OrderBy(m => m.CreatedAt)
            .Take(200)
            .ToListAsync(ct);

        var dto = new MentorChatHistoryResponse(
            ToSessionDto(session, isReady, messages.Count),
            messages.Select(ToMessageDto).ToList());
        return MentorChatOperationResult<MentorChatHistoryResponse>.Ok(dto);
    }

    public async Task<MentorChatOperationResult<MentorChatSessionDto>> CreateSessionAsync(
        CreateSessionRequest request, Guid userId, CancellationToken ct = default)
    {
        if (!TryParseScope(request.Scope, out var scope))
        {
            return MentorChatOperationResult<MentorChatSessionDto>.Fail(
                MentorChatErrorCode.InvalidScope,
                $"Scope must be 'submission' or 'audit'.");
        }
        if (request.ScopeId == Guid.Empty)
        {
            return MentorChatOperationResult<MentorChatSessionDto>.Fail(
                MentorChatErrorCode.Validation, "ScopeId is required.");
        }

        var resource = await OwnsAsync(scope, request.ScopeId, userId, ct);
        if (resource is null)
        {
            return MentorChatOperationResult<MentorChatSessionDto>.Fail(
                MentorChatErrorCode.UnderlyingResourceMissing,
                "The underlying submission/audit was not found or is not owned by this user.");
        }

        var existing = await _db.MentorChatSessions
            .FirstOrDefaultAsync(s =>
                s.UserId == userId && s.Scope == scope && s.ScopeId == request.ScopeId, ct);

        var (session, isFresh) = existing is null
            ? (Created(userId, scope, request.ScopeId), true)
            : (existing, false);

        if (isFresh)
        {
            _db.MentorChatSessions.Add(session);
            await _db.SaveChangesAsync(ct);
        }

        return MentorChatOperationResult<MentorChatSessionDto>.Ok(
            ToSessionDto(session, resource.MentorIndexedAt is not null, messageCount: 0));
    }

    public async Task<MentorChatOperationResult<int>> ClearHistoryAsync(
        Guid sessionId, Guid userId, CancellationToken ct = default)
    {
        var session = await _db.MentorChatSessions
            .FirstOrDefaultAsync(s => s.Id == sessionId, ct);
        if (session is null)
            return MentorChatOperationResult<int>.Fail(MentorChatErrorCode.NotFound);
        if (session.UserId != userId)
            return MentorChatOperationResult<int>.Fail(MentorChatErrorCode.NotOwned);

        var existing = await _db.MentorChatMessages
            .Where(m => m.SessionId == sessionId)
            .ToListAsync(ct);
        if (existing.Count > 0)
        {
            _db.MentorChatMessages.RemoveRange(existing);
        }
        session.LastMessageAt = null;
        await _db.SaveChangesAsync(ct);
        return MentorChatOperationResult<int>.Ok(existing.Count);
    }

    public async Task<MentorChatOperationResult<MentorChatSendContext>> PrepareSendAsync(
        Guid sessionId, Guid userId, SendMessageRequest request, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.Content))
        {
            return MentorChatOperationResult<MentorChatSendContext>.Fail(
                MentorChatErrorCode.Validation, "Message content is required.");
        }

        var session = await _db.MentorChatSessions
            .FirstOrDefaultAsync(s => s.Id == sessionId, ct);
        if (session is null)
            return MentorChatOperationResult<MentorChatSendContext>.Fail(MentorChatErrorCode.NotFound);
        if (session.UserId != userId)
            return MentorChatOperationResult<MentorChatSendContext>.Fail(MentorChatErrorCode.NotOwned);

        var resource = await OwnsAsync(session.Scope, session.ScopeId, userId, ct);
        if (resource is null)
            return MentorChatOperationResult<MentorChatSendContext>.Fail(
                MentorChatErrorCode.UnderlyingResourceMissing);
        if (resource.MentorIndexedAt is null)
            return MentorChatOperationResult<MentorChatSendContext>.Fail(MentorChatErrorCode.NotReady);

        var feedback = await LoadFeedbackPayloadAsync(session.Scope, session.ScopeId, ct);

        // Persist the user turn BEFORE we start streaming so the assistant turn
        // has a stable predecessor — keeps the conversation coherent if the
        // stream is cut off mid-response.
        var userMessage = new MentorChatMessage
        {
            SessionId = session.Id,
            Role = MentorChatRole.User,
            Content = request.Content,
        };
        _db.MentorChatMessages.Add(userMessage);
        session.LastMessageAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);

        var historyTurns = await _db.MentorChatMessages
            .AsNoTracking()
            .Where(m => m.SessionId == session.Id && m.Id != userMessage.Id)
            .OrderByDescending(m => m.CreatedAt)
            .Take(HistoryLimit)
            .ToListAsync(ct);
        historyTurns.Reverse();

        var ctx = new MentorChatSendContext(
            SessionId: session.Id,
            UserMessageId: userMessage.Id,
            Scope: session.Scope.ToString().ToLowerInvariant(),
            ScopeId: session.ScopeId.ToString("N"),
            Message: request.Content,
            History: historyTurns
                .Select(m => new MentorChatHistoryTurnDto(
                    m.Role.ToString().ToLowerInvariant(),
                    m.Content))
                .ToList(),
            FeedbackPayload: feedback);
        return MentorChatOperationResult<MentorChatSendContext>.Ok(ctx);
    }

    public async Task PersistAssistantTurnAsync(
        Guid sessionId,
        string content,
        int tokensInput,
        int tokensOutput,
        MentorChatContextMode contextMode,
        IReadOnlyList<string> retrievedChunkIds,
        CancellationToken ct = default)
    {
        var assistant = new MentorChatMessage
        {
            SessionId = sessionId,
            Role = MentorChatRole.Assistant,
            Content = content,
            ContextMode = contextMode,
            TokensInput = tokensInput,
            TokensOutput = tokensOutput,
            RetrievedChunkIds = retrievedChunkIds.Count == 0 ? null : retrievedChunkIds,
        };
        _db.MentorChatMessages.Add(assistant);

        var session = await _db.MentorChatSessions.FirstOrDefaultAsync(s => s.Id == sessionId, ct);
        if (session is not null)
        {
            session.LastMessageAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync(ct);
    }

    // ------------------------------------------------------------------
    // helpers
    // ------------------------------------------------------------------

    private async Task<bool> IsResourceIndexedAsync(MentorChatScope scope, Guid scopeId, CancellationToken ct) =>
        scope switch
        {
            MentorChatScope.Submission => await _db.Submissions
                .AsNoTracking()
                .Where(s => s.Id == scopeId)
                .Select(s => s.MentorIndexedAt)
                .SingleOrDefaultAsync(ct) is not null,
            MentorChatScope.Audit => await _db.ProjectAudits
                .AsNoTracking()
                .Where(a => a.Id == scopeId)
                .Select(a => a.MentorIndexedAt)
                .SingleOrDefaultAsync(ct) is not null,
            _ => false,
        };

    private async Task<ResourceSnapshot?> OwnsAsync(MentorChatScope scope, Guid scopeId, Guid userId, CancellationToken ct)
    {
        if (scope == MentorChatScope.Submission)
        {
            return await _db.Submissions
                .AsNoTracking()
                .Where(s => s.Id == scopeId && s.UserId == userId)
                .Select(s => new ResourceSnapshot(s.Id, s.MentorIndexedAt))
                .SingleOrDefaultAsync(ct);
        }
        return await _db.ProjectAudits
            .AsNoTracking()
            .Where(a => a.Id == scopeId && a.UserId == userId && !a.IsDeleted)
            .Select(a => new ResourceSnapshot(a.Id, a.MentorIndexedAt))
            .SingleOrDefaultAsync(ct);
    }

    private async Task<object?> LoadFeedbackPayloadAsync(MentorChatScope scope, Guid scopeId, CancellationToken ct)
    {
        if (scope == MentorChatScope.Submission)
        {
            var json = await _db.AIAnalysisResults
                .AsNoTracking()
                .Where(r => r.SubmissionId == scopeId)
                .Select(r => r.FeedbackJson)
                .SingleOrDefaultAsync(ct);
            return ParseFeedbackJson(json);
        }
        var audit = await _db.ProjectAuditResults
            .AsNoTracking()
            .Where(r => r.AuditId == scopeId)
            .Select(r => new
            {
                r.StrengthsJson,
                r.CriticalIssuesJson,
                r.WarningsJson,
                r.SuggestionsJson,
                r.MissingFeaturesJson,
                r.RecommendedImprovementsJson,
                r.TechStackAssessment,
                r.InlineAnnotationsJson,
            })
            .SingleOrDefaultAsync(ct);
        if (audit is null) return null;
        return new
        {
            strengths = TryParse(audit.StrengthsJson),
            criticalIssues = TryParse(audit.CriticalIssuesJson),
            warnings = TryParse(audit.WarningsJson),
            suggestions = TryParse(audit.SuggestionsJson),
            missingFeatures = TryParse(audit.MissingFeaturesJson),
            recommendations = TryParse(audit.RecommendedImprovementsJson),
            techStackAssessment = audit.TechStackAssessment,
            inlineAnnotations = TryParse(audit.InlineAnnotationsJson),
        };
    }

    private static object? TryParse(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;
        try { return JsonSerializer.Deserialize<JsonElement>(json); }
        catch (JsonException) { return null; }
    }

    private static object? ParseFeedbackJson(string? json) => TryParse(json);

    private static MentorChatSession Created(Guid userId, MentorChatScope scope, Guid scopeId) =>
        new() { UserId = userId, Scope = scope, ScopeId = scopeId };

    private static MentorChatSessionDto ToSessionDto(MentorChatSession s, bool isReady, int messageCount) =>
        new(s.Id, s.Scope, s.ScopeId, s.CreatedAt, s.LastMessageAt, isReady, messageCount);

    private static MentorChatMessageDto ToMessageDto(MentorChatMessage m) =>
        new(m.Id, m.Role, m.Content, m.ContextMode, m.TokensInput, m.TokensOutput, m.CreatedAt);

    private static bool TryParseScope(string raw, out MentorChatScope scope)
    {
        scope = default;
        return raw?.ToLowerInvariant() switch
        {
            "submission" => SetTrue(out scope, MentorChatScope.Submission),
            "audit" => SetTrue(out scope, MentorChatScope.Audit),
            _ => false,
        };
    }

    private static bool SetTrue(out MentorChatScope scope, MentorChatScope value)
    {
        scope = value;
        return true;
    }

    private sealed record ResourceSnapshot(Guid Id, DateTime? MentorIndexedAt);
}

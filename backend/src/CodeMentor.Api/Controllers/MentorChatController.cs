using System.Security.Claims;
using System.Text;
using System.Text.Json;
using CodeMentor.Api.Extensions;
using CodeMentor.Application.MentorChat;
using CodeMentor.Application.MentorChat.Contracts;
using CodeMentor.Domain.MentorChat;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace CodeMentor.Api.Controllers;

/// <summary>
/// S10-T6 / F12: backend HTTP API for mentor chat (architecture §6.12; ADR-036).
///   GET    /api/mentor-chat/{sessionId}            — load history (lazy-create not done here, see POST /sessions)
///   POST   /api/mentor-chat/sessions                — idempotent create (returns existing for the (user, scope, scopeId) triple)
///   POST   /api/mentor-chat/{sessionId}/messages    — proxy SSE stream from the AI service to the client
///   DELETE /api/mentor-chat/{sessionId}/messages    — clear conversation history
/// All routes require auth.
/// </summary>
[ApiController]
[Route("api/mentor-chat")]
[Authorize]
public class MentorChatController : ControllerBase
{
    private readonly IMentorChatService _service;
    private readonly IMentorChatStreamClient _stream;
    private readonly ILogger<MentorChatController> _logger;

    public MentorChatController(
        IMentorChatService service,
        IMentorChatStreamClient stream,
        ILogger<MentorChatController> logger)
    {
        _service = service;
        _stream = stream;
        _logger = logger;
    }

    [HttpGet("{sessionId:guid}")]
    public async Task<IActionResult> GetSession(Guid sessionId, CancellationToken ct)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        var result = await _service.GetOrCreateAndLoadAsync(sessionId, userId, ct);
        return result switch
        {
            { Success: true, Value: var v } => Ok(v),
            { ErrorCode: MentorChatErrorCode.NotFound } => NotFound(),
            { ErrorCode: MentorChatErrorCode.NotOwned } => NotFound(), // don't leak ownership
            _ => Problem(detail: result.Message, statusCode: StatusCodes.Status400BadRequest),
        };
    }

    [HttpPost("sessions")]
    public async Task<IActionResult> CreateSession(
        [FromBody] CreateSessionRequest request,
        CancellationToken ct)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        var result = await _service.CreateSessionAsync(request, userId, ct);
        return result switch
        {
            { Success: true, Value: var v } => Ok(v),
            { ErrorCode: MentorChatErrorCode.InvalidScope } =>
                Problem(detail: result.Message, statusCode: StatusCodes.Status400BadRequest),
            { ErrorCode: MentorChatErrorCode.Validation } =>
                Problem(detail: result.Message, statusCode: StatusCodes.Status400BadRequest),
            { ErrorCode: MentorChatErrorCode.UnderlyingResourceMissing } =>
                NotFound(new { error = result.Message }),
            _ => Problem(detail: result.Message, statusCode: StatusCodes.Status400BadRequest),
        };
    }

    [HttpPost("{sessionId:guid}/messages")]
    [EnableRateLimiting(RateLimitingExtensions.MentorChatMessagesPolicy)]
    public async Task<IActionResult> SendMessage(
        Guid sessionId,
        [FromBody] SendMessageRequest request,
        CancellationToken ct)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();

        var prepared = await _service.PrepareSendAsync(sessionId, userId, request, ct);
        if (!prepared.Success)
        {
            return prepared.ErrorCode switch
            {
                MentorChatErrorCode.NotFound => NotFound(),
                MentorChatErrorCode.NotOwned => NotFound(),
                MentorChatErrorCode.NotReady => Conflict(new
                {
                    error = "Mentor chat is still preparing. Try again in a moment.",
                    code = "not_ready",
                }),
                MentorChatErrorCode.UnderlyingResourceMissing => NotFound(),
                MentorChatErrorCode.Validation =>
                    Problem(detail: prepared.Message, statusCode: StatusCodes.Status400BadRequest),
                _ => Problem(detail: prepared.Message, statusCode: StatusCodes.Status400BadRequest),
            };
        }

        var ctx = prepared.Value!;
        Response.Headers["Content-Type"] = "text/event-stream";
        Response.Headers["Cache-Control"] = "no-cache";
        Response.Headers["X-Accel-Buffering"] = "no";

        var assistantBuffer = new StringBuilder();
        var doneCaptured = false;
        int tokensInput = 0, tokensOutput = 0;
        var contextMode = MentorChatContextMode.Rag;
        IReadOnlyList<string> chunkIds = Array.Empty<string>();

        var streamRequest = new MentorChatStreamRequest(
            SessionId: ctx.SessionId.ToString("N"),
            Scope: ctx.Scope,
            ScopeId: ctx.ScopeId,
            Message: ctx.Message,
            History: ctx.History
                .Select(t => new MentorChatHistoryTurn(t.Role, t.Content))
                .ToList(),
            FeedbackPayload: ctx.FeedbackPayload);

        var correlationId = $"mentor-chat-{ctx.SessionId:N}";

        await foreach (var sseEvent in _stream.StreamAsync(streamRequest, correlationId, ct))
        {
            // Forward the raw SSE event to the FE byte-for-byte.
            await Response.WriteAsync(sseEvent, ct);
            await Response.Body.FlushAsync(ct);

            // Inspect each event payload to capture metrics + assistant text
            // for persistence. Tolerant of malformed events — the FE still sees
            // them, but we just skip metrics on parse failure.
            var (kind, payload) = TryParseEvent(sseEvent);
            if (payload is null) continue;

            if (kind == "token")
            {
                if (payload.Value.TryGetProperty("content", out var cp)
                    && cp.ValueKind == JsonValueKind.String)
                {
                    assistantBuffer.Append(cp.GetString());
                }
            }
            else if (kind == "done")
            {
                doneCaptured = true;
                tokensInput = payload.Value.TryGetProperty("tokensInput", out var ti) && ti.TryGetInt32(out var v1) ? v1 : 0;
                tokensOutput = payload.Value.TryGetProperty("tokensOutput", out var to) && to.TryGetInt32(out var v2) ? v2 : 0;
                contextMode = payload.Value.TryGetProperty("contextMode", out var cm)
                              && cm.ValueKind == JsonValueKind.String
                              && Enum.TryParse(cm.GetString(), ignoreCase: true, out MentorChatContextMode parsed)
                    ? parsed : MentorChatContextMode.Rag;
                chunkIds = payload.Value.TryGetProperty("chunkIds", out var ck)
                           && ck.ValueKind == JsonValueKind.Array
                    ? ck.EnumerateArray()
                       .Where(e => e.ValueKind == JsonValueKind.String)
                       .Select(e => e.GetString()!)
                       .ToList()
                    : Array.Empty<string>();
            }
            // 'error' events fall through — we still persist whatever assistant
            // text we collected, but mark contextMode based on whatever the AI
            // service indicated before the error (default Rag).
        }

        // Persist the assistant turn only if we actually got some text. Streams
        // that died before any token leave the user message in place but no
        // assistant turn — the FE will render an error and let the user retry.
        var assistantText = assistantBuffer.ToString();
        if (!string.IsNullOrWhiteSpace(assistantText))
        {
            await _service.PersistAssistantTurnAsync(
                ctx.SessionId,
                assistantText,
                tokensInput,
                tokensOutput,
                contextMode,
                chunkIds,
                ct);
        }
        else if (!doneCaptured)
        {
            _logger.LogWarning(
                "Mentor-chat session {SessionId} stream produced no tokens before completion",
                ctx.SessionId);
        }

        return new EmptyResult();
    }

    [HttpDelete("{sessionId:guid}/messages")]
    public async Task<IActionResult> ClearHistory(Guid sessionId, CancellationToken ct)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        var result = await _service.ClearHistoryAsync(sessionId, userId, ct);
        return result switch
        {
            { Success: true } => NoContent(),
            { ErrorCode: MentorChatErrorCode.NotFound } => NotFound(),
            { ErrorCode: MentorChatErrorCode.NotOwned } => NotFound(),
            _ => Problem(detail: result.Message, statusCode: StatusCodes.Status400BadRequest),
        };
    }

    // ------------------------------------------------------------------
    // helpers
    // ------------------------------------------------------------------

    private static (string kind, JsonElement? payload) TryParseEvent(string sseEvent)
    {
        // Walk lines, find the `data:` line, parse it, sniff the discriminator.
        foreach (var raw in sseEvent.Split('\n'))
        {
            var line = raw.TrimEnd('\r');
            if (!line.StartsWith("data:")) continue;
            var json = line["data:".Length..].TrimStart();
            if (string.IsNullOrEmpty(json)) continue;
            try
            {
                var doc = JsonDocument.Parse(json);
                var root = doc.RootElement;
                if (root.ValueKind != JsonValueKind.Object) return (string.Empty, null);

                if (root.TryGetProperty("done", out var d) && d.ValueKind == JsonValueKind.True)
                    return ("done", root.Clone());
                if (root.TryGetProperty("error", out _))
                    return ("error", root.Clone());
                if (root.TryGetProperty("type", out var t) && t.GetString() == "token")
                    return ("token", root.Clone());
            }
            catch (JsonException)
            {
                return (string.Empty, null);
            }
        }
        return (string.Empty, null);
    }

    private bool TryGetUserId(out Guid userId)
    {
        userId = Guid.Empty;
        var sub = User.FindFirstValue(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)
            ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        return sub is not null && Guid.TryParse(sub, out userId);
    }
}

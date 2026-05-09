using System.Net.Http.Json;
using System.Text;
using CodeMentor.Application.MentorChat;
using Microsoft.Extensions.Logging;

namespace CodeMentor.Infrastructure.MentorChat;

/// <summary>
/// S10-T6 / F12: SSE-aware HTTP client that proxies the AI service's
/// <c>POST /api/mentor-chat</c> endpoint. Refit can't model an SSE response,
/// so this uses raw <see cref="HttpClient"/> + an async-iterator over the
/// response body to yield each ``data: {...}\\n\\n`` event as a complete
/// string. The controller forwards those bytes byte-for-byte to the FE and
/// inspects the trailing <c>done</c>/<c>error</c> events for metrics.
/// </summary>
public sealed class HttpMentorChatStreamClient : IMentorChatStreamClient
{
    private readonly HttpClient _http;
    private readonly ILogger<HttpMentorChatStreamClient> _logger;

    public HttpMentorChatStreamClient(HttpClient http, ILogger<HttpMentorChatStreamClient> logger)
    {
        _http = http;
        _logger = logger;
    }

    public async IAsyncEnumerable<string> StreamAsync(
        MentorChatStreamRequest request,
        string correlationId,
        [System.Runtime.CompilerServices.EnumeratorCancellation] CancellationToken ct = default)
    {
        var body = new
        {
            sessionId = request.SessionId,
            scope = request.Scope,
            scopeId = request.ScopeId,
            message = request.Message,
            history = request.History.Select(h => new { role = h.Role, content = h.Content }).ToList(),
            feedbackPayload = request.FeedbackPayload,
        };

        using var requestMessage = new HttpRequestMessage(HttpMethod.Post, "/api/mentor-chat")
        {
            Content = JsonContent.Create(body),
        };
        requestMessage.Headers.Accept.ParseAdd("text/event-stream");
        requestMessage.Headers.TryAddWithoutValidation("X-Correlation-Id", correlationId);

        // S10-T10 live-dogfood finding: when the AI service is unreachable,
        // SendAsync throws HttpRequestException — without this guard the
        // exception propagated past the controller into the global error
        // handler and returned 500 ProblemDetails JSON instead of the
        // documented `data: error` SSE event the FE expects to render inline.
        // C# disallows ``yield`` inside a catch block, so we capture the
        // failure into a sentinel string and yield it after the try/catch.
        HttpResponseMessage? response = null;
        string? sendFailureEvent = null;
        try
        {
            response = await _http.SendAsync(
                requestMessage, HttpCompletionOption.ResponseHeadersRead, ct);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex,
                "Mentor-chat AI service unreachable for session {SessionId}", request.SessionId);
            sendFailureEvent = BuildErrorEvent("AI service unreachable", "openai_unavailable");
        }
        catch (TaskCanceledException ex) when (!ct.IsCancellationRequested)
        {
            _logger.LogWarning(ex,
                "Mentor-chat AI service timed out for session {SessionId}", request.SessionId);
            sendFailureEvent = BuildErrorEvent("AI service timed out", "openai_unavailable");
        }

        if (sendFailureEvent is not null)
        {
            yield return sendFailureEvent;
            yield break;
        }

        using var _ownsResponse = response!;

        if (!response!.IsSuccessStatusCode)
        {
            var preview = await SafeReadShortAsync(response, ct);
            _logger.LogWarning(
                "Mentor-chat AI service returned {Status} for session {SessionId}: {Body}",
                response.StatusCode, request.SessionId, preview);
            // Synthesize an error event so the FE's parser is fed a valid SSE.
            yield return BuildErrorEvent(
                $"AI service returned {(int)response.StatusCode}",
                response.StatusCode == System.Net.HttpStatusCode.ServiceUnavailable
                    ? "openai_unavailable"
                    : "internal");
            yield break;
        }

        await using var stream = await response.Content.ReadAsStreamAsync(ct);
        using var reader = new StreamReader(stream, Encoding.UTF8);

        var buffer = new StringBuilder();
        while (true)
        {
            ct.ThrowIfCancellationRequested();
            var line = await reader.ReadLineAsync(ct);
            if (line is null) break;

            // Use Unix line endings explicitly so the FE / curl / our SSE
            // parser all see canonical ``data: ...\n\n`` framing. .NET's
            // StringBuilder.AppendLine injects \r\n on Windows, which the
            // dogfood parser + react-event-source split would mishandle
            // (caught during S10-T10 live walkthrough — events arrived but
            // tokens never accumulated because the boundary regex failed).
            buffer.Append(line);
            buffer.Append('\n');

            // SSE events are terminated by a blank line. When we see the
            // boundary, flush the accumulated event to the consumer.
            if (line.Length == 0)
            {
                var ev = buffer.ToString();
                buffer.Clear();
                if (!string.IsNullOrWhiteSpace(ev))
                {
                    yield return ev;
                }
            }
        }

        // Flush any trailing partial event the AI service didn't terminate
        // with a blank line — keeps us tolerant of upstream quirks.
        if (buffer.Length > 0)
        {
            yield return buffer.ToString();
        }
    }

    private static async Task<string> SafeReadShortAsync(HttpResponseMessage response, CancellationToken ct)
    {
        try
        {
            await using var s = await response.Content.ReadAsStreamAsync(ct);
            using var reader = new StreamReader(s);
            var buf = new char[256];
            var read = await reader.ReadAsync(buf, ct);
            return read <= 0 ? string.Empty : new string(buf, 0, read);
        }
        catch
        {
            return string.Empty;
        }
    }

    private static string BuildErrorEvent(string message, string code) =>
        "data: " + System.Text.Json.JsonSerializer.Serialize(new
        {
            error = message,
            code,
        }) + "\n\n";
}

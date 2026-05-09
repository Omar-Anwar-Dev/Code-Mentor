namespace CodeMentor.Application.MentorChat;

/// <summary>
/// S10-T6 / F12: HTTP client wrapper for the AI service's
/// <c>POST /api/mentor-chat</c> SSE endpoint. Refit doesn't support SSE
/// natively, so the production impl uses raw <c>HttpClient</c> +
/// <c>IAsyncEnumerable&lt;string&gt;</c> line reader.
///
/// The yielded items are full SSE events terminated by a blank line —
/// the controller forwards them to the FE byte-for-byte and only
/// inspects the trailing <c>done</c> / <c>error</c> events to capture
/// metrics for persistence.
/// </summary>
public interface IMentorChatStreamClient
{
    IAsyncEnumerable<string> StreamAsync(
        MentorChatStreamRequest request,
        string correlationId,
        CancellationToken ct = default);
}

public sealed record MentorChatStreamRequest(
    string SessionId,
    string Scope,
    string ScopeId,
    string Message,
    IReadOnlyList<MentorChatHistoryTurn> History,
    object? FeedbackPayload);

public sealed record MentorChatHistoryTurn(string Role, string Content);

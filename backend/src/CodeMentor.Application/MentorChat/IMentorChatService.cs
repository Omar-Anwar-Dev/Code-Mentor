using CodeMentor.Application.MentorChat.Contracts;

namespace CodeMentor.Application.MentorChat;

/// <summary>
/// S10-T6 / F12: backend service surface for the mentor-chat HTTP endpoints
/// (ADR-036). The four operations map 1:1 to the four routes the controller
/// exposes; ownership + readiness checks live here so the controller can stay
/// thin.
/// </summary>
public interface IMentorChatService
{
    /// <summary>
    /// GET /mentor-chat/{sessionId}: load history for a session the user owns,
    /// or lazy-create one if the underlying resource is owned + indexed.
    /// </summary>
    Task<MentorChatOperationResult<MentorChatHistoryResponse>> GetOrCreateAndLoadAsync(
        Guid sessionId, Guid userId, CancellationToken ct = default);

    /// <summary>
    /// POST /mentor-chat/sessions: idempotent create — returns existing session
    /// when the (user, scope, scopeId) triple already has one.
    /// </summary>
    Task<MentorChatOperationResult<MentorChatSessionDto>> CreateSessionAsync(
        CreateSessionRequest request, Guid userId, CancellationToken ct = default);

    /// <summary>
    /// DELETE /mentor-chat/{sessionId}/messages: clear conversation history while
    /// preserving the session row itself.
    /// </summary>
    Task<MentorChatOperationResult<int>> ClearHistoryAsync(
        Guid sessionId, Guid userId, CancellationToken ct = default);

    /// <summary>
    /// Snapshot of an outgoing message + the AI-side request body the SSE
    /// proxy will send. Returned by <see cref="PrepareSendAsync"/> so the
    /// controller can stream while the service stays free of HTTP concerns.
    /// </summary>
    Task<MentorChatOperationResult<MentorChatSendContext>> PrepareSendAsync(
        Guid sessionId, Guid userId, SendMessageRequest request, CancellationToken ct = default);

    /// <summary>
    /// Persist the assistant's reply after the stream finishes. Called by the
    /// controller's SSE proxy once it's collected the full response from the
    /// AI service.
    /// </summary>
    Task PersistAssistantTurnAsync(
        Guid sessionId,
        string content,
        int tokensInput,
        int tokensOutput,
        Domain.MentorChat.MentorChatContextMode contextMode,
        IReadOnlyList<string> retrievedChunkIds,
        CancellationToken ct = default);
}

/// <summary>
/// Bundle of state captured at the start of a "send message" call. The
/// controller's SSE proxy consumes this to build the AI-service request +
/// the user-message DB row that's already been persisted.
/// </summary>
public sealed record MentorChatSendContext(
    Guid SessionId,
    Guid UserMessageId,
    string Scope,
    string ScopeId,
    string Message,
    IReadOnlyList<MentorChatHistoryTurnDto> History,
    object? FeedbackPayload);

public sealed record MentorChatHistoryTurnDto(string Role, string Content);

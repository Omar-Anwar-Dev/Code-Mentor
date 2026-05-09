using CodeMentor.Domain.MentorChat;

namespace CodeMentor.Application.MentorChat.Contracts;

/// <summary>
/// S10-T6 / F12: request + response shapes for the backend mentor-chat HTTP API
/// (architecture §6.12; ADR-036).
/// </summary>

public sealed record CreateSessionRequest(string Scope, Guid ScopeId);

public sealed record MentorChatSessionDto(
    Guid SessionId,
    MentorChatScope Scope,
    Guid ScopeId,
    DateTime CreatedAt,
    DateTime? LastMessageAt,
    bool IsReady,
    int MessageCount);

public sealed record MentorChatMessageDto(
    Guid Id,
    MentorChatRole Role,
    string Content,
    MentorChatContextMode? ContextMode,
    int? TokensInput,
    int? TokensOutput,
    DateTime CreatedAt);

public sealed record MentorChatHistoryResponse(
    MentorChatSessionDto Session,
    IReadOnlyList<MentorChatMessageDto> Messages);

public sealed record SendMessageRequest(string Content);

public enum MentorChatErrorCode
{
    None = 0,
    NotFound,
    NotOwned,
    NotReady,                // MentorIndexedAt is null
    InvalidScope,
    UnderlyingResourceMissing,
    Validation,
}

public sealed record MentorChatOperationResult<T>(
    bool Success,
    T? Value,
    MentorChatErrorCode ErrorCode,
    string? Message)
{
    public static MentorChatOperationResult<T> Ok(T value) =>
        new(true, value, MentorChatErrorCode.None, null);

    public static MentorChatOperationResult<T> Fail(MentorChatErrorCode code, string? message = null) =>
        new(false, default, code, message);
}

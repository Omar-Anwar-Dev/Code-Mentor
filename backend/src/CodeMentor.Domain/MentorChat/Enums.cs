namespace CodeMentor.Domain.MentorChat;

/// <summary>
/// S10-T2 / F12: which kind of artifact a mentor-chat session is anchored to.
/// Polymorphic key — the actual ScopeId column on <see cref="MentorChatSession"/>
/// resolves to either <c>Submissions.Id</c> or <c>ProjectAudits.Id</c> depending
/// on this value (architecture §5 Domain 7, ADR-036).
/// </summary>
public enum MentorChatScope
{
    Submission = 1,
    Audit = 2,
}

/// <summary>
/// Role of a turn in a mentor-chat conversation. Mirrors the OpenAI chat-completions
/// role taxonomy at the storage layer; system messages are constructed at the AI
/// service per turn and never persisted here.
/// </summary>
public enum MentorChatRole
{
    User = 1,
    Assistant = 2,
}

/// <summary>
/// How the assistant turn was grounded — RAG-retrieved chunks or the full feedback
/// payload (raw fallback). Recorded per assistant turn so dogfood + analytics can
/// distinguish degraded turns from healthy ones (ADR-036 graceful-degradation).
/// </summary>
public enum MentorChatContextMode
{
    Rag = 1,
    RawFallback = 2,
}

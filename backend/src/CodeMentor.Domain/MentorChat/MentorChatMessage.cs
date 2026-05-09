namespace CodeMentor.Domain.MentorChat;

/// <summary>
/// S10-T2 / F12: a single turn (user prompt or assistant response) inside a
/// <see cref="MentorChatSession"/>. The last 10 turns of a session are sent as
/// the conversation history on each new <c>POST /messages</c> request — older
/// turns stay in the database for replay but do not leak into the prompt
/// budget (architecture §6.12; ADR-036).
///
/// Token counts and <see cref="ContextMode"/> are populated only on assistant
/// rows; user rows leave them null.
/// </summary>
public class MentorChatMessage
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid SessionId { get; set; }

    public MentorChatRole Role { get; set; }

    /// <summary>
    /// User prompt or final assistant text (post-stream concatenation). Markdown
    /// is allowed — the FE renders via react-markdown + DOMPurify per S10-T8.
    /// </summary>
    public string Content { get; set; } = string.Empty;

    /// <summary>
    /// Qdrant point IDs (UUID strings) used to ground this assistant turn. Null
    /// for user turns and for assistant turns that ran in
    /// <see cref="MentorChatContextMode.RawFallback"/> mode (no retrieval).
    /// Stored as JSON on the SQL Server side.
    /// </summary>
    public IReadOnlyList<string>? RetrievedChunkIds { get; set; }

    /// <summary>Prompt tokens reported by the AI service for this turn — assistant rows only.</summary>
    public int? TokensInput { get; set; }

    /// <summary>Completion tokens reported by the AI service for this turn — assistant rows only.</summary>
    public int? TokensOutput { get; set; }

    /// <summary>RAG vs RawFallback grounding mode for this turn — assistant rows only.</summary>
    public MentorChatContextMode? ContextMode { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

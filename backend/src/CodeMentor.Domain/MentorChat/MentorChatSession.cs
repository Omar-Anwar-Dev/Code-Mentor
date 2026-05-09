namespace CodeMentor.Domain.MentorChat;

/// <summary>
/// S10-T2 / F12: per-(user, submission|audit) chat session. Lazy-created on the
/// first <c>POST /api/mentor-chat/{sessionId}/messages</c> for a given resource.
/// Unique constraint on <c>(UserId, Scope, ScopeId)</c> guarantees there is at
/// most one session per (user, submission) or (user, audit) pair (architecture
/// §5 Domain 7; ADR-036).
///
/// <c>ScopeId</c> is polymorphic by <see cref="Scope"/>: it points at
/// <c>Submissions.Id</c> when <see cref="Scope"/> is <see cref="MentorChatScope.Submission"/>,
/// and at <c>ProjectAudits.Id</c> when <see cref="Scope"/> is
/// <see cref="MentorChatScope.Audit"/>. We do not declare a database FK because
/// SQL Server cannot express a polymorphic FK; ownership is enforced in the
/// application layer at session-create time.
/// </summary>
public class MentorChatSession
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }

    public MentorChatScope Scope { get; set; }
    public Guid ScopeId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Last activity timestamp (touched on every successful message turn). Used by
    /// the FE for "Resume your last conversation" cues and by analytics. Null on a
    /// freshly-created, unused session.
    /// </summary>
    public DateTime? LastMessageAt { get; set; }
}

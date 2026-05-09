namespace CodeMentor.Application.Audit;

/// <summary>
/// S7-T11: writes audit entries for admin actions. Implementation captures the
/// caller's IP via <c>IHttpContextAccessor</c> so callers don't have to thread
/// that context through every service signature.
/// </summary>
public interface IAuditLogger
{
    Task LogAsync(
        string action,
        string entityType,
        string entityId,
        object? oldValue,
        object? newValue,
        Guid actorUserId,
        CancellationToken ct = default);
}

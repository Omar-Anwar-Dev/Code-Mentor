namespace CodeMentor.Domain.Audit;

/// <summary>
/// S7-T11 / Architecture §5.1: per-write audit entry. Populated by admin
/// service writes — one row per Create/Update/SoftDelete/RoleChange action.
/// Old/New values are JSON snapshots of the affected entity (or partial diff)
/// captured by the service before/after the change.
/// </summary>
public class AuditLog
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid? UserId { get; set; }                 // actor (admin); null only when system-initiated
    public string Action { get; set; } = string.Empty;       // e.g. "CreateTask", "UpdateQuestion", "DeactivateUser"
    public string EntityType { get; set; } = string.Empty;   // "Task", "Question", "User"
    public string EntityId { get; set; } = string.Empty;     // serialized GUID or other identifier
    public string? OldValueJson { get; set; }
    public string? NewValueJson { get; set; }
    public string? IpAddress { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

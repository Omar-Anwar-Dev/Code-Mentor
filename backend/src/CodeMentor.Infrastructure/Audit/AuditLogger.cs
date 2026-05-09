using System.Text.Json;
using CodeMentor.Application.Audit;
using CodeMentor.Domain.Audit;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.AspNetCore.Http;

namespace CodeMentor.Infrastructure.Audit;

public sealed class AuditLogger : IAuditLogger
{
    private static readonly JsonSerializerOptions Json = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false,
    };

    private readonly ApplicationDbContext _db;
    private readonly IHttpContextAccessor _httpContext;

    public AuditLogger(ApplicationDbContext db, IHttpContextAccessor httpContext)
    {
        _db = db;
        _httpContext = httpContext;
    }

    public async Task LogAsync(
        string action,
        string entityType,
        string entityId,
        object? oldValue,
        object? newValue,
        Guid actorUserId,
        CancellationToken ct = default)
    {
        var ip = _httpContext.HttpContext?.Connection.RemoteIpAddress?.ToString();
        if (ip is not null && ip.Length > 45) ip = ip[..45];

        _db.AuditLogs.Add(new AuditLog
        {
            UserId = actorUserId == Guid.Empty ? null : actorUserId,
            Action = Truncate(action, 60),
            EntityType = Truncate(entityType, 40),
            EntityId = Truncate(entityId, 80),
            OldValueJson = oldValue is null ? null : JsonSerializer.Serialize(oldValue, Json),
            NewValueJson = newValue is null ? null : JsonSerializer.Serialize(newValue, Json),
            IpAddress = ip,
            CreatedAt = DateTime.UtcNow,
        });
        await _db.SaveChangesAsync(ct);
    }

    private static string Truncate(string s, int max) =>
        string.IsNullOrEmpty(s) ? string.Empty : (s.Length <= max ? s : s[..max]);
}

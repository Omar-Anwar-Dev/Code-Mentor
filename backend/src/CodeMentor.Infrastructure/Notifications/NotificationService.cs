using CodeMentor.Application.Notifications;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CodeMentor.Infrastructure.Notifications;

/// <summary>
/// S6-T11: paginated, owner-scoped notifications + mark-read. Uses the
/// composite (UserId, IsRead, CreatedAt DESC) index added in S6-T6 so the
/// bell-icon's "unread first, newest first" query stays cheap as the table grows.
/// </summary>
public sealed class NotificationService : INotificationService
{
    public const int DefaultPageSize = 20;
    public const int MaxPageSize = 100;

    private readonly ApplicationDbContext _db;

    public NotificationService(ApplicationDbContext db)
    {
        _db = db;
    }

    public async Task<NotificationListResponse> ListAsync(
        Guid userId,
        int page,
        int size,
        bool? isRead,
        CancellationToken ct = default)
    {
        page = page < 1 ? 1 : page;
        size = size < 1 ? DefaultPageSize : Math.Min(size, MaxPageSize);

        var baseQuery = _db.Notifications
            .AsNoTracking()
            .Where(n => n.UserId == userId);

        if (isRead is bool readFilter)
        {
            baseQuery = baseQuery.Where(n => n.IsRead == readFilter);
        }

        var total = await baseQuery.CountAsync(ct);

        var items = await baseQuery
            .OrderByDescending(n => n.CreatedAt)
            .Skip((page - 1) * size)
            .Take(size)
            .Select(n => new NotificationDto(
                n.Id,
                n.Type.ToString(),
                n.Title,
                n.Message,
                n.Link,
                n.IsRead,
                n.CreatedAt,
                n.ReadAt))
            .ToListAsync(ct);

        var unreadCount = await _db.Notifications
            .AsNoTracking()
            .CountAsync(n => n.UserId == userId && !n.IsRead, ct);

        return new NotificationListResponse(items, page, size, total, unreadCount);
    }

    /// <summary>
    /// Returns false if the notification doesn't exist or doesn't belong to the user.
    /// True if it was already read OR if it was newly marked read.
    /// </summary>
    public async Task<bool> MarkReadAsync(Guid userId, Guid notificationId, CancellationToken ct = default)
    {
        var notif = await _db.Notifications
            .FirstOrDefaultAsync(n => n.Id == notificationId && n.UserId == userId, ct);

        if (notif is null) return false;

        if (!notif.IsRead)
        {
            notif.IsRead = true;
            notif.ReadAt = DateTime.UtcNow;
            await _db.SaveChangesAsync(ct);
        }
        return true;
    }
}

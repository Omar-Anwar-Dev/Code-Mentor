namespace CodeMentor.Application.Notifications;

/// <summary>S6-T11: DTO returned by GET /api/notifications.</summary>
public sealed record NotificationDto(
    Guid Id,
    string Type,
    string Title,
    string Message,
    string? Link,
    bool IsRead,
    DateTime CreatedAt,
    DateTime? ReadAt);

public sealed record NotificationListResponse(
    IReadOnlyList<NotificationDto> Items,
    int Page,
    int Size,
    int Total,
    int UnreadCount);

public interface INotificationService
{
    Task<NotificationListResponse> ListAsync(
        Guid userId,
        int page,
        int size,
        bool? isRead,
        CancellationToken ct = default);

    Task<bool> MarkReadAsync(
        Guid userId,
        Guid notificationId,
        CancellationToken ct = default);
}

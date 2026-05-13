using CodeMentor.Application.Notifications;
using CodeMentor.Domain.Notifications;
using CodeMentor.Infrastructure.Notifications;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;

namespace CodeMentor.Application.Tests.Notifications;

/// <summary>
/// S6-T11 acceptance:
///   - List paginated, owner-scoped, filterable by isRead.
///   - UnreadCount honest (independent of pagination).
///   - MarkRead flips IsRead + ReadAt; idempotent on already-read; 404 for missing/other-user.
///
/// The pref-aware Raise* paths added in S14-T5 are covered separately in
/// <see cref="NotificationServiceRaiseTests"/>. These tests exercise only
/// List + MarkRead which don't touch the email side, so the renderer + delivery
/// service can be safely passed as null!.
/// </summary>
public class NotificationServiceTests
{
    private static ApplicationDbContext NewDb() => new(
        new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase($"notif_svc_{Guid.NewGuid():N}")
            .Options);

    private static INotificationService NewService(ApplicationDbContext db) => new NotificationService(
        db,
        templates: null!,  // unused by List/MarkRead
        emails: null!,      // unused by List/MarkRead
        config: new ConfigurationBuilder().Build(),
        log: NullLogger<NotificationService>.Instance);

    [Fact]
    public async Task List_DefaultPagination_ReturnsNewestFirst_OwnerScoped()
    {
        using var db = NewDb();
        var me = Guid.NewGuid();
        var other = Guid.NewGuid();

        for (var i = 0; i < 3; i++)
        {
            db.Notifications.Add(new Notification
            {
                UserId = me,
                Type = NotificationType.FeedbackReady,
                Title = $"Mine #{i}",
                Message = "x",
                CreatedAt = DateTime.UtcNow.AddMinutes(-i),
            });
        }
        db.Notifications.Add(new Notification
        {
            UserId = other,
            Type = NotificationType.FeedbackReady,
            Title = "Theirs",
            Message = "x",
        });
        await db.SaveChangesAsync();

        var result = await NewService(db).ListAsync(me, page: 1, size: 20, isRead: null);

        Assert.Equal(3, result.Total);
        Assert.Equal(3, result.Items.Count);
        Assert.Equal("Mine #0", result.Items[0].Title);  // newest first
        Assert.Equal("Mine #2", result.Items[2].Title);
        Assert.DoesNotContain(result.Items, n => n.Title == "Theirs");
    }

    [Fact]
    public async Task List_FilterByIsRead_RespectsFlag()
    {
        using var db = NewDb();
        var me = Guid.NewGuid();
        db.Notifications.AddRange(
            new Notification { UserId = me, Type = NotificationType.FeedbackReady, Title = "unread", Message = "x", IsRead = false },
            new Notification { UserId = me, Type = NotificationType.FeedbackReady, Title = "read",   Message = "x", IsRead = true });
        await db.SaveChangesAsync();

        var unreadOnly = await NewService(db).ListAsync(me, 1, 20, isRead: false);
        Assert.Equal(1, unreadOnly.Total);
        Assert.Equal("unread", unreadOnly.Items[0].Title);

        var readOnly = await NewService(db).ListAsync(me, 1, 20, isRead: true);
        Assert.Equal(1, readOnly.Total);
        Assert.Equal("read", readOnly.Items[0].Title);
    }

    [Fact]
    public async Task List_UnreadCount_IsAccurate_AcrossPages()
    {
        using var db = NewDb();
        var me = Guid.NewGuid();
        for (var i = 0; i < 10; i++)
        {
            db.Notifications.Add(new Notification
            {
                UserId = me,
                Type = NotificationType.FeedbackReady,
                Title = $"n{i}",
                Message = "x",
                IsRead = i < 4,                          // first 4 are read
                CreatedAt = DateTime.UtcNow.AddMinutes(-i),
            });
        }
        await db.SaveChangesAsync();

        var page1 = await NewService(db).ListAsync(me, 1, 3, isRead: null);
        Assert.Equal(10, page1.Total);
        Assert.Equal(6, page1.UnreadCount);  // not affected by pagination
    }

    [Fact]
    public async Task MarkRead_HappyPath_Flips_IsRead_And_SetsReadAt()
    {
        using var db = NewDb();
        var me = Guid.NewGuid();
        var notif = new Notification { UserId = me, Type = NotificationType.FeedbackReady, Title = "x", Message = "y" };
        db.Notifications.Add(notif);
        await db.SaveChangesAsync();

        var ok = await NewService(db).MarkReadAsync(me, notif.Id);
        Assert.True(ok);

        var reloaded = await db.Notifications.AsNoTracking().FirstAsync(n => n.Id == notif.Id);
        Assert.True(reloaded.IsRead);
        Assert.NotNull(reloaded.ReadAt);
    }

    [Fact]
    public async Task MarkRead_AlreadyRead_IsIdempotent_DoesNotOverwriteReadAt()
    {
        using var db = NewDb();
        var me = Guid.NewGuid();
        var firstReadAt = DateTime.UtcNow.AddDays(-1);
        var notif = new Notification
        {
            UserId = me,
            Type = NotificationType.FeedbackReady,
            Title = "x",
            Message = "y",
            IsRead = true,
            ReadAt = firstReadAt,
        };
        db.Notifications.Add(notif);
        await db.SaveChangesAsync();

        var ok = await NewService(db).MarkReadAsync(me, notif.Id);
        Assert.True(ok);

        var reloaded = await db.Notifications.AsNoTracking().FirstAsync(n => n.Id == notif.Id);
        Assert.Equal(firstReadAt, reloaded.ReadAt);
    }

    [Fact]
    public async Task MarkRead_OtherUsersNotification_Returns404()
    {
        using var db = NewDb();
        var me = Guid.NewGuid();
        var other = Guid.NewGuid();
        var notif = new Notification { UserId = other, Type = NotificationType.FeedbackReady, Title = "x", Message = "y" };
        db.Notifications.Add(notif);
        await db.SaveChangesAsync();

        var ok = await NewService(db).MarkReadAsync(me, notif.Id);
        Assert.False(ok);
    }

    [Fact]
    public async Task MarkRead_Missing_Returns404()
    {
        using var db = NewDb();
        var ok = await NewService(db).MarkReadAsync(Guid.NewGuid(), Guid.NewGuid());
        Assert.False(ok);
    }
}

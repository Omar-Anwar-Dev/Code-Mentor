using CodeMentor.Domain.Notifications;
using CodeMentor.Domain.Submissions;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.Extensions.DependencyInjection;

namespace CodeMentor.Application.Tests.Submissions;

/// <summary>
/// S6-T6 acceptance:
///  - Recommendations / Resources / Notifications tables created via model mapping.
///  - Recommendations.TaskId is nullable (text-only suggestions allowed).
///  - Recommendations + Resources cascade-delete from their Submission.
///  - Notifications carry an enum Type stored as string.
///  - Notifications composite index `(UserId, IsRead, CreatedAt DESC)` is configured.
/// </summary>
public class FeedbackEntitiesTests
{
    private static ApplicationDbContext NewDb() => new(
        new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase($"feedback_entities_{Guid.NewGuid():N}")
            .Options);

    [Fact]
    public async Task Recommendation_Persists_BothTaskBacked_AndTextOnly_Variants()
    {
        using var db = NewDb();
        var sub = SeedSubmission(db);

        var taskBacked = new Recommendation
        {
            SubmissionId = sub.Id,
            TaskId = Guid.NewGuid(),
            Reason = "Adds REST + auth practice that you flagged as weak.",
            Priority = 1,
        };
        var textOnly = new Recommendation
        {
            SubmissionId = sub.Id,
            TaskId = null,
            Topic = "SOLID principles",
            Reason = "AI suggested without a matching task in the seeded library.",
            Priority = 3,
        };
        db.Recommendations.AddRange(taskBacked, textOnly);
        await db.SaveChangesAsync();

        var rows = db.Recommendations.AsNoTracking().Where(r => r.SubmissionId == sub.Id).ToList();
        Assert.Equal(2, rows.Count);
        Assert.Contains(rows, r => r.TaskId is not null && r.Topic is null);
        Assert.Contains(rows, r => r.TaskId is null && r.Topic == "SOLID principles");
        Assert.All(rows, r => Assert.False(r.IsAdded));
    }

    [Fact]
    public async Task Resource_Persists_WithEnumTypeAsString()
    {
        using var db = NewDb();
        var sub = SeedSubmission(db);

        var resource = new Resource
        {
            SubmissionId = sub.Id,
            Title = "OWASP SQL Injection cheat sheet",
            Url = "https://owasp.org/www-project-cheat-sheets/",
            Type = ResourceType.Documentation,
            Topic = "SQL injection prevention",
        };
        db.Resources.Add(resource);
        await db.SaveChangesAsync();

        var fetched = await db.Resources.AsNoTracking().SingleAsync(r => r.Id == resource.Id);
        Assert.Equal(ResourceType.Documentation, fetched.Type);
        Assert.Equal("https://owasp.org/www-project-cheat-sheets/", fetched.Url);
    }

    [Fact]
    public async Task Recommendations_And_Resources_Cascade_FromSubmission()
    {
        using var db = NewDb();
        var sub = SeedSubmission(db);

        db.Recommendations.Add(new Recommendation { SubmissionId = sub.Id, Reason = "x", Priority = 3 });
        db.Resources.Add(new Resource
        {
            SubmissionId = sub.Id,
            Title = "t",
            Url = "https://e.x",
            Type = ResourceType.Article,
            Topic = "y",
        });
        await db.SaveChangesAsync();

        db.Submissions.Remove(sub);
        await db.SaveChangesAsync();

        Assert.Empty(db.Recommendations.ToList());
        Assert.Empty(db.Resources.ToList());
    }

    [Fact]
    public async Task Notification_Persists_WithEnumTypeAsString_And_DefaultsToUnread()
    {
        using var db = NewDb();
        var notif = new Notification
        {
            UserId = Guid.NewGuid(),
            Type = NotificationType.FeedbackReady,
            Title = "Feedback ready",
            Message = "Your code review for Task X is complete.",
            Link = "/submissions/abc-123",
        };
        db.Notifications.Add(notif);
        await db.SaveChangesAsync();

        var fetched = await db.Notifications.AsNoTracking().SingleAsync(n => n.Id == notif.Id);
        Assert.Equal(NotificationType.FeedbackReady, fetched.Type);
        Assert.False(fetched.IsRead);
        Assert.Null(fetched.ReadAt);
        Assert.Equal("/submissions/abc-123", fetched.Link);
    }

    [Fact]
    public void Notification_HasComposite_UnreadIndex_For_BellIcon_Query()
    {
        using var db = NewDb();
        var model = db.GetService<IDesignTimeModel>().Model;
        var entityType = model.FindEntityType(typeof(Notification))!;

        var ix = entityType.GetIndexes().FirstOrDefault(i =>
            i.Properties.Count == 3 &&
            i.Properties[0].Name == nameof(Notification.UserId) &&
            i.Properties[1].Name == nameof(Notification.IsRead) &&
            i.Properties[2].Name == nameof(Notification.CreatedAt));

        Assert.NotNull(ix);
        Assert.Equal("IX_Notifications_User_Unread_CreatedAt_Desc", ix!.GetDatabaseName());
    }

    [Fact]
    public void Resource_Type_Is_Stored_As_Nvarchar20()
    {
        using var db = NewDb();
        var model = db.GetService<IDesignTimeModel>().Model;
        var entityType = model.FindEntityType(typeof(Resource))!;
        var typeProp = entityType.FindProperty(nameof(Resource.Type))!;

        Assert.Equal(typeof(string), typeProp.GetProviderClrType() ?? typeProp.ClrType);
        Assert.Equal(20, typeProp.GetMaxLength());
    }

    private static Submission SeedSubmission(ApplicationDbContext db)
    {
        var sub = new Submission
        {
            UserId = Guid.NewGuid(),
            TaskId = Guid.NewGuid(),
            SubmissionType = SubmissionType.Upload,
            BlobPath = "u/p.zip",
            Status = SubmissionStatus.Completed,
        };
        db.Submissions.Add(sub);
        db.SaveChanges();
        return sub;
    }
}

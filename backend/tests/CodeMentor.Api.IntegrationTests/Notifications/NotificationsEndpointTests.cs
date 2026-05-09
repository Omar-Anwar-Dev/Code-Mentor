using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using CodeMentor.Api.IntegrationTests.TestHost;
using CodeMentor.Application.Auth.Contracts;
using CodeMentor.Application.Notifications;
using CodeMentor.Domain.Notifications;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.Extensions.DependencyInjection;

namespace CodeMentor.Api.IntegrationTests.Notifications;

/// <summary>S6-T11 acceptance — paginated, filterable by isRead, mark-read flow.</summary>
public class NotificationsEndpointTests : IClassFixture<CodeMentorWebApplicationFactory>
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    private readonly CodeMentorWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public NotificationsEndpointTests(CodeMentorWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    private void Bearer(string token) =>
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

    private async Task<(string token, Guid userId)> RegisterAndLoginAsync(string email)
    {
        var req = new RegisterRequest(email, "Strong_Pass_123!", "Notif Tester", null);
        var res = await _client.PostAsJsonAsync("/api/auth/register", req);
        res.EnsureSuccessStatusCode();
        var body = (await res.Content.ReadFromJsonAsync<AuthResponse>(Json))!;
        return (body.AccessToken, body.User.Id);
    }

    private void SeedNotifications(Guid userId, IEnumerable<(string title, bool read, int minutesAgo)> rows)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        foreach (var (title, read, minutesAgo) in rows)
        {
            db.Notifications.Add(new Notification
            {
                UserId = userId,
                Type = NotificationType.FeedbackReady,
                Title = title,
                Message = "msg",
                Link = "/x",
                IsRead = read,
                CreatedAt = DateTime.UtcNow.AddMinutes(-minutesAgo),
            });
        }
        db.SaveChanges();
    }

    [Fact]
    public async Task List_WithoutAuth_Returns401()
    {
        var res = await _client.GetAsync("/api/notifications");
        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    [Fact]
    public async Task List_ReturnsOwner_NewestFirst_WithUnreadCount()
    {
        var (token, userId) = await RegisterAndLoginAsync("notif-list@test.local");
        Bearer(token);

        SeedNotifications(userId, new[]
        {
            ("oldest-read", true,  60),
            ("middle-unread", false, 30),
            ("newest-unread", false, 1),
        });

        var resp = await _client.GetFromJsonAsync<NotificationListResponse>("/api/notifications", Json);

        Assert.NotNull(resp);
        Assert.Equal(3, resp!.Total);
        Assert.Equal("newest-unread", resp.Items[0].Title);
        Assert.Equal("oldest-read", resp.Items[2].Title);
        Assert.Equal(2, resp.UnreadCount);
    }

    [Fact]
    public async Task List_FilterByIsRead_Honored()
    {
        var (token, userId) = await RegisterAndLoginAsync("notif-filter@test.local");
        Bearer(token);

        SeedNotifications(userId, new[]
        {
            ("read1", true, 10),
            ("unread1", false, 5),
        });

        var unread = await _client.GetFromJsonAsync<NotificationListResponse>("/api/notifications?isRead=false", Json);
        Assert.Equal(1, unread!.Total);
        Assert.Equal("unread1", unread.Items[0].Title);
    }

    [Fact]
    public async Task MarkRead_HappyPath_Returns204_AndFlipsState()
    {
        var (token, userId) = await RegisterAndLoginAsync("notif-mark@test.local");
        Bearer(token);

        SeedNotifications(userId, new[] { ("to-mark", false, 1) });

        // Get the notification's id.
        var list = await _client.GetFromJsonAsync<NotificationListResponse>("/api/notifications", Json);
        var notifId = list!.Items[0].Id;

        var res = await _client.PostAsync($"/api/notifications/{notifId}/read", content: null);
        Assert.Equal(HttpStatusCode.NoContent, res.StatusCode);

        var afterMark = await _client.GetFromJsonAsync<NotificationListResponse>("/api/notifications", Json);
        Assert.True(afterMark!.Items[0].IsRead);
        Assert.NotNull(afterMark.Items[0].ReadAt);
        Assert.Equal(0, afterMark.UnreadCount);
    }

    [Fact]
    public async Task MarkRead_OtherUsersNotification_Returns404()
    {
        // Owner creates the notification.
        var (_, ownerId) = await RegisterAndLoginAsync("notif-owner@test.local");
        SeedNotifications(ownerId, new[] { ("owners", false, 1) });

        // Get its id (still as owner).
        Guid notifId;
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            notifId = db.Notifications.First(n => n.UserId == ownerId).Id;
        }

        // Switch to a different user — should 404.
        var (intruderToken, _) = await RegisterAndLoginAsync("notif-intruder@test.local");
        Bearer(intruderToken);

        var res = await _client.PostAsync($"/api/notifications/{notifId}/read", content: null);
        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
    }
}

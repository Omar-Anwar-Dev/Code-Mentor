using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using CodeMentor.Api.IntegrationTests.TestHost;
using CodeMentor.Application.Auth.Contracts;
using CodeMentor.Domain.Users;
using CodeMentor.Infrastructure.Identity;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace CodeMentor.Api.IntegrationTests.Users;

/// <summary>
/// S14-T1 / ADR-046: round-trip tests for the 3 new domain entities
/// (<c>UserSettings</c>, <c>EmailDelivery</c>, <c>UserAccountDeletionRequest</c>)
/// + the soft-delete columns on <c>ApplicationUser</c> (<c>IsDeleted</c>,
/// <c>DeletedAt</c>, <c>HardDeleteAt</c>). Persistence-shape only — service +
/// API surface comes online in S14-T2..T9.
/// </summary>
public class UserSettingsEntitiesTests : IClassFixture<CodeMentorWebApplicationFactory>
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    private readonly CodeMentorWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public UserSettingsEntitiesTests(CodeMentorWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    private async Task<Guid> RegisterAsync(string email)
    {
        var req = new RegisterRequest(email, "Strong_Pass_123!", "Settings Tester", null);
        var res = await _client.PostAsJsonAsync("/api/auth/register", req);
        res.EnsureSuccessStatusCode();
        var body = (await res.Content.ReadFromJsonAsync<AuthResponse>(Json))!;
        return body.User.Id;
    }

    [Fact]
    public async Task UserSettings_RoundTrip_PrefsAndPrivacyTogglesPersist()
    {
        var userId = await RegisterAsync($"settings-rt-{Guid.NewGuid():N}@test.local");

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        // T2's lazy-init will create this row for new users; for now we insert directly.
        var settings = new UserSettings
        {
            UserId = userId,
            // Override 2 fields to verify the round-trip is real (not just default echo).
            NotifBadgeEmail = false,
            PublicCvDefault = true,
        };
        db.UserSettings.Add(settings);
        await db.SaveChangesAsync();

        var fetched = await db.UserSettings.AsNoTracking().SingleAsync(s => s.UserId == userId);

        Assert.Equal(userId, fetched.UserId);
        // 4 default-true prefs that were not overridden:
        Assert.True(fetched.NotifSubmissionEmail);
        Assert.True(fetched.NotifSubmissionInApp);
        Assert.True(fetched.NotifAuditEmail);
        Assert.True(fetched.NotifAuditInApp);
        Assert.True(fetched.NotifWeaknessEmail);
        Assert.True(fetched.NotifWeaknessInApp);
        Assert.True(fetched.NotifBadgeInApp);
        Assert.True(fetched.NotifSecurityEmail);
        Assert.True(fetched.NotifSecurityInApp);
        // S20-T0 / ADR-061: 6th pref family also defaults ON.
        Assert.True(fetched.NotifAdaptationEmail);
        Assert.True(fetched.NotifAdaptationInApp);
        // Overridden:
        Assert.False(fetched.NotifBadgeEmail);
        Assert.True(fetched.PublicCvDefault);
        // Privacy default:
        Assert.True(fetched.ProfileDiscoverable);
        Assert.True(fetched.ShowInLeaderboard);
        Assert.True((DateTime.UtcNow - fetched.CreatedAt).TotalMinutes < 5);
    }

    [Fact]
    public void UserSettings_ModelHasUniqueIndexOnUserId()
    {
        // Test factory uses InMemory provider, which does NOT enforce unique indexes
        // at runtime. The relational migration sets `unique: true` on this index
        // (see migration AddUserSettings). Here we assert the EF model is configured
        // correctly so the relational DB will enforce uniqueness in prod.
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var entity = db.Model.FindEntityType(typeof(UserSettings))!;
        var userIdIndex = entity.GetIndexes().Single(i =>
            i.Properties.Count == 1 && i.Properties[0].Name == "UserId");
        Assert.True(userIdIndex.IsUnique);
    }

    // Note: EmailDelivery.Status is configured with HasConversion<string>() so the
    // relational provider stores it as nvarchar(20) (verified in migration
    // AddUserSettings). InMemory provider strips value converters from its
    // metadata so we can't model-shape-assert it here — the migration file is
    // the source of truth for the string-storage choice.

    [Fact]
    public async Task EmailDelivery_RoundTrip_PersistsAndUpdatesFields()
    {
        var userId = await RegisterAsync($"email-rt-{Guid.NewGuid():N}@test.local");

        Guid deliveryId;
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

            var delivery = new EmailDelivery
            {
                UserId = userId,
                Type = "feedback-ready",
                ToAddress = "user@test.local",
                Subject = "Your feedback is ready",
                BodyHtml = "<p>Hello</p>",
                BodyText = "Hello",
                Status = EmailDeliveryStatus.Pending,
                AttemptCount = 0,
                NextAttemptAt = DateTime.UtcNow.AddMinutes(5),
            };
            db.EmailDeliveries.Add(delivery);
            await db.SaveChangesAsync();
            deliveryId = delivery.Id;

            // Simulate provider success → mark Sent.
            delivery.Status = EmailDeliveryStatus.Sent;
            delivery.SentAt = DateTime.UtcNow;
            delivery.ProviderMessageId = "sendgrid-msgid-123";
            await db.SaveChangesAsync();
        }

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var fetched = await db.EmailDeliveries.AsNoTracking().SingleAsync(d => d.Id == deliveryId);
            Assert.Equal("feedback-ready", fetched.Type);
            Assert.Equal("user@test.local", fetched.ToAddress);
            Assert.Equal("Your feedback is ready", fetched.Subject);
            Assert.Equal(EmailDeliveryStatus.Sent, fetched.Status);
            Assert.Equal("sendgrid-msgid-123", fetched.ProviderMessageId);
            Assert.NotNull(fetched.SentAt);
            Assert.Equal(0, fetched.AttemptCount);
        }
    }

    [Fact]
    public async Task UserAccountDeletionRequest_RoundTrip_RecordsCoolingOffWindow()
    {
        var userId = await RegisterAsync($"delete-rt-{Guid.NewGuid():N}@test.local");

        Guid requestId;
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

            var request = new UserAccountDeletionRequest
            {
                UserId = userId,
                RequestedAt = DateTime.UtcNow,
                HardDeleteAt = DateTime.UtcNow.AddDays(30),
                ScheduledJobId = "hangfire-job-abc",
                Reason = "no longer needed",
            };
            db.UserAccountDeletionRequests.Add(request);
            await db.SaveChangesAsync();
            requestId = request.Id;

            // Simulate auto-cancel-on-login (Spotify model, T9).
            request.CancelledAt = DateTime.UtcNow;
            await db.SaveChangesAsync();
        }

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var fetched = await db.UserAccountDeletionRequests.AsNoTracking()
                .SingleAsync(r => r.Id == requestId);
            Assert.Equal(userId, fetched.UserId);
            Assert.Equal("hangfire-job-abc", fetched.ScheduledJobId);
            Assert.Equal("no longer needed", fetched.Reason);
            Assert.NotNull(fetched.CancelledAt);
            Assert.Null(fetched.HardDeletedAt);
            Assert.True((fetched.HardDeleteAt - fetched.RequestedAt).TotalDays > 29);
        }
    }

    [Fact]
    public async Task ApplicationUser_SoftDeleteColumns_RoundTripAndDontHideUser()
    {
        var userId = await RegisterAsync($"user-softdel-{Guid.NewGuid():N}@test.local");

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var user = await db.Users.SingleAsync(u => u.Id == userId);
        Assert.False(user.IsDeleted);
        Assert.Null(user.DeletedAt);
        Assert.Null(user.HardDeleteAt);

        // Apply the soft-delete state that T9 will set on POST /api/user/account/delete.
        user.IsDeleted = true;
        user.DeletedAt = DateTime.UtcNow;
        user.HardDeleteAt = DateTime.UtcNow.AddDays(30);
        await db.SaveChangesAsync();

        // T1 design: no global query filter on User — login path needs to see soft-deleted
        // users so Spotify-model auto-cancel can fire (T9). Admin listings will apply an
        // explicit .Where(u => !u.IsDeleted) at the appropriate seams (T9).
        var refetched = await db.Users.AsNoTracking().SingleAsync(u => u.Id == userId);
        Assert.True(refetched.IsDeleted);
        Assert.NotNull(refetched.DeletedAt);
        Assert.NotNull(refetched.HardDeleteAt);
        Assert.True((refetched.HardDeleteAt!.Value - refetched.DeletedAt!.Value).TotalDays > 29);
    }
}

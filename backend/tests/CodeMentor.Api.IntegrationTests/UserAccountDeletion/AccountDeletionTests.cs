using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using CodeMentor.Api.IntegrationTests.TestHost;
using CodeMentor.Application.Auth.Contracts;
using CodeMentor.Application.LearningCV;
using CodeMentor.Application.UserAccountDeletion;
using CodeMentor.Application.UserSettings;
using CodeMentor.Domain.Gamification;
using CodeMentor.Domain.Notifications;
using CodeMentor.Domain.Users;
using CodeMentor.Infrastructure.Identity;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace CodeMentor.Api.IntegrationTests.UserAccountDeletion;

/// <summary>
/// S14-T9 / ADR-046 acceptance — account-deletion lifecycle. Covers the
/// request / login-auto-cancel / explicit-cancel / hard-delete-cascade paths +
/// the visibility filters (public CV 404, admin listing hides). The 30-day
/// Hangfire wait is sidestepped via <see cref="InlineUserAccountDeletionScheduler.TriggerHardDeleteAsync"/>.
/// </summary>
public class AccountDeletionTests : IClassFixture<CodeMentorWebApplicationFactory>
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    private readonly CodeMentorWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public AccountDeletionTests(CodeMentorWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    private void Bearer(string token) =>
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

    private async Task<(string token, Guid userId)> RegisterAsync(string email)
    {
        var req = new RegisterRequest(email, "Strong_Pass_123!", "Deletion Tester", null);
        var res = await _client.PostAsJsonAsync("/api/auth/register", req);
        res.EnsureSuccessStatusCode();
        var body = (await res.Content.ReadFromJsonAsync<AuthResponse>(Json))!;
        return (body.AccessToken, body.User.Id);
    }

    // ====== auth ======

    [Fact]
    public async Task PostDelete_WithoutAuth_Returns401()
    {
        var res = await _client.PostAsJsonAsync("/api/user/account/delete", new { });
        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    [Fact]
    public async Task DeleteDelete_WithoutAuth_Returns401()
    {
        var res = await _client.DeleteAsync("/api/user/account/delete");
        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    // ====== request deletion ======

    [Fact]
    public async Task PostDelete_CreatesPendingRow_SoftDeletesUser_SchedulesJob_RaisesSecurityAlert()
    {
        var (token, userId) = await RegisterAsync($"del-req-{Guid.NewGuid():N}@test.local");
        Bearer(token);

        var res = await _client.PostAsJsonAsync("/api/user/account/delete", new { reason = "no longer needed" });
        res.EnsureSuccessStatusCode();
        var body = (await res.Content.ReadFromJsonAsync<InitiateDeletionResponse>(Json))!;
        Assert.True(body.Status.HasActiveRequest);
        Assert.NotNull(body.Status.HardDeleteAtUtc);
        Assert.True(body.Status.HardDeleteAtUtc!.Value > DateTime.UtcNow.AddDays(29));
        Assert.True(body.Status.HardDeleteAtUtc!.Value < DateTime.UtcNow.AddDays(31));

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var scheduler = (InlineUserAccountDeletionScheduler)scope.ServiceProvider.GetRequiredService<IUserAccountDeletionScheduler>();

        // User row soft-deleted.
        var user = await db.Users.AsNoTracking().SingleAsync(u => u.Id == userId);
        Assert.True(user.IsDeleted);
        Assert.NotNull(user.DeletedAt);
        Assert.NotNull(user.HardDeleteAt);

        // Deletion request row written.
        var request = await db.UserAccountDeletionRequests.AsNoTracking().SingleAsync(r => r.UserId == userId);
        Assert.Null(request.CancelledAt);
        Assert.Null(request.HardDeletedAt);
        Assert.Equal("no longer needed", request.Reason);
        Assert.False(string.IsNullOrEmpty(request.ScheduledJobId));

        // Hangfire scheduling captured by the inline scheduler.
        Assert.Contains(scheduler.Scheduled, s => s.UserId == userId && s.RequestId == request.Id);

        // Security alert raised.
        var notif = await db.Notifications.AsNoTracking()
            .SingleAsync(n => n.UserId == userId && n.Type == NotificationType.SecurityAlert);
        Assert.Contains("Account deletion requested", notif.Message);
    }

    [Fact]
    public async Task PostDelete_SecondCall_IsIdempotent_NoDuplicateRow()
    {
        var (token, userId) = await RegisterAsync($"del-idemp-{Guid.NewGuid():N}@test.local");
        Bearer(token);

        var first = await _client.PostAsJsonAsync("/api/user/account/delete", new { });
        first.EnsureSuccessStatusCode();
        var firstBody = (await first.Content.ReadFromJsonAsync<InitiateDeletionResponse>(Json))!;

        var second = await _client.PostAsJsonAsync("/api/user/account/delete", new { });
        second.EnsureSuccessStatusCode();
        var secondBody = (await second.Content.ReadFromJsonAsync<InitiateDeletionResponse>(Json))!;

        // Same request id returned.
        Assert.Equal(firstBody.Status.RequestId, secondBody.Status.RequestId);

        // No duplicate row in DB.
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var rowCount = await db.UserAccountDeletionRequests.AsNoTracking().CountAsync(r => r.UserId == userId);
        Assert.Equal(1, rowCount);
    }

    // ====== get active ======

    [Fact]
    public async Task GetActive_ReturnsRequestWhenPresent_NullOtherwise()
    {
        var (token, _) = await RegisterAsync($"del-get-{Guid.NewGuid():N}@test.local");
        Bearer(token);

        // No request initially.
        var initial = await _client.GetFromJsonAsync<DeletionRequestStatus>("/api/user/account/delete", Json);
        Assert.False(initial!.HasActiveRequest);

        await _client.PostAsJsonAsync("/api/user/account/delete", new { });

        var afterRequest = await _client.GetFromJsonAsync<DeletionRequestStatus>("/api/user/account/delete", Json);
        Assert.True(afterRequest!.HasActiveRequest);
        Assert.NotNull(afterRequest.RequestId);
    }

    // ====== auto-cancel on login ======

    [Fact]
    public async Task Login_DuringCoolingOff_AutoCancels_RestoresUser_RaisesRestoredAlert()
    {
        var email = $"del-login-cancel-{Guid.NewGuid():N}@test.local";
        var (token, userId) = await RegisterAsync(email);
        Bearer(token);
        await _client.PostAsJsonAsync("/api/user/account/delete", new { });

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var u = await db.Users.AsNoTracking().SingleAsync(x => x.Id == userId);
            Assert.True(u.IsDeleted);
        }

        // Now log back in via /api/auth/login — the AuthService hook should auto-cancel.
        var loginClient = _factory.CreateClient(); // fresh client to avoid the prior Bearer
        var loginRes = await loginClient.PostAsJsonAsync("/api/auth/login",
            new LoginRequest(email, "Strong_Pass_123!"));
        loginRes.EnsureSuccessStatusCode();

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var scheduler = (InlineUserAccountDeletionScheduler)scope.ServiceProvider.GetRequiredService<IUserAccountDeletionScheduler>();

            var u = await db.Users.AsNoTracking().SingleAsync(x => x.Id == userId);
            Assert.False(u.IsDeleted);
            Assert.Null(u.DeletedAt);
            Assert.Null(u.HardDeleteAt);

            var req = await db.UserAccountDeletionRequests.AsNoTracking().SingleAsync(r => r.UserId == userId);
            Assert.NotNull(req.CancelledAt);
            Assert.Null(req.HardDeletedAt);

            Assert.Contains(req.ScheduledJobId!, scheduler.Cancelled);

            // Two SecurityAlert notifications now: "requested" + "restored".
            var notifs = await db.Notifications.AsNoTracking()
                .Where(n => n.UserId == userId && n.Type == NotificationType.SecurityAlert)
                .OrderBy(n => n.CreatedAt)
                .ToListAsync();
            Assert.Equal(2, notifs.Count);
            Assert.Contains("Account deletion requested", notifs[0].Message);
            Assert.Contains("Account restored", notifs[1].Message);
        }
    }

    // ====== explicit cancel ======

    [Fact]
    public async Task DeleteEndpoint_CancelsActiveRequest_RestoresUser()
    {
        var (token, userId) = await RegisterAsync($"del-cancel-{Guid.NewGuid():N}@test.local");
        Bearer(token);
        await _client.PostAsJsonAsync("/api/user/account/delete", new { });

        var res = await _client.DeleteAsync("/api/user/account/delete");
        res.EnsureSuccessStatusCode();
        var body = (await res.Content.ReadFromJsonAsync<CancelDeletionResponse>(Json))!;
        Assert.True(body.Cancelled);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var u = await db.Users.AsNoTracking().SingleAsync(x => x.Id == userId);
        Assert.False(u.IsDeleted);
    }

    [Fact]
    public async Task DeleteEndpoint_WithNoActiveRequest_ReturnsCancelledFalse()
    {
        var (token, _) = await RegisterAsync($"del-cancel-noop-{Guid.NewGuid():N}@test.local");
        Bearer(token);

        var res = await _client.DeleteAsync("/api/user/account/delete");
        res.EnsureSuccessStatusCode();
        var body = (await res.Content.ReadFromJsonAsync<CancelDeletionResponse>(Json))!;
        Assert.False(body.Cancelled);
    }

    // ====== hard-delete cascade ======

    [Fact]
    public async Task HardDeleteJob_RunsCascade_PurgesUserOwnedRowsAnonymizesSubmissions_ScrubsPii()
    {
        var email = $"del-cascade-{Guid.NewGuid():N}@test.local";
        var (token, userId) = await RegisterAsync(email);
        Bearer(token);

        // Seed some user-owned data across the cascade-affected tables.
        Guid requestId;
        using (var seedScope = _factory.Services.CreateScope())
        {
            var db = seedScope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            db.UserSettings.Add(new Domain.Users.UserSettings { UserId = userId });
            db.XpTransactions.Add(new XpTransaction { UserId = userId, Amount = 50, Reason = "test", CreatedAt = DateTime.UtcNow });
            db.Notifications.Add(new Notification { UserId = userId, Type = NotificationType.FeedbackReady, Title = "x", Message = "x" });
            db.Submissions.Add(new Domain.Submissions.Submission
            {
                UserId = userId,
                TaskId = Guid.NewGuid(),
                SubmissionType = Domain.Submissions.SubmissionType.Upload,
                Status = Domain.Submissions.SubmissionStatus.Completed,
                AiAnalysisStatus = Domain.Submissions.AiAnalysisStatus.Available,
            });
            await db.SaveChangesAsync();
        }

        // Request deletion (sets up the request row + soft-delete).
        var requestRes = await _client.PostAsJsonAsync("/api/user/account/delete", new { });
        requestRes.EnsureSuccessStatusCode();

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            requestId = (await db.UserAccountDeletionRequests.AsNoTracking()
                .SingleAsync(r => r.UserId == userId)).Id;
        }

        // Trigger the hard-delete cascade synchronously (sidesteps the 30-day Hangfire wait).
        using (var scope = _factory.Services.CreateScope())
        {
            var scheduler = (InlineUserAccountDeletionScheduler)scope.ServiceProvider.GetRequiredService<IUserAccountDeletionScheduler>();
            await scheduler.TriggerHardDeleteAsync(userId, requestId);
        }

        // Verify post-cascade state.
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

            // Purged tables (Phase 1):
            Assert.Equal(0, await db.UserSettings.AsNoTracking().CountAsync(s => s.UserId == userId));
            Assert.Equal(0, await db.XpTransactions.AsNoTracking().CountAsync(x => x.UserId == userId));
            Assert.Equal(0, await db.Notifications.AsNoTracking().CountAsync(n => n.UserId == userId));

            // Anonymized tables (Phase 3): Submission row exists but UserId is now null.
            var submissions = await db.Submissions.AsNoTracking().ToListAsync();
            Assert.Contains(submissions, s => s.UserId == null);
            Assert.DoesNotContain(submissions, s => s.UserId == userId);

            // User tombstone (Phase 5): row still exists, PII scrubbed, IsDeleted stays true.
            var tombstone = await db.Users.AsNoTracking().SingleAsync(u => u.Id == userId);
            Assert.True(tombstone.IsDeleted);
            Assert.Null(tombstone.Email);
            Assert.Null(tombstone.GitHubUsername);
            Assert.Null(tombstone.ProfilePictureUrl);
            Assert.Null(tombstone.PasswordHash);
            Assert.StartsWith("deleted-", tombstone.UserName!);
            Assert.Equal("(deleted user)", tombstone.FullName);

            // Request row marked hard-deleted (Phase 6).
            var req = await db.UserAccountDeletionRequests.AsNoTracking().SingleAsync(r => r.Id == requestId);
            Assert.NotNull(req.HardDeletedAt);
        }
    }

    [Fact]
    public async Task HardDeleteJob_RequestCancelled_IsNoOp()
    {
        var (token, userId) = await RegisterAsync($"del-cascade-cancelled-{Guid.NewGuid():N}@test.local");
        Bearer(token);

        await _client.PostAsJsonAsync("/api/user/account/delete", new { });

        Guid requestId;
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            requestId = (await db.UserAccountDeletionRequests.AsNoTracking().SingleAsync(r => r.UserId == userId)).Id;
        }

        await _client.DeleteAsync("/api/user/account/delete");

        // Run the job AFTER cancellation — should be a no-op + leave user intact.
        using (var scope = _factory.Services.CreateScope())
        {
            var scheduler = (InlineUserAccountDeletionScheduler)scope.ServiceProvider.GetRequiredService<IUserAccountDeletionScheduler>();
            await scheduler.TriggerHardDeleteAsync(userId, requestId);
        }

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var u = await db.Users.AsNoTracking().SingleAsync(x => x.Id == userId);
            Assert.False(u.IsDeleted);
            Assert.NotNull(u.Email); // PII NOT scrubbed
        }
    }

    // ====== visibility ======

    [Fact]
    public async Task PublicCV_OfSoftDeletedOwner_Returns404()
    {
        var (token, userId) = await RegisterAsync($"del-public-cv-{Guid.NewGuid():N}@test.local");
        Bearer(token);

        // Seed a public CV.
        const string slug = "soon-to-be-deleted";
        using (var seedScope = _factory.Services.CreateScope())
        {
            var db = seedScope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            db.LearningCVs.Add(new Domain.LearningCV.LearningCV
            {
                UserId = userId,
                IsPublic = true,
                PublicSlug = slug,
            });
            await db.SaveChangesAsync();
        }

        // Confirm public access works before deletion request.
        var beforeRes = await _client.GetAsync($"/api/public/cv/{slug}");
        Assert.Equal(HttpStatusCode.OK, beforeRes.StatusCode);

        // Request deletion → User.IsDeleted = true.
        await _client.PostAsJsonAsync("/api/user/account/delete", new { });

        // Now the public CV should 404.
        var afterRes = await _client.GetAsync($"/api/public/cv/{slug}");
        Assert.Equal(HttpStatusCode.NotFound, afterRes.StatusCode);
    }
}

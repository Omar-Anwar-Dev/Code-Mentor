using System.IO.Compression;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using CodeMentor.Api.IntegrationTests.TestHost;
using CodeMentor.Application.Auth.Contracts;
using CodeMentor.Application.Storage;
using CodeMentor.Application.UserExports;
using CodeMentor.Domain.Notifications;
using CodeMentor.Domain.Users;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace CodeMentor.Api.IntegrationTests.UserExports;

/// <summary>
/// S14-T8 / ADR-046 acceptance — data export end-to-end through the inline
/// scheduler. Verifies the controller authorizes, the job runs, the ZIP lands
/// in (fake) blob storage with all 7 expected entries, the SAS URL has a
/// 1-hour validity, the in-app DataExportReady notification is written, and
/// the EmailDelivery row carries the absolute download URL.
/// </summary>
public class UserDataExportTests : IClassFixture<CodeMentorWebApplicationFactory>
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    private readonly CodeMentorWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public UserDataExportTests(CodeMentorWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    private void Bearer(string token) =>
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

    private async Task<(string token, Guid userId)> RegisterAsync(string email)
    {
        var req = new RegisterRequest(email, "Strong_Pass_123!", "Export Tester", null);
        var res = await _client.PostAsJsonAsync("/api/auth/register", req);
        res.EnsureSuccessStatusCode();
        var body = (await res.Content.ReadFromJsonAsync<AuthResponse>(Json))!;
        return (body.AccessToken, body.User.Id);
    }

    // ====== auth ======

    [Fact]
    public async Task PostExport_WithoutAuth_Returns401()
    {
        var res = await _client.PostAsync("/api/user/export", content: null);
        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    // ====== happy path ======

    [Fact]
    public async Task PostExport_WithAuth_RunsJob_AndProducesZipNotificationAndEmail()
    {
        var (token, userId) = await RegisterAsync($"export-happy-{Guid.NewGuid():N}@test.local");
        Bearer(token);

        var res = await _client.PostAsync("/api/user/export", content: null);
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var body = (await res.Content.ReadFromJsonAsync<InitiateExportResponse>(Json))!;
        Assert.True(body.Accepted);
        Assert.Contains("email", body.Message, StringComparison.OrdinalIgnoreCase);

        // The inline scheduler runs the job synchronously, so by the time POST returns
        // the ZIP must already exist in fake blob storage + the notification + email
        // rows must be persisted.

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var blobs = (FakeBlobStorage)scope.ServiceProvider.GetRequiredService<IBlobStorage>();
        var sched = (InlineUserDataExportScheduler)scope.ServiceProvider.GetRequiredService<IUserDataExportScheduler>();

        Assert.Contains(userId, sched.Scheduled);

        // In-app notification:
        var notif = await db.Notifications.AsNoTracking()
            .SingleAsync(n => n.UserId == userId && n.Type == NotificationType.DataExportReady);
        Assert.Equal("Your data export is ready", notif.Title);
        // Notification.Link holds the absolute SAS URL directly (FE just window.opens it).
        Assert.StartsWith("http", notif.Link);
        Assert.Contains("user-exports", notif.Link);

        // EmailDelivery row:
        var email = await db.EmailDeliveries.AsNoTracking()
            .SingleAsync(e => e.UserId == userId && e.Type == "data-export-ready");
        Assert.Equal(EmailDeliveryStatus.Sent, email.Status);
        Assert.Contains("data export is ready", email.Subject, StringComparison.OrdinalIgnoreCase);
        Assert.Contains(notif.Link!, email.BodyText); // SAS URL embedded in email body
    }

    [Fact]
    public async Task PostExport_ZipContainsAllSixJsonFilesPlusPdf()
    {
        var (token, userId) = await RegisterAsync($"export-zip-{Guid.NewGuid():N}@test.local");
        Bearer(token);

        await _client.PostAsync("/api/user/export", content: null);

        using var scope = _factory.Services.CreateScope();
        var blobs = (FakeBlobStorage)scope.ServiceProvider.GetRequiredService<IBlobStorage>();

        // Locate the just-uploaded ZIP via the in-app notification (its Link is the SAS URL).
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var notif = await db.Notifications.AsNoTracking()
            .SingleAsync(n => n.UserId == userId && n.Type == NotificationType.DataExportReady);

        // The SAS URL path is /{container}/{blobPath} — extract blobPath.
        var uri = new Uri(notif.Link!);
        var pathSegments = uri.AbsolutePath.TrimStart('/').Split('/', 2);
        Assert.Equal(BlobContainers.UserExports, pathSegments[0]);
        var blobPath = pathSegments[1];

        await using var zipStream = await blobs.DownloadAsync(BlobContainers.UserExports, blobPath);
        using var archive = new ZipArchive(zipStream, ZipArchiveMode.Read);
        var entries = archive.Entries.Select(e => e.FullName).ToHashSet();

        // 6 JSON files + 1 PDF dossier = 7 entries.
        Assert.Contains("profile.json", entries);
        Assert.Contains("submissions.json", entries);
        Assert.Contains("audits.json", entries);
        Assert.Contains("assessments.json", entries);
        Assert.Contains("gamification.json", entries);
        Assert.Contains("notifications.json", entries);
        Assert.Contains("data-export.pdf", entries);
        Assert.Equal(7, entries.Count);

        // profile.json must contain the user's id + email (round-trip verification).
        using var profileStream = archive.GetEntry("profile.json")!.Open();
        var profileJson = await JsonDocument.ParseAsync(profileStream);
        Assert.Equal(userId.ToString(), profileJson.RootElement.GetProperty("id").GetString());
        Assert.Contains("export-zip-", profileJson.RootElement.GetProperty("email").GetString()!);

        // PDF must be non-empty + have the %PDF magic header (proves QuestPDF produced output).
        using var pdfStream = archive.GetEntry("data-export.pdf")!.Open();
        var head = new byte[4];
        var read = await pdfStream.ReadAsync(head);
        Assert.Equal(4, read);
        Assert.Equal((byte)'%', head[0]);
        Assert.Equal((byte)'P', head[1]);
        Assert.Equal((byte)'D', head[2]);
        Assert.Equal((byte)'F', head[3]);
    }

    [Fact]
    public async Task PostExport_SasUrlHasOneHourValidity()
    {
        var (token, userId) = await RegisterAsync($"export-sas-{Guid.NewGuid():N}@test.local");
        Bearer(token);

        var beforeUnix = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        await _client.PostAsync("/api/user/export", content: null);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var notif = await db.Notifications.AsNoTracking()
            .SingleAsync(n => n.UserId == userId && n.Type == NotificationType.DataExportReady);

        // FakeBlobStorage encodes expiry as `?se={unix}` in the SAS query.
        var uri = new Uri(notif.Link!);
        var query = System.Web.HttpUtility.ParseQueryString(uri.Query);
        var expiresUnix = long.Parse(query["se"]!);

        // ~1 hour validity = 3600s, allow ±60s for clock drift inside the test run.
        var expectedExpires = beforeUnix + 3600;
        Assert.InRange(expiresUnix, expectedExpires - 60, expectedExpires + 60);
    }

    [Fact]
    public async Task PostExport_EmailBypassesUserPrefs_AlwaysSends()
    {
        // The user disabled every notification pref. Data-export-ready still fires
        // because the user explicitly initiated the export — RaiseDataExportReadyAsync
        // bypasses prefs (see NotificationService.RaiseDataExportReadyAsync).
        var (token, userId) = await RegisterAsync($"export-bypass-{Guid.NewGuid():N}@test.local");
        Bearer(token);

        using (var prepScope = _factory.Services.CreateScope())
        {
            var db = prepScope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            db.UserSettings.Add(new Domain.Users.UserSettings
            {
                UserId = userId,
                NotifSubmissionEmail = false, NotifSubmissionInApp = false,
                NotifAuditEmail = false, NotifAuditInApp = false,
                NotifWeaknessEmail = false, NotifWeaknessInApp = false,
                NotifBadgeEmail = false, NotifBadgeInApp = false,
                NotifSecurityEmail = false, NotifSecurityInApp = false,
            });
            await db.SaveChangesAsync();
        }

        await _client.PostAsync("/api/user/export", content: null);

        using var verifyScope = _factory.Services.CreateScope();
        var verifyDb = verifyScope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        Assert.Single(await verifyDb.Notifications.AsNoTracking()
            .Where(n => n.UserId == userId && n.Type == NotificationType.DataExportReady).ToListAsync());
        var email = await verifyDb.EmailDeliveries.AsNoTracking()
            .SingleAsync(e => e.UserId == userId && e.Type == "data-export-ready");
        Assert.Equal(EmailDeliveryStatus.Sent, email.Status); // NOT Suppressed
    }
}

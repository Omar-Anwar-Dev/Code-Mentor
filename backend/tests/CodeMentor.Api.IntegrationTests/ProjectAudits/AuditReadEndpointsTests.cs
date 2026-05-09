using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using CodeMentor.Api.IntegrationTests.TestHost;
using CodeMentor.Application.Auth.Contracts;
using CodeMentor.Application.CodeReview;
using CodeMentor.Application.ProjectAudits.Contracts;
using CodeMentor.Domain.ProjectAudits;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace CodeMentor.Api.IntegrationTests.ProjectAudits;

/// <summary>
/// S9-T5 acceptance:
///  - <c>GET /audits/{id}</c> — owner-scoped; 401 / 404 / 200.
///  - <c>GET /audits/{id}/report</c> — 404 missing, 409 if not Completed, 200 happy.
///  - <c>GET /audits/me</c> — paginated; soft-deleted excluded; date + score filters work.
///  - <c>DELETE /audits/{id}</c> — soft delete; 204 / 404; subsequent reads 404.
///  - <c>POST /audits/{id}/retry</c> — 409 on non-Failed, 202 on Failed (re-enqueues + AttemptNumber++).
/// </summary>
public class AuditReadEndpointsTests : IClassFixture<CodeMentorWebApplicationFactory>
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    private readonly CodeMentorWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public AuditReadEndpointsTests(CodeMentorWebApplicationFactory factory)
    {
        _factory = factory;
        // Reset the AI fake to the default happy response so each test starts from a known state.
        var fakeAi = (FakeProjectAuditAiClient)_factory.Services.GetRequiredService<IProjectAuditAiClient>();
        fakeAi.ThrowUnavailable = false;
        fakeAi.Response = FakeProjectAuditAiClient.EmptyResponse();
        _client = factory.CreateClient();
    }

    private async Task<string> RegisterAsync(string label)
    {
        var email = $"{label}-{Guid.NewGuid():N}@audit-test.local";
        var req = new RegisterRequest(email, "Strong_Pass_123!", "Read Tester", null);
        var res = await _client.PostAsJsonAsync("/api/auth/register", req);
        res.EnsureSuccessStatusCode();
        return (await res.Content.ReadFromJsonAsync<AuthResponse>())!.AccessToken;
    }

    private void Bearer(string token) =>
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

    private static CreateAuditRequest GitHubRequest(string projectName) => new(
        ProjectName: projectName,
        Summary: "Read-endpoint test.",
        Description: "Drives the read endpoints under test.",
        ProjectType: "WebApp",
        TechStack: new[] { "JavaScript" },
        Features: new[] { "feature" },
        TargetAudience: null,
        FocusAreas: null,
        KnownIssues: null,
        Source: new AuditSourceDto("github", $"https://github.com/octocat/repo-{projectName}", null));

    private async Task<Guid> CreateAuditAsync(string projectName)
    {
        var res = await _client.PostAsJsonAsync("/api/audits", GitHubRequest(projectName), Json);
        res.EnsureSuccessStatusCode();
        return (await res.Content.ReadFromJsonAsync<AuditCreatedResponse>(Json))!.AuditId;
    }

    // ── GET /audits/{id} ──────────────────────────────────────────────────

    [Fact]
    public async Task GetById_WithoutAuth_Returns401()
    {
        var res = await _client.GetAsync($"/api/audits/{Guid.NewGuid()}");
        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    [Fact]
    public async Task GetById_OtherUsersAudit_Returns404_NotLeaked()
    {
        Bearer(await RegisterAsync("alice"));
        var aliceAudit = await CreateAuditAsync("alice-only");

        Bearer(await RegisterAsync("eve"));
        var res = await _client.GetAsync($"/api/audits/{aliceAudit}");
        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
    }

    [Fact]
    public async Task GetById_OwnAudit_Returns200_WithExpectedShape()
    {
        Bearer(await RegisterAsync("getter"));
        var auditId = await CreateAuditAsync("get-by-id-happy");

        var res = await _client.GetAsync($"/api/audits/{auditId}");
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);

        var dto = await res.Content.ReadFromJsonAsync<AuditDto>(Json);
        Assert.NotNull(dto);
        Assert.Equal(auditId, dto!.AuditId);
        Assert.Equal("get-by-id-happy", dto.ProjectName);
        Assert.Equal(ProjectAuditStatus.Completed, dto.Status); // inline scheduler ran the pipeline
        Assert.Equal(1, dto.AttemptNumber);
        Assert.False(dto.IsDeleted);
    }

    // ── GET /audits/{id}/report ───────────────────────────────────────────

    [Fact]
    public async Task GetReport_NotOwned_Returns404()
    {
        Bearer(await RegisterAsync("owner"));
        var auditId = await CreateAuditAsync("report-not-owned");

        Bearer(await RegisterAsync("intruder"));
        var res = await _client.GetAsync($"/api/audits/{auditId}/report");
        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
    }

    [Fact]
    public async Task GetReport_NotYetCompleted_Returns409_ReportNotReady()
    {
        Bearer(await RegisterAsync("not-ready"));
        var auditId = await CreateAuditAsync("not-ready-report");

        // Force the audit back to a non-Completed state so the report endpoint
        // distinguishes "exists but not ready" (409) from "missing" (404).
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var audit = await db.ProjectAudits.SingleAsync(a => a.Id == auditId);
            audit.Status = ProjectAuditStatus.Pending;
            await db.SaveChangesAsync();
        }

        var res = await _client.GetAsync($"/api/audits/{auditId}/report");
        Assert.Equal(HttpStatusCode.Conflict, res.StatusCode);
        var problem = await res.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("ReportNotReady", problem.GetProperty("title").GetString());
    }

    [Fact]
    public async Task GetReport_WhenCompleted_Returns200_WithStructuredJson()
    {
        Bearer(await RegisterAsync("report-happy"));
        var auditId = await CreateAuditAsync("report-happy-project");

        var res = await _client.GetAsync($"/api/audits/{auditId}/report");
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);

        var doc = await res.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(auditId.ToString(), doc.GetProperty("auditId").GetString());
        Assert.True(doc.GetProperty("overallScore").GetInt32() > 0);
        Assert.Equal("project_audit.v1", doc.GetProperty("promptVersion").GetString());
        // Scores object is nested JSON, not a string blob.
        Assert.Equal(JsonValueKind.Object, doc.GetProperty("scores").ValueKind);
        Assert.True(doc.GetProperty("scores").GetProperty("completeness").GetInt32() >= 0);
        // Arrays come through as arrays.
        Assert.Equal(JsonValueKind.Array, doc.GetProperty("strengths").ValueKind);
        Assert.Equal(JsonValueKind.Array, doc.GetProperty("recommendedImprovements").ValueKind);
    }

    // ── GET /audits/me ────────────────────────────────────────────────────

    [Fact]
    public async Task ListMine_WithoutAuth_Returns401()
    {
        var res = await _client.GetAsync("/api/audits/me");
        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    [Fact]
    public async Task ListMine_EmptyAccount_Returns200_EmptyList()
    {
        Bearer(await RegisterAsync("empty"));
        var list = await _client.GetFromJsonAsync<AuditListResponse>("/api/audits/me", Json);
        Assert.NotNull(list);
        Assert.Equal(0, list!.TotalCount);
        Assert.Empty(list.Items);
    }

    [Fact]
    public async Task ListMine_WithAudits_OrdersByCreatedAtDesc_AndExcludesSoftDeleted()
    {
        Bearer(await RegisterAsync("lister"));

        var first = await CreateAuditAsync("audit-1");
        await Task.Delay(20); // ensure ordering by CreatedAt is deterministic
        var second = await CreateAuditAsync("audit-2");
        await Task.Delay(20);
        var third = await CreateAuditAsync("audit-3");

        // Soft-delete the middle one.
        var deleteRes = await _client.DeleteAsync($"/api/audits/{second}");
        Assert.Equal(HttpStatusCode.NoContent, deleteRes.StatusCode);

        var list = await _client.GetFromJsonAsync<AuditListResponse>("/api/audits/me", Json);
        Assert.NotNull(list);
        Assert.Equal(2, list!.TotalCount);
        // Newest first.
        Assert.Equal(third, list.Items[0].AuditId);
        Assert.Equal(first, list.Items[1].AuditId);
        Assert.DoesNotContain(list.Items, i => i.AuditId == second);
    }

    [Fact]
    public async Task ListMine_ScoreFilter_NarrowsResults()
    {
        Bearer(await RegisterAsync("filter-score"));

        var lowScore = await CreateAuditAsync("low");
        var highScore = await CreateAuditAsync("high");

        // Manipulate scores directly so we have a known split.
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            (await db.ProjectAudits.SingleAsync(a => a.Id == lowScore)).OverallScore = 30;
            (await db.ProjectAudits.SingleAsync(a => a.Id == highScore)).OverallScore = 90;
            await db.SaveChangesAsync();
        }

        var top = await _client.GetFromJsonAsync<AuditListResponse>(
            "/api/audits/me?scoreMin=80", Json);
        Assert.Single(top!.Items);
        Assert.Equal(highScore, top.Items[0].AuditId);

        var bottom = await _client.GetFromJsonAsync<AuditListResponse>(
            "/api/audits/me?scoreMax=50", Json);
        Assert.Single(bottom!.Items);
        Assert.Equal(lowScore, bottom.Items[0].AuditId);
    }

    [Fact]
    public async Task ListMine_PaginationCapsSizeAt100()
    {
        Bearer(await RegisterAsync("page-cap"));
        await CreateAuditAsync("only-one");

        // Request size > 100; service clamps to 100 (or current count, whichever smaller).
        var list = await _client.GetFromJsonAsync<AuditListResponse>(
            "/api/audits/me?size=999", Json);
        Assert.Equal(100, list!.Size);
    }

    // ── DELETE /audits/{id} ───────────────────────────────────────────────

    [Fact]
    public async Task Delete_WithoutAuth_Returns401()
    {
        var res = await _client.DeleteAsync($"/api/audits/{Guid.NewGuid()}");
        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    [Fact]
    public async Task Delete_NotOwned_Returns404()
    {
        Bearer(await RegisterAsync("owner-d"));
        var auditId = await CreateAuditAsync("delete-not-owned");

        Bearer(await RegisterAsync("intruder-d"));
        var res = await _client.DeleteAsync($"/api/audits/{auditId}");
        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
    }

    [Fact]
    public async Task Delete_HappyPath_Returns204_ThenGetReturns404_AndExcludedFromList()
    {
        Bearer(await RegisterAsync("deleter"));
        var auditId = await CreateAuditAsync("to-delete");

        var del = await _client.DeleteAsync($"/api/audits/{auditId}");
        Assert.Equal(HttpStatusCode.NoContent, del.StatusCode);

        var get = await _client.GetAsync($"/api/audits/{auditId}");
        Assert.Equal(HttpStatusCode.NotFound, get.StatusCode);

        var list = await _client.GetFromJsonAsync<AuditListResponse>("/api/audits/me", Json);
        Assert.Empty(list!.Items);

        // Repeat delete on a now-soft-deleted row → 404 (idempotent from caller's perspective).
        var del2 = await _client.DeleteAsync($"/api/audits/{auditId}");
        Assert.Equal(HttpStatusCode.NotFound, del2.StatusCode);
    }

    // ── POST /audits/{id}/retry ───────────────────────────────────────────

    [Fact]
    public async Task Retry_NotFound_Returns404()
    {
        Bearer(await RegisterAsync("retry-missing"));
        var res = await _client.PostAsync($"/api/audits/{Guid.NewGuid()}/retry", content: null);
        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
    }

    [Fact]
    public async Task Retry_OnCompleted_Returns409_NotRetryable()
    {
        Bearer(await RegisterAsync("retry-completed"));
        var auditId = await CreateAuditAsync("retry-completed-project");

        // Inline scheduler already drove the audit to Completed.
        var res = await _client.PostAsync($"/api/audits/{auditId}/retry", content: null);
        Assert.Equal(HttpStatusCode.Conflict, res.StatusCode);
    }

    [Fact]
    public async Task Retry_OnFailed_Returns202_AndIncrementsAttempt_AndReSchedules()
    {
        Bearer(await RegisterAsync("retry-failed"));
        var auditId = await CreateAuditAsync("retry-failed-project");

        // Force the row to Failed so retry has something to act on.
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var audit = await db.ProjectAudits.SingleAsync(a => a.Id == auditId);
            audit.Status = ProjectAuditStatus.Failed;
            audit.ErrorMessage = "Simulated transient failure for retry test.";
            audit.CompletedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();
        }

        var inlineScheduler = (InlineProjectAuditScheduler)_factory.Services.GetRequiredService<CodeMentor.Application.ProjectAudits.IProjectAuditScheduler>();
        var beforeScheduledCount = inlineScheduler.Scheduled.Count;

        var res = await _client.PostAsync($"/api/audits/{auditId}/retry", content: null);
        Assert.Equal(HttpStatusCode.Accepted, res.StatusCode);

        var body = await res.Content.ReadFromJsonAsync<AuditCreatedResponse>(Json);
        Assert.Equal(auditId, body!.AuditId);
        // Scheduler ran inline — by now Status is back to Completed (fake AI returns happy).
        Assert.Equal(2, body.AttemptNumber);

        // Verify scheduler was invoked again.
        Assert.Contains(auditId, inlineScheduler.Scheduled.Skip(beforeScheduledCount));

        // ErrorMessage cleared after successful retry.
        using var scope2 = _factory.Services.CreateScope();
        var db2 = scope2.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var refreshed = await db2.ProjectAudits.AsNoTracking().SingleAsync(a => a.Id == auditId);
        Assert.Null(refreshed.ErrorMessage);
        Assert.Equal(ProjectAuditStatus.Completed, refreshed.Status);
    }
}

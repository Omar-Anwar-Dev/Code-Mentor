using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using CodeMentor.Api.IntegrationTests.TestHost;
using CodeMentor.Application.Admin.Contracts;
using CodeMentor.Application.Auth.Contracts;
using CodeMentor.Domain.Tasks;
using CodeMentor.Infrastructure.CodeReview;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace CodeMentor.Api.IntegrationTests.Admin;

/// <summary>
/// S18-T4 / F16 (ADR-049 / ADR-058): admin task-drafts endpoints + service end-to-end.
///
/// Acceptance bar: 8 integration tests parallel to S16-T4.
/// </summary>
public class AdminTaskDraftsTests : IClassFixture<CodeMentorWebApplicationFactory>
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    private readonly CodeMentorWebApplicationFactory _factory;
    private readonly HttpClient _client;
    private static string? _cachedAdminToken;
    private static readonly SemaphoreSlim _loginLock = new(1, 1);

    public AdminTaskDraftsTests(CodeMentorWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    private FakeTaskGeneratorRefit ResolveFake() =>
        (FakeTaskGeneratorRefit)_factory.Services.GetRequiredService<ITaskGeneratorRefit>();

    private void Bearer(string token) =>
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

    private async Task<string> LoginAsAdminAsync()
    {
        if (_cachedAdminToken is not null) return _cachedAdminToken;
        await _loginLock.WaitAsync();
        try
        {
            if (_cachedAdminToken is not null) return _cachedAdminToken;
            var login = await _client.PostAsJsonAsync("/api/auth/login",
                new LoginRequest("admin@codementor.local", "Admin_Dev_123!"));
            login.EnsureSuccessStatusCode();
            var body = await login.Content.ReadFromJsonAsync<AuthResponse>();
            _cachedAdminToken = body!.AccessToken;
            return _cachedAdminToken;
        }
        finally { _loginLock.Release(); }
    }

    private async Task<GenerateTaskDraftsResponse> GenerateAsync(int count = 2, string track = "Backend", int difficulty = 2)
    {
        var req = new GenerateTaskDraftsRequest(
            Track: track, Difficulty: difficulty, Count: count,
            FocusSkills: new[] { "correctness", "design" }, ExistingTitles: null);
        var resp = await _client.PostAsJsonAsync("/api/admin/tasks/generate", req, Json);
        resp.EnsureSuccessStatusCode();
        var body = await resp.Content.ReadFromJsonAsync<GenerateTaskDraftsResponse>(Json);
        return body!;
    }

    [Fact]
    public async Task Generate_HappyPath_PersistsBatchAndReturnsDrafts()
    {
        Bearer(await LoginAsAdminAsync());
        var fake = ResolveFake();
        var callsBefore = fake.Calls.Count;

        var resp = await GenerateAsync(count: 3);

        Assert.Equal(callsBefore + 1, fake.Calls.Count);
        Assert.Equal(3, resp.Drafts.Count);
        Assert.Equal("generate_tasks_v1", resp.PromptVersion);
        Assert.Equal(1500, resp.TokensUsed);
        Assert.NotEqual(Guid.Empty, resp.BatchId);

        // Confirm DB persistence.
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var rows = await db.TaskDrafts.Where(d => d.BatchId == resp.BatchId).ToListAsync();
        Assert.Equal(3, rows.Count);
        Assert.All(rows, r => Assert.Equal(TaskDraftStatus.Draft, r.Status));
    }

    [Fact]
    public async Task Generate_AiServiceDown_Returns503()
    {
        Bearer(await LoginAsAdminAsync());
        var fake = ResolveFake();
        fake.ThrowOnNext = FakeTaskGeneratorRefit.MakeApiException(HttpStatusCode.ServiceUnavailable);

        var req = new GenerateTaskDraftsRequest(
            Track: "Backend", Difficulty: 2, Count: 1,
            FocusSkills: new[] { "correctness" }, ExistingTitles: null);
        var resp = await _client.PostAsJsonAsync("/api/admin/tasks/generate", req, Json);
        Assert.Equal(HttpStatusCode.ServiceUnavailable, resp.StatusCode);
    }

    [Fact]
    public async Task GetBatch_ReturnsDraftsInPositionOrder()
    {
        Bearer(await LoginAsAdminAsync());
        var batch = await GenerateAsync(count: 3);

        var resp = await _client.GetAsync($"/api/admin/tasks/drafts/{batch.BatchId}");
        resp.EnsureSuccessStatusCode();
        var rows = await resp.Content.ReadFromJsonAsync<IReadOnlyList<TaskDraftDto>>(Json);
        Assert.NotNull(rows);
        Assert.Equal(3, rows!.Count);
        Assert.Equal(0, rows[0].PositionInBatch);
        Assert.Equal(1, rows[1].PositionInBatch);
        Assert.Equal(2, rows[2].PositionInBatch);
    }

    [Fact]
    public async Task GetBatch_UnknownBatchId_Returns404()
    {
        Bearer(await LoginAsAdminAsync());
        var resp = await _client.GetAsync($"/api/admin/tasks/drafts/{Guid.NewGuid()}");
        Assert.Equal(HttpStatusCode.NotFound, resp.StatusCode);
    }

    [Fact]
    public async Task Approve_HappyPath_InsertsTaskAndEnqueuesEmbed()
    {
        Bearer(await LoginAsAdminAsync());
        var batch = await GenerateAsync(count: 1);
        var draft = batch.Drafts.Single();

        var resp = await _client.PostAsJsonAsync($"/api/admin/tasks/drafts/{draft.Id}/approve", (object?)null, Json);
        resp.EnsureSuccessStatusCode();
        var body = await resp.Content.ReadFromJsonAsync<JsonElement>();
        var newTaskId = body.GetProperty("taskId").GetGuid();

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var task = await db.Tasks.AsNoTracking().SingleAsync(t => t.Id == newTaskId);
        Assert.Equal(draft.Title, task.Title);
        Assert.Equal(TaskSource.AI, task.Source);
        Assert.NotNull(task.SkillTagsJson);
        Assert.NotNull(task.LearningGainJson);
        Assert.Equal("generate_tasks_v1", task.PromptVersion);

        // Inline embed scheduler ran the embed job → EmbeddingJson populated.
        Assert.NotNull(task.EmbeddingJson);

        var draftRow = await db.TaskDrafts.AsNoTracking().SingleAsync(d => d.Id == draft.Id);
        Assert.Equal(TaskDraftStatus.Approved, draftRow.Status);
        Assert.Equal(newTaskId, draftRow.ApprovedTaskId);
    }

    [Fact]
    public async Task Approve_AlreadyApproved_Returns409Conflict()
    {
        Bearer(await LoginAsAdminAsync());
        var batch = await GenerateAsync(count: 1);
        var draft = batch.Drafts.Single();

        var first = await _client.PostAsJsonAsync($"/api/admin/tasks/drafts/{draft.Id}/approve", (object?)null, Json);
        first.EnsureSuccessStatusCode();

        var second = await _client.PostAsJsonAsync($"/api/admin/tasks/drafts/{draft.Id}/approve", (object?)null, Json);
        Assert.Equal(HttpStatusCode.Conflict, second.StatusCode);
    }

    [Fact]
    public async Task Reject_HappyPath_Returns204AndPersistsReason()
    {
        Bearer(await LoginAsAdminAsync());
        var batch = await GenerateAsync(count: 1);
        var draft = batch.Drafts.Single();

        var resp = await _client.PostAsJsonAsync(
            $"/api/admin/tasks/drafts/{draft.Id}/reject",
            new RejectTaskDraftRequest("topical overlap with existing CRUD task"),
            Json);
        Assert.Equal(HttpStatusCode.NoContent, resp.StatusCode);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var draftRow = await db.TaskDrafts.AsNoTracking().SingleAsync(d => d.Id == draft.Id);
        Assert.Equal(TaskDraftStatus.Rejected, draftRow.Status);
        Assert.Equal("topical overlap with existing CRUD task", draftRow.RejectionReason);
        Assert.Null(draftRow.ApprovedTaskId);
    }

    [Fact]
    public async Task Reject_AlreadyDecided_Returns409Conflict()
    {
        Bearer(await LoginAsAdminAsync());
        var batch = await GenerateAsync(count: 1);
        var draft = batch.Drafts.Single();

        var first = await _client.PostAsJsonAsync($"/api/admin/tasks/drafts/{draft.Id}/approve", (object?)null, Json);
        first.EnsureSuccessStatusCode();

        var reject = await _client.PostAsJsonAsync(
            $"/api/admin/tasks/drafts/{draft.Id}/reject",
            new RejectTaskDraftRequest(null),
            Json);
        Assert.Equal(HttpStatusCode.Conflict, reject.StatusCode);
    }
}

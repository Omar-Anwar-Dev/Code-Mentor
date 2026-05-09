using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using CodeMentor.Api.IntegrationTests.TestHost;
using CodeMentor.Application.Admin.Contracts;
using CodeMentor.Application.Auth.Contracts;
using CodeMentor.Domain.Assessments;
using CodeMentor.Domain.Tasks;
using CodeMentor.Infrastructure.Identity;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace CodeMentor.Api.IntegrationTests.Admin;

/// <summary>
/// S7-T11 acceptance: every admin write produces an <c>AuditLog</c> row with
/// (action, entityType, entityId, oldValueJson, newValueJson, actorUserId,
/// timestamp). Verified through the same admin endpoints exercised by S7-T9.
/// </summary>
public class AuditLogTests : IClassFixture<CodeMentorWebApplicationFactory>
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    private readonly CodeMentorWebApplicationFactory _factory;
    private readonly HttpClient _client;
    private static string? _cachedAdminToken;
    private static readonly SemaphoreSlim _loginLock = new(1, 1);

    public AuditLogTests(CodeMentorWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task CreateTask_AppendsCreateTaskAuditEntry()
    {
        Bearer(await LoginAsAdminAsync());
        var actor = await GetActorIdAsync();

        var t = await CreateTaskAsync("Audit Create");
        var rows = await GetAuditRowsForEntityAsync("Task", t.Id);
        Assert.Contains(rows, r => r.Action == "CreateTask"
                                && r.UserId == actor
                                && r.EntityId == t.Id.ToString("N")
                                && r.NewValueJson is not null
                                && r.OldValueJson is null);
    }

    [Fact]
    public async Task UpdateTask_AppendsUpdateTaskAuditEntry_WithOldAndNew()
    {
        Bearer(await LoginAsAdminAsync());
        var t = await CreateTaskAsync("Audit Update — Original");
        await _client.PutAsJsonAsync($"/api/admin/tasks/{t.Id}",
            new UpdateTaskRequest("Audit Update — Renamed", null, null, null, null, null, null, null, null), Json);
        var rows = await GetAuditRowsForEntityAsync("Task", t.Id);
        Assert.Contains(rows, r => r.Action == "UpdateTask"
                                && r.OldValueJson is not null
                                && r.NewValueJson is not null
                                && r.OldValueJson.Contains("Original")
                                && r.NewValueJson.Contains("Renamed"));
    }

    [Fact]
    public async Task SoftDeleteTask_AppendsSoftDeleteAuditEntry()
    {
        Bearer(await LoginAsAdminAsync());
        var t = await CreateTaskAsync("Audit Delete");
        await _client.DeleteAsync($"/api/admin/tasks/{t.Id}");
        var rows = await GetAuditRowsForEntityAsync("Task", t.Id);
        Assert.Contains(rows, r => r.Action == "SoftDeleteTask");
    }

    [Fact]
    public async Task UpdateQuestion_AppendsUpdateQuestionAuditEntry()
    {
        Bearer(await LoginAsAdminAsync());
        var qRes = await _client.PostAsJsonAsync("/api/admin/questions",
            new CreateQuestionRequest("Audit Q?", 1, SkillCategory.OOP,
                new[] { "A", "B", "C", "D" }, "C", null), Json);
        var dto = await qRes.Content.ReadFromJsonAsync<AdminQuestionDto>(Json);

        await _client.PutAsJsonAsync($"/api/admin/questions/{dto!.Id}",
            new UpdateQuestionRequest("Audit Q? (revised)", null, null, null, null, null, null), Json);

        var rows = await GetAuditRowsForEntityAsync("Question", dto.Id);
        Assert.Contains(rows, r => r.Action == "CreateQuestion");
        Assert.Contains(rows, r => r.Action == "UpdateQuestion"
                                && r.NewValueJson!.Contains("revised"));
    }

    [Fact]
    public async Task DeactivateUser_AppendsDeactivateUserAuditEntry()
    {
        Bearer(await LoginAsAdminAsync());
        var email = $"audit-deactivate-{Guid.NewGuid():N}@admin.test";
        await RegisterAsync(email);
        var userId = await GetUserIdAsync(email);

        await _client.PatchAsJsonAsync($"/api/admin/users/{userId}",
            new UpdateUserRequest(IsActive: false, Role: null), Json);

        var rows = await GetAuditRowsForEntityAsync("User", userId);
        Assert.Contains(rows, r => r.Action == "DeactivateUser"
                                && r.OldValueJson is not null
                                && r.NewValueJson is not null);
    }

    // ---- helpers -----

    private void Bearer(string token) =>
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

    private async Task<string> RegisterAsync(string email)
    {
        var req = new RegisterRequest(email, "Strong_Pass_123!", "Audit Tester", null);
        var res = await _client.PostAsJsonAsync("/api/auth/register", req);
        res.EnsureSuccessStatusCode();
        return (await res.Content.ReadFromJsonAsync<AuthResponse>(Json))!.AccessToken;
    }

    private async Task<string> LoginAsAdminAsync()
    {
        if (_cachedAdminToken is not null) return _cachedAdminToken;
        await _loginLock.WaitAsync();
        try
        {
            if (_cachedAdminToken is not null) return _cachedAdminToken;
            var login = new LoginRequest("admin@codementor.local", "Admin_Dev_123!");
            var res = await _client.PostAsJsonAsync("/api/auth/login", login);
            res.EnsureSuccessStatusCode();
            _cachedAdminToken = (await res.Content.ReadFromJsonAsync<AuthResponse>(Json))!.AccessToken;
            return _cachedAdminToken;
        }
        finally { _loginLock.Release(); }
    }

    private async Task<AdminTaskDto> CreateTaskAsync(string title)
    {
        var res = await _client.PostAsJsonAsync("/api/admin/tasks",
            new CreateTaskRequest(title, "Desc", 2, SkillCategory.Algorithms,
                Track.Backend, ProgrammingLanguage.Python, 4, Array.Empty<string>()), Json);
        res.EnsureSuccessStatusCode();
        return (await res.Content.ReadFromJsonAsync<AdminTaskDto>(Json))!;
    }

    private async Task<List<AuditRow>> GetAuditRowsForEntityAsync(string entityType, Guid entityId)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var rows = await db.AuditLogs.AsNoTracking()
            .Where(a => a.EntityType == entityType && a.EntityId == entityId.ToString("N"))
            .Select(a => new AuditRow(a.Action, a.UserId, a.EntityId, a.OldValueJson, a.NewValueJson, a.IpAddress, a.CreatedAt))
            .ToListAsync();
        return rows;
    }

    private async Task<Guid> GetUserIdAsync(string email)
    {
        using var scope = _factory.Services.CreateScope();
        var users = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var user = await users.FindByEmailAsync(email);
        return user!.Id;
    }

    private async Task<Guid> GetActorIdAsync()
    {
        using var scope = _factory.Services.CreateScope();
        var users = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var user = await users.FindByEmailAsync("admin@codementor.local");
        return user!.Id;
    }

    private record AuditRow(string Action, Guid? UserId, string EntityId, string? OldValueJson, string? NewValueJson, string? IpAddress, DateTime CreatedAt);
}

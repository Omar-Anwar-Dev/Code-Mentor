using System.Net;
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
/// S7-T9 acceptance:
///   - POST/PUT/DELETE /api/admin/tasks — admin-only, soft-delete on DELETE.
///   - POST/PUT/DELETE /api/admin/questions — admin-only, validates 4 options + correct answer A-D.
///   - GET /api/admin/users — paginated + searchable.
///   - PATCH /api/admin/users/{id} — deactivate via lockout, role swap.
///   - 401 unauthenticated, 403 non-admin (RequireAdmin policy).
/// </summary>
public class AdminEndpointTests : IClassFixture<CodeMentorWebApplicationFactory>
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    private readonly CodeMentorWebApplicationFactory _factory;
    private readonly HttpClient _client;
    private static string? _cachedAdminToken;
    private static readonly SemaphoreSlim _loginLock = new(1, 1);

    public AdminEndpointTests(CodeMentorWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task PostTask_WithoutAuth_Returns401()
    {
        var res = await _client.PostAsJsonAsync("/api/admin/tasks", BuildTaskRequest("X"));
        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    [Fact]
    public async Task PostTask_AsLearner_Returns403()
    {
        Bearer(await RegisterAsync("learner@admin.test"));
        var res = await _client.PostAsJsonAsync("/api/admin/tasks", BuildTaskRequest("X"), Json);
        Assert.Equal(HttpStatusCode.Forbidden, res.StatusCode);
    }

    [Fact]
    public async Task PostTask_AsAdmin_Creates_AndListIncludesIt()
    {
        Bearer(await LoginAsAdminAsync());

        var res = await _client.PostAsJsonAsync("/api/admin/tasks",
            BuildTaskRequest("Admin Created Task"), Json);
        Assert.Equal(HttpStatusCode.Created, res.StatusCode);
        var dto = await res.Content.ReadFromJsonAsync<AdminTaskDto>(Json);
        Assert.NotNull(dto);
        Assert.True(dto!.IsActive);
        Assert.Equal("Admin Created Task", dto.Title);

        // Newly-created task should be visible on the public list.
        var list = await _client.GetFromJsonAsync<JsonElement>($"/api/tasks?search={Uri.EscapeDataString("Admin Created")}");
        var titles = list.GetProperty("items").EnumerateArray()
            .Select(t => t.GetProperty("title").GetString()).ToList();
        Assert.Contains("Admin Created Task", titles);
    }

    [Fact]
    public async Task PutTask_UnknownId_Returns404()
    {
        Bearer(await LoginAsAdminAsync());
        var res = await _client.PutAsJsonAsync($"/api/admin/tasks/{Guid.NewGuid()}",
            new UpdateTaskRequest("New Title", null, null, null, null, null, null, null, null), Json);
        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
    }

    [Fact]
    public async Task PutTask_HappyPath_AppliesPartialUpdate()
    {
        Bearer(await LoginAsAdminAsync());
        var created = await CreateTaskAsync("Original");
        var put = await _client.PutAsJsonAsync($"/api/admin/tasks/{created.Id}",
            new UpdateTaskRequest("Renamed", null, null, null, null, null, null, null, null), Json);
        var updated = await put.Content.ReadFromJsonAsync<AdminTaskDto>(Json);
        Assert.Equal("Renamed", updated!.Title);
        Assert.Equal(created.Description, updated.Description);
    }

    [Fact]
    public async Task DeleteTask_SoftDeletes_AndDropsFromActiveList()
    {
        Bearer(await LoginAsAdminAsync());
        var created = await CreateTaskAsync("To Delete");

        var del = await _client.DeleteAsync($"/api/admin/tasks/{created.Id}");
        Assert.Equal(HttpStatusCode.NoContent, del.StatusCode);

        // GET /api/tasks filters out IsActive=false rows.
        var list = await _client.GetFromJsonAsync<JsonElement>($"/api/tasks?search={Uri.EscapeDataString("To Delete")}");
        var ids = list.GetProperty("items").EnumerateArray()
            .Select(t => t.GetProperty("taskId").GetGuid()).ToList();
        Assert.DoesNotContain(created.Id, ids);
    }

    [Fact]
    public async Task DeleteTask_AlreadyDeleted_Idempotent_Returns204()
    {
        Bearer(await LoginAsAdminAsync());
        var created = await CreateTaskAsync("Delete Twice");
        await _client.DeleteAsync($"/api/admin/tasks/{created.Id}");
        var second = await _client.DeleteAsync($"/api/admin/tasks/{created.Id}");
        Assert.Equal(HttpStatusCode.NoContent, second.StatusCode);
    }

    [Fact]
    public async Task PostQuestion_HappyPath_Creates_4Options_CorrectAnswerA()
    {
        Bearer(await LoginAsAdminAsync());
        var req = new CreateQuestionRequest(
            Content: "What is 2+2?",
            Difficulty: 1,
            Category: SkillCategory.Algorithms,
            Options: new[] { "3", "4", "5", "22" },
            CorrectAnswer: "B",
            Explanation: "Basic arithmetic.");
        var res = await _client.PostAsJsonAsync("/api/admin/questions", req, Json);
        Assert.Equal(HttpStatusCode.Created, res.StatusCode);
        var dto = await res.Content.ReadFromJsonAsync<AdminQuestionDto>(Json);
        Assert.Equal("B", dto!.CorrectAnswer);
        Assert.Equal(4, dto.Options.Count);
    }

    [Fact]
    public async Task PostQuestion_BadOptionsCount_Returns400()
    {
        Bearer(await LoginAsAdminAsync());
        var req = new CreateQuestionRequest("Q", 1, SkillCategory.OOP,
            new[] { "A", "B" }, "A", null);
        var res = await _client.PostAsJsonAsync("/api/admin/questions", req, Json);
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }

    [Fact]
    public async Task PostQuestion_BadCorrectAnswer_Returns400()
    {
        Bearer(await LoginAsAdminAsync());
        var req = new CreateQuestionRequest("Q", 1, SkillCategory.OOP,
            new[] { "A", "B", "C", "D" }, "Z", null);
        var res = await _client.PostAsJsonAsync("/api/admin/questions", req, Json);
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }

    [Fact]
    public async Task DeleteQuestion_SoftDeletes()
    {
        Bearer(await LoginAsAdminAsync());
        var created = await CreateQuestionAsync();
        var del = await _client.DeleteAsync($"/api/admin/questions/{created.Id}");
        Assert.Equal(HttpStatusCode.NoContent, del.StatusCode);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var row = await db.Questions.AsNoTracking().FirstAsync(q => q.Id == created.Id);
        Assert.False(row.IsActive);
    }

    [Fact]
    public async Task GetUsers_AsAdmin_ReturnsPaginated()
    {
        Bearer(await LoginAsAdminAsync());
        var res = await _client.GetFromJsonAsync<JsonElement>("/api/admin/users?page=1&pageSize=10", Json);
        Assert.True(res.GetProperty("total").GetInt32() >= 1);
        var items = res.GetProperty("items").EnumerateArray().ToList();
        Assert.NotEmpty(items);
        Assert.All(items, u => Assert.True(u.TryGetProperty("email", out _)));
    }

    [Fact]
    public async Task PatchUser_Deactivate_Works_AndIsActiveFlips()
    {
        Bearer(await LoginAsAdminAsync());
        // Need a learner to deactivate.
        var learnerEmail = $"deactivate-{Guid.NewGuid():N}@admin.test";
        await RegisterAsync(learnerEmail);
        var learnerId = await GetUserIdByEmailAsync(learnerEmail);

        var res = await _client.PatchAsJsonAsync(
            $"/api/admin/users/{learnerId}",
            new UpdateUserRequest(IsActive: false, Role: null), Json);
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var dto = await res.Content.ReadFromJsonAsync<AdminUserDto>(Json);
        Assert.False(dto!.IsActive);
        Assert.NotNull(dto.LockoutEndUtc);
    }

    [Fact]
    public async Task PatchUser_Reactivate_ClearsLockout()
    {
        Bearer(await LoginAsAdminAsync());
        var learnerEmail = $"reactivate-{Guid.NewGuid():N}@admin.test";
        await RegisterAsync(learnerEmail);
        var learnerId = await GetUserIdByEmailAsync(learnerEmail);
        await _client.PatchAsJsonAsync($"/api/admin/users/{learnerId}",
            new UpdateUserRequest(IsActive: false, null), Json);

        var on = await _client.PatchAsJsonAsync($"/api/admin/users/{learnerId}",
            new UpdateUserRequest(IsActive: true, null), Json);
        var dto = await on.Content.ReadFromJsonAsync<AdminUserDto>(Json);
        Assert.True(dto!.IsActive);
        Assert.Null(dto.LockoutEndUtc);
    }

    // ---- helpers --------------------------------------------------------

    private void Bearer(string token) =>
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

    private async Task<string> RegisterAsync(string email)
    {
        var req = new RegisterRequest(email, "Strong_Pass_123!", "Admin Tester", null);
        var res = await _client.PostAsJsonAsync("/api/auth/register", req);
        res.EnsureSuccessStatusCode();
        return (await res.Content.ReadFromJsonAsync<AuthResponse>(Json))!.AccessToken;
    }

    private async Task<string> LoginAsAdminAsync()
    {
        // Login rate limiter is 5/15min/IP; cache the admin token across tests
        // in this class to avoid 429s on the 6th+ test.
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
        var res = await _client.PostAsJsonAsync("/api/admin/tasks", BuildTaskRequest(title), Json);
        res.EnsureSuccessStatusCode();
        return (await res.Content.ReadFromJsonAsync<AdminTaskDto>(Json))!;
    }

    private async Task<AdminQuestionDto> CreateQuestionAsync()
    {
        var res = await _client.PostAsJsonAsync("/api/admin/questions",
            new CreateQuestionRequest("What is 2+2?", 1, SkillCategory.Algorithms,
                new[] { "3", "4", "5", "22" }, "B", null), Json);
        res.EnsureSuccessStatusCode();
        return (await res.Content.ReadFromJsonAsync<AdminQuestionDto>(Json))!;
    }

    private async Task<Guid> GetUserIdByEmailAsync(string email)
    {
        using var scope = _factory.Services.CreateScope();
        var users = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var user = await users.FindByEmailAsync(email);
        return user!.Id;
    }

    private static CreateTaskRequest BuildTaskRequest(string title) => new(
        Title: title,
        Description: "## Description\nPlaceholder.",
        Difficulty: 2,
        Category: SkillCategory.Algorithms,
        Track: Track.Backend,
        ExpectedLanguage: ProgrammingLanguage.Python,
        EstimatedHours: 4,
        Prerequisites: Array.Empty<string>());
}

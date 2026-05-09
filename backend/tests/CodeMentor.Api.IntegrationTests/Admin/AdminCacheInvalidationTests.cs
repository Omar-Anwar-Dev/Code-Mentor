using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using CodeMentor.Api.IntegrationTests.TestHost;
using CodeMentor.Application.Admin.Contracts;
using CodeMentor.Application.Auth.Contracts;
using CodeMentor.Domain.Assessments;
using CodeMentor.Domain.Tasks;

namespace CodeMentor.Api.IntegrationTests.Admin;

/// <summary>
/// S7-T12 acceptance: after an admin task write (Create/Update/Delete), the
/// public <c>GET /api/tasks</c> response reflects the change immediately —
/// the version-counter cache bust (ADR-018) hook in <see cref="CodeMentor.Infrastructure.Admin.AdminTaskService"/>
/// is exercised by the live ITaskCatalogService decorator.
/// </summary>
public class AdminCacheInvalidationTests : IClassFixture<CodeMentorWebApplicationFactory>
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    private readonly HttpClient _client;
    private static string? _cachedAdminToken;
    private static readonly SemaphoreSlim _loginLock = new(1, 1);

    public AdminCacheInvalidationTests(CodeMentorWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task AdminCreateTask_BustsTaskListCache_NewRowVisibleImmediately()
    {
        Bearer(await LoginAsAdminAsync());
        var marker = $"cache-bust-{Guid.NewGuid():N}";

        // Warm the cache by reading the list with a search that won't match.
        var pre = await _client.GetFromJsonAsync<JsonElement>($"/api/tasks?search={Uri.EscapeDataString(marker)}", Json);
        Assert.Empty(pre.GetProperty("items").EnumerateArray());

        // Admin write — should bust the cache version.
        var create = await _client.PostAsJsonAsync("/api/admin/tasks",
            new CreateTaskRequest($"Cache Bust {marker}", "Desc", 2, SkillCategory.Algorithms,
                Track.Backend, ProgrammingLanguage.Python, 4, Array.Empty<string>()), Json);
        create.EnsureSuccessStatusCode();

        // Same query — must now include the new task (cache miss → fresh DB read).
        var post = await _client.GetFromJsonAsync<JsonElement>($"/api/tasks?search={Uri.EscapeDataString(marker)}", Json);
        var titles = post.GetProperty("items").EnumerateArray()
            .Select(t => t.GetProperty("title").GetString()).ToList();
        Assert.Contains($"Cache Bust {marker}", titles);
    }

    [Fact]
    public async Task AdminUpdateTask_BustsTaskListCache_RenameVisibleImmediately()
    {
        Bearer(await LoginAsAdminAsync());
        var marker = $"rename-{Guid.NewGuid():N}";

        var created = await _client.PostAsJsonAsync("/api/admin/tasks",
            new CreateTaskRequest($"Original {marker}", "Desc", 2, SkillCategory.Algorithms,
                Track.Backend, ProgrammingLanguage.Python, 4, Array.Empty<string>()), Json);
        var dto = await created.Content.ReadFromJsonAsync<AdminTaskDto>(Json);

        // Warm the cache — the original title is what we'd see.
        await _client.GetAsync($"/api/tasks?search={Uri.EscapeDataString(marker)}");

        var put = await _client.PutAsJsonAsync($"/api/admin/tasks/{dto!.Id}",
            new UpdateTaskRequest($"Renamed {marker}", null, null, null, null, null, null, null, null), Json);
        put.EnsureSuccessStatusCode();

        // Cache should be busted; renamed title must appear immediately.
        var post = await _client.GetFromJsonAsync<JsonElement>($"/api/tasks?search={Uri.EscapeDataString(marker)}", Json);
        var titles = post.GetProperty("items").EnumerateArray()
            .Select(t => t.GetProperty("title").GetString()!).ToList();
        Assert.Contains($"Renamed {marker}", titles);
        Assert.DoesNotContain($"Original {marker}", titles);
    }

    [Fact]
    public async Task AdminSoftDeleteTask_BustsTaskListCache_RowDropsFromList()
    {
        Bearer(await LoginAsAdminAsync());
        var marker = $"sd-{Guid.NewGuid():N}";

        var create = await _client.PostAsJsonAsync("/api/admin/tasks",
            new CreateTaskRequest($"Soft Delete {marker}", "Desc", 2, SkillCategory.Algorithms,
                Track.Backend, ProgrammingLanguage.Python, 4, Array.Empty<string>()), Json);
        var dto = await create.Content.ReadFromJsonAsync<AdminTaskDto>(Json);

        // Warm: should appear once.
        var pre = await _client.GetFromJsonAsync<JsonElement>($"/api/tasks?search={Uri.EscapeDataString(marker)}", Json);
        Assert.Single(pre.GetProperty("items").EnumerateArray());

        await _client.DeleteAsync($"/api/admin/tasks/{dto!.Id}");

        // Should drop from the active list immediately.
        var post = await _client.GetFromJsonAsync<JsonElement>($"/api/tasks?search={Uri.EscapeDataString(marker)}", Json);
        Assert.Empty(post.GetProperty("items").EnumerateArray());
    }

    private void Bearer(string token) =>
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

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
}

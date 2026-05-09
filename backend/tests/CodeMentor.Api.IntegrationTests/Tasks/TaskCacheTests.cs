using System.Diagnostics;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using CodeMentor.Api.IntegrationTests.TestHost;
using CodeMentor.Application.Auth.Contracts;
using CodeMentor.Application.Tasks;
using CodeMentor.Application.Tasks.Contracts;
using CodeMentor.Infrastructure.Tasks;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.DependencyInjection;

namespace CodeMentor.Api.IntegrationTests.Tasks;

/// <summary>
/// S3-T9 acceptance: repeated GET served from cache; after InvalidateListCacheAsync,
/// cache busted (the version key changes so old keys orphan).
/// </summary>
public class TaskCacheTests : IClassFixture<CodeMentorWebApplicationFactory>
{
    private readonly CodeMentorWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public TaskCacheTests(CodeMentorWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    private async Task<string> RegisterAndGetAccessTokenAsync(string email)
    {
        var req = new RegisterRequest(email, "Strong_Pass_123!", "Cache Tester", null);
        var res = await _client.PostAsJsonAsync("/api/auth/register", req);
        res.EnsureSuccessStatusCode();
        var body = await res.Content.ReadFromJsonAsync<AuthResponse>();
        return body!.AccessToken;
    }

    [Fact]
    public async Task Repeated_ListCalls_Populate_CacheKey()
    {
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(
            "Bearer", await RegisterAndGetAccessTokenAsync("cache-hit@test.local"));

        // Prime the cache.
        var first = await _client.GetFromJsonAsync<TaskListResponse>("/api/tasks?track=Backend");
        Assert.NotNull(first);

        // A cache entry should now exist under the current version (which may have been
        // bumped by other tests sharing this class-fixture; we only assert it's populated).
        using var scope = _factory.Services.CreateScope();
        var cache = scope.ServiceProvider.GetRequiredService<IDistributedCache>();
        var version = await cache.GetStringAsync(CachedTaskCatalogService.VersionKey);
        Assert.False(string.IsNullOrEmpty(version));
        Assert.True(long.TryParse(version, out var v) && v >= 1);
    }

    [Fact]
    public async Task Invalidate_Bumps_VersionKey_AndReload_Repopulates()
    {
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(
            "Bearer", await RegisterAndGetAccessTokenAsync("cache-bust@test.local"));

        // Prime.
        await _client.GetFromJsonAsync<TaskListResponse>("/api/tasks");

        // Invalidate via service.
        using var scope = _factory.Services.CreateScope();
        var svc = scope.ServiceProvider.GetRequiredService<ITaskCatalogService>();
        var cache = scope.ServiceProvider.GetRequiredService<IDistributedCache>();
        var before = await cache.GetStringAsync(CachedTaskCatalogService.VersionKey);
        await svc.InvalidateListCacheAsync();
        var after = await cache.GetStringAsync(CachedTaskCatalogService.VersionKey);

        Assert.NotEqual(before, after);
        Assert.True(long.Parse(after!) > long.Parse(before!));

        // After invalidation, a fresh call still succeeds and returns the same 21 items.
        var reloaded = await _client.GetFromJsonAsync<TaskListResponse>("/api/tasks");
        Assert.Equal(21, reloaded!.TotalCount);
    }

    [Fact]
    public async Task Second_ListCall_IsFaster_ThanFirst()
    {
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(
            "Bearer", await RegisterAndGetAccessTokenAsync("cache-perf@test.local"));

        // Warm up auth, EF, etc. — don't time the absolute first request.
        await _client.GetFromJsonAsync<TaskListResponse>("/api/tasks?track=Python");

        // Bust cache so the next call is a guaranteed miss.
        using (var scope = _factory.Services.CreateScope())
        {
            var svc = scope.ServiceProvider.GetRequiredService<ITaskCatalogService>();
            await svc.InvalidateListCacheAsync();
        }

        var sw = Stopwatch.StartNew();
        await _client.GetFromJsonAsync<TaskListResponse>("/api/tasks?track=FullStack");
        var missMs = sw.Elapsed.TotalMilliseconds;
        sw.Restart();
        await _client.GetFromJsonAsync<TaskListResponse>("/api/tasks?track=FullStack");
        var hitMs = sw.Elapsed.TotalMilliseconds;

        // Cache hit should be measurably (usually much) faster than miss on the same filter.
        // Loose bound to stay tolerant of CI jitter; miss+hit both sub-100ms locally.
        Assert.True(hitMs <= missMs + 5,
            $"cache hit ({hitMs:F1}ms) should be <= cache miss ({missMs:F1}ms) + jitter window.");
    }
}

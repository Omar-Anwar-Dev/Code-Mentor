using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using CodeMentor.Application.Tasks;
using CodeMentor.Application.Tasks.Contracts;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging;

namespace CodeMentor.Infrastructure.Tasks;

/// <summary>
/// S3-T9: distributed-cache decorator over TaskCatalogService. Caches list pages for 5 minutes
/// keyed by filter signature + a version counter. Invalidation bumps the counter, orphaning
/// old keys (they expire on TTL).
/// </summary>
public sealed class CachedTaskCatalogService : ITaskCatalogService
{
    public const string VersionKey = "tasks:version";
    public static readonly TimeSpan ListCacheTtl = TimeSpan.FromMinutes(5);

    private readonly TaskCatalogService _inner;
    private readonly IDistributedCache _cache;
    private readonly ILogger<CachedTaskCatalogService> _logger;

    public CachedTaskCatalogService(
        TaskCatalogService inner,
        IDistributedCache cache,
        ILogger<CachedTaskCatalogService> logger)
    {
        _inner = inner;
        _cache = cache;
        _logger = logger;
    }

    public async Task<TaskListResponse> ListAsync(TaskListFilter filter, CancellationToken ct = default)
    {
        var version = await GetVersionAsync(ct);
        var key = BuildListKey(version, filter);

        var cached = await _cache.GetStringAsync(key, ct);
        if (cached is not null)
        {
            try
            {
                var hit = JsonSerializer.Deserialize<TaskListResponse>(cached);
                if (hit is not null) return hit;
            }
            catch (JsonException ex)
            {
                _logger.LogWarning(ex, "Cached tasks list payload for key {Key} was malformed; bypassing cache.", key);
            }
        }

        var fresh = await _inner.ListAsync(filter, ct);
        await _cache.SetStringAsync(
            key,
            JsonSerializer.Serialize(fresh),
            new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = ListCacheTtl },
            ct);
        return fresh;
    }

    public Task<TaskDetailDto?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => _inner.GetByIdAsync(id, ct); // details are cheap; skip caching for MVP

    public async Task InvalidateListCacheAsync(CancellationToken ct = default)
    {
        var current = await GetVersionAsync(ct);
        var next = current + 1;
        await _cache.SetStringAsync(
            VersionKey,
            next.ToString(),
            new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = TimeSpan.FromDays(30) },
            ct);
        _logger.LogInformation("Task list cache invalidated. Version {Old} -> {New}", current, next);
    }

    private async Task<long> GetVersionAsync(CancellationToken ct)
    {
        var raw = await _cache.GetStringAsync(VersionKey, ct);
        if (raw is not null && long.TryParse(raw, out var v)) return v;
        // First use — seed v=1.
        await _cache.SetStringAsync(VersionKey, "1",
            new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = TimeSpan.FromDays(30) },
            ct);
        return 1L;
    }

    private static string BuildListKey(long version, TaskListFilter f)
    {
        var signature = string.Join('|',
            f.Track ?? "",
            f.Difficulty?.ToString() ?? "",
            f.Category ?? "",
            f.Language ?? "",
            (f.Search ?? "").Trim().ToLowerInvariant(),
            f.Page.ToString(),
            f.Size.ToString());

        // Keep keys bounded and predictable via SHA1 of the signature.
        using var sha = SHA1.Create();
        var hash = Convert.ToHexString(sha.ComputeHash(Encoding.UTF8.GetBytes(signature)))[..12];
        return $"tasks:list:v{version}:{hash}";
    }
}

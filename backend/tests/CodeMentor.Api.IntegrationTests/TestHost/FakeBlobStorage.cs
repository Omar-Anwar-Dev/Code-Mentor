using System.Collections.Concurrent;
using CodeMentor.Application.Storage;

namespace CodeMentor.Api.IntegrationTests.TestHost;

/// <summary>
/// In-memory blob-storage fake for integration tests. Produces valid-looking
/// SAS URLs, tracks which blob paths have been "uploaded," and supports
/// upload/download/exists/delete round-trips. Not a real storage backend —
/// never use outside tests.
/// </summary>
public sealed class FakeBlobStorage : IBlobStorage
{
    private readonly ConcurrentDictionary<string, byte[]> _store = new();

    public Task EnsureContainerAsync(string container, CancellationToken ct = default)
        => Task.CompletedTask;

    public Task UploadAsync(string container, string blobPath, Stream content, string? contentType = null, CancellationToken ct = default)
    {
        using var ms = new MemoryStream();
        content.CopyTo(ms);
        _store[Key(container, blobPath)] = ms.ToArray();
        return Task.CompletedTask;
    }

    public Task<Stream> DownloadAsync(string container, string blobPath, CancellationToken ct = default)
    {
        if (!_store.TryGetValue(Key(container, blobPath), out var bytes))
            throw new FileNotFoundException($"Blob not found: {container}/{blobPath}");
        return Task.FromResult<Stream>(new MemoryStream(bytes));
    }

    public Task<bool> ExistsAsync(string container, string blobPath, CancellationToken ct = default)
        => Task.FromResult(_store.ContainsKey(Key(container, blobPath)));

    public Task DeleteAsync(string container, string blobPath, CancellationToken ct = default)
    {
        _store.TryRemove(Key(container, blobPath), out _);
        return Task.CompletedTask;
    }

    public Uri GenerateUploadSasUrl(string container, string blobPath, TimeSpan validity)
        => MakeSasUri(container, blobPath, validity, "cw");

    public Uri GenerateDownloadSasUrl(string container, string blobPath, TimeSpan validity)
        => MakeSasUri(container, blobPath, validity, "r");

    public Task EnsureCorsAsync(IEnumerable<string> allowedOrigins, CancellationToken ct = default)
        => Task.CompletedTask;

    /// <summary>Helper for tests: pre-seed a blob so POST /submissions finds it.</summary>
    public void SeedBlob(string container, string blobPath, byte[] content)
        => _store[Key(container, blobPath)] = content;

    private static Uri MakeSasUri(string container, string blobPath, TimeSpan validity, string perms)
    {
        var expires = DateTimeOffset.UtcNow.Add(validity).ToUnixTimeSeconds();
        var url = $"http://fake-blob.local/{container}/{blobPath}?sig=FAKE&sp={perms}&se={expires}";
        return new Uri(url);
    }

    private static string Key(string container, string blobPath) => $"{container}/{blobPath}";
}

using System.Net.Http;
using System.Net.Sockets;
using System.Text;
using CodeMentor.Application.Storage;
using CodeMentor.Infrastructure.Storage;
using Microsoft.Extensions.Options;

namespace CodeMentor.Application.Tests.Storage;

/// <summary>
/// S4-T2 acceptance: integration test uploads a 1KB file to `submissions-uploads`
/// container via pre-signed URL; retrieves it.
///
/// The SAS-URL construction test runs unconditionally (no external deps).
/// The round-trip test skips gracefully when Azurite isn't listening on
/// 127.0.0.1:10000 so CI/clean-checkouts don't fail.
/// </summary>
public class AzureBlobStorageTests
{
    private static AzureBlobStorage NewStorage() =>
        new(Options.Create(new BlobStorageOptions()));

    [Fact]
    public void GenerateUploadSasUrl_EmitsUriWithSignature_AndBlobPath()
    {
        var storage = NewStorage();

        var uri = storage.GenerateUploadSasUrl(
            BlobContainers.Submissions,
            "user-abc/2026-04-21/sample.zip",
            TimeSpan.FromMinutes(10));

        Assert.Equal("127.0.0.1", uri.Host);
        Assert.Contains(BlobContainers.Submissions, uri.AbsolutePath);
        Assert.Contains("user-abc", uri.AbsolutePath);
        Assert.Contains("sample.zip", uri.AbsolutePath);
        // SAS v2 tokens always include sig + se (expiry) + sp (permissions).
        Assert.Contains("sig=", uri.Query);
        Assert.Contains("se=", uri.Query);
        Assert.Contains("sp=", uri.Query);
    }

    [Fact]
    public void GenerateDownloadSasUrl_UsesReadPermission()
    {
        var storage = NewStorage();

        var uri = storage.GenerateDownloadSasUrl(
            BlobContainers.Submissions,
            "x/y.zip",
            TimeSpan.FromMinutes(5));

        // SAS 'sp' param encodes permissions; read = 'r'.
        Assert.Matches(@"[?&]sp=[^&]*r[^&]*(&|$)", uri.Query);
    }

    [Fact]
    public async Task RoundTrip_UploadViaSas_Then_Download_Returns_SameBytes()
    {
        if (!IsAzuriteReachable())
        {
            // Acceptance-critical behavior is exercised against live Azurite in
            // docker-compose; skip cleanly when the port is closed.
            return;
        }

        var storage = NewStorage();
        var container = BlobContainers.Submissions;
        var blobPath = $"tests/roundtrip-{Guid.NewGuid():N}.zip";

        try
        {
            await storage.EnsureContainerAsync(container);

            var payload = Encoding.UTF8.GetBytes(new string('A', 1024)); // 1KB
            var uploadUrl = storage.GenerateUploadSasUrl(container, blobPath, TimeSpan.FromMinutes(10));

            using var http = new HttpClient();
            using var content = new ByteArrayContent(payload);
            content.Headers.Add("x-ms-blob-type", "BlockBlob");
            var put = new HttpRequestMessage(HttpMethod.Put, uploadUrl) { Content = content };
            var response = await http.SendAsync(put);
            response.EnsureSuccessStatusCode();

            Assert.True(await storage.ExistsAsync(container, blobPath), "blob should exist after SAS PUT");

            var downloadUrl = storage.GenerateDownloadSasUrl(container, blobPath, TimeSpan.FromMinutes(10));
            var downloaded = await http.GetByteArrayAsync(downloadUrl);

            Assert.Equal(payload.Length, downloaded.Length);
            Assert.Equal(payload, downloaded);
        }
        finally
        {
            await storage.DeleteAsync(container, blobPath);
        }
    }

    private static bool IsAzuriteReachable()
    {
        try
        {
            using var client = new TcpClient();
            var connectTask = client.ConnectAsync("127.0.0.1", 10000);
            return connectTask.Wait(TimeSpan.FromMilliseconds(500)) && client.Connected;
        }
        catch
        {
            return false;
        }
    }
}

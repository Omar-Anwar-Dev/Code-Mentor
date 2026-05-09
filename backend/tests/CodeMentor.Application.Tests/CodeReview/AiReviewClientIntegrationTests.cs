using System.IO.Compression;
using System.Net.Sockets;
using CodeMentor.Application.CodeReview;
using CodeMentor.Infrastructure.CodeReview;
using Microsoft.Extensions.Logging.Abstractions;
using Refit;

namespace CodeMentor.Application.Tests.CodeReview;

/// <summary>
/// S5-T1 acceptance (integration): hit real AI service in Docker with a minimal
/// ZIP and verify we get back per-tool blocks. Self-skips if the service isn't
/// reachable on localhost:8001 (same pattern as Azurite round-trip tests).
/// </summary>
public class AiReviewClientIntegrationTests
{
    private static bool IsAiServiceReachable()
    {
        try
        {
            using var client = new TcpClient();
            var connectTask = client.ConnectAsync("127.0.0.1", 8001);
            return connectTask.Wait(TimeSpan.FromMilliseconds(500)) && client.Connected;
        }
        catch
        {
            return false;
        }
    }

    private static IAiReviewClient NewClient()
    {
        var http = new HttpClient { BaseAddress = new Uri("http://127.0.0.1:8001"), Timeout = TimeSpan.FromMinutes(2) };
        var settings = new RefitSettings
        {
            ContentSerializer = new SystemTextJsonContentSerializer(
                new System.Text.Json.JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true,
                    PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase,
                }),
        };
        var refit = RestService.For<IAiServiceRefit>(http, settings);
        return new AiReviewClient(refit, NullLogger<AiReviewClient>.Instance);
    }

    [Fact]
    public async Task IsHealthyAsync_HitsLiveService_Returns_True()
    {
        if (!IsAiServiceReachable()) return; // self-skip

        var client = NewClient();
        var ok = await client.IsHealthyAsync();
        Assert.True(ok);
    }

    [Fact]
    public async Task AnalyzeZipAsync_HitsLiveService_ReturnsPerToolBlocks()
    {
        if (!IsAiServiceReachable()) return; // self-skip

        // Construct a tiny Python ZIP.
        using var zipStream = new MemoryStream();
        using (var archive = new ZipArchive(zipStream, ZipArchiveMode.Create, leaveOpen: true))
        {
            var entry = archive.CreateEntry("hello.py");
            using var w = new StreamWriter(entry.Open());
            await w.WriteAsync("import os\nassert True\n");
        }
        zipStream.Position = 0;

        var client = NewClient();

        AiCombinedResponse resp;
        try
        {
            resp = await client.AnalyzeZipAsync(zipStream, "hello.zip", "itest-corr-1");
        }
        catch (AiServiceUnavailableException)
        {
            // Treat transport-layer hiccups the same as not-reachable — the host
            // environment may have started the service but it's not ready yet.
            return;
        }

        Assert.NotNull(resp);
        Assert.NotNull(resp.StaticAnalysis);
        // Bandit (Python) should be among the tools that ran.
        Assert.NotNull(resp.StaticAnalysis!.PerTool);
        Assert.Contains(resp.StaticAnalysis.PerTool, t => t.Tool == "bandit");
    }
}

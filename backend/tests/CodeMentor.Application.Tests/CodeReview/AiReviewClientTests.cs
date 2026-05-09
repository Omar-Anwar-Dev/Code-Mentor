using System.Net;
using System.Text;
using System.Text.Json;
using CodeMentor.Application.CodeReview;
using CodeMentor.Infrastructure.CodeReview;
using Microsoft.Extensions.Logging.Abstractions;
using Refit;

namespace CodeMentor.Application.Tests.CodeReview;

/// <summary>
/// S5-T1: IAiReviewClient (via AiReviewClient) translates Refit transport errors
/// into AiServiceUnavailableException and passes successful payloads through.
/// </summary>
public class AiReviewClientTests
{
    private static AiReviewClient NewClient(IAiServiceRefit fake) =>
        new(fake, NullLogger<AiReviewClient>.Instance);

    [Fact]
    public async Task AnalyzeZipAsync_HappyPath_ReturnsCombinedResponse()
    {
        var expected = new AiCombinedResponse(
            SubmissionId: "s-001",
            AnalysisType: "combined",
            OverallScore: 82,
            StaticAnalysis: new AiStaticAnalysis(
                Score: 90,
                Issues: Array.Empty<AiIssue>(),
                Summary: new AiAnalysisSummary(0, 0, 0, 0),
                ToolsUsed: new[] { "eslint", "bandit" },
                PerTool: new[]
                {
                    new AiPerToolResult("eslint", Array.Empty<AiIssue>(), new AiAnalysisSummary(0, 0, 0, 0), 120),
                    new AiPerToolResult("bandit", Array.Empty<AiIssue>(), new AiAnalysisSummary(0, 0, 0, 0), 45),
                }),
            AiReview: new AiReviewResponse(
                OverallScore: 75,
                Scores: new AiReviewScores(80, 75, 70, 80, 75),
                Strengths: new[] { "good structure" },
                Weaknesses: new[] { "missing error handling" },
                Recommendations: Array.Empty<AiRecommendation>(),
                Summary: "OK",
                ModelUsed: "gpt-5.1-codex-mini",
                TokensUsed: 1500,
                PromptVersion: "v1.0.0",
                Available: true,
                Error: null),
            Metadata: new AiAnalysisMetadata("demo", new[] { "python" }, 3, 3500, true, true));

        var fake = new FakeRefit { AnalyzeZipReturns = expected };
        var client = NewClient(fake);

        using var zip = new MemoryStream(new byte[] { 0x50, 0x4B, 0x03, 0x04 });
        var result = await client.AnalyzeZipAsync(zip, "test.zip", "corr-123");

        Assert.Same(expected, result);
        Assert.Equal("corr-123", fake.LastCorrelationId);
        Assert.NotNull(fake.LastFilePart);
    }

    [Fact]
    public async Task AnalyzeZipAsync_On5xx_ThrowsAiServiceUnavailable()
    {
        var fake = new FakeRefit
        {
            AnalyzeZipThrows = CreateApiException(HttpStatusCode.ServiceUnavailable, "/api/analyze-zip")
        };
        var client = NewClient(fake);

        using var zip = new MemoryStream(new byte[] { 0x50, 0x4B, 0x03, 0x04 });

        var ex = await Assert.ThrowsAsync<AiServiceUnavailableException>(
            () => client.AnalyzeZipAsync(zip, "t.zip", "c-1"));
        Assert.Contains("503", ex.Message);
    }

    [Fact]
    public async Task AnalyzeZipAsync_OnHttpRequestException_ThrowsAiServiceUnavailable()
    {
        var fake = new FakeRefit
        {
            AnalyzeZipThrows = new HttpRequestException("connection refused")
        };
        var client = NewClient(fake);

        using var zip = new MemoryStream(new byte[] { 0x50, 0x4B, 0x03, 0x04 });

        var ex = await Assert.ThrowsAsync<AiServiceUnavailableException>(
            () => client.AnalyzeZipAsync(zip, "t.zip", "c-1"));
        Assert.Contains("unreachable", ex.Message);
    }

    [Fact]
    public async Task AnalyzeZipAsync_OnTimeoutNotCallerCancelled_ThrowsAiServiceUnavailable()
    {
        var fake = new FakeRefit
        {
            AnalyzeZipThrows = new TaskCanceledException("internal timeout")
        };
        var client = NewClient(fake);

        using var zip = new MemoryStream(new byte[] { 0x50, 0x4B, 0x03, 0x04 });

        var ex = await Assert.ThrowsAsync<AiServiceUnavailableException>(
            () => client.AnalyzeZipAsync(zip, "t.zip", "c-1"));
        Assert.Contains("timed out", ex.Message);
    }

    // ─────────────────────────────────────────────────────────────────────
    // S11-T4: AnalyzeZipMultiAsync (new method targeting /api/analyze-zip-multi)
    // ─────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task AnalyzeZipMultiAsync_HappyPath_PassesFileToMultiEndpoint()
    {
        var expected = new AiCombinedResponse(
            SubmissionId: "s-multi-001",
            AnalysisType: "combined",
            OverallScore: 80,
            StaticAnalysis: new AiStaticAnalysis(
                Score: 90, Issues: Array.Empty<AiIssue>(),
                Summary: new AiAnalysisSummary(0, 0, 0, 0),
                ToolsUsed: Array.Empty<string>(),
                PerTool: Array.Empty<AiPerToolResult>()),
            AiReview: new AiReviewResponse(
                OverallScore: 80,
                Scores: new AiReviewScores(82, 90, 88, 75, 78),
                Strengths: new[] { "Clear naming" },
                Weaknesses: new[] { "Missing error handling" },
                Recommendations: Array.Empty<AiRecommendation>(),
                Summary: "Multi-agent review.",
                ModelUsed: "gpt-5.1-codex-mini",
                TokensUsed: 5500,
                PromptVersion: "multi-agent.v1",
                Available: true,
                Error: null),
            Metadata: new AiAnalysisMetadata("demo", new[] { "python" }, 3, 6500, true, true));

        var fake = new FakeRefit { AnalyzeZipMultiReturns = expected };
        var client = NewClient(fake);

        using var zip = new MemoryStream(new byte[] { 0x50, 0x4B, 0x03, 0x04 });
        var result = await client.AnalyzeZipMultiAsync(zip, "test.zip", "corr-multi-1");

        Assert.Same(expected, result);
        Assert.Equal("corr-multi-1", fake.LastCorrelationId);
        Assert.Equal("multi", fake.LastEndpoint);
        Assert.Equal("multi-agent.v1", result.AiReview!.PromptVersion);
    }

    [Fact]
    public async Task AnalyzeZipMultiAsync_On5xx_ThrowsAiServiceUnavailable()
    {
        var fake = new FakeRefit { AnalyzeZipMultiThrows = CreateApiException(HttpStatusCode.BadGateway, "/api/analyze-zip-multi") };
        var client = NewClient(fake);

        using var zip = new MemoryStream(new byte[] { 0x50, 0x4B, 0x03, 0x04 });
        var ex = await Assert.ThrowsAsync<AiServiceUnavailableException>(
            () => client.AnalyzeZipMultiAsync(zip, "t.zip", "c-1"));

        Assert.Contains("/api/analyze-zip-multi", ex.Message);
    }

    [Fact]
    public async Task AnalyzeZipMultiAsync_OnHttpRequestException_ThrowsAiServiceUnavailable()
    {
        var fake = new FakeRefit { AnalyzeZipMultiThrows = new HttpRequestException("connection refused") };
        var client = NewClient(fake);

        using var zip = new MemoryStream(new byte[] { 0x50, 0x4B, 0x03, 0x04 });
        await Assert.ThrowsAsync<AiServiceUnavailableException>(
            () => client.AnalyzeZipMultiAsync(zip, "t.zip", "c-1"));
    }

    [Fact]
    public async Task IsHealthyAsync_Returns_True_OnSuccessStatus()
    {
        var fake = new FakeRefit
        {
            HealthReturns = new HttpResponseMessage(HttpStatusCode.OK)
        };
        var client = NewClient(fake);

        Assert.True(await client.IsHealthyAsync());
    }

    [Fact]
    public async Task IsHealthyAsync_Returns_False_OnException()
    {
        var fake = new FakeRefit { HealthThrows = new HttpRequestException("down") };
        var client = NewClient(fake);

        Assert.False(await client.IsHealthyAsync());
    }

    private static ApiException CreateApiException(HttpStatusCode status, string path)
    {
        var req = new HttpRequestMessage(HttpMethod.Post, path);
        var resp = new HttpResponseMessage(status)
        {
            Content = new StringContent("{}", Encoding.UTF8, "application/json"),
            RequestMessage = req,
        };
        return ApiException.Create(req, HttpMethod.Post, resp, new RefitSettings())
            .GetAwaiter().GetResult();
    }

    private sealed class FakeRefit : IAiServiceRefit
    {
        public AiCombinedResponse? AnalyzeZipReturns { get; set; }
        public Exception? AnalyzeZipThrows { get; set; }
        public AiCombinedResponse? AnalyzeZipMultiReturns { get; set; }
        public Exception? AnalyzeZipMultiThrows { get; set; }
        public HttpResponseMessage? HealthReturns { get; set; }
        public Exception? HealthThrows { get; set; }

        public StreamPart? LastFilePart { get; private set; }
        public string? LastCorrelationId { get; private set; }
        public string? LastEndpoint { get; private set; }

        public Task<AiCombinedResponse> AnalyzeZipAsync(StreamPart file, string correlationId, CancellationToken ct)
        {
            LastFilePart = file;
            LastCorrelationId = correlationId;
            LastEndpoint = "single";
            if (AnalyzeZipThrows is not null) throw AnalyzeZipThrows;
            return Task.FromResult(AnalyzeZipReturns
                ?? throw new InvalidOperationException("AnalyzeZipReturns not configured"));
        }

        public Task<AiCombinedResponse> AnalyzeZipMultiAsync(StreamPart file, string correlationId, CancellationToken ct)
        {
            LastFilePart = file;
            LastCorrelationId = correlationId;
            LastEndpoint = "multi";
            if (AnalyzeZipMultiThrows is not null) throw AnalyzeZipMultiThrows;
            return Task.FromResult(AnalyzeZipMultiReturns
                ?? throw new InvalidOperationException("AnalyzeZipMultiReturns not configured"));
        }

        public Task<HttpResponseMessage> HealthAsync(CancellationToken ct)
        {
            if (HealthThrows is not null) throw HealthThrows;
            return Task.FromResult(HealthReturns ?? new HttpResponseMessage(HttpStatusCode.OK));
        }
    }
}

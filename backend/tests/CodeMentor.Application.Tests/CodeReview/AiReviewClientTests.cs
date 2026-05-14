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
    // B-035: 4xx from the AI service must surface the FastAPI `detail` body
    // as the exception message (instead of "400 Bad Request"). Distinct
    // exception type (`AiServiceBadRequestException`) so the Hangfire job
    // skips auto-retry on payload-shape failures.
    // ─────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task AnalyzeZipAsync_On400WithFastApiDetail_ThrowsBadRequest_WithDetailMessage()
    {
        const string detail = "ZIP has too many analyzable entries: 623 > max 500";
        var fake = new FakeRefit
        {
            AnalyzeZipThrows = CreateApiException(
                HttpStatusCode.BadRequest, "/api/analyze-zip",
                body: $"{{\"detail\":\"{detail}\"}}")
        };
        var client = NewClient(fake);

        using var zip = new MemoryStream(new byte[] { 0x50, 0x4B, 0x03, 0x04 });

        var ex = await Assert.ThrowsAsync<AiServiceBadRequestException>(
            () => client.AnalyzeZipAsync(zip, "t.zip", "c-1"));
        Assert.Equal(400, ex.StatusCode);
        Assert.Equal(detail, ex.Message);
    }

    [Fact]
    public async Task AnalyzeZipAsync_On422PydanticValidationArray_StringifiesDetail()
    {
        // FastAPI's Pydantic validation responses use a list (not a string)
        // under `detail` — we stringify so the FE still gets something useful.
        const string body =
            """{"detail":[{"loc":["body","file"],"msg":"field required","type":"value_error.missing"}]}""";
        var fake = new FakeRefit
        {
            AnalyzeZipThrows = CreateApiException(
                HttpStatusCode.UnprocessableContent, "/api/analyze-zip", body: body)
        };
        var client = NewClient(fake);

        using var zip = new MemoryStream(new byte[] { 0x50, 0x4B, 0x03, 0x04 });

        var ex = await Assert.ThrowsAsync<AiServiceBadRequestException>(
            () => client.AnalyzeZipAsync(zip, "t.zip", "c-1"));
        Assert.Equal(422, ex.StatusCode);
        Assert.Contains("field required", ex.Message);
    }

    [Fact]
    public async Task AnalyzeZipAsync_On400WithEmptyBody_FallsBackToEndpointMessage()
    {
        var fake = new FakeRefit
        {
            AnalyzeZipThrows = CreateApiException(
                HttpStatusCode.BadRequest, "/api/analyze-zip", body: "")
        };
        var client = NewClient(fake);

        using var zip = new MemoryStream(new byte[] { 0x50, 0x4B, 0x03, 0x04 });

        var ex = await Assert.ThrowsAsync<AiServiceBadRequestException>(
            () => client.AnalyzeZipAsync(zip, "t.zip", "c-1"));
        Assert.Equal(400, ex.StatusCode);
        Assert.Contains("/api/analyze-zip", ex.Message);
    }

    [Theory]
    [InlineData(HttpStatusCode.RequestTimeout)]   // 408 — transient, should stay AiServiceUnavailable
    [InlineData(HttpStatusCode.TooManyRequests)]  // 429 — rate-limit, should stay AiServiceUnavailable
    public async Task AnalyzeZipAsync_On408or429_StillThrowsAiServiceUnavailable(HttpStatusCode status)
    {
        // 408 + 429 are 4xx codes but transient by semantic — they belong in
        // the retry-able bucket, not the payload-shape one.
        var fake = new FakeRefit
        {
            AnalyzeZipThrows = CreateApiException(status, "/api/analyze-zip")
        };
        var client = NewClient(fake);

        using var zip = new MemoryStream(new byte[] { 0x50, 0x4B, 0x03, 0x04 });

        await Assert.ThrowsAsync<AiServiceUnavailableException>(
            () => client.AnalyzeZipAsync(zip, "t.zip", "c-1"));
    }

    [Fact]
    public async Task AnalyzeZipMultiAsync_On400_AlsoThrowsBadRequest()
    {
        // B-035 must apply identically to the multi-agent path — both go
        // through the same `InvokeAsync` helper.
        const string detail = "Code too large for multi-agent review";
        var fake = new FakeRefit
        {
            AnalyzeZipMultiThrows = CreateApiException(
                HttpStatusCode.RequestEntityTooLarge, "/api/analyze-zip-multi",
                body: $"{{\"detail\":\"{detail}\"}}")
        };
        var client = NewClient(fake);

        using var zip = new MemoryStream(new byte[] { 0x50, 0x4B, 0x03, 0x04 });

        var ex = await Assert.ThrowsAsync<AiServiceBadRequestException>(
            () => client.AnalyzeZipMultiAsync(zip, "t.zip", "c-1"));
        Assert.Equal(413, ex.StatusCode);
        Assert.Equal(detail, ex.Message);
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

    /// <summary>
    /// SBF-1 / T5: when a TaskBrief is forwarded, the AI client serialises it
    /// into the <c>project_context_json</c> multipart form field with the
    /// brief's title as the project name and the composite
    /// description+acceptance+deliverables as the description.
    /// </summary>
    [Fact]
    public async Task AnalyzeZipAsync_WithTaskBrief_SendsProjectContextJson()
    {
        var fake = new FakeRefit
        {
            AnalyzeZipReturns = new AiCombinedResponse(
                "s", "combined", 80, null, null,
                new AiAnalysisMetadata("p", Array.Empty<string>(), 0, 0, true, false))
        };
        var client = NewClient(fake);

        var brief = new TaskBrief(
            TaskId: Guid.NewGuid(),
            Title: "Implement a linked-list",
            Description: "Build a singly-linked-list with insert / delete / search.",
            AcceptanceCriteria: "- insert / delete / search all O(1) at head\n- 3 unit tests pass",
            Deliverables: "- one .py file with the LinkedList class",
            Track: "Python",
            Category: "DataStructures",
            ExpectedLanguage: "Python",
            Difficulty: 2,
            EstimatedHours: 3);

        using var zip = new MemoryStream(new byte[] { 0x50, 0x4B, 0x03, 0x04 });
        await client.AnalyzeZipAsync(zip, "t.zip", "corr-x", snapshot: null, taskBrief: brief);

        Assert.NotNull(fake.LastProjectContextJson);
        using var doc = JsonDocument.Parse(fake.LastProjectContextJson!);
        Assert.Equal("Implement a linked-list", doc.RootElement.GetProperty("name").GetString());
        var desc = doc.RootElement.GetProperty("description").GetString() ?? "";
        Assert.Contains("singly-linked-list", desc);
        Assert.Contains("## Acceptance Criteria", desc);
        Assert.Contains("## Deliverables", desc);
        Assert.Equal("Python", doc.RootElement.GetProperty("learningTrack").GetString());
        Assert.Equal("Beginner", doc.RootElement.GetProperty("difficulty").GetString());
        var focus = doc.RootElement.GetProperty("focusAreas").EnumerateArray()
            .Select(e => e.GetString()).ToList();
        Assert.Contains("task_fit", focus);
    }

    /// <summary>
    /// SBF-1 / T5: no TaskBrief → no override of the snapshot project_context_json.
    /// </summary>
    [Fact]
    public async Task AnalyzeZipAsync_WithoutTaskBrief_LeavesProjectContextNull()
    {
        var fake = new FakeRefit
        {
            AnalyzeZipReturns = new AiCombinedResponse(
                "s", "combined", 80, null, null,
                new AiAnalysisMetadata("p", Array.Empty<string>(), 0, 0, true, false))
        };
        var client = NewClient(fake);

        using var zip = new MemoryStream(new byte[] { 0x50, 0x4B, 0x03, 0x04 });
        await client.AnalyzeZipAsync(zip, "t.zip", "corr-x");

        Assert.Null(fake.LastProjectContextJson);
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

    private static ApiException CreateApiException(HttpStatusCode status, string path, string body = "{}")
    {
        var req = new HttpRequestMessage(HttpMethod.Post, path);
        var resp = new HttpResponseMessage(status)
        {
            Content = new StringContent(body, Encoding.UTF8, "application/json"),
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

        // S12-T6 / F14 (ADR-040): new optional snapshot form parts. Recorded
        // for assertion in F14 tests; defaulted to null so pre-F14 tests
        // still get parity behaviour.
        public string? LastLearnerProfileJson { get; private set; }
        public string? LastLearnerHistoryJson { get; private set; }
        public string? LastProjectContextJson { get; private set; }

        public Task<AiCombinedResponse> AnalyzeZipAsync(StreamPart file, string correlationId, CancellationToken ct,
            string? learnerProfileJson = null, string? learnerHistoryJson = null, string? projectContextJson = null)
        {
            LastFilePart = file;
            LastCorrelationId = correlationId;
            LastEndpoint = "single";
            LastLearnerProfileJson = learnerProfileJson;
            LastLearnerHistoryJson = learnerHistoryJson;
            LastProjectContextJson = projectContextJson;
            if (AnalyzeZipThrows is not null) throw AnalyzeZipThrows;
            return Task.FromResult(AnalyzeZipReturns
                ?? throw new InvalidOperationException("AnalyzeZipReturns not configured"));
        }

        public Task<AiCombinedResponse> AnalyzeZipMultiAsync(StreamPart file, string correlationId, CancellationToken ct,
            string? learnerProfileJson = null, string? learnerHistoryJson = null, string? projectContextJson = null)
        {
            LastFilePart = file;
            LastCorrelationId = correlationId;
            LastEndpoint = "multi";
            LastLearnerProfileJson = learnerProfileJson;
            LastLearnerHistoryJson = learnerHistoryJson;
            LastProjectContextJson = projectContextJson;
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

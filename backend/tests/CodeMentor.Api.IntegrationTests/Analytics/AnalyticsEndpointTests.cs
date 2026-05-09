using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using CodeMentor.Api.IntegrationTests.TestHost;
using CodeMentor.Application.Analytics.Contracts;
using CodeMentor.Application.Assessments.Contracts;
using CodeMentor.Application.Auth.Contracts;
using CodeMentor.Application.CodeReview;
using CodeMentor.Application.LearningPaths.Contracts;
using CodeMentor.Application.Storage;
using CodeMentor.Application.Submissions.Contracts;
using CodeMentor.Domain.Assessments;
using CodeMentor.Domain.Submissions;
using Microsoft.Extensions.DependencyInjection;

namespace CodeMentor.Api.IntegrationTests.Analytics;

/// <summary>
/// S8-T1 acceptance:
///   - GET /api/analytics/me requires auth (401 without).
///   - Empty state: 12 zero-buckets + empty knowledge snapshot.
///   - After assessment: knowledge snapshot populated, trend still empty.
///   - After submission with AI scores: current week's trend bucket carries
///     the per-category averages and SampleCount=1; weeklySubmissions
///     stack reflects status counts; off-window submissions don't bleed.
/// </summary>
public class AnalyticsEndpointTests : IClassFixture<CodeMentorWebApplicationFactory>
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    private readonly CodeMentorWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public AnalyticsEndpointTests(CodeMentorWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task GetMine_WithoutAuth_Returns401()
    {
        var res = await _client.GetAsync("/api/analytics/me");
        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    [Fact]
    public async Task GetMine_FreshUser_Returns_TwelveZeroBuckets_AndEmptySnapshot()
    {
        Bearer(await RegisterAsync("fresh-analytics@test.local"));

        var dto = await _client.GetFromJsonAsync<AnalyticsDto>("/api/analytics/me", Json);
        Assert.NotNull(dto);
        Assert.Equal(12, dto!.WeeklyTrend.Count);
        Assert.Equal(12, dto.WeeklySubmissions.Count);
        Assert.All(dto.WeeklyTrend, w => Assert.Equal(0, w.SampleCount));
        Assert.All(dto.WeeklyTrend, w => Assert.Null(w.Correctness));
        Assert.All(dto.WeeklySubmissions, w => Assert.Equal(0, w.Total));
        Assert.Empty(dto.KnowledgeSnapshot);
        // Buckets are 7 days apart.
        for (int i = 1; i < dto.WeeklyTrend.Count; i++)
            Assert.Equal(7, (dto.WeeklyTrend[i].WeekStart - dto.WeeklyTrend[i - 1].WeekStart).TotalDays);
        Assert.Equal(12 * 7, (dto.WindowEnd - dto.WindowStart).TotalDays);
    }

    [Fact]
    public async Task GetMine_AfterAssessment_Populates_KnowledgeSnapshot()
    {
        Bearer(await RegisterAsync("assess-analytics@test.local"));
        await CompleteAssessmentAndGetPathAsync(Track.Backend);

        var dto = await _client.GetFromJsonAsync<AnalyticsDto>("/api/analytics/me", Json);
        Assert.NotNull(dto);
        Assert.NotEmpty(dto!.KnowledgeSnapshot);
        // No submissions yet → trend stays empty per-bucket.
        Assert.All(dto.WeeklyTrend, w => Assert.Equal(0, w.SampleCount));
    }

    [Fact]
    public async Task GetMine_AfterSubmissionWithAi_Populates_CurrentWeek_Trend_AndCounts()
    {
        var ai = (FakeAiReviewClient)_factory.Services.GetRequiredService<IAiReviewClient>();
        ai.Response = BuildAiResponseWithScores(
            correctness: 70, readability: 80, security: 90, performance: 60, design: 75);

        Bearer(await RegisterAsync("trend-analytics@test.local"));
        var path = await CompleteAssessmentAndGetPathAsync(Track.Python);

        var blobPath = $"tests/{Guid.NewGuid():N}/a.zip";
        var blob = (FakeBlobStorage)_factory.Services.GetRequiredService<IBlobStorage>();
        blob.SeedBlob(BlobContainers.Submissions, blobPath, new byte[] { 0x50, 0x4b, 0x03, 0x04 });

        var pt = path.Tasks[0];
        var submitRes = await _client.PostAsJsonAsync("/api/submissions",
            new CreateSubmissionRequest(pt.Task.TaskId, SubmissionType.Upload, null, blobPath));
        submitRes.EnsureSuccessStatusCode();

        var dto = await _client.GetFromJsonAsync<AnalyticsDto>("/api/analytics/me", Json);
        Assert.NotNull(dto);

        // The current week (last bucket) holds the just-created submission.
        var currentWeek = dto!.WeeklyTrend[^1];
        Assert.Equal(1, currentWeek.SampleCount);
        Assert.Equal(70m, currentWeek.Correctness);
        Assert.Equal(80m, currentWeek.Readability);
        Assert.Equal(90m, currentWeek.Security);
        Assert.Equal(60m, currentWeek.Performance);
        Assert.Equal(75m, currentWeek.Design);

        var currentSubs = dto.WeeklySubmissions[^1];
        Assert.Equal(1, currentSubs.Total);
        Assert.Equal(1, currentSubs.Completed);
        Assert.Equal(0, currentSubs.Failed);

        // Earlier buckets stay empty (off-window or no submissions).
        for (int i = 0; i < dto.WeeklyTrend.Count - 1; i++)
        {
            Assert.Equal(0, dto.WeeklyTrend[i].SampleCount);
            Assert.Equal(0, dto.WeeklySubmissions[i].Total);
        }
    }

    private void Bearer(string token) =>
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

    private async Task<string> RegisterAsync(string email)
    {
        var req = new RegisterRequest(email, "Strong_Pass_123!", "Analytics Tester", null);
        var res = await _client.PostAsJsonAsync("/api/auth/register", req);
        res.EnsureSuccessStatusCode();
        return (await res.Content.ReadFromJsonAsync<AuthResponse>(Json))!.AccessToken;
    }

    private async Task<LearningPathDto> CompleteAssessmentAndGetPathAsync(Track track)
    {
        var start = await _client.PostAsJsonAsync("/api/assessments", new StartAssessmentRequest(track));
        var sb = await start.Content.ReadFromJsonAsync<StartAssessmentResponse>(Json);
        var cur = sb!.FirstQuestion;
        for (int i = 0; i < 30; i++)
        {
            var res = await _client.PostAsJsonAsync($"/api/assessments/{sb.AssessmentId}/answers",
                new AnswerRequest(cur.QuestionId, "A", 2));
            var body = await res.Content.ReadFromJsonAsync<AnswerResult>(Json);
            if (i < 29) cur = body!.NextQuestion!;
        }
        return (await _client.GetFromJsonAsync<LearningPathDto>("/api/learning-paths/me/active", Json))!;
    }

    private static AiCombinedResponse BuildAiResponseWithScores(
        int correctness, int readability, int security, int performance, int design)
    {
        var overall = (correctness + readability + security + performance + design) / 5;
        var aiReview = new AiReviewResponse(
            OverallScore: overall,
            Scores: new AiReviewScores(correctness, readability, security, performance, design),
            Strengths: new[] { "ok" },
            Weaknesses: new[] { "ok" },
            Recommendations: Array.Empty<AiRecommendation>(),
            Summary: "ok",
            ModelUsed: "gpt-5.1-codex-mini",
            TokensUsed: 100,
            PromptVersion: "v1.0.0",
            Available: true,
            Error: null);

        return new AiCombinedResponse(
            SubmissionId: "x",
            AnalysisType: "combined",
            OverallScore: overall,
            StaticAnalysis: new AiStaticAnalysis(
                Score: 80,
                Issues: Array.Empty<AiIssue>(),
                Summary: new AiAnalysisSummary(0, 0, 0, 0),
                ToolsUsed: Array.Empty<string>(),
                PerTool: Array.Empty<AiPerToolResult>()),
            AiReview: aiReview,
            Metadata: new AiAnalysisMetadata("test", new[] { "python" }, 1, 100, true, true));
    }
}

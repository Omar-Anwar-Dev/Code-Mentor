using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using CodeMentor.Api.IntegrationTests.TestHost;
using CodeMentor.Application.Assessments.Contracts;
using CodeMentor.Application.Auth.Contracts;
using CodeMentor.Application.CodeReview;
using CodeMentor.Application.Dashboard.Contracts;
using CodeMentor.Application.LearningPaths.Contracts;
using CodeMentor.Application.Storage;
using CodeMentor.Application.Submissions.Contracts;
using CodeMentor.Domain.Assessments;
using CodeMentor.Domain.Submissions;
using Microsoft.Extensions.DependencyInjection;

namespace CodeMentor.Api.IntegrationTests.Dashboard;

/// <summary>
/// S3-T12 acceptance: aggregate returns { activePath, recentSubmissions, skillSnapshot }.
/// recentSubmissions is empty until Sprint 4.
/// </summary>
public class DashboardEndpointTests : IClassFixture<CodeMentorWebApplicationFactory>
{
    private readonly CodeMentorWebApplicationFactory _factory;
    private readonly HttpClient _client;
    public DashboardEndpointTests(CodeMentorWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    private async Task<string> RegisterAndGetAccessTokenAsync(string email)
    {
        var req = new RegisterRequest(email, "Strong_Pass_123!", "Dashboard", null);
        var res = await _client.PostAsJsonAsync("/api/auth/register", req);
        res.EnsureSuccessStatusCode();
        return (await res.Content.ReadFromJsonAsync<AuthResponse>())!.AccessToken;
    }

    private void Bearer(string token) =>
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

    [Fact]
    public async Task GetMine_WithoutAuth_Returns401()
    {
        var res = await _client.GetAsync("/api/dashboard/me");
        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    [Fact]
    public async Task GetMine_BeforeAssessment_Returns_NullActivePath_EmptyLists()
    {
        Bearer(await RegisterAndGetAccessTokenAsync("freshuser@test.local"));

        var res = await _client.GetFromJsonAsync<DashboardDto>("/api/dashboard/me");
        Assert.NotNull(res);
        Assert.Null(res!.ActivePath);
        Assert.Empty(res.RecentSubmissions);
        Assert.Empty(res.SkillSnapshot);
    }

    [Fact]
    public async Task GetMine_AfterAssessment_Populates_ActivePath_AndSkillSnapshot()
    {
        Bearer(await RegisterAndGetAccessTokenAsync("dashuser@test.local"));

        var start = await _client.PostAsJsonAsync("/api/assessments", new StartAssessmentRequest(Track.Backend));
        var startBody = await start.Content.ReadFromJsonAsync<StartAssessmentResponse>();
        var id = startBody!.AssessmentId;
        var cur = startBody.FirstQuestion;
        for (int i = 0; i < 30; i++)
        {
            var res = await _client.PostAsJsonAsync($"/api/assessments/{id}/answers",
                new AnswerRequest(cur.QuestionId, "A", 2));
            var body = await res.Content.ReadFromJsonAsync<AnswerResult>();
            if (i < 29) cur = body!.NextQuestion!;
        }

        var dash = await _client.GetFromJsonAsync<DashboardDto>("/api/dashboard/me");
        Assert.NotNull(dash);
        Assert.NotNull(dash!.ActivePath);
        Assert.Equal("Backend", dash.ActivePath!.Track);
        Assert.InRange(dash.ActivePath.Tasks.Count, 5, 7);
        Assert.NotEmpty(dash.SkillSnapshot);
        Assert.Empty(dash.RecentSubmissions); // no submissions yet for this user
    }

    [Fact]
    public async Task GetMine_AfterSubmissions_Populates_RecentSubmissions_NewestFirst()
    {
        var json = new JsonSerializerOptions(JsonSerializerDefaults.Web) { Converters = { new JsonStringEnumConverter() } };

        // FakeAiReviewClient is a singleton in the test factory; reset to the
        // default no-AI-row response so this test is robust against execution
        // order with siblings that mutate `Response` (e.g. the B-001 regression
        // test, which sets a populated AI review).
        var ai = (FakeAiReviewClient)_factory.Services.GetRequiredService<IAiReviewClient>();
        ai.Response = FakeAiReviewClient.EmptyResponse();

        Bearer(await RegisterAndGetAccessTokenAsync("dash-recent@test.local"));

        // Complete assessment → path generated.
        var start = await _client.PostAsJsonAsync("/api/assessments", new StartAssessmentRequest(Track.FullStack));
        var sb = await start.Content.ReadFromJsonAsync<StartAssessmentResponse>();
        var cur = sb!.FirstQuestion;
        for (int i = 0; i < 30; i++)
        {
            var r = await _client.PostAsJsonAsync($"/api/assessments/{sb.AssessmentId}/answers",
                new AnswerRequest(cur.QuestionId, "A", 2));
            var body = await r.Content.ReadFromJsonAsync<AnswerResult>();
            if (i < 29) cur = body!.NextQuestion!;
        }
        var path = (await _client.GetFromJsonAsync<LearningPathDto>("/api/learning-paths/me/active"))!;

        // Create 3 submissions across different tasks.
        var submissionIds = new List<Guid>();
        foreach (var pt in path.Tasks.Take(3))
        {
            var res = await _client.PostAsJsonAsync("/api/submissions",
                new CreateSubmissionRequest(pt.Task.TaskId, SubmissionType.GitHub, "https://github.com/a/b", null));
            res.EnsureSuccessStatusCode();
            var body = await res.Content.ReadFromJsonAsync<SubmissionCreatedResponse>(json);
            submissionIds.Add(body!.SubmissionId);
            await Task.Delay(15);  // keep CreatedAt ordering deterministic
        }

        var dash = await _client.GetFromJsonAsync<DashboardDto>("/api/dashboard/me");
        Assert.NotNull(dash);
        Assert.Equal(3, dash!.RecentSubmissions.Count);
        // Newest first.
        Assert.Equal(submissionIds[^1], dash.RecentSubmissions[0].SubmissionId);
        Assert.Equal(submissionIds[0], dash.RecentSubmissions[^1].SubmissionId);
        Assert.All(dash.RecentSubmissions, rs =>
        {
            Assert.False(string.IsNullOrEmpty(rs.TaskTitle));
            // Inline pipeline runs synchronously → Completed. The fake AI client's
            // default response has AiReview=null (no row), so OverallScore is null.
            // Tests that need a real AI score override FakeAiReviewClient.Response
            // (see the AiSurfacesOverallScore test below).
            Assert.Equal("Completed", rs.Status);
            Assert.Null(rs.OverallScore);
        });
    }

    [Fact]
    public async Task GetMine_AfterAiAvailableSubmission_Surfaces_OverallScore()
    {
        // S8-T9 / B-001: when an AIAnalysisResult row exists for the submission,
        // the dashboard's RecentSubmissionDto.OverallScore should NOT be null.
        var ai = (FakeAiReviewClient)_factory.Services.GetRequiredService<IAiReviewClient>();
        ai.Response = new AiCombinedResponse(
            SubmissionId: "x", AnalysisType: "combined", OverallScore: 84,
            StaticAnalysis: new AiStaticAnalysis(80,
                Array.Empty<AiIssue>(),
                new AiAnalysisSummary(0, 0, 0, 0),
                Array.Empty<string>(),
                Array.Empty<AiPerToolResult>()),
            AiReview: new AiReviewResponse(
                OverallScore: 84,
                Scores: new AiReviewScores(80, 85, 80, 85, 90),
                Strengths: new[] { "ok" },
                Weaknesses: new[] { "todo" },
                Recommendations: Array.Empty<AiRecommendation>(),
                Summary: "ok",
                ModelUsed: "gpt-5.1-codex-mini",
                TokensUsed: 100,
                PromptVersion: "v1.0.0",
                Available: true,
                Error: null),
            Metadata: new AiAnalysisMetadata("test", new[] { "python" }, 1, 100, true, true));

        Bearer(await RegisterAndGetAccessTokenAsync("dash-ai-score@test.local"));

        var start = await _client.PostAsJsonAsync("/api/assessments", new StartAssessmentRequest(Track.Python));
        var sb = await start.Content.ReadFromJsonAsync<StartAssessmentResponse>();
        var cur = sb!.FirstQuestion;
        for (int i = 0; i < 30; i++)
        {
            var r = await _client.PostAsJsonAsync($"/api/assessments/{sb.AssessmentId}/answers",
                new AnswerRequest(cur.QuestionId, "A", 2));
            var body = await r.Content.ReadFromJsonAsync<AnswerResult>();
            if (i < 29) cur = body!.NextQuestion!;
        }
        var path = (await _client.GetFromJsonAsync<LearningPathDto>("/api/learning-paths/me/active"))!;

        var blobPath = $"tests/{Guid.NewGuid():N}/dash-ai.zip";
        var blob = (FakeBlobStorage)_factory.Services.GetRequiredService<IBlobStorage>();
        blob.SeedBlob(BlobContainers.Submissions, blobPath, new byte[] { 0x50, 0x4b, 0x03, 0x04 });

        await _client.PostAsJsonAsync("/api/submissions",
            new CreateSubmissionRequest(path.Tasks[0].Task.TaskId, SubmissionType.Upload, null, blobPath));

        var dash = await _client.GetFromJsonAsync<DashboardDto>("/api/dashboard/me");
        Assert.NotNull(dash);
        Assert.Single(dash!.RecentSubmissions);
        Assert.Equal(84m, dash.RecentSubmissions[0].OverallScore);
    }
}

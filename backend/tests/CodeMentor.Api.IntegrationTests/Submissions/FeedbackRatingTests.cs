using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using CodeMentor.Api.IntegrationTests.TestHost;
using CodeMentor.Application.Assessments.Contracts;
using CodeMentor.Application.Auth.Contracts;
using CodeMentor.Application.CodeReview;
using CodeMentor.Application.CodeReview.Contracts;
using CodeMentor.Application.LearningPaths.Contracts;
using CodeMentor.Application.Storage;
using CodeMentor.Application.Submissions.Contracts;
using CodeMentor.Domain.Assessments;
using CodeMentor.Domain.Submissions;
using Microsoft.Extensions.DependencyInjection;

namespace CodeMentor.Api.IntegrationTests.Submissions;

/// <summary>
/// S8-T7 / SF4 acceptance:
///  - 401 unauth.
///  - 400 invalid category / vote.
///  - 404 cross-user submission.
///  - 204 happy path; GET returns the row.
///  - Duplicate POST overwrites (not append).
/// </summary>
public class FeedbackRatingTests : IClassFixture<CodeMentorWebApplicationFactory>
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    private readonly CodeMentorWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public FeedbackRatingTests(CodeMentorWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task WithoutAuth_Returns401()
    {
        var res = await _client.PostAsJsonAsync(
            $"/api/submissions/{Guid.NewGuid()}/rating",
            new RateFeedbackRequest("correctness", "up"));
        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    [Fact]
    public async Task UnknownSubmission_Returns404()
    {
        Bearer(await RegisterAsync("rate-unknown@test.local"));
        var res = await _client.PostAsJsonAsync(
            $"/api/submissions/{Guid.NewGuid()}/rating",
            new RateFeedbackRequest("correctness", "up"));
        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
    }

    [Theory]
    [InlineData("nonsense", "up")]
    [InlineData("correctness", "maybe")]
    [InlineData("", "up")]
    [InlineData("correctness", "")]
    public async Task InvalidPayload_Returns400(string category, string vote)
    {
        Bearer(await RegisterAsync($"rate-bad-{Guid.NewGuid():N}@test.local"));
        var subId = await CreateCompletedSubmissionAsync();

        var res = await _client.PostAsJsonAsync(
            $"/api/submissions/{subId}/rating",
            new RateFeedbackRequest(category, vote));
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }

    [Fact]
    public async Task HappyPath_Returns204_AndPersists()
    {
        Bearer(await RegisterAsync("rate-happy@test.local"));
        var subId = await CreateCompletedSubmissionAsync();

        var res = await _client.PostAsJsonAsync(
            $"/api/submissions/{subId}/rating",
            new RateFeedbackRequest("correctness", "up"));
        Assert.Equal(HttpStatusCode.NoContent, res.StatusCode);

        var list = await _client.GetFromJsonAsync<List<FeedbackRatingDto>>(
            $"/api/submissions/{subId}/rating", Json);
        Assert.NotNull(list);
        Assert.Single(list!);
        Assert.Equal("Correctness", list![0].Category);
        Assert.Equal("Up", list[0].Vote);
    }

    [Fact]
    public async Task DuplicatePost_Overwrites_NotAppends()
    {
        Bearer(await RegisterAsync("rate-overwrite@test.local"));
        var subId = await CreateCompletedSubmissionAsync();

        await _client.PostAsJsonAsync($"/api/submissions/{subId}/rating",
            new RateFeedbackRequest("correctness", "up"));
        await _client.PostAsJsonAsync($"/api/submissions/{subId}/rating",
            new RateFeedbackRequest("correctness", "down"));

        var list = await _client.GetFromJsonAsync<List<FeedbackRatingDto>>(
            $"/api/submissions/{subId}/rating", Json);
        Assert.Single(list!);
        Assert.Equal("Down", list![0].Vote);
    }

    [Fact]
    public async Task TwoCategories_TwoRows()
    {
        Bearer(await RegisterAsync("rate-multi@test.local"));
        var subId = await CreateCompletedSubmissionAsync();

        await _client.PostAsJsonAsync($"/api/submissions/{subId}/rating",
            new RateFeedbackRequest("correctness", "up"));
        await _client.PostAsJsonAsync($"/api/submissions/{subId}/rating",
            new RateFeedbackRequest("readability", "down"));

        var list = await _client.GetFromJsonAsync<List<FeedbackRatingDto>>(
            $"/api/submissions/{subId}/rating", Json);
        Assert.Equal(2, list!.Count);
    }

    [Fact]
    public async Task CrossUserSubmission_Returns404()
    {
        Bearer(await RegisterAsync("rate-A@test.local"));
        var subId = await CreateCompletedSubmissionAsync();

        Bearer(await RegisterAsync("rate-B@test.local"));
        var res = await _client.PostAsJsonAsync(
            $"/api/submissions/{subId}/rating",
            new RateFeedbackRequest("correctness", "up"));
        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
    }

    private void Bearer(string token) =>
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

    private async Task<string> RegisterAsync(string email)
    {
        var req = new RegisterRequest(email, "Strong_Pass_123!", "Rating Tester", null);
        var res = await _client.PostAsJsonAsync("/api/auth/register", req);
        res.EnsureSuccessStatusCode();
        return (await res.Content.ReadFromJsonAsync<AuthResponse>(Json))!.AccessToken;
    }

    /// <summary>Drives the full submission flow so a Completed Submission row owned
    /// by the current bearer exists. Returns the submission id.</summary>
    private async Task<Guid> CreateCompletedSubmissionAsync()
    {
        var ai = (FakeAiReviewClient)_factory.Services.GetRequiredService<IAiReviewClient>();
        ai.Response = BuildAiResponse();

        var path = await CompleteAssessmentAndGetPathAsync(Track.Python);

        var blobPath = $"tests/{Guid.NewGuid():N}/r.zip";
        var blob = (FakeBlobStorage)_factory.Services.GetRequiredService<IBlobStorage>();
        blob.SeedBlob(BlobContainers.Submissions, blobPath, new byte[] { 0x50, 0x4b, 0x03, 0x04 });

        var pt = path.Tasks[0];
        var subRes = await _client.PostAsJsonAsync("/api/submissions",
            new CreateSubmissionRequest(pt.Task.TaskId, SubmissionType.Upload, null, blobPath));
        subRes.EnsureSuccessStatusCode();
        var body = await subRes.Content.ReadFromJsonAsync<SubmissionCreatedResponse>(Json);
        return body!.SubmissionId;
    }

    private async Task<LearningPathDto> CompleteAssessmentAndGetPathAsync(Track track)
    {
        var start = await _client.PostAsJsonAsync("/api/assessments", new StartAssessmentRequest(track));
        var sb = await start.Content.ReadFromJsonAsync<StartAssessmentResponse>(Json);
        var cur = sb!.FirstQuestion;
        for (int i = 0; i < 30; i++)
        {
            var res = await _client.PostAsJsonAsync(
                $"/api/assessments/{sb.AssessmentId}/answers",
                new AnswerRequest(cur.QuestionId, "A", 2));
            var body = await res.Content.ReadFromJsonAsync<AnswerResult>(Json);
            if (i < 29) cur = body!.NextQuestion!;
        }
        return (await _client.GetFromJsonAsync<LearningPathDto>("/api/learning-paths/me/active", Json))!;
    }

    private static AiCombinedResponse BuildAiResponse()
    {
        var aiReview = new AiReviewResponse(
            OverallScore: 80,
            Scores: new AiReviewScores(80, 80, 80, 80, 80),
            Strengths: new[] { "ok" },
            Weaknesses: new[] { "todo" },
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
            OverallScore: 80,
            StaticAnalysis: new AiStaticAnalysis(80,
                Array.Empty<AiIssue>(),
                new AiAnalysisSummary(0, 0, 0, 0),
                Array.Empty<string>(),
                Array.Empty<AiPerToolResult>()),
            AiReview: aiReview,
            Metadata: new AiAnalysisMetadata("test", new[] { "python" }, 1, 100, true, true));
    }
}

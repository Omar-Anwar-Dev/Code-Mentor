using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using CodeMentor.Api.IntegrationTests.TestHost;
using CodeMentor.Application.Assessments.Contracts;
using CodeMentor.Application.Auth.Contracts;
using CodeMentor.Application.CodeReview;
using CodeMentor.Application.LearningPaths.Contracts;
using CodeMentor.Application.Storage;
using CodeMentor.Application.Submissions.Contracts;
using CodeMentor.Domain.Assessments;
using CodeMentor.Domain.Submissions;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace CodeMentor.Api.IntegrationTests.Submissions;

/// <summary>
/// S6-T7 acceptance:
///   - GET /api/submissions/{id}/feedback returns the unified payload (200) for the owner once analysis is Completed.
///   - 401 without auth.
///   - 404 if the submission belongs to a different user.
///   - 404 if the submission is not yet Completed.
///   - 404 if the AI analysis row hasn't been written yet (e.g. Pending/Unavailable).
///   - The payload contains all PRD F6 fields: overallScore, 5 category scores, strengths/weaknesses, inlineAnnotations, recommendations, resources, metadata.
/// </summary>
public class FeedbackEndpointTests : IClassFixture<CodeMentorWebApplicationFactory>
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    private readonly CodeMentorWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public FeedbackEndpointTests(CodeMentorWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task GetFeedback_WithoutAuth_Returns401()
    {
        var res = await _client.GetAsync($"/api/submissions/{Guid.NewGuid()}/feedback");
        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    [Fact]
    public async Task GetFeedback_OtherUsersSubmission_Returns404()
    {
        var (otherSubId, _) = await SeedCompletedSubmissionWithAiAsync("owner@feedback.test", overallScore: 70);

        // Switch to a different bearer token (different user) — should 404.
        Bearer(await RegisterAsync("intruder@feedback.test"));
        var res = await _client.GetAsync($"/api/submissions/{otherSubId}/feedback");
        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
    }

    [Fact]
    public async Task GetFeedback_NotYetCompleted_Returns404()
    {
        Bearer(await RegisterAsync("notdone@feedback.test"));
        var path = await CompleteAssessmentAndGetPathAsync(Track.Python);

        // Seed a Pending submission row directly — no AI run has happened yet.
        Guid subId;
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var token = (await _client.GetFromJsonAsync<AuthMeResponse>("/api/auth/me", Json))!;
            var sub = new Submission
            {
                UserId = token.UserId,
                TaskId = path.Tasks[0].Task.TaskId,
                SubmissionType = SubmissionType.Upload,
                BlobPath = "p/x.zip",
                Status = SubmissionStatus.Pending,
            };
            db.Submissions.Add(sub);
            await db.SaveChangesAsync();
            subId = sub.Id;
        }

        var res = await _client.GetAsync($"/api/submissions/{subId}/feedback");
        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
    }

    [Fact]
    public async Task GetFeedback_HappyPath_ReturnsUnifiedPayload_With_AllPrdF6Fields()
    {
        // Configure FakeAiReviewClient to produce a full enhanced response — the
        // FeedbackAggregator should turn it into the unified payload.
        var ai = (FakeAiReviewClient)_factory.Services.GetRequiredService<IAiReviewClient>();
        ai.Response = BuildEnhancedAiResponse();

        var (subId, _) = await SeedCompletedSubmissionWithAiAsync("happy@feedback.test", overallScore: 78);

        var res = await _client.GetAsync($"/api/submissions/{subId}/feedback");
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        Assert.Equal("application/json", res.Content.Headers.ContentType?.MediaType);

        var json = await res.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        Assert.Equal(78, root.GetProperty("overallScore").GetInt32());
        Assert.Equal(subId, root.GetProperty("submissionId").GetGuid());
        Assert.Equal("Completed", root.GetProperty("status").GetString());

        var scoreNames = root.GetProperty("scores").EnumerateObject().Select(p => p.Name).ToHashSet();
        Assert.Equal(
            new HashSet<string> { "correctness", "readability", "security", "performance", "design" },
            scoreNames);

        Assert.True(root.GetProperty("inlineAnnotations").GetArrayLength() >= 1);
        Assert.True(root.GetProperty("recommendations").GetArrayLength() >= 1);
        Assert.True(root.GetProperty("resources").GetArrayLength() >= 1);
        Assert.Equal("v1.0.0", root.GetProperty("metadata").GetProperty("promptVersion").GetString());
    }

    // ----- helpers --------------------------------------------------------

    private void Bearer(string token) =>
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

    private async Task<string> RegisterAsync(string email)
    {
        var req = new RegisterRequest(email, "Strong_Pass_123!", "Feedback Tester", null);
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

    private async Task<(Guid submissionId, Guid taskId)> SeedCompletedSubmissionWithAiAsync(string email, int overallScore)
    {
        // Set up the FakeAiReviewClient before the submission triggers the inline pipeline.
        var ai = (FakeAiReviewClient)_factory.Services.GetRequiredService<IAiReviewClient>();
        ai.Response ??= BuildEnhancedAiResponse(overallScore);

        Bearer(await RegisterAsync(email));
        var path = await CompleteAssessmentAndGetPathAsync(Track.Python);
        var pathTask = path.Tasks[0];

        var blobPath = $"tests/{Guid.NewGuid():N}/submission.zip";
        var fakeBlob = (FakeBlobStorage)_factory.Services.GetRequiredService<IBlobStorage>();
        fakeBlob.SeedBlob(BlobContainers.Submissions, blobPath, new byte[] { 0x50, 0x4b, 0x03, 0x04 });

        var res = await _client.PostAsJsonAsync("/api/submissions",
            new CreateSubmissionRequest(pathTask.Task.TaskId, SubmissionType.Upload, null, blobPath));
        res.EnsureSuccessStatusCode();
        var body = await res.Content.ReadFromJsonAsync<SubmissionCreatedResponse>(Json);

        return (body!.SubmissionId, pathTask.Task.TaskId);
    }

    private static AiCombinedResponse BuildEnhancedAiResponse(int overallScore = 78)
    {
        var aiReview = new AiReviewResponse(
            OverallScore: overallScore,
            Scores: new AiReviewScores(80, 75, 70, 80, 75),
            Strengths: new[] { "Clean naming", "Good module split" },
            Weaknesses: new[] { "Missing error handling" },
            Recommendations: new[]
            {
                new AiRecommendation("high", "security", "Sanitize user input before persisting.", null),
                new AiRecommendation("medium", "design", "Extract DB code to a repository.", null),
            },
            Summary: "Solid effort with clear room to improve security handling.",
            ModelUsed: "gpt-5.1-codex-mini",
            TokensUsed: 2200,
            PromptVersion: "v1.0.0",
            Available: true,
            Error: null,
            DetailedIssues: new[]
            {
                new AiDetailedIssue(
                    "app/users.py", 12, null,
                    "execute(f\"SELECT ...\")",
                    "security", "high",
                    "SQL injection",
                    "Direct string interpolation into SQL.",
                    "An attacker controlling the input can run arbitrary SQL.",
                    false,
                    "Use parameterized queries.",
                    "cursor.execute('SELECT ... WHERE name = ?', (name,))"),
            },
            LearningResources: new[]
            {
                new AiWeaknessWithResources("SQL injection prevention", new[]
                {
                    new AiLearningResource("OWASP cheat sheet", "https://owasp.org/sqli", "documentation", "Defense overview."),
                }),
            });

        return new AiCombinedResponse(
            SubmissionId: "x",
            AnalysisType: "combined",
            OverallScore: overallScore,
            StaticAnalysis: new AiStaticAnalysis(
                Score: 80,
                Issues: Array.Empty<AiIssue>(),
                Summary: new AiAnalysisSummary(0, 0, 0, 0),
                ToolsUsed: new[] { "bandit" },
                PerTool: new[]
                {
                    new AiPerToolResult("bandit", Array.Empty<AiIssue>(), new AiAnalysisSummary(0, 0, 0, 0), 120),
                }),
            AiReview: aiReview,
            Metadata: new AiAnalysisMetadata("test", new[] { "python" }, 1, 500, true, true));
    }

    public record AuthMeResponse(Guid UserId, string Email);
}

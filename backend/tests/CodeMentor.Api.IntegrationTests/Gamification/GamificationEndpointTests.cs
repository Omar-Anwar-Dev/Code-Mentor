using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using CodeMentor.Api.IntegrationTests.TestHost;
using CodeMentor.Application.Assessments.Contracts;
using CodeMentor.Application.Auth.Contracts;
using CodeMentor.Application.CodeReview;
using CodeMentor.Application.Gamification.Contracts;
using CodeMentor.Application.LearningCV.Contracts;
using CodeMentor.Application.LearningPaths.Contracts;
using CodeMentor.Application.Storage;
using CodeMentor.Application.Submissions.Contracts;
using CodeMentor.Domain.Assessments;
using CodeMentor.Domain.Submissions;
using Microsoft.Extensions.DependencyInjection;

namespace CodeMentor.Api.IntegrationTests.Gamification;

/// <summary>
/// S8-T3 acceptance:
///  - GET /api/gamification/me requires auth.
///  - Fresh user → 0 XP, level 1, no badges.
///  - Completing assessment grants 100 XP (level 2).
///  - High-score submission grants +50 XP and the relevant quality badges.
///  - Publishing the Learning CV grants the FirstLearningCVGenerated badge.
///  - GET /api/gamification/badges returns the catalog (5 starters) with
///    correct IsEarned flags for the current user.
/// </summary>
public class GamificationEndpointTests : IClassFixture<CodeMentorWebApplicationFactory>
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    private readonly CodeMentorWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public GamificationEndpointTests(CodeMentorWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task GetMine_WithoutAuth_Returns401()
    {
        var res = await _client.GetAsync("/api/gamification/me");
        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    [Fact]
    public async Task GetMine_FreshUser_HasZeroXp_Level1_NoBadges()
    {
        Bearer(await RegisterAsync("fresh-gamif@test.local"));

        var p = await _client.GetFromJsonAsync<GamificationProfileDto>("/api/gamification/me", Json);
        Assert.NotNull(p);
        Assert.Equal(0, p!.TotalXp);
        Assert.Equal(1, p.Level);
        Assert.Empty(p.EarnedBadges);
        Assert.Empty(p.RecentTransactions);
    }

    [Fact]
    public async Task GetBadges_FreshUser_ReturnsAllFiveStarter_AllUnearned()
    {
        Bearer(await RegisterAsync("badges-fresh@test.local"));

        var c = await _client.GetFromJsonAsync<BadgeCatalogDto>("/api/gamification/badges", Json);
        Assert.NotNull(c);
        Assert.Equal(5, c!.Badges.Count);
        Assert.All(c.Badges, b => Assert.False(b.IsEarned));
        Assert.All(c.Badges, b => Assert.Null(b.EarnedAt));
    }

    [Fact]
    public async Task CompletingAssessment_Grants100Xp_ReachesLevel2()
    {
        Bearer(await RegisterAsync("xp-assess@test.local"));
        await CompleteAssessmentAndGetPathAsync(Track.Backend);

        var p = await _client.GetFromJsonAsync<GamificationProfileDto>("/api/gamification/me", Json);
        Assert.NotNull(p);
        Assert.Equal(100, p!.TotalXp);
        Assert.Equal(2, p.Level);
        Assert.Single(p.RecentTransactions);
        Assert.Equal("AssessmentCompleted", p.RecentTransactions[0].Reason);
    }

    [Fact]
    public async Task HighScoringSubmission_Grants50Xp_AndQualityBadges()
    {
        var ai = (FakeAiReviewClient)_factory.Services.GetRequiredService<IAiReviewClient>();
        // 95 across the board → triggers HighQualitySubmission (overall ≥80) AND
        // FirstPerfectCategoryScore (any category ≥90).
        ai.Response = BuildAiResponse(95, 95, 95, 95, 95);

        Bearer(await RegisterAsync("xp-sub-quality@test.local"));
        var path = await CompleteAssessmentAndGetPathAsync(Track.Python);

        var blobPath = $"tests/{Guid.NewGuid():N}/g.zip";
        var blob = (FakeBlobStorage)_factory.Services.GetRequiredService<IBlobStorage>();
        blob.SeedBlob(BlobContainers.Submissions, blobPath, new byte[] { 0x50, 0x4b, 0x03, 0x04 });

        var pt = path.Tasks[0];
        var subRes = await _client.PostAsJsonAsync("/api/submissions",
            new CreateSubmissionRequest(pt.Task.TaskId, SubmissionType.Upload, null, blobPath));
        subRes.EnsureSuccessStatusCode();

        var p = await _client.GetFromJsonAsync<GamificationProfileDto>("/api/gamification/me", Json);
        Assert.NotNull(p);
        // 100 (assessment) + 50 (submission) = 150 XP → still Level 2
        Assert.Equal(150, p!.TotalXp);
        Assert.Equal(2, p.Level);

        // 95 ≥ 70 → PathTask auto-completes, granting FirstPathTaskCompleted.
        var earnedKeys = p.EarnedBadges.Select(b => b.Key).ToHashSet();
        Assert.Contains("first-submission", earnedKeys);
        Assert.Contains("high-quality-submission", earnedKeys);
        Assert.Contains("first-perfect-category-score", earnedKeys);
        Assert.Contains("first-path-task-completed", earnedKeys);
    }

    [Fact]
    public async Task LowScoringSubmission_Grants50Xp_NoQualityBadges()
    {
        var ai = (FakeAiReviewClient)_factory.Services.GetRequiredService<IAiReviewClient>();
        // 65 across the board → no quality badge, no path auto-complete (< 70).
        ai.Response = BuildAiResponse(65, 65, 65, 65, 65);

        Bearer(await RegisterAsync("xp-sub-low@test.local"));
        var path = await CompleteAssessmentAndGetPathAsync(Track.Python);

        var blobPath = $"tests/{Guid.NewGuid():N}/lo.zip";
        var blob = (FakeBlobStorage)_factory.Services.GetRequiredService<IBlobStorage>();
        blob.SeedBlob(BlobContainers.Submissions, blobPath, new byte[] { 0x50, 0x4b, 0x03, 0x04 });

        var pt = path.Tasks[0];
        await _client.PostAsJsonAsync("/api/submissions",
            new CreateSubmissionRequest(pt.Task.TaskId, SubmissionType.Upload, null, blobPath));

        var p = await _client.GetFromJsonAsync<GamificationProfileDto>("/api/gamification/me", Json);
        Assert.NotNull(p);
        Assert.Equal(150, p!.TotalXp);
        var earnedKeys = p.EarnedBadges.Select(b => b.Key).ToHashSet();
        // First submission still awarded — completing-an-AI-flow is the trigger.
        Assert.Contains("first-submission", earnedKeys);
        Assert.DoesNotContain("high-quality-submission", earnedKeys);
        Assert.DoesNotContain("first-perfect-category-score", earnedKeys);
        Assert.DoesNotContain("first-path-task-completed", earnedKeys);
    }

    [Fact]
    public async Task PublishingLearningCV_Grants_FirstLearningCVGenerated_Badge()
    {
        Bearer(await RegisterAsync("xp-cv@test.local"));

        var res = await _client.PatchAsJsonAsync("/api/learning-cv/me",
            new UpdateLearningCVRequest(true));
        res.EnsureSuccessStatusCode();

        var p = await _client.GetFromJsonAsync<GamificationProfileDto>("/api/gamification/me", Json);
        Assert.NotNull(p);
        Assert.Contains(p!.EarnedBadges, b => b.Key == "first-learning-cv-generated");

        // Toggling private→public again should NOT re-grant.
        await _client.PatchAsJsonAsync("/api/learning-cv/me", new UpdateLearningCVRequest(false));
        await _client.PatchAsJsonAsync("/api/learning-cv/me", new UpdateLearningCVRequest(true));

        var p2 = await _client.GetFromJsonAsync<GamificationProfileDto>("/api/gamification/me", Json);
        Assert.Single(p2!.EarnedBadges, b => b.Key == "first-learning-cv-generated");
    }

    private void Bearer(string token) =>
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

    private async Task<string> RegisterAsync(string email)
    {
        var req = new RegisterRequest(email, "Strong_Pass_123!", "Gamif Tester", null);
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

    private static AiCombinedResponse BuildAiResponse(
        int correctness, int readability, int security, int performance, int design)
    {
        var overall = (correctness + readability + security + performance + design) / 5;
        var aiReview = new AiReviewResponse(
            OverallScore: overall,
            Scores: new AiReviewScores(correctness, readability, security, performance, design),
            Strengths: new[] { "good" },
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

using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using CodeMentor.Api.IntegrationTests.TestHost;
using CodeMentor.Application.Assessments.Contracts;
using CodeMentor.Application.Auth.Contracts;
using CodeMentor.Application.CodeReview;
using CodeMentor.Application.LearningCV.Contracts;
using CodeMentor.Application.LearningPaths.Contracts;
using CodeMentor.Application.Storage;
using CodeMentor.Application.Submissions.Contracts;
using CodeMentor.Domain.Assessments;
using CodeMentor.Domain.Submissions;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace CodeMentor.Api.IntegrationTests.LearningCV;

/// <summary>
/// S7-T2 acceptance:
///   - GET /api/learning-cv/me requires auth (401 without).
///   - Fresh user (no submissions, no assessment) returns a well-formed empty
///     payload with defaults: empty score lists, 0 verified projects, CV
///     metadata defaults (no slug, IsPublic=false, ViewCount=0).
///   - After completing an assessment, skillProfile.scores is populated and
///     overallLevel reflects the latest completed assessment's level.
///   - After a submission completes with AI=Available, verifiedProjects
///     surfaces the submission with its AI overall score, and
///     codeQualityProfile.scores reflects the per-category averages from S7-T1.
///   - Email is included on /me (it's redacted only on the /public/cv/{slug} view, S7-T4).
/// </summary>
public class LearningCVEndpointTests : IClassFixture<CodeMentorWebApplicationFactory>
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    private readonly CodeMentorWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public LearningCVEndpointTests(CodeMentorWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task GetMine_WithoutAuth_Returns401()
    {
        var res = await _client.GetAsync("/api/learning-cv/me");
        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    [Fact]
    public async Task GetMine_FreshUser_Returns_EmptyPayload_WithDefaults()
    {
        Bearer(await RegisterAsync("fresh-cv@cv.test"));

        var cv = await _client.GetFromJsonAsync<LearningCVDto>("/api/learning-cv/me", Json);
        Assert.NotNull(cv);
        Assert.NotNull(cv!.Profile);
        Assert.Equal("fresh-cv@cv.test", cv.Profile.Email);
        Assert.Empty(cv.SkillProfile.Scores);
        Assert.Null(cv.SkillProfile.OverallLevel);
        Assert.Empty(cv.CodeQualityProfile.Scores);
        Assert.Empty(cv.VerifiedProjects);
        Assert.Equal(0, cv.Stats.SubmissionsTotal);
        Assert.Equal(0, cv.Stats.AssessmentsCompleted);
        Assert.Null(cv.Cv.PublicSlug);
        Assert.False(cv.Cv.IsPublic);
        Assert.Equal(0, cv.Cv.ViewCount);
    }

    [Fact]
    public async Task GetMine_AfterAssessment_Populates_SkillProfile_AndOverallLevel()
    {
        Bearer(await RegisterAsync("assess-cv@cv.test"));
        await CompleteAssessmentAndGetPathAsync(Track.Backend);

        var cv = await _client.GetFromJsonAsync<LearningCVDto>("/api/learning-cv/me", Json);
        Assert.NotNull(cv);
        Assert.NotEmpty(cv!.SkillProfile.Scores);
        // The 30-question flow always lands at one of the 3 PRD-defined levels.
        Assert.Contains(cv.SkillProfile.OverallLevel, new[] { "Beginner", "Intermediate", "Advanced" });
        Assert.Equal(1, cv.Stats.AssessmentsCompleted);
        Assert.Equal(1, cv.Stats.LearningPathsActive);
    }

    [Fact]
    public async Task GetMine_AfterSubmissionWithAi_Surfaces_VerifiedProjects_AndCodeQualityScores()
    {
        // Configure FakeAiReviewClient to produce a successful AI review.
        var ai = (FakeAiReviewClient)_factory.Services.GetRequiredService<IAiReviewClient>();
        ai.Response = BuildAiResponse(overallScore: 88);

        Bearer(await RegisterAsync("project-cv@cv.test"));
        var path = await CompleteAssessmentAndGetPathAsync(Track.Python);

        // Seed a blob and trigger a submission that the InlineSubmissionAnalysisScheduler
        // will run synchronously to Completed state.
        var blobPath = $"tests/{Guid.NewGuid():N}/cv.zip";
        var fakeBlob = (FakeBlobStorage)_factory.Services.GetRequiredService<IBlobStorage>();
        fakeBlob.SeedBlob(BlobContainers.Submissions, blobPath, new byte[] { 0x50, 0x4b, 0x03, 0x04 });

        var pathTask = path.Tasks[0];
        var subRes = await _client.PostAsJsonAsync("/api/submissions",
            new CreateSubmissionRequest(pathTask.Task.TaskId, SubmissionType.Upload, null, blobPath));
        subRes.EnsureSuccessStatusCode();
        var subBody = await subRes.Content.ReadFromJsonAsync<SubmissionCreatedResponse>(Json);

        var cv = await _client.GetFromJsonAsync<LearningCVDto>("/api/learning-cv/me", Json);
        Assert.NotNull(cv);

        // Verified projects: 1 entry (the just-submitted task), score=88.
        Assert.Single(cv!.VerifiedProjects);
        var project = cv.VerifiedProjects[0];
        Assert.Equal(subBody!.SubmissionId, project.SubmissionId);
        Assert.Equal(pathTask.Task.Title, project.TaskTitle);
        Assert.Equal(88, project.OverallScore);
        Assert.Equal($"/submissions/{subBody.SubmissionId}/feedback", project.FeedbackPath);

        // CodeQualityProfile: 5 rows (one per PRD F6 category), SampleCount=1.
        Assert.Equal(5, cv.CodeQualityProfile.Scores.Count);
        Assert.All(cv.CodeQualityProfile.Scores, s => Assert.Equal(1, s.SampleCount));
        Assert.Contains(cv.CodeQualityProfile.Scores, s => s.Category == "Correctness");
        Assert.Contains(cv.CodeQualityProfile.Scores, s => s.Category == "Design");

        Assert.Equal(1, cv.Stats.SubmissionsCompleted);
    }

    [Fact]
    public async Task PatchMe_WithoutAuth_Returns401()
    {
        var res = await _client.PatchAsJsonAsync("/api/learning-cv/me", new UpdateLearningCVRequest(true));
        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    [Fact]
    public async Task PatchMe_FirstPublish_Generates_StableSlug_DerivedFromUsername()
    {
        Bearer(await RegisterAsync("publish-cv@cv.test"));

        var res = await _client.PatchAsJsonAsync("/api/learning-cv/me", new UpdateLearningCVRequest(true));
        res.EnsureSuccessStatusCode();
        var cv = await res.Content.ReadFromJsonAsync<LearningCVDto>(Json);
        Assert.NotNull(cv);
        Assert.True(cv!.Cv.IsPublic);
        Assert.NotNull(cv.Cv.PublicSlug);
        // Default Identity behaviour sets UserName == Email; the slug strips the mail domain.
        Assert.Equal("publish-cv", cv.Cv.PublicSlug);
    }

    [Fact]
    public async Task PatchMe_TogglePrivateAfterPublish_KeepsSlug_Stable()
    {
        Bearer(await RegisterAsync("toggle-cv@cv.test"));

        var first = await (await _client.PatchAsJsonAsync("/api/learning-cv/me",
            new UpdateLearningCVRequest(true)))
            .Content.ReadFromJsonAsync<LearningCVDto>(Json);
        var slug = first!.Cv.PublicSlug;
        Assert.NotNull(slug);

        var off = await (await _client.PatchAsJsonAsync("/api/learning-cv/me",
            new UpdateLearningCVRequest(false)))
            .Content.ReadFromJsonAsync<LearningCVDto>(Json);
        Assert.False(off!.Cv.IsPublic);
        Assert.Equal(slug, off.Cv.PublicSlug);

        var on = await (await _client.PatchAsJsonAsync("/api/learning-cv/me",
            new UpdateLearningCVRequest(true)))
            .Content.ReadFromJsonAsync<LearningCVDto>(Json);
        Assert.True(on!.Cv.IsPublic);
        // Re-publishing must not regenerate the slug.
        Assert.Equal(slug, on.Cv.PublicSlug);
    }

    [Fact]
    public async Task PatchMe_NullIsPublic_NoOp()
    {
        Bearer(await RegisterAsync("noop-cv@cv.test"));

        var first = await _client.GetFromJsonAsync<LearningCVDto>("/api/learning-cv/me", Json);
        var res = await _client.PatchAsJsonAsync("/api/learning-cv/me", new UpdateLearningCVRequest(null));
        res.EnsureSuccessStatusCode();
        var after = await res.Content.ReadFromJsonAsync<LearningCVDto>(Json);
        Assert.False(after!.Cv.IsPublic);
        Assert.Null(after.Cv.PublicSlug);
        Assert.Equal(first!.Cv.IsPublic, after.Cv.IsPublic);
    }

    [Fact]
    public async Task GetPublic_UnknownSlug_Returns404()
    {
        var res = await _client.GetAsync("/api/public/cv/no-such-slug");
        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
    }

    [Fact]
    public async Task GetPublic_PrivateCv_Returns404()
    {
        Bearer(await RegisterAsync("private-cv@cv.test"));

        // Force-create the metadata row + slug, then immediately flip to private
        // so the slug is known but the CV must read as 404.
        var pubRes = await (await _client.PatchAsJsonAsync("/api/learning-cv/me",
            new UpdateLearningCVRequest(true)))
            .Content.ReadFromJsonAsync<LearningCVDto>(Json);
        var slug = pubRes!.Cv.PublicSlug!;

        await _client.PatchAsJsonAsync("/api/learning-cv/me", new UpdateLearningCVRequest(false));

        var anon = _factory.CreateClient();
        var res = await anon.GetAsync($"/api/public/cv/{slug}");
        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
    }

    [Fact]
    public async Task GetPublic_PublicCv_Returns200_WithEmailRedacted()
    {
        Bearer(await RegisterAsync("redact-cv@cv.test"));
        var published = await (await _client.PatchAsJsonAsync("/api/learning-cv/me",
            new UpdateLearningCVRequest(true)))
            .Content.ReadFromJsonAsync<LearningCVDto>(Json);
        var slug = published!.Cv.PublicSlug!;

        var anon = _factory.CreateClient();
        var res = await anon.GetAsync($"/api/public/cv/{slug}");
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);

        var cv = await res.Content.ReadFromJsonAsync<LearningCVDto>(Json);
        Assert.NotNull(cv);
        Assert.Null(cv!.Profile.Email);
        Assert.Equal(slug, cv.Cv.PublicSlug);
        Assert.True(cv.Cv.IsPublic);
    }

    [Fact]
    public async Task GetPublic_RepeatedReads_ReturnConsistent200()
    {
        // The IP-deduped counter behaviour itself is exercised exhaustively at
        // the service layer (LearningCVViewCounterTests) where we can synthesise
        // multiple IPs cleanly. The integration test only proves that public
        // reads succeed repeatedly without 5xx-ing the server.
        Bearer(await RegisterAsync("counter-cv@cv.test"));
        var published = await (await _client.PatchAsJsonAsync("/api/learning-cv/me",
            new UpdateLearningCVRequest(true)))
            .Content.ReadFromJsonAsync<LearningCVDto>(Json);
        var slug = published!.Cv.PublicSlug!;

        var anon = _factory.CreateClient();
        var first = await anon.GetAsync($"/api/public/cv/{slug}");
        var second = await anon.GetAsync($"/api/public/cv/{slug}");
        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        Assert.Equal(HttpStatusCode.OK, second.StatusCode);
    }

    [Fact]
    public async Task GetPdf_WithoutAuth_Returns401()
    {
        var res = await _client.GetAsync("/api/learning-cv/me/pdf");
        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    [Fact]
    public async Task GetPdf_Authenticated_ReturnsApplicationPdf()
    {
        Bearer(await RegisterAsync("pdf-cv@cv.test"));

        var res = await _client.GetAsync("/api/learning-cv/me/pdf");
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        Assert.Equal("application/pdf", res.Content.Headers.ContentType?.MediaType);
        var disp = res.Content.Headers.ContentDisposition;
        Assert.NotNull(disp);
        Assert.NotNull(disp!.FileNameStar ?? disp.FileName);
        var bytes = await res.Content.ReadAsByteArrayAsync();
        Assert.True(bytes.Length > 500);
        Assert.Equal("%PDF-", System.Text.Encoding.ASCII.GetString(bytes, 0, 5));
    }

    [Fact]
    public async Task PatchMe_DifferentUsersWithCollidingSlug_GetUniqueSuffix()
    {
        // Both users register with the same local-part. The first claims the
        // bare slug; the second falls back to a suffixed one.
        Bearer(await RegisterAsync("clash@one.test"));
        var a = await (await _client.PatchAsJsonAsync("/api/learning-cv/me",
            new UpdateLearningCVRequest(true)))
            .Content.ReadFromJsonAsync<LearningCVDto>(Json);
        Assert.Equal("clash", a!.Cv.PublicSlug);

        Bearer(await RegisterAsync("clash@two.test"));
        var b = await (await _client.PatchAsJsonAsync("/api/learning-cv/me",
            new UpdateLearningCVRequest(true)))
            .Content.ReadFromJsonAsync<LearningCVDto>(Json);
        Assert.NotEqual("clash", b!.Cv.PublicSlug);
        Assert.StartsWith("clash-", b.Cv.PublicSlug);
    }

    [Fact]
    public async Task GetMine_TopFiveOnly_Sorted_HighestScoreFirst()
    {
        // Direct DB seed for determinism — drives the top-5 sort independent of
        // the AI/job pipeline. Demonstrates ORDER BY OverallScore DESC, CompletedAt DESC.
        Bearer(await RegisterAsync("top5-cv@cv.test"));
        var me = await _client.GetFromJsonAsync<UserDto>("/api/auth/me", Json);
        var userId = me!.Id;

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var anyTask = await db.Tasks.AsNoTracking().FirstAsync();

            // 7 completed submissions with AI rows, scores 50..95 in 5-pt steps.
            var now = DateTime.UtcNow;
            var scores = new[] { 50, 60, 70, 80, 85, 90, 95 };
            for (int i = 0; i < scores.Length; i++)
            {
                var sub = new Submission
                {
                    UserId = userId,
                    TaskId = anyTask.Id,
                    SubmissionType = SubmissionType.Upload,
                    BlobPath = $"x/{i}.zip",
                    Status = SubmissionStatus.Completed,
                    AiAnalysisStatus = AiAnalysisStatus.Available,
                    CompletedAt = now.AddMinutes(-i),
                };
                db.Submissions.Add(sub);
                db.AIAnalysisResults.Add(new AIAnalysisResult
                {
                    SubmissionId = sub.Id,
                    OverallScore = scores[i],
                    FeedbackJson = "{}",
                    StrengthsJson = "[]",
                    WeaknessesJson = "[]",
                    ModelUsed = "test",
                    PromptVersion = "v1.0.0",
                });
            }
            await db.SaveChangesAsync();
        }

        var cv = await _client.GetFromJsonAsync<LearningCVDto>("/api/learning-cv/me", Json);
        Assert.NotNull(cv);
        // Cap at 5; sorted high → low.
        Assert.Equal(5, cv!.VerifiedProjects.Count);
        Assert.Equal(95, cv.VerifiedProjects[0].OverallScore);
        Assert.Equal(70, cv.VerifiedProjects[^1].OverallScore);
    }

    // ----- helpers --------------------------------------------------------

    private void Bearer(string token) =>
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

    private async Task<string> RegisterAsync(string email)
    {
        var req = new RegisterRequest(email, "Strong_Pass_123!", "CV Tester", null);
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

    private static AiCombinedResponse BuildAiResponse(int overallScore = 80)
    {
        var aiReview = new AiReviewResponse(
            OverallScore: overallScore,
            Scores: new AiReviewScores(overallScore, overallScore, overallScore, overallScore, overallScore),
            Strengths: new[] { "Clean code" },
            Weaknesses: new[] { "Missing tests" },
            Recommendations: Array.Empty<AiRecommendation>(),
            Summary: "ok",
            ModelUsed: "gpt-5.1-codex-mini",
            TokensUsed: 1500,
            PromptVersion: "v1.0.0",
            Available: true,
            Error: null);

        return new AiCombinedResponse(
            SubmissionId: "x",
            AnalysisType: "combined",
            OverallScore: overallScore,
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

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
/// S5-T3 sprint-level integration check: POST /submissions → inline job runs
/// end-to-end → StaticAnalysisResult rows persisted with per-tool blocks from
/// the AI response.
/// </summary>
public class SubmissionAnalysisPipelineTests : IClassFixture<CodeMentorWebApplicationFactory>
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    private readonly CodeMentorWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public SubmissionAnalysisPipelineTests(CodeMentorWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task UploadSubmission_RunsPipeline_And_WritesPerToolRows()
    {
        // Arrange — configure the FakeAiReviewClient to return bandit results.
        var ai = (FakeAiReviewClient)_factory.Services.GetRequiredService<IAiReviewClient>();
        ai.Response = new AiCombinedResponse(
            SubmissionId: "test",
            AnalysisType: "combined",
            OverallScore: 75,
            StaticAnalysis: new AiStaticAnalysis(
                Score: 80,
                Issues: new[]
                {
                    new AiIssue("warning", "security", "use of assert", "a.py", 3, null, "B101", null),
                },
                Summary: new AiAnalysisSummary(1, 0, 1, 0),
                ToolsUsed: new[] { "bandit" },
                PerTool: new[]
                {
                    new AiPerToolResult(
                        Tool: "bandit",
                        Issues: new[] { new AiIssue("warning", "security", "use of assert", "a.py", 3, null, "B101", null) },
                        Summary: new AiAnalysisSummary(1, 0, 1, 0),
                        ExecutionTimeMs: 340),
                }),
            AiReview: null,
            Metadata: new AiAnalysisMetadata("demo", new[] { "python" }, 1, 400, true, false));

        Bearer(await RegisterAsync("pipeline@test.local"));
        var path = await CompleteAssessmentAndGetPathAsync(Track.Python);
        var pathTask = path.Tasks[0];

        var blobPath = $"tests/{Guid.NewGuid():N}/submission.zip";
        var fakeBlob = (FakeBlobStorage)_factory.Services.GetRequiredService<IBlobStorage>();
        fakeBlob.SeedBlob(BlobContainers.Submissions, blobPath, new byte[] { 0x50, 0x4b, 0x03, 0x04 });

        // Act
        var res = await _client.PostAsJsonAsync("/api/submissions",
            new CreateSubmissionRequest(pathTask.Task.TaskId, SubmissionType.Upload, null, blobPath));
        Assert.Equal(HttpStatusCode.Accepted, res.StatusCode);
        var body = await res.Content.ReadFromJsonAsync<SubmissionCreatedResponse>(Json);

        // Assert — pipeline ran synchronously via inline scheduler.
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var sub = await db.Submissions.AsNoTracking().FirstAsync(s => s.Id == body!.SubmissionId);
        Assert.Equal(SubmissionStatus.Completed, sub.Status);
        Assert.Null(sub.ErrorMessage);
        Assert.NotNull(sub.CompletedAt);

        var rows = db.StaticAnalysisResults.AsNoTracking()
            .Where(r => r.SubmissionId == body!.SubmissionId).ToList();
        var row = Assert.Single(rows);
        Assert.Equal(StaticAnalysisTool.Bandit, row.Tool);
        Assert.Equal(340, row.ExecutionTimeMs);
        Assert.Contains("B101", row.IssuesJson);
        Assert.Contains("\"totalIssues\":1", row.MetricsJson);
    }

    // ----- helpers mirroring SubmissionCreateTests -----

    private void Bearer(string token) =>
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

    private async Task<string> RegisterAsync(string email)
    {
        var req = new RegisterRequest(email, "Strong_Pass_123!", "Pipeline Tester", null);
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
}

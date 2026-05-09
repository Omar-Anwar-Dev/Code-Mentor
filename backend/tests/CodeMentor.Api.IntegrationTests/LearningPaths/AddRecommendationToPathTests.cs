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
using CodeMentor.Domain.Tasks;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace CodeMentor.Api.IntegrationTests.LearningPaths;

/// <summary>
/// S8-T5 acceptance:
///  - 401 without auth.
///  - 404 unknown rec / cross-user rec.
///  - 400 when recommendation has no TaskId (text-only suggestion).
///  - 409 NoActivePath / TaskAlreadyOnPath / AlreadyAdded.
///  - 200 happy path: new PathTask appended at max(OrderIndex)+1, IsAdded=true.
/// </summary>
public class AddRecommendationToPathTests : IClassFixture<CodeMentorWebApplicationFactory>
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    private readonly CodeMentorWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public AddRecommendationToPathTests(CodeMentorWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task WithoutAuth_Returns401()
    {
        var res = await _client.PostAsync(
            $"/api/learning-paths/me/tasks/from-recommendation/{Guid.NewGuid()}", null);
        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    [Fact]
    public async Task UnknownRecommendation_Returns404()
    {
        Bearer(await RegisterAsync("addrec-unknown@test.local"));

        var res = await _client.PostAsync(
            $"/api/learning-paths/me/tasks/from-recommendation/{Guid.NewGuid()}", null);
        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
    }

    [Fact]
    public async Task RecommendationWithNoTaskId_Returns400()
    {
        Bearer(await RegisterAsync("addrec-textonly@test.local"));
        await CompleteAssessmentAndGetPathAsync(Track.Python);

        var recId = await SeedTextOnlyRecommendationAsync();

        var res = await _client.PostAsync(
            $"/api/learning-paths/me/tasks/from-recommendation/{recId}", null);
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }

    [Fact]
    public async Task NoActivePath_Returns409()
    {
        Bearer(await RegisterAsync("addrec-nopath@test.local"));

        // Seed a recommendation directly (no submission flow → no path).
        var (recId, _) = await SeedRecommendationWithTaskIdAsync();

        var res = await _client.PostAsync(
            $"/api/learning-paths/me/tasks/from-recommendation/{recId}", null);
        Assert.Equal(HttpStatusCode.Conflict, res.StatusCode);
    }

    [Fact]
    public async Task HappyPath_AppendsToEnd_MarksIsAdded_True()
    {
        Bearer(await RegisterAsync("addrec-happy@test.local"));
        var path = await CompleteAssessmentAndGetPathAsync(Track.FullStack);

        var initialCount = path.Tasks.Count;
        var maxOrderBefore = path.Tasks.Max(pt => pt.OrderIndex);

        var userId = await CurrentUserIdAsync();
        Guid newTaskId;
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var pathRow = await db.LearningPaths.Include(p => p.Tasks)
                .FirstAsync(p => p.UserId == userId && p.IsActive);
            var onPathTaskIds = pathRow.Tasks.Select(pt => pt.TaskId).ToHashSet();
            newTaskId = (await db.Tasks.FirstAsync(t => !onPathTaskIds.Contains(t.Id) && t.IsActive)).Id;
        }

        var (recId, _) = await SeedRecommendationDirectAsync(userId, newTaskId);

        var res = await _client.PostAsync(
            $"/api/learning-paths/me/tasks/from-recommendation/{recId}", null);
        res.EnsureSuccessStatusCode();
        var updated = await res.Content.ReadFromJsonAsync<LearningPathDto>(Json);

        Assert.NotNull(updated);
        Assert.Equal(initialCount + 1, updated!.Tasks.Count);
        var appended = updated.Tasks.OrderBy(pt => pt.OrderIndex).Last();
        Assert.Equal(newTaskId, appended.Task.TaskId);
        Assert.Equal(maxOrderBefore + 1, appended.OrderIndex);
        Assert.Equal("NotStarted", appended.Status);

        // Recommendation flipped IsAdded.
        using var scope2 = _factory.Services.CreateScope();
        var db2 = scope2.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var rec = await db2.Recommendations.FirstAsync(r => r.Id == recId);
        Assert.True(rec.IsAdded);
    }

    [Fact]
    public async Task TaskAlreadyOnPath_Returns409()
    {
        Bearer(await RegisterAsync("addrec-already@test.local"));
        var path = await CompleteAssessmentAndGetPathAsync(Track.Python);
        var existingTaskId = path.Tasks[0].Task.TaskId;

        var userId = await CurrentUserIdAsync();
        var (recId, _) = await SeedRecommendationDirectAsync(userId, existingTaskId);

        var res = await _client.PostAsync(
            $"/api/learning-paths/me/tasks/from-recommendation/{recId}", null);
        Assert.Equal(HttpStatusCode.Conflict, res.StatusCode);
    }

    [Fact]
    public async Task AlreadyAdded_Returns409_OnSecondCall()
    {
        Bearer(await RegisterAsync("addrec-twice@test.local"));
        await CompleteAssessmentAndGetPathAsync(Track.FullStack);

        var userId = await CurrentUserIdAsync();
        Guid newTaskId;
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var pathRow = await db.LearningPaths.Include(p => p.Tasks)
                .FirstAsync(p => p.UserId == userId && p.IsActive);
            var onPathTaskIds = pathRow.Tasks.Select(pt => pt.TaskId).ToHashSet();
            newTaskId = (await db.Tasks.FirstAsync(t => !onPathTaskIds.Contains(t.Id) && t.IsActive)).Id;
        }
        var (recId, _) = await SeedRecommendationDirectAsync(userId, newTaskId);

        var first = await _client.PostAsync(
            $"/api/learning-paths/me/tasks/from-recommendation/{recId}", null);
        first.EnsureSuccessStatusCode();

        var second = await _client.PostAsync(
            $"/api/learning-paths/me/tasks/from-recommendation/{recId}", null);
        Assert.Equal(HttpStatusCode.Conflict, second.StatusCode);
    }

    [Fact]
    public async Task CrossUserRecommendation_Returns404()
    {
        // User A: register + seed recommendation directly.
        Bearer(await RegisterAsync("addrec-A@test.local"));
        var (recIdA, _) = await SeedRecommendationWithTaskIdAsync();

        // User B tries to add A's recommendation.
        Bearer(await RegisterAsync("addrec-B@test.local"));
        await CompleteAssessmentAndGetPathAsync(Track.Backend);

        var res = await _client.PostAsync(
            $"/api/learning-paths/me/tasks/from-recommendation/{recIdA}", null);
        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
    }

    // ----- helpers --------------------------------------------------------

    private void Bearer(string token) =>
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

    private async Task<string> RegisterAsync(string email)
    {
        var req = new RegisterRequest(email, "Strong_Pass_123!", "AddRec Tester", null);
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
            var res = await _client.PostAsJsonAsync(
                $"/api/assessments/{sb.AssessmentId}/answers",
                new AnswerRequest(cur.QuestionId, "A", 2));
            var body = await res.Content.ReadFromJsonAsync<AnswerResult>(Json);
            if (i < 29) cur = body!.NextQuestion!;
        }
        return (await _client.GetFromJsonAsync<LearningPathDto>("/api/learning-paths/me/active", Json))!;
    }

    /// <summary>Resolves the current bearer's user id by hitting /auth/me.</summary>
    private async Task<Guid> CurrentUserIdAsync()
    {
        var me = await _client.GetFromJsonAsync<UserDto>("/api/auth/me", Json);
        return me!.Id;
    }

    /// <summary>Seeds a Recommendation directly (no submission flow), referencing
    /// a real seeded Task. Returns (recId, taskId).</summary>
    private async Task<(Guid recId, Guid taskId)> SeedRecommendationWithTaskIdAsync()
    {
        var userId = await CurrentUserIdAsync();
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var task = await db.Tasks.FirstAsync(t => t.IsActive);
        var sub = new Submission
        {
            UserId = userId, TaskId = task.Id,
            SubmissionType = SubmissionType.Upload, BlobPath = "x.zip",
            Status = SubmissionStatus.Completed,
        };
        db.Submissions.Add(sub);
        var rec = new Recommendation { SubmissionId = sub.Id, TaskId = task.Id, Reason = "test" };
        db.Recommendations.Add(rec);
        await db.SaveChangesAsync();
        return (rec.Id, task.Id);
    }

    private async Task<(Guid recId, Guid taskId)> SeedRecommendationDirectAsync(Guid userId, Guid taskId)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var sub = new Submission
        {
            UserId = userId, TaskId = taskId,
            SubmissionType = SubmissionType.Upload, BlobPath = "x.zip",
            Status = SubmissionStatus.Completed,
        };
        db.Submissions.Add(sub);
        var rec = new Recommendation { SubmissionId = sub.Id, TaskId = taskId, Reason = "test" };
        db.Recommendations.Add(rec);
        await db.SaveChangesAsync();
        return (rec.Id, taskId);
    }

    private async Task<Guid> SeedTextOnlyRecommendationAsync()
    {
        var userId = await CurrentUserIdAsync();
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var task = await db.Tasks.FirstAsync(t => t.IsActive);
        var sub = new Submission
        {
            UserId = userId, TaskId = task.Id,
            SubmissionType = SubmissionType.Upload, BlobPath = "x.zip",
            Status = SubmissionStatus.Completed,
        };
        db.Submissions.Add(sub);
        var rec = new Recommendation { SubmissionId = sub.Id, TaskId = null, Topic = "SOLID", Reason = "text-only" };
        db.Recommendations.Add(rec);
        await db.SaveChangesAsync();
        return rec.Id;
    }

    private static AiCombinedResponse BuildAiResponse()
    {
        var aiReview = new AiReviewResponse(
            OverallScore: 80,
            Scores: new AiReviewScores(80, 80, 80, 80, 80),
            Strengths: new[] { "ok" },
            Weaknesses: new[] { "todo" },
            Recommendations: new[] { new AiRecommendation("medium", "Code quality", "Add tests", null) },
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

using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using CodeMentor.Api.IntegrationTests.TestHost;
using CodeMentor.Application.Assessments.Contracts;
using CodeMentor.Application.Auth.Contracts;
using CodeMentor.Application.LearningPaths.Contracts;
using CodeMentor.Application.Storage;
using CodeMentor.Application.Submissions.Contracts;
using CodeMentor.Domain.Assessments;
using CodeMentor.Domain.Submissions;
using CodeMentor.Domain.Tasks;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace CodeMentor.Api.IntegrationTests.Submissions;

/// <summary>
/// S4-T4 acceptance:
///   - Happy path creates Submission row; returns 202.
///   - Invalid task → 404.
///   - Bad GitHub URL → 400.
///   - Missing blob → 400.
///   - Path side-effect rules (ADR-020) apply in a single transaction.
/// Inline scheduler runs SubmissionAnalysisJob synchronously so by the time
/// the HTTP response returns, the stub job has already transitioned status.
/// </summary>
public class SubmissionCreateTests : IClassFixture<CodeMentorWebApplicationFactory>
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    private readonly CodeMentorWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public SubmissionCreateTests(CodeMentorWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    private async Task<string> RegisterAsync(string email)
    {
        var req = new RegisterRequest(email, "Strong_Pass_123!", "Sub Tester", null);
        var res = await _client.PostAsJsonAsync("/api/auth/register", req);
        res.EnsureSuccessStatusCode();
        return (await res.Content.ReadFromJsonAsync<AuthResponse>())!.AccessToken;
    }

    private void Bearer(string token) =>
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

    private async Task<LearningPathDto> CompleteAssessmentAndGetPathAsync(Track track)
    {
        var start = await _client.PostAsJsonAsync("/api/assessments", new StartAssessmentRequest(track));
        var sb = await start.Content.ReadFromJsonAsync<StartAssessmentResponse>();
        var cur = sb!.FirstQuestion;
        for (int i = 0; i < 30; i++)
        {
            var res = await _client.PostAsJsonAsync($"/api/assessments/{sb.AssessmentId}/answers",
                new AnswerRequest(cur.QuestionId, "A", 2));
            var body = await res.Content.ReadFromJsonAsync<AnswerResult>();
            if (i < 29) cur = body!.NextQuestion!;
        }
        return (await _client.GetFromJsonAsync<LearningPathDto>("/api/learning-paths/me/active"))!;
    }

    [Fact]
    public async Task Post_WithoutAuth_Returns401()
    {
        var res = await _client.PostAsJsonAsync("/api/submissions",
            new CreateSubmissionRequest(Guid.NewGuid(), SubmissionType.GitHub, "https://github.com/a/b", null));
        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    [Fact]
    public async Task Post_WithUnknownTask_Returns404()
    {
        Bearer(await RegisterAsync("unknown-task@test.local"));

        var res = await _client.PostAsJsonAsync("/api/submissions",
            new CreateSubmissionRequest(Guid.NewGuid(), SubmissionType.GitHub, "https://github.com/a/b", null));

        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
    }

    [Fact]
    public async Task Post_WithMalformedGitHubUrl_Returns400()
    {
        Bearer(await RegisterAsync("badurl@test.local"));
        var path = await CompleteAssessmentAndGetPathAsync(Track.Python);
        var taskId = path.Tasks[0].Task.TaskId;

        var cases = new[]
        {
            "http://github.com/a/b",             // wrong scheme
            "https://gitlab.com/a/b",            // wrong host
            "https://github.com/onlyowner",      // missing repo
            "not-a-url",                         // bogus
        };
        foreach (var url in cases)
        {
            var res = await _client.PostAsJsonAsync("/api/submissions",
                new CreateSubmissionRequest(taskId, SubmissionType.GitHub, url, null));
            Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        }
    }

    [Fact]
    public async Task Post_WithMissingBlob_Returns400()
    {
        Bearer(await RegisterAsync("nullblob@test.local"));
        var path = await CompleteAssessmentAndGetPathAsync(Track.Python);
        var taskId = path.Tasks[0].Task.TaskId;

        var res = await _client.PostAsJsonAsync("/api/submissions",
            new CreateSubmissionRequest(taskId, SubmissionType.Upload, null, "missing/blob/path.zip"));
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }

    [Fact]
    public async Task Post_GitHubHappyPath_Returns202_AndCreatesRow()
    {
        Bearer(await RegisterAsync("github-happy@test.local"));
        var path = await CompleteAssessmentAndGetPathAsync(Track.Backend);
        var pathTask = path.Tasks[0];

        var res = await _client.PostAsJsonAsync("/api/submissions",
            new CreateSubmissionRequest(pathTask.Task.TaskId, SubmissionType.GitHub, "https://github.com/codementor/sample-repo", null));

        Assert.Equal(HttpStatusCode.Accepted, res.StatusCode);
        var body = await res.Content.ReadFromJsonAsync<SubmissionCreatedResponse>(Json);
        Assert.NotNull(body);
        Assert.NotEqual(Guid.Empty, body!.SubmissionId);
        Assert.Equal(1, body.AttemptNumber);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var sub = await db.Submissions.FirstAsync(s => s.Id == body.SubmissionId);
        Assert.Equal(SubmissionType.GitHub, sub.SubmissionType);
        Assert.Equal("https://github.com/codementor/sample-repo", sub.RepositoryUrl);
        Assert.Null(sub.BlobPath);
        // Inline scheduler ran the stub job → Completed by the time we got here.
        Assert.Equal(SubmissionStatus.Completed, sub.Status);
    }

    [Fact]
    public async Task Post_UploadHappyPath_Seeds_Blob_AndSucceeds()
    {
        Bearer(await RegisterAsync("upload-happy@test.local"));
        var path = await CompleteAssessmentAndGetPathAsync(Track.FullStack);
        var pathTask = path.Tasks[0];

        var blobPath = "00000000-0000-0000-0000-000000000001/2026-04-21/test.zip";
        var fake = (FakeBlobStorage)_factory.Services.GetRequiredService<IBlobStorage>();
        fake.SeedBlob(BlobContainers.Submissions, blobPath, new byte[] { 0x50, 0x4b, 0x03, 0x04 });

        var res = await _client.PostAsJsonAsync("/api/submissions",
            new CreateSubmissionRequest(pathTask.Task.TaskId, SubmissionType.Upload, null, blobPath));
        Assert.Equal(HttpStatusCode.Accepted, res.StatusCode);

        var body = await res.Content.ReadFromJsonAsync<SubmissionCreatedResponse>(Json);
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var sub = await db.Submissions.FirstAsync(s => s.Id == body!.SubmissionId);
        Assert.Equal(SubmissionType.Upload, sub.SubmissionType);
        Assert.Equal(blobPath, sub.BlobPath);
        Assert.Null(sub.RepositoryUrl);
    }

    [Fact]
    public async Task Post_TaskInPath_NotStarted_TransitionsTo_InProgress()
    {
        Bearer(await RegisterAsync("sideeffect-new@test.local"));
        var path = await CompleteAssessmentAndGetPathAsync(Track.Backend);
        var pathTask = path.Tasks[0];
        Assert.Equal("NotStarted", pathTask.Status);

        var res = await _client.PostAsJsonAsync("/api/submissions",
            new CreateSubmissionRequest(pathTask.Task.TaskId, SubmissionType.GitHub, "https://github.com/a/b", null));
        Assert.Equal(HttpStatusCode.Accepted, res.StatusCode);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var pt = await db.PathTasks.FirstAsync(x => x.Id == pathTask.PathTaskId);
        Assert.Equal(PathTaskStatus.InProgress, pt.Status);
        Assert.NotNull(pt.StartedAt);
    }

    [Fact]
    public async Task Post_TaskInPath_InProgress_StaysInProgress_NoReopen()
    {
        Bearer(await RegisterAsync("sideeffect-keep@test.local"));
        var path = await CompleteAssessmentAndGetPathAsync(Track.FullStack);
        var pathTask = path.Tasks[0];

        // Mark task InProgress via explicit start endpoint first.
        await _client.PostAsync($"/api/learning-paths/me/tasks/{pathTask.PathTaskId}/start", null);

        DateTime startedAtBefore;
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            startedAtBefore = (await db.PathTasks.FirstAsync(x => x.Id == pathTask.PathTaskId)).StartedAt!.Value;
        }

        await Task.Delay(20); // enough to detect any bogus StartedAt rewrite

        var res = await _client.PostAsJsonAsync("/api/submissions",
            new CreateSubmissionRequest(pathTask.Task.TaskId, SubmissionType.GitHub, "https://github.com/a/b", null));
        Assert.Equal(HttpStatusCode.Accepted, res.StatusCode);

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var pt = await db.PathTasks.FirstAsync(x => x.Id == pathTask.PathTaskId);
            Assert.Equal(PathTaskStatus.InProgress, pt.Status);
            Assert.Equal(startedAtBefore, pt.StartedAt);  // unchanged by the submit
        }
    }

    [Fact]
    public async Task Post_TaskNotInPath_Succeeds_WithoutPathSideEffects()
    {
        Bearer(await RegisterAsync("offpath@test.local"));
        var path = await CompleteAssessmentAndGetPathAsync(Track.Python);
        var pathTaskIds = path.Tasks.Select(t => t.Task.TaskId).ToHashSet();

        Guid offPathTaskId;
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            offPathTaskId = await db.Tasks
                .Where(t => t.IsActive && !pathTaskIds.Contains(t.Id))
                .Select(t => t.Id)
                .FirstAsync();
        }

        var res = await _client.PostAsJsonAsync("/api/submissions",
            new CreateSubmissionRequest(offPathTaskId, SubmissionType.GitHub, "https://github.com/x/y", null));
        Assert.Equal(HttpStatusCode.Accepted, res.StatusCode);

        // Every path task still NotStarted — no side effects for off-path submissions.
        using var scope2 = _factory.Services.CreateScope();
        var db2 = scope2.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        foreach (var pt in path.Tasks)
        {
            var pathTask = await db2.PathTasks.FirstAsync(x => x.Id == pt.PathTaskId);
            Assert.Equal(PathTaskStatus.NotStarted, pathTask.Status);
        }
    }

    [Fact]
    public async Task Post_SecondSubmissionForSameTask_Increments_AttemptNumber()
    {
        Bearer(await RegisterAsync("attempt-inc@test.local"));
        var path = await CompleteAssessmentAndGetPathAsync(Track.Backend);
        var taskId = path.Tasks[0].Task.TaskId;

        var first = await _client.PostAsJsonAsync("/api/submissions",
            new CreateSubmissionRequest(taskId, SubmissionType.GitHub, "https://github.com/a/b", null));
        var firstBody = await first.Content.ReadFromJsonAsync<SubmissionCreatedResponse>(Json);
        Assert.Equal(1, firstBody!.AttemptNumber);

        var second = await _client.PostAsJsonAsync("/api/submissions",
            new CreateSubmissionRequest(taskId, SubmissionType.GitHub, "https://github.com/a/b", null));
        var secondBody = await second.Content.ReadFromJsonAsync<SubmissionCreatedResponse>(Json);
        Assert.Equal(2, secondBody!.AttemptNumber);
    }
}

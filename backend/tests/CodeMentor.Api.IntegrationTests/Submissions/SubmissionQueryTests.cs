using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using CodeMentor.Api.IntegrationTests.TestHost;
using CodeMentor.Application.Assessments.Contracts;
using CodeMentor.Application.Auth.Contracts;
using CodeMentor.Application.LearningPaths.Contracts;
using CodeMentor.Application.Submissions.Contracts;
using CodeMentor.Domain.Assessments;
using CodeMentor.Domain.Submissions;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace CodeMentor.Api.IntegrationTests.Submissions;

/// <summary>
/// S4-T7 acceptance:
///   - GET /submissions/{id} returns detail; 404 if missing/not-owner
///   - GET /submissions/me paginated list
///   - POST /submissions/{id}/retry: Failed → re-enqueued (202); non-Failed → 409
/// </summary>
public class SubmissionQueryTests : IClassFixture<CodeMentorWebApplicationFactory>
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    private readonly CodeMentorWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public SubmissionQueryTests(CodeMentorWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    private async Task<string> RegisterAsync(string email)
    {
        var req = new RegisterRequest(email, "Strong_Pass_123!", "Query Tester", null);
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

    private async Task<Guid> CreateSubmissionAsync(Guid taskId)
    {
        var res = await _client.PostAsJsonAsync("/api/submissions",
            new CreateSubmissionRequest(taskId, SubmissionType.GitHub, "https://github.com/a/b", null));
        res.EnsureSuccessStatusCode();
        var body = await res.Content.ReadFromJsonAsync<SubmissionCreatedResponse>(Json);
        return body!.SubmissionId;
    }

    [Fact]
    public async Task GetById_WithoutAuth_Returns401()
    {
        var res = await _client.GetAsync($"/api/submissions/{Guid.NewGuid()}");
        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    [Fact]
    public async Task GetById_Unknown_Returns404()
    {
        Bearer(await RegisterAsync("get-unknown@test.local"));
        var res = await _client.GetAsync($"/api/submissions/{Guid.NewGuid()}");
        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
    }

    [Fact]
    public async Task GetById_OtherUsersSubmission_Returns404()
    {
        // User A creates submission.
        Bearer(await RegisterAsync("owner-a@test.local"));
        var pathA = await CompleteAssessmentAndGetPathAsync(Track.Backend);
        var subId = await CreateSubmissionAsync(pathA.Tasks[0].Task.TaskId);

        // User B tries to read it → 404 (owner-scoped).
        Bearer(await RegisterAsync("snooper-b@test.local"));
        var res = await _client.GetAsync($"/api/submissions/{subId}");
        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
    }

    [Fact]
    public async Task GetById_Owner_Returns_FullDetail_WithTaskTitle()
    {
        Bearer(await RegisterAsync("owner-detail@test.local"));
        var path = await CompleteAssessmentAndGetPathAsync(Track.FullStack);
        var taskId = path.Tasks[0].Task.TaskId;
        var expectedTitle = path.Tasks[0].Task.Title;

        var subId = await CreateSubmissionAsync(taskId);

        var dto = await _client.GetFromJsonAsync<SubmissionDto>($"/api/submissions/{subId}", Json);
        Assert.NotNull(dto);
        Assert.Equal(subId, dto!.Id);
        Assert.Equal(taskId, dto.TaskId);
        Assert.Equal(expectedTitle, dto.TaskTitle);
        Assert.Equal(SubmissionType.GitHub, dto.SubmissionType);
        Assert.Equal(SubmissionStatus.Completed, dto.Status); // stub job ran inline
    }

    [Fact]
    public async Task GetMe_Paginated_Returns_Newest_First_Desc()
    {
        Bearer(await RegisterAsync("listmine@test.local"));
        var path = await CompleteAssessmentAndGetPathAsync(Track.Python);

        // 3 submissions, different tasks.
        var ids = new List<Guid>();
        foreach (var pathTask in path.Tasks.Take(3))
        {
            ids.Add(await CreateSubmissionAsync(pathTask.Task.TaskId));
            await Task.Delay(15); // keep CreatedAt ordering deterministic
        }

        var list = await _client.GetFromJsonAsync<SubmissionListResponse>("/api/submissions/me", Json);
        Assert.NotNull(list);
        Assert.Equal(3, list!.TotalCount);
        Assert.Equal(3, list.Items.Count);
        // Newest first: the last created id should be the first in the list.
        Assert.Equal(ids[^1], list.Items[0].Id);
        Assert.Equal(ids[0], list.Items[^1].Id);
    }

    [Fact]
    public async Task GetMe_Pagination_RespectsPageAndSize()
    {
        Bearer(await RegisterAsync("list-page@test.local"));
        var path = await CompleteAssessmentAndGetPathAsync(Track.Backend);

        foreach (var pathTask in path.Tasks.Take(5))
        {
            await CreateSubmissionAsync(pathTask.Task.TaskId);
            await Task.Delay(10);
        }

        var list = await _client.GetFromJsonAsync<SubmissionListResponse>("/api/submissions/me?page=2&size=2", Json);
        Assert.NotNull(list);
        Assert.Equal(5, list!.TotalCount);
        Assert.Equal(2, list.Items.Count);
        Assert.Equal(2, list.Page);
        Assert.Equal(2, list.Size);
    }

    [Fact]
    public async Task Retry_OnCompleted_Returns409()
    {
        Bearer(await RegisterAsync("retry-completed@test.local"));
        var path = await CompleteAssessmentAndGetPathAsync(Track.Backend);
        var subId = await CreateSubmissionAsync(path.Tasks[0].Task.TaskId);
        // Stub job has already run → status=Completed.

        var res = await _client.PostAsync($"/api/submissions/{subId}/retry", null);
        Assert.Equal(HttpStatusCode.Conflict, res.StatusCode);
    }

    [Fact]
    public async Task Retry_OnFailed_Returns202_AndRuns_Job_Again()
    {
        Bearer(await RegisterAsync("retry-failed@test.local"));
        var path = await CompleteAssessmentAndGetPathAsync(Track.FullStack);
        var subId = await CreateSubmissionAsync(path.Tasks[0].Task.TaskId);

        // Manually flip the row to Failed so we can exercise the retry path.
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var sub = await db.Submissions.FirstAsync(s => s.Id == subId);
            sub.Status = SubmissionStatus.Failed;
            sub.ErrorMessage = "simulated";
            sub.CompletedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();
        }

        var res = await _client.PostAsync($"/api/submissions/{subId}/retry", null);
        Assert.Equal(HttpStatusCode.Accepted, res.StatusCode);

        var body = await res.Content.ReadFromJsonAsync<SubmissionCreatedResponse>(Json);
        // Retry increments AttemptNumber.
        Assert.Equal(2, body!.AttemptNumber);

        // Inline scheduler runs the stub → eventually Completed, ErrorMessage cleared.
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var sub = await db.Submissions.AsNoTracking().FirstAsync(s => s.Id == subId);
            Assert.Equal(SubmissionStatus.Completed, sub.Status);
            Assert.Null(sub.ErrorMessage);
        }
    }

    [Fact]
    public async Task Retry_UnknownSubmission_Returns404()
    {
        Bearer(await RegisterAsync("retry-missing@test.local"));
        var res = await _client.PostAsync($"/api/submissions/{Guid.NewGuid()}/retry", null);
        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
    }
}

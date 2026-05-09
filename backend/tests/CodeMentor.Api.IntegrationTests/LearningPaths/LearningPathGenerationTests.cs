using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using CodeMentor.Api.IntegrationTests.TestHost;
using CodeMentor.Application.Assessments.Contracts;
using CodeMentor.Application.Auth.Contracts;
using CodeMentor.Application.LearningPaths.Contracts;
using CodeMentor.Domain.Assessments;
using CodeMentor.Domain.Tasks;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace CodeMentor.Api.IntegrationTests.LearningPaths;

/// <summary>
/// S3-T4 acceptance: after full assessment, a path exists (via scheduler) with 5-7 ordered
/// tasks relevant to weakness. Integration harness uses InlineLearningPathScheduler so the
/// path appears synchronously.
/// </summary>
public class LearningPathGenerationTests : IClassFixture<CodeMentorWebApplicationFactory>
{
    private readonly CodeMentorWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public LearningPathGenerationTests(CodeMentorWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    private async Task<string> RegisterAndGetAccessTokenAsync(string email)
    {
        var req = new RegisterRequest(email, "Strong_Pass_123!", "Path Tester", null);
        var res = await _client.PostAsJsonAsync("/api/auth/register", req);
        res.EnsureSuccessStatusCode();
        var body = await res.Content.ReadFromJsonAsync<AuthResponse>();
        return body!.AccessToken;
    }

    private void Bearer(string token) =>
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

    [Fact]
    public async Task CompletedAssessment_AutoGenerates_LearningPath_InActiveState()
    {
        Bearer(await RegisterAndGetAccessTokenAsync("pathgen@test.local"));

        var start = await _client.PostAsJsonAsync("/api/assessments", new StartAssessmentRequest(Track.Backend));
        var startBody = await start.Content.ReadFromJsonAsync<StartAssessmentResponse>();
        var assessmentId = startBody!.AssessmentId;
        var current = startBody.FirstQuestion;

        for (int i = 0; i < 30; i++)
        {
            var res = await _client.PostAsJsonAsync(
                $"/api/assessments/{assessmentId}/answers",
                new AnswerRequest(current.QuestionId, "A", 3));
            var body = await res.Content.ReadFromJsonAsync<AnswerResult>();
            if (i < 29) current = body!.NextQuestion!;
        }

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var assessment = await db.Assessments.FirstAsync(a => a.Id == assessmentId);
        var userId = assessment.UserId;

        var path = await db.LearningPaths
            .Include(p => p.Tasks.OrderBy(t => t.OrderIndex)).ThenInclude(pt => pt.Task)
            .FirstOrDefaultAsync(p => p.UserId == userId && p.IsActive);

        Assert.NotNull(path);
        Assert.Equal(Track.Backend, path!.Track);
        Assert.Equal(assessmentId, path.AssessmentId);
        Assert.InRange(path.Tasks.Count, 5, 7);

        // Task order indexes are contiguous 1..N.
        var orderIndexes = path.Tasks.Select(t => t.OrderIndex).ToList();
        Assert.Equal(Enumerable.Range(1, path.Tasks.Count), orderIndexes);

        // No duplicate tasks.
        Assert.Equal(path.Tasks.Count, path.Tasks.Select(t => t.TaskId).Distinct().Count());

        // Every path task belongs to the selected track.
        Assert.All(path.Tasks, t => Assert.Equal(Track.Backend, t.Task!.Track));

        // All path tasks start as NotStarted.
        Assert.All(path.Tasks, t => Assert.Equal(PathTaskStatus.NotStarted, t.Status));
    }

    [Fact]
    public async Task Regenerating_Replaces_Old_Active_Path()
    {
        Bearer(await RegisterAndGetAccessTokenAsync("regen@test.local"));

        // First complete assessment → first path.
        await CompleteAssessmentAsync(Track.Python);

        Guid userId;
        Guid assessmentId;
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var ass = await db.Assessments.OrderByDescending(a => a.StartedAt).FirstAsync();
            userId = ass.UserId;
            assessmentId = ass.Id;

            var activePerUser = await db.LearningPaths.CountAsync(p => p.IsActive && p.UserId == userId);
            Assert.Equal(1, activePerUser);
        }

        // Manually re-run path generation for the same user via the scheduler. Inline in tests.
        using (var scope = _factory.Services.CreateScope())
        {
            var scheduler = scope.ServiceProvider.GetRequiredService<CodeMentor.Application.LearningPaths.ILearningPathScheduler>();
            scheduler.EnqueueGeneration(userId, assessmentId);
        }

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var activePerUser = await db.LearningPaths.CountAsync(p => p.IsActive && p.UserId == userId);
            var totalPerUser = await db.LearningPaths.CountAsync(p => p.UserId == userId);
            Assert.Equal(1, activePerUser);
            Assert.Equal(2, totalPerUser); // old inactive + new active
        }
    }

    private async Task CompleteAssessmentAsync(Track track)
    {
        var start = await _client.PostAsJsonAsync("/api/assessments", new StartAssessmentRequest(track));
        var startBody = await start.Content.ReadFromJsonAsync<StartAssessmentResponse>();
        var id = startBody!.AssessmentId;
        var current = startBody.FirstQuestion;

        for (int i = 0; i < 30; i++)
        {
            var res = await _client.PostAsJsonAsync($"/api/assessments/{id}/answers",
                new AnswerRequest(current.QuestionId, "A", 3));
            var body = await res.Content.ReadFromJsonAsync<AnswerResult>();
            if (i < 29) current = body!.NextQuestion!;
        }
    }

    // ---------- S3-T5 + S3-T6 endpoint coverage ----------

    [Fact]
    public async Task GetActive_WithoutAuth_Returns401()
    {
        var res = await _client.GetAsync("/api/learning-paths/me/active");
        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    [Fact]
    public async Task GetActive_WhenNoPath_Returns404()
    {
        Bearer(await RegisterAndGetAccessTokenAsync("nopath@test.local"));
        var res = await _client.GetAsync("/api/learning-paths/me/active");
        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
    }

    [Fact]
    public async Task GetActive_AfterAssessment_Returns_OrderedPath()
    {
        Bearer(await RegisterAndGetAccessTokenAsync("getactive@test.local"));
        await CompleteAssessmentAsync(Track.FullStack);

        var path = await _client.GetFromJsonAsync<LearningPathDto>("/api/learning-paths/me/active");
        Assert.NotNull(path);
        Assert.True(path!.IsActive);
        Assert.Equal("FullStack", path.Track);
        Assert.InRange(path.Tasks.Count, 5, 7);
        Assert.Equal(Enumerable.Range(1, path.Tasks.Count), path.Tasks.Select(t => t.OrderIndex));
    }

    [Fact]
    public async Task StartTask_ValidPathTask_ReturnsInProgress_AndSecondCall_Returns409()
    {
        Bearer(await RegisterAndGetAccessTokenAsync("starttask@test.local"));
        await CompleteAssessmentAsync(Track.Backend);

        var path = (await _client.GetFromJsonAsync<LearningPathDto>("/api/learning-paths/me/active"))!;
        var firstTask = path.Tasks[0];

        var first = await _client.PostAsync($"/api/learning-paths/me/tasks/{firstTask.PathTaskId}/start", null);
        Assert.Equal(HttpStatusCode.OK, first.StatusCode);

        var updated = await first.Content.ReadFromJsonAsync<LearningPathDto>();
        Assert.Equal("InProgress", updated!.Tasks.First(t => t.PathTaskId == firstTask.PathTaskId).Status);

        var second = await _client.PostAsync($"/api/learning-paths/me/tasks/{firstTask.PathTaskId}/start", null);
        Assert.Equal(HttpStatusCode.Conflict, second.StatusCode);
    }

    [Fact]
    public async Task StartTask_UnknownId_Returns404()
    {
        Bearer(await RegisterAndGetAccessTokenAsync("starttask-unknown@test.local"));
        await CompleteAssessmentAsync(Track.Python);

        var bogusId = Guid.NewGuid();
        var res = await _client.PostAsync($"/api/learning-paths/me/tasks/{bogusId}/start", null);
        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
    }
}

using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using CodeMentor.Api.IntegrationTests.TestHost;
using CodeMentor.Application.Assessments.Contracts;
using CodeMentor.Application.Auth.Contracts;
using CodeMentor.Domain.Assessments;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace CodeMentor.Api.IntegrationTests.Assessments;

public class AssessmentEndpointsTests : IClassFixture<CodeMentorWebApplicationFactory>
{
    private readonly CodeMentorWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public AssessmentEndpointsTests(CodeMentorWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient(new Microsoft.AspNetCore.Mvc.Testing.WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false,
        });
    }

    private async Task<T> WithDbAsync<T>(Func<ApplicationDbContext, Task<T>> work)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        return await work(db);
    }

    private async Task<string> RegisterAndGetAccessTokenAsync(string email)
    {
        var req = new RegisterRequest(email, "Strong_Pass_123!", "Test User", null);
        var res = await _client.PostAsJsonAsync("/api/auth/register", req);
        res.EnsureSuccessStatusCode();
        var body = await res.Content.ReadFromJsonAsync<AuthResponse>();
        return body!.AccessToken;
    }

    private void Bearer(string token)
    {
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
    }

    [Fact]
    public async Task Start_WithoutAuth_Returns401()
    {
        var res = await _client.PostAsJsonAsync("/api/assessments", new StartAssessmentRequest(Track.FullStack));
        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    [Fact]
    public async Task Start_ReturnsAssessmentIdAndMediumFirstQuestion_InAllowedCategory()
    {
        Bearer(await RegisterAndGetAccessTokenAsync("start@test.local"));

        var res = await _client.PostAsJsonAsync("/api/assessments", new StartAssessmentRequest(Track.FullStack));
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);

        var body = await res.Content.ReadFromJsonAsync<StartAssessmentResponse>();
        Assert.NotNull(body);
        Assert.NotEqual(Guid.Empty, body!.AssessmentId);
        Assert.Equal(2, body.FirstQuestion.Difficulty);
        Assert.Equal(1, body.FirstQuestion.OrderIndex);
        Assert.Equal(30, body.FirstQuestion.TotalQuestions);
        Assert.Equal(4, body.FirstQuestion.Options.Count);

        // S2-T3 acceptance: first question must be in an allowed skill category.
        var allowedCategories = Enum.GetValues<SkillCategory>().Select(c => c.ToString()).ToHashSet();
        Assert.Contains(body.FirstQuestion.Category, allowedCategories);
    }

    [Fact]
    public async Task FullFlow_Answer30Questions_CompletesWithScore()
    {
        Bearer(await RegisterAndGetAccessTokenAsync("full@test.local"));

        var start = await _client.PostAsJsonAsync("/api/assessments", new StartAssessmentRequest(Track.Backend));
        var startBody = await start.Content.ReadFromJsonAsync<StartAssessmentResponse>();
        var assessmentId = startBody!.AssessmentId;
        var currentQuestion = startBody.FirstQuestion;

        for (int i = 0; i < 30; i++)
        {
            var answer = i % 2 == 0 ? "A" : "B";
            var ans = await _client.PostAsJsonAsync(
                $"/api/assessments/{assessmentId}/answers",
                new AnswerRequest(currentQuestion.QuestionId, answer, TimeSpentSec: 5));
            var raw = await ans.Content.ReadAsStringAsync();
            Assert.True(ans.IsSuccessStatusCode, $"answer #{i + 1} failed: {ans.StatusCode} — {raw}");

            var body = await System.Text.Json.JsonSerializer.DeserializeAsync<AnswerResult>(
                new MemoryStream(System.Text.Encoding.UTF8.GetBytes(raw)),
                new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            Assert.NotNull(body);

            if (i < 29)
            {
                Assert.False(body!.Completed, $"answer #{i + 1} unexpectedly completed — server body: {raw}");
                Assert.NotNull(body.NextQuestion);
                currentQuestion = body.NextQuestion!;
            }
            else
            {
                Assert.True(body!.Completed, $"answer #30 should be completed — server body: {raw}");
                Assert.Null(body.NextQuestion);
            }
        }

        var result = await _client.GetFromJsonAsync<AssessmentResultDto>($"/api/assessments/{assessmentId}");
        Assert.NotNull(result);
        Assert.Equal("Completed", result!.Status);
        Assert.Equal(30, result.AnsweredCount);
        Assert.NotNull(result.TotalScore);
        Assert.NotNull(result.SkillLevel);
    }

    [Fact]
    public async Task IdempotencyKey_ReplayingSameAnswer_DoesNotCreateDuplicate()
    {
        Bearer(await RegisterAndGetAccessTokenAsync("idem@test.local"));

        var start = await _client.PostAsJsonAsync("/api/assessments", new StartAssessmentRequest(Track.Python));
        var startBody = await start.Content.ReadFromJsonAsync<StartAssessmentResponse>();
        var id = startBody!.AssessmentId;
        var first = startBody.FirstQuestion;

        var key = Guid.NewGuid().ToString("N");
        var answerBody = JsonContent.Create(new AnswerRequest(first.QuestionId, "A", 4));

        var req1 = new HttpRequestMessage(HttpMethod.Post, $"/api/assessments/{id}/answers") { Content = answerBody };
        req1.Headers.Add("Idempotency-Key", key);
        var res1 = await _client.SendAsync(req1);
        Assert.Equal(HttpStatusCode.OK, res1.StatusCode);

        // Same key + same payload — should be idempotent (no duplicate response row; same "next" returned).
        var req2 = new HttpRequestMessage(HttpMethod.Post, $"/api/assessments/{id}/answers")
        {
            Content = JsonContent.Create(new AnswerRequest(first.QuestionId, "A", 4)),
        };
        req2.Headers.Add("Idempotency-Key", key);
        var res2 = await _client.SendAsync(req2);
        Assert.Equal(HttpStatusCode.OK, res2.StatusCode);

        var result = await _client.GetFromJsonAsync<AssessmentResultDto>($"/api/assessments/{id}");
        Assert.Equal(1, result!.AnsweredCount);
    }

    [Fact]
    public async Task Latest_WhenNone_Returns204()
    {
        Bearer(await RegisterAndGetAccessTokenAsync("nonelatest@test.local"));
        var res = await _client.GetAsync("/api/assessments/me/latest");
        Assert.Equal(HttpStatusCode.NoContent, res.StatusCode);
    }

    [Fact]
    public async Task Latest_AfterStart_ReturnsInProgress()
    {
        Bearer(await RegisterAndGetAccessTokenAsync("latest@test.local"));
        await _client.PostAsJsonAsync("/api/assessments", new StartAssessmentRequest(Track.FullStack));

        var res = await _client.GetFromJsonAsync<AssessmentResultDto>("/api/assessments/me/latest");
        Assert.NotNull(res);
        Assert.Equal("InProgress", res!.Status);
    }

    [Fact]
    public async Task Abandon_MarksAssessmentAbandoned()
    {
        Bearer(await RegisterAndGetAccessTokenAsync("abandon@test.local"));
        var start = await _client.PostAsJsonAsync("/api/assessments", new StartAssessmentRequest(Track.FullStack));
        var id = (await start.Content.ReadFromJsonAsync<StartAssessmentResponse>())!.AssessmentId;

        var res = await _client.PostAsJsonAsync($"/api/assessments/{id}/abandon", new { });
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);

        var body = await res.Content.ReadFromJsonAsync<AssessmentResultDto>();
        Assert.Equal("Abandoned", body!.Status);
    }

    // ---------- S2-T6: SkillScores written on completion ----------

    [Fact]
    public async Task FullFlow_Writes_SkillScores_OneRow_PerCategoryAnswered()
    {
        Bearer(await RegisterAndGetAccessTokenAsync("skillscores@test.local"));

        var start = await _client.PostAsJsonAsync("/api/assessments", new StartAssessmentRequest(Track.FullStack));
        var startBody = await start.Content.ReadFromJsonAsync<StartAssessmentResponse>();
        var id = startBody!.AssessmentId;
        var current = startBody.FirstQuestion;

        for (var i = 0; i < 30; i++)
        {
            var resp = await _client.PostAsJsonAsync($"/api/assessments/{id}/answers",
                new AnswerRequest(current.QuestionId, i % 2 == 0 ? "A" : "B", 3));
            resp.EnsureSuccessStatusCode();
            var body = await resp.Content.ReadFromJsonAsync<AnswerResult>();
            if (body!.Completed) break;
            current = body.NextQuestion!;
        }

        var result = await _client.GetFromJsonAsync<AssessmentResultDto>($"/api/assessments/{id}");
        Assert.Equal("Completed", result!.Status);

        // Assert: every category answered has a matching SkillScores row for the user.
        var userId = Guid.Parse(result.AssessmentId == id
            ? (await GetUserIdAsync("skillscores@test.local"))
            : string.Empty);

        var skillRows = await WithDbAsync(db => db.SkillScores
            .Where(s => s.UserId == userId)
            .ToListAsync());

        Assert.NotEmpty(skillRows);
        Assert.Equal(result.CategoryScores.Count, skillRows.Count);
        foreach (var cat in result.CategoryScores)
        {
            var match = skillRows.SingleOrDefault(s => s.Category.ToString() == cat.Category);
            Assert.NotNull(match);
            Assert.Equal(cat.Score, match!.Score);
        }
    }

    // ---------- S2-T7: 40-minute auto-timeout ----------

    [Fact]
    public async Task GET_AssessmentAfter_40MinElapsed_Returns_TimedOut()
    {
        Bearer(await RegisterAndGetAccessTokenAsync("timeout@test.local"));
        var start = await _client.PostAsJsonAsync("/api/assessments", new StartAssessmentRequest(Track.Backend));
        var id = (await start.Content.ReadFromJsonAsync<StartAssessmentResponse>())!.AssessmentId;

        // Rewind StartedAt to 41 minutes ago so the 40-min timeout has fired.
        await WithDbAsync(async db =>
        {
            var a = await db.Assessments.FirstAsync(x => x.Id == id);
            a.StartedAt = DateTime.UtcNow.AddMinutes(-41);
            await db.SaveChangesAsync();
            return true;
        });

        var res = await _client.GetFromJsonAsync<AssessmentResultDto>($"/api/assessments/{id}");
        Assert.NotNull(res);
        Assert.Equal("TimedOut", res!.Status);
        Assert.NotNull(res.CompletedAt);
    }

    // ---------- S2-T8: 30-day reattempt policy ----------

    [Fact]
    public async Task Start_Within30Days_OfCompletedAssessment_Returns_409_WithRetakeDate()
    {
        Bearer(await RegisterAndGetAccessTokenAsync("reattempt@test.local"));

        // Seed: one completed assessment 5 days ago.
        var userId = Guid.Parse(await GetUserIdAsync("reattempt@test.local"));
        await WithDbAsync(async db =>
        {
            db.Assessments.Add(new Assessment
            {
                UserId = userId,
                Track = Track.Python,
                Status = AssessmentStatus.Completed,
                StartedAt = DateTime.UtcNow.AddDays(-5).AddHours(-1),
                CompletedAt = DateTime.UtcNow.AddDays(-5),
                DurationSec = 60 * 30,
                TotalScore = 72m,
                SkillLevel = SkillLevel.Intermediate,
            });
            await db.SaveChangesAsync();
            return true;
        });

        var res = await _client.PostAsJsonAsync("/api/assessments", new StartAssessmentRequest(Track.Python));
        Assert.Equal(HttpStatusCode.Conflict, res.StatusCode);
        var body = await res.Content.ReadAsStringAsync();
        Assert.Contains("retake", body, StringComparison.OrdinalIgnoreCase);
    }

    private async Task<string> GetUserIdAsync(string email)
    {
        return await WithDbAsync(async db =>
        {
            var u = await db.Users.AsNoTracking().SingleAsync(x => x.Email == email);
            return u.Id.ToString();
        });
    }
}

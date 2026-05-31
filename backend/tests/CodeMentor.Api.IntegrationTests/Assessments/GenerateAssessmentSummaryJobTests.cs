using System.Net.Http.Headers;
using System.Net.Http.Json;
using CodeMentor.Api.IntegrationTests.TestHost;
using CodeMentor.Application.Assessments;
using CodeMentor.Application.Assessments.Contracts;
using CodeMentor.Application.Auth.Contracts;
using CodeMentor.Domain.Assessments;
using CodeMentor.Infrastructure.Assessments;
using CodeMentor.Infrastructure.CodeReview;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace CodeMentor.Api.IntegrationTests.Assessments;

/// <summary>
/// S17-T2 / F15 (ADR-049): GenerateAssessmentSummaryJob end-to-end coverage.
///
/// Acceptance bar (per implementation-plan.md S17-T2):
///   - 4 integration tests: happy path / AI down / Assessment-not-Completed
///     / mini-reassessment-no-trigger (covered as TimedOut-no-trigger here
///     since the mini-reassessment status flag ships in S20).
///
/// Uses <see cref="InlineAssessmentSummaryScheduler"/> which runs the job
/// synchronously after CompleteAsync, and <see cref="FakeAssessmentSummaryRefit"/>
/// so no live OpenAI call happens.
/// </summary>
public class GenerateAssessmentSummaryJobTests : IClassFixture<CodeMentorWebApplicationFactory>
{
    private readonly CodeMentorWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public GenerateAssessmentSummaryJobTests(CodeMentorWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient(new Microsoft.AspNetCore.Mvc.Testing.WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false,
        });
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

    private FakeAssessmentSummaryRefit ResolveAi() =>
        (FakeAssessmentSummaryRefit)_factory.Services.GetRequiredService<IAssessmentSummaryRefit>();

    private InlineAssessmentSummaryScheduler ResolveScheduler() =>
        (InlineAssessmentSummaryScheduler)_factory.Services.GetRequiredService<IAssessmentSummaryScheduler>();

    /// <summary>Drive a 30-question assessment to Completed state. Returns the assessmentId.</summary>
    private async Task<Guid> CompleteAssessmentAsync(Track track)
    {
        var start = await _client.PostAsJsonAsync("/api/assessments", new StartAssessmentRequest(track));
        start.EnsureSuccessStatusCode();
        var startBody = await start.Content.ReadFromJsonAsync<StartAssessmentResponse>();
        var assessmentId = startBody!.AssessmentId;
        var currentQuestion = startBody.FirstQuestion;

        for (int i = 0; i < 30; i++)
        {
            var answer = i % 2 == 0 ? "A" : "B";
            var ans = await _client.PostAsJsonAsync(
                $"/api/assessments/{assessmentId}/answers",
                new AnswerRequest(currentQuestion.QuestionId, answer, TimeSpentSec: 5));
            ans.EnsureSuccessStatusCode();

            var raw = await ans.Content.ReadAsStringAsync();
            var body = System.Text.Json.JsonSerializer.Deserialize<AnswerResult>(
                raw,
                new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            if (i < 29)
            {
                currentQuestion = body!.NextQuestion!;
            }
        }
        return assessmentId;
    }

    [Fact]
    public async Task CompleteAssessment_RunsSummaryJob_PersistsAssessmentSummaryRow()
    {
        Bearer(await RegisterAndGetAccessTokenAsync("summary-happy@test.local"));

        var aiBefore = ResolveAi().Calls.Count;
        var enqueueBefore = ResolveScheduler().Enqueues.Count;

        var assessmentId = await CompleteAssessmentAsync(Track.Backend);

        // The inline scheduler ran GenerateAssessmentSummaryJob synchronously after CompleteAsync.
        Assert.Equal(enqueueBefore + 1, ResolveScheduler().Enqueues.Count);
        Assert.Equal(assessmentId, ResolveScheduler().Enqueues.Last().AssessmentId);

        // The AI service was called exactly once with a fully-populated request.
        Assert.Equal(aiBefore + 1, ResolveAi().Calls.Count);
        var sentRequest = ResolveAi().Calls.Last();
        Assert.Equal("Backend", sentRequest.Track);
        Assert.NotEmpty(sentRequest.SkillLevel);
        Assert.InRange(sentRequest.TotalScore, 0.0, 100.0);
        Assert.InRange(sentRequest.DurationSec, 0, int.MaxValue);
        Assert.NotEmpty(sentRequest.CategoryScores);
        Assert.All(sentRequest.CategoryScores, c =>
        {
            Assert.NotEmpty(c.Category);
            Assert.InRange(c.Score, 0.0, 100.0);
            Assert.True(c.CorrectCount <= c.TotalAnswered);
        });

        // The persisted AssessmentSummary row matches the canned response.
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var summary = await db.AssessmentSummaries.SingleAsync(s => s.AssessmentId == assessmentId);
        Assert.Contains("OOP", summary.StrengthsParagraph);
        Assert.Contains("Databases", summary.WeaknessesParagraph);
        Assert.Contains("query design and indexing", summary.PathGuidanceParagraph);
        Assert.Equal("assessment_summary_v1", summary.PromptVersion);
        Assert.Equal(1234, summary.TokensUsed);
        Assert.Equal(0, summary.RetryCount);
        Assert.True(summary.LatencyMs >= 0, "LatencyMs should be measured");
        Assert.NotEqual(default, summary.GeneratedAt);
    }

    [Fact]
    public async Task CompleteAssessment_AiDown_SwallowsException_NoSummaryPersisted()
    {
        Bearer(await RegisterAndGetAccessTokenAsync("summary-aidown@test.local"));

        var ai = ResolveAi();
        var scheduler = ResolveScheduler();
        ai.ThrowOnNext = FakeAssessmentSummaryRefit.MakeApiException(System.Net.HttpStatusCode.ServiceUnavailable);
        var swallowedBefore = scheduler.SwallowedExceptions.Count;
        var enqueueBefore = scheduler.Enqueues.Count;

        // CompleteAsync must still succeed end-to-end — the summary failure is fire-and-forget.
        var assessmentId = await CompleteAssessmentAsync(Track.FullStack);

        Assert.Equal(enqueueBefore + 1, scheduler.Enqueues.Count);
        Assert.Equal(swallowedBefore + 1, scheduler.SwallowedExceptions.Count);

        // No AssessmentSummary row was persisted (the AI throw bubbled up to the inline scheduler which swallowed it).
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var summary = await db.AssessmentSummaries.SingleOrDefaultAsync(s => s.AssessmentId == assessmentId);
        Assert.Null(summary);
    }

    [Fact]
    public async Task SummaryJob_AssessmentInProgress_StatusGateSkipsCleanly_NoAiCall()
    {
        Bearer(await RegisterAndGetAccessTokenAsync("summary-inprogress@test.local"));

        // Start an assessment but do NOT answer the 30 questions. Status stays InProgress.
        var start = await _client.PostAsJsonAsync("/api/assessments", new StartAssessmentRequest(Track.Python));
        var startBody = await start.Content.ReadFromJsonAsync<StartAssessmentResponse>();
        var assessmentId = startBody!.AssessmentId;

        Guid userId;
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            userId = await db.Assessments.Where(a => a.Id == assessmentId).Select(a => a.UserId).SingleAsync();
            Assert.Equal(AssessmentStatus.InProgress,
                await db.Assessments.Where(a => a.Id == assessmentId).Select(a => a.Status).SingleAsync());
        }

        var aiBefore = ResolveAi().Calls.Count;

        // Direct job invocation — would normally not happen for InProgress (CompleteAsync is the
        // only enqueue site), but this tests the belt-and-suspenders status gate inside the job.
        using (var scope = _factory.Services.CreateScope())
        {
            var job = scope.ServiceProvider.GetRequiredService<GenerateAssessmentSummaryJob>();
            await job.ExecuteAsync(userId, assessmentId, CancellationToken.None);
        }

        // Status gate fires before the AI call — no AI call was made.
        Assert.Equal(aiBefore, ResolveAi().Calls.Count);

        // No summary row was persisted.
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var summary = await db.AssessmentSummaries.SingleOrDefaultAsync(s => s.AssessmentId == assessmentId);
            Assert.Null(summary);
        }
    }

    [Fact]
    public async Task SummaryJob_TimedOutAssessment_StatusGateSkipsCleanly_NoAiCall()
    {
        // Mini-reassessments (S20) will not trigger summary generation per S17 locked answer #1.
        // Today, the only equivalent we can exercise pre-S20 is a TimedOut assessment, which
        // shares the same "non-Completed status gate" code path. This test pins that gate.
        Bearer(await RegisterAndGetAccessTokenAsync("summary-timedout@test.local"));

        var start = await _client.PostAsJsonAsync("/api/assessments", new StartAssessmentRequest(Track.Backend));
        var startBody = await start.Content.ReadFromJsonAsync<StartAssessmentResponse>();
        var assessmentId = startBody!.AssessmentId;

        Guid userId;
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var assessment = await db.Assessments.SingleAsync(a => a.Id == assessmentId);
            assessment.Status = AssessmentStatus.TimedOut;
            assessment.CompletedAt = DateTime.UtcNow;
            assessment.DurationSec = 2400;
            assessment.TotalScore = 35m;
            assessment.SkillLevel = SkillLevel.Beginner;
            await db.SaveChangesAsync();
            userId = assessment.UserId;
        }

        var aiBefore = ResolveAi().Calls.Count;

        using (var scope = _factory.Services.CreateScope())
        {
            var job = scope.ServiceProvider.GetRequiredService<GenerateAssessmentSummaryJob>();
            await job.ExecuteAsync(userId, assessmentId, CancellationToken.None);
        }

        // Status gate skipped the AI call + persistence.
        Assert.Equal(aiBefore, ResolveAi().Calls.Count);

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var summary = await db.AssessmentSummaries.SingleOrDefaultAsync(s => s.AssessmentId == assessmentId);
            Assert.Null(summary);
        }
    }

    [Fact]
    public async Task SummaryJob_RerunForAlreadySummarizedAssessment_IsIdempotent()
    {
        // Bonus 5th test for Hangfire-retry safety: re-invoking the job for an
        // assessment that already has a summary row must skip cleanly without
        // a duplicate AI call (or a unique-index DB exception).
        Bearer(await RegisterAndGetAccessTokenAsync("summary-idem@test.local"));

        var assessmentId = await CompleteAssessmentAsync(Track.Backend);

        Guid userId;
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            userId = await db.Assessments.Where(a => a.Id == assessmentId).Select(a => a.UserId).SingleAsync();
        }

        var aiCallsAfterFirst = ResolveAi().Calls.Count;

        // Re-invoke the job — would normally happen via Hangfire retry on a transient error.
        using (var scope = _factory.Services.CreateScope())
        {
            var job = scope.ServiceProvider.GetRequiredService<GenerateAssessmentSummaryJob>();
            await job.ExecuteAsync(userId, assessmentId, CancellationToken.None);
        }

        // Idempotency gate fires: no second AI call, no second row.
        Assert.Equal(aiCallsAfterFirst, ResolveAi().Calls.Count);

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var rowCount = await db.AssessmentSummaries.CountAsync(s => s.AssessmentId == assessmentId);
            Assert.Equal(1, rowCount);
        }
    }
}

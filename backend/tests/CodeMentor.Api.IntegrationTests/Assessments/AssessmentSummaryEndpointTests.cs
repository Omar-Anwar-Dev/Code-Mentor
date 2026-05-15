using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using CodeMentor.Api.IntegrationTests.TestHost;
using CodeMentor.Application.Assessments.Contracts;
using CodeMentor.Application.Auth.Contracts;
using CodeMentor.Domain.Assessments;
using CodeMentor.Infrastructure.CodeReview;
using Microsoft.Extensions.DependencyInjection;

namespace CodeMentor.Api.IntegrationTests.Assessments;

/// <summary>
/// S17-T3 / F15 (ADR-049): GET /api/assessments/{id}/summary endpoint coverage.
///
/// Acceptance bar (per implementation-plan.md S17-T3):
///   - 3 integration tests; OwnsResource enforced (only the assessment's user can read).
///
/// Verifies the cache-aware contract:
///   - 200 with payload once the AssessmentSummary row exists.
///   - 409 Conflict when the row hasn't been written yet (FE polls).
///   - 404 NotFound when caller doesn't own the assessment.
/// </summary>
public class AssessmentSummaryEndpointTests : IClassFixture<CodeMentorWebApplicationFactory>
{
    private readonly CodeMentorWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public AssessmentSummaryEndpointTests(CodeMentorWebApplicationFactory factory)
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
                raw, new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            if (i < 29) currentQuestion = body!.NextQuestion!;
        }
        return assessmentId;
    }

    [Fact]
    public async Task Summary_AfterRowPersisted_Returns200WithPayload()
    {
        Bearer(await RegisterAndGetAccessTokenAsync("summary-get-200@test.local"));
        var assessmentId = await CompleteAssessmentAsync(Track.Backend);

        var res = await _client.GetAsync($"/api/assessments/{assessmentId}/summary");
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);

        var body = await res.Content.ReadFromJsonAsync<AssessmentSummaryDto>();
        Assert.NotNull(body);
        Assert.Equal(assessmentId, body!.AssessmentId);
        Assert.Contains("OOP", body.StrengthsParagraph);
        Assert.Contains("Databases", body.WeaknessesParagraph);
        Assert.Contains("query design and indexing", body.PathGuidanceParagraph);
        Assert.Equal("assessment_summary_v1", body.PromptVersion);
        Assert.Equal(1234, body.TokensUsed);
        Assert.Equal(0, body.RetryCount);
        Assert.True(body.LatencyMs >= 0);
        Assert.NotEqual(default, body.GeneratedAt);
    }

    [Fact]
    public async Task Summary_BeforeRowPersisted_Returns409Conflict()
    {
        // Force the AI service to fail so the inline scheduler swallows + no row is written.
        // The endpoint should then surface 409 Conflict (FE polls until 200).
        Bearer(await RegisterAndGetAccessTokenAsync("summary-get-409@test.local"));
        var ai = ResolveAi();
        ai.ThrowOnNext = FakeAssessmentSummaryRefit.MakeApiException(HttpStatusCode.ServiceUnavailable);
        var assessmentId = await CompleteAssessmentAsync(Track.Python);

        var res = await _client.GetAsync($"/api/assessments/{assessmentId}/summary");
        Assert.Equal(HttpStatusCode.Conflict, res.StatusCode);

        var problem = await res.Content.ReadAsStringAsync();
        Assert.Contains("being generated", problem);
    }

    [Fact]
    public async Task Summary_NonOwner_Returns404NotFound()
    {
        // Owner completes an assessment + summary row is persisted.
        Bearer(await RegisterAndGetAccessTokenAsync("summary-owner@test.local"));
        var assessmentId = await CompleteAssessmentAsync(Track.FullStack);

        // Re-bear with a different user — the OwnsResource check must reject.
        Bearer(await RegisterAndGetAccessTokenAsync("summary-stranger@test.local"));
        var res = await _client.GetAsync($"/api/assessments/{assessmentId}/summary");
        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
    }

    [Fact]
    public async Task Summary_NoAuth_Returns401Unauthorized()
    {
        // Bonus 4th test — confirms the [Authorize] attribute on the controller class
        // applies to the new endpoint too. Caught a real S2-era oversight back in the day.
        var res = await _client.GetAsync($"/api/assessments/{Guid.NewGuid()}/summary");
        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }
}

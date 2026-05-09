using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using CodeMentor.Api.IntegrationTests.TestHost;
using CodeMentor.Application.Auth.Contracts;
using CodeMentor.Domain.Submissions;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace CodeMentor.Api.IntegrationTests.Submissions;

/// <summary>
/// S5-T9 acceptance: GET /api/submissions/{id}/static-results is admin-only,
/// returns raw per-tool StaticAnalysisResult rows for a submission.
/// </summary>
public class AdminStaticResultsEndpointTests : IClassFixture<CodeMentorWebApplicationFactory>
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    private readonly CodeMentorWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public AdminStaticResultsEndpointTests(CodeMentorWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task GetStaticResults_WithoutAuth_Returns401()
    {
        var res = await _client.GetAsync($"/api/submissions/{Guid.NewGuid()}/static-results");
        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    [Fact]
    public async Task GetStaticResults_AsLearner_Returns403()
    {
        Bearer(await RegisterLearnerAsync("learner-static@test.local"));
        var res = await _client.GetAsync($"/api/submissions/{Guid.NewGuid()}/static-results");
        Assert.Equal(HttpStatusCode.Forbidden, res.StatusCode);
    }

    [Fact]
    public async Task GetStaticResults_AsAdmin_UnknownSubmission_Returns404()
    {
        Bearer(await LoginAsAdminAsync());
        var res = await _client.GetAsync($"/api/submissions/{Guid.NewGuid()}/static-results");
        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
    }

    [Fact]
    public async Task GetStaticResults_AsAdmin_ReturnsPerToolRows()
    {
        // Seed a submission + two static-analysis rows directly in DB.
        Guid subId;
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var sub = new Submission
            {
                UserId = Guid.NewGuid(),
                TaskId = Guid.NewGuid(),
                SubmissionType = SubmissionType.Upload,
                BlobPath = "u/p.zip",
                Status = SubmissionStatus.Completed,
                CompletedAt = DateTime.UtcNow,
            };
            db.Submissions.Add(sub);
            await db.SaveChangesAsync();
            subId = sub.Id;

            db.StaticAnalysisResults.AddRange(
                new StaticAnalysisResult
                {
                    SubmissionId = subId, Tool = StaticAnalysisTool.Bandit,
                    IssuesJson = "[{\"rule\":\"B101\"}]",
                    MetricsJson = "{\"totalIssues\":1}",
                    ExecutionTimeMs = 250,
                },
                new StaticAnalysisResult
                {
                    SubmissionId = subId, Tool = StaticAnalysisTool.ESLint,
                    IssuesJson = "[]",
                    MetricsJson = "{\"totalIssues\":0}",
                    ExecutionTimeMs = 180,
                });
            await db.SaveChangesAsync();
        }

        Bearer(await LoginAsAdminAsync());
        var res = await _client.GetAsync($"/api/submissions/{subId}/static-results");

        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var rows = await res.Content.ReadFromJsonAsync<List<RawStaticResultDto>>(Json);

        Assert.NotNull(rows);
        Assert.Equal(2, rows!.Count);
        Assert.Contains(rows, r => r.Tool == "Bandit" && r.ExecutionTimeMs == 250 && r.IssuesJson.Contains("B101"));
        Assert.Contains(rows, r => r.Tool == "ESLint" && r.ExecutionTimeMs == 180);
    }

    // ----- helpers -----

    private void Bearer(string token) =>
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

    private async Task<string> RegisterLearnerAsync(string email)
    {
        var res = await _client.PostAsJsonAsync("/api/auth/register",
            new RegisterRequest(email, "Strong_Pass_123!", "Learner", null));
        res.EnsureSuccessStatusCode();
        return (await res.Content.ReadFromJsonAsync<AuthResponse>(Json))!.AccessToken;
    }

    private async Task<string> LoginAsAdminAsync()
    {
        var res = await _client.PostAsJsonAsync("/api/auth/login",
            new LoginRequest("admin@codementor.local", "Admin_Dev_123!"));
        res.EnsureSuccessStatusCode();
        return (await res.Content.ReadFromJsonAsync<AuthResponse>(Json))!.AccessToken;
    }

    private sealed record RawStaticResultDto(
        string Tool,
        string IssuesJson,
        string? MetricsJson,
        int ExecutionTimeMs,
        DateTime ProcessedAt);
}

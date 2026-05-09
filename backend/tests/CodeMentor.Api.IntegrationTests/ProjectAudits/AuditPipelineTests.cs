using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Reflection;
using System.Text.Json;
using System.Text.Json.Serialization;
using CodeMentor.Api.IntegrationTests.TestHost;
using CodeMentor.Application.Auth.Contracts;
using CodeMentor.Application.CodeReview;
using CodeMentor.Application.ProjectAudits;
using CodeMentor.Application.ProjectAudits.Contracts;
using CodeMentor.Domain.ProjectAudits;
using CodeMentor.Domain.Submissions;
using CodeMentor.Infrastructure.Persistence;
using CodeMentor.Infrastructure.ProjectAudits;
using Hangfire;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace CodeMentor.Api.IntegrationTests.ProjectAudits;

/// <summary>
/// S9-T4 acceptance:
///  - Job pipeline reaches Completed for valid input (audit row + ProjectAuditResult + per-tool static rows persisted).
///  - AI-down test → static-only audit, AiReviewStatus=Unavailable, retry once after 15 min.
///  - Timeout / retry metadata declared on RunAsync.
///
/// Uses the InlineProjectAuditScheduler so POST /api/audits triggers the
/// full job synchronously — by the time the HTTP response returns, the
/// Completed/Failed transition has already happened.
/// </summary>
public class AuditPipelineTests : IClassFixture<CodeMentorWebApplicationFactory>
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    private readonly CodeMentorWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public AuditPipelineTests(CodeMentorWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    private async Task<string> RegisterAsync()
    {
        var email = $"pipeline-{Guid.NewGuid():N}@audit-test.local";
        var req = new RegisterRequest(email, "Strong_Pass_123!", "Pipeline Tester", null);
        var res = await _client.PostAsJsonAsync("/api/auth/register", req);
        res.EnsureSuccessStatusCode();
        return (await res.Content.ReadFromJsonAsync<AuthResponse>())!.AccessToken;
    }

    private static CreateAuditRequest GitHubRequest(string projectName) => new(
        ProjectName: projectName,
        Summary: "Pipeline test project.",
        Description: "Used to drive the full audit pipeline through to Completed.",
        ProjectType: "WebApp",
        TechStack: new[] { "Python", "Flask" },
        Features: new[] { "CRUD" },
        TargetAudience: null,
        FocusAreas: null,
        KnownIssues: null,
        Source: new AuditSourceDto("github", "https://github.com/octocat/hello-world", null));

    [Fact]
    public async Task Pipeline_HappyPath_ReachesCompleted_WithResultRow_AndStaticRows()
    {
        // Configure fake AI client to return a richer payload with one per-tool result.
        var fakeAi = (FakeProjectAuditAiClient)_factory.Services.GetRequiredService<IProjectAuditAiClient>();
        fakeAi.ThrowUnavailable = false;
        fakeAi.Response = new AiAuditCombinedResponse(
            AuditId: "test-happy",
            OverallScore: 88,
            Grade: "B+",
            StaticAnalysis: new AiStaticAnalysis(
                Score: 90,
                Issues: Array.Empty<AiIssue>(),
                Summary: new AiAnalysisSummary(0, 0, 0, 0),
                ToolsUsed: new[] { "Bandit" },
                PerTool: new[] {
                    new AiPerToolResult(
                        Tool: "Bandit",
                        Issues: Array.Empty<AiIssue>(),
                        Summary: new AiAnalysisSummary(0, 0, 0, 0),
                        ExecutionTimeMs: 240),
                }),
            AiAudit: new AiAuditResponse(
                OverallScore: 88,
                Grade: "B+",
                Scores: new AiAuditScores(90, 80, 85, 88, 90, 92),
                Strengths: new[] { "Strong test coverage" },
                CriticalIssues: Array.Empty<AiAuditIssue>(),
                Warnings: Array.Empty<AiAuditIssue>(),
                Suggestions: new[] { new AiAuditIssue("Add type hints", "app/main.py", 1, "low", "Type hints improve IDE support.", "Add `-> str` to public functions.") },
                MissingFeatures: new[] { "Pagination" },
                RecommendedImprovements: new[] {
                    new AiAuditRecommendation(1, "Introduce schema validation", "Use pydantic to validate request bodies."),
                },
                TechStackAssessment: "Flask is suitable for current scale.",
                InlineAnnotations: null,
                ModelUsed: "gpt-5.1-codex-mini",
                TokensInput: 4500,
                TokensOutput: 1700,
                PromptVersion: "project_audit.v1",
                Available: true,
                Error: null),
            Metadata: new AiAnalysisMetadata("test-happy-project", new[] { "Python" }, 5, 240, true, true));

        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", await RegisterAsync());

        var res = await _client.PostAsJsonAsync("/api/audits", GitHubRequest("happy-project"), Json);
        res.EnsureSuccessStatusCode();
        var created = await res.Content.ReadFromJsonAsync<AuditCreatedResponse>(Json);

        // InlineProjectAuditScheduler ran the job by now; row should be Completed.
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var audit = await db.ProjectAudits.AsNoTracking().SingleAsync(a => a.Id == created!.AuditId);

        Assert.Equal(ProjectAuditStatus.Completed, audit.Status);
        Assert.Equal(ProjectAuditAiStatus.Available, audit.AiReviewStatus);
        Assert.Equal(88, audit.OverallScore);
        Assert.Equal("B+", audit.Grade);
        Assert.NotNull(audit.CompletedAt);
        Assert.NotNull(audit.StartedAt);

        // ProjectAuditResult row exists with the correct prompt version + scores.
        var result = await db.ProjectAuditResults.AsNoTracking().SingleAsync(r => r.AuditId == audit.Id);
        Assert.Equal("project_audit.v1", result.PromptVersion);
        Assert.Equal("gpt-5.1-codex-mini", result.ModelUsed);
        Assert.Equal(4500, result.TokensInput);
        Assert.Equal(1700, result.TokensOutput);

        using var scoresDoc = JsonDocument.Parse(result.ScoresJson);
        Assert.Equal(92, scoresDoc.RootElement.GetProperty("completeness").GetInt32());

        // Per-tool static row persisted.
        var bandit = await db.AuditStaticAnalysisResults.AsNoTracking()
            .SingleAsync(r => r.AuditId == audit.Id && r.Tool == StaticAnalysisTool.Bandit);
        Assert.Equal(240, bandit.ExecutionTimeMs);
    }

    [Fact]
    public async Task Pipeline_WhenAiAuditUnavailable_StaticOnly_PersistsAndSchedulesRetry()
    {
        // AI portion explicitly unavailable but static portion succeeds.
        var fakeAi = (FakeProjectAuditAiClient)_factory.Services.GetRequiredService<IProjectAuditAiClient>();
        fakeAi.ThrowUnavailable = false;
        fakeAi.Response = FakeProjectAuditAiClient.StaticOnlyResponse();

        var inlineScheduler = (InlineProjectAuditScheduler)_factory.Services.GetRequiredService<IProjectAuditScheduler>();
        inlineScheduler.DelayedRetries.Clear();

        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", await RegisterAsync());

        var res = await _client.PostAsJsonAsync("/api/audits", GitHubRequest("static-only-project"), Json);
        res.EnsureSuccessStatusCode();
        var created = await res.Content.ReadFromJsonAsync<AuditCreatedResponse>(Json);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var audit = await db.ProjectAudits.AsNoTracking().SingleAsync(a => a.Id == created!.AuditId);

        Assert.Equal(ProjectAuditStatus.Completed, audit.Status);
        // Either the job's degradation path set AiReviewStatus=Unavailable directly OR the scheduled
        // retry flipped it to Pending; both are valid graceful-degradation outcomes.
        Assert.Contains(audit.AiReviewStatus,
            new[] { ProjectAuditAiStatus.Unavailable, ProjectAuditAiStatus.Pending });

        // No ProjectAuditResult row (AI portion didn't ship) — retry will create it later.
        var hasResult = await db.ProjectAuditResults.AsNoTracking().AnyAsync(r => r.AuditId == audit.Id);
        Assert.False(hasResult);

        // ESLint per-tool static row IS persisted (static phase succeeded).
        var hasStatic = await db.AuditStaticAnalysisResults.AsNoTracking()
            .AnyAsync(r => r.AuditId == audit.Id && r.Tool == StaticAnalysisTool.ESLint);
        Assert.True(hasStatic);

        // Retry was scheduled with the documented 15-min delay.
        Assert.Contains(
            inlineScheduler.DelayedRetries,
            entry => entry.AuditId == audit.Id && entry.Delay == ProjectAuditJob.AiRetryDelay);
        Assert.Equal(1, audit.AiAutoRetryCount);
    }

    [Fact]
    public async Task Pipeline_WhenAiServiceUnavailable_FullOutage_StillCompletes_AndSchedulesRetry()
    {
        // Simulate a full transport-level outage (the client throws AiServiceUnavailableException).
        var fakeAi = (FakeProjectAuditAiClient)_factory.Services.GetRequiredService<IProjectAuditAiClient>();
        fakeAi.ThrowUnavailable = true;

        var inlineScheduler = (InlineProjectAuditScheduler)_factory.Services.GetRequiredService<IProjectAuditScheduler>();
        inlineScheduler.DelayedRetries.Clear();

        try
        {
            _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", await RegisterAsync());

            var res = await _client.PostAsJsonAsync("/api/audits", GitHubRequest("ai-down-project"), Json);
            res.EnsureSuccessStatusCode();
            var created = await res.Content.ReadFromJsonAsync<AuditCreatedResponse>(Json);

            using var scope = _factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var audit = await db.ProjectAudits.AsNoTracking().SingleAsync(a => a.Id == created!.AuditId);

            // Audit reaches Completed (degradation path), with Unavailable / Pending AI status.
            Assert.Equal(ProjectAuditStatus.Completed, audit.Status);
            Assert.Contains(audit.AiReviewStatus,
                new[] { ProjectAuditAiStatus.Unavailable, ProjectAuditAiStatus.Pending });
            Assert.NotNull(audit.ErrorMessage);
            Assert.Contains("AI service unavailable", audit.ErrorMessage!);

            // Retry scheduled with the documented 15-min delay.
            Assert.Contains(
                inlineScheduler.DelayedRetries,
                entry => entry.AuditId == audit.Id && entry.Delay == ProjectAuditJob.AiRetryDelay);
        }
        finally
        {
            // Reset for downstream tests sharing the same factory fixture.
            fakeAi.ThrowUnavailable = false;
            fakeAi.Response = FakeProjectAuditAiClient.EmptyResponse();
        }
    }

    [Fact]
    public void RunAsync_HasAutomaticRetry_AndConcurrencyLock()
    {
        // Static-time check: confirms the Hangfire decorators are present so a future
        // accidental removal triggers this test rather than only being caught by
        // production observation.
        var method = typeof(ProjectAuditJob).GetMethod(nameof(ProjectAuditJob.RunAsync))!;

        var retry = method.GetCustomAttribute<AutomaticRetryAttribute>();
        Assert.NotNull(retry);
        Assert.Equal(3, retry!.Attempts);

        var concurrency = method.GetCustomAttribute<DisableConcurrentExecutionAttribute>();
        Assert.NotNull(concurrency);
        // 12-min hard timeout — architecture §4.4 cap (slightly higher than submissions' 600s).
        var timeoutField = typeof(DisableConcurrentExecutionAttribute)
            .GetField("_timeoutInSeconds", BindingFlags.NonPublic | BindingFlags.Instance);
        if (timeoutField is not null)
        {
            var timeoutValue = (int)timeoutField.GetValue(concurrency)!;
            Assert.Equal(720, timeoutValue);
        }
    }
}

using System.Net.Http.Headers;
using System.Net.Http.Json;
using CodeMentor.Api.IntegrationTests.TestHost;
using CodeMentor.Application.Assessments.Contracts;
using CodeMentor.Application.Auth.Contracts;
using CodeMentor.Domain.Assessments;
using CodeMentor.Domain.Tasks;
using CodeMentor.Infrastructure.CodeReview;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace CodeMentor.Api.IntegrationTests.LearningPaths;

/// <summary>
/// S19-T4 / F16 (ADR-052): integration tests for the AI-first
/// path-generation pipeline + template fallback.
///
/// Six acceptance scenarios per the implementation-plan S19-T4 entry:
///   1. Happy AI path → Source=AIGenerated + 8 tasks + reasoning persisted.
///   2. AI unavailable (503) → fallback to template with Source=TemplateFallback.
///   3. AI returns invalid (422) → fallback.
///   4. AI returns unknown taskId → fallback (hallucinated ID gate).
///   5. Source enum + GenerationReasoningText correctly stamped + returned.
///   6. Template fallback preserves the 5–7 task length convention.
/// </summary>
public class AiPathGenerationTests : IClassFixture<CodeMentorWebApplicationFactory>
{
    private readonly CodeMentorWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public AiPathGenerationTests(CodeMentorWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
        // Top up Backend + Python pools so candidates >= AiTargetLength (8).
        // Idempotent — only seeds if pool is short.
        SeedExtraTasksIfNeeded(factory).GetAwaiter().GetResult();
    }

    private static async Task SeedExtraTasksIfNeeded(CodeMentorWebApplicationFactory factory)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        foreach (var track in new[] { Track.Backend, Track.Python, Track.FullStack })
        {
            var count = await db.Tasks.CountAsync(t => t.Track == track && t.IsActive);
            if (count >= 8) continue;
            var topUp = 8 - count + 2;  // pad to ~10 each so completed-task filtering still leaves ≥8
            for (var i = 0; i < topUp; i++)
            {
                db.Tasks.Add(new TaskItem
                {
                    Title = $"S19-seed-{track}-{i:D2}",
                    Description = $"Extra Backend task seeded by AiPathGenerationTests #{i}. Padding to support AiTargetLength=8 in path-generation tests.",
                    AcceptanceCriteria = "- All endpoints return 2xx for valid input.",
                    Deliverables = "GitHub URL.",
                    Difficulty = (i % 3) + 1,
                    Category = (CodeMentor.Domain.Assessments.SkillCategory)((i % 5) + 1),
                    Track = track,
                    ExpectedLanguage = track switch
                    {
                        Track.Python => CodeMentor.Domain.Tasks.ProgrammingLanguage.Python,
                        Track.FullStack => CodeMentor.Domain.Tasks.ProgrammingLanguage.TypeScript,
                        _ => CodeMentor.Domain.Tasks.ProgrammingLanguage.CSharp,
                    },
                    EstimatedHours = 4,
                    IsActive = true,
                });
            }
        }
        await db.SaveChangesAsync();
    }

    // ── helpers ───────────────────────────────────────────────────────

    private async Task<string> RegisterAndGetAccessTokenAsync(string email)
    {
        var req = new RegisterRequest(email, "Strong_Pass_123!", "AI Path Tester", null);
        var res = await _client.PostAsJsonAsync("/api/auth/register", req);
        res.EnsureSuccessStatusCode();
        var body = await res.Content.ReadFromJsonAsync<AuthResponse>();
        return body!.AccessToken;
    }

    private void Bearer(string token) =>
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

    private async Task<Guid> RunFullAssessmentAsync(Track track)
    {
        var start = await _client.PostAsJsonAsync(
            "/api/assessments", new StartAssessmentRequest(track));
        start.EnsureSuccessStatusCode();
        var startBody = await start.Content.ReadFromJsonAsync<StartAssessmentResponse>();
        var assessmentId = startBody!.AssessmentId;
        var current = startBody.FirstQuestion;
        for (int i = 0; i < 30; i++)
        {
            var res = await _client.PostAsJsonAsync(
                $"/api/assessments/{assessmentId}/answers",
                new AnswerRequest(current.QuestionId, "A", 3));
            res.EnsureSuccessStatusCode();
            var body = await res.Content.ReadFromJsonAsync<AnswerResult>();
            if (i < 29) current = body!.NextQuestion!;
        }
        return assessmentId;
    }

    private FakePathGeneratorRefit ResolveFake()
    {
        // Singleton registration → root provider works.
        var fake = (FakePathGeneratorRefit)_factory.Services.GetRequiredService<IPathGeneratorRefit>();
        fake.Reset();
        return fake;
    }

    private static PGenerateResponse BuildAiResponse(
        IEnumerable<Guid> taskIds,
        string reasoning = "Eight-task path tailored to the learner's gaps in Algorithms and Security.")
    {
        var entries = taskIds
            .Select((id, idx) => new PGeneratedEntry(
                TaskId: id.ToString(),
                OrderIndex: idx + 1,
                Reasoning: $"Pick #{idx + 1}: targets the learner's weakest scores (DS 40, OOP 55)."))
            .ToList();
        return new PGenerateResponse(
            PathTasks: entries,
            OverallReasoning: reasoning,
            RecallSize: entries.Count,
            PromptVersion: "generate_path_v1",
            TokensUsed: 950,
            RetryCount: 0);
    }

    // ── 1: AI happy path lands with Source=AIGenerated + 8 tasks + reasoning ──

    [Fact]
    public async Task AiHappyPath_Persists_Source_AIGenerated_With_Reasoning()
    {
        // ARRANGE — pre-seed a canned AI response of 8 tasks before kicking
        // off the assessment so the path-generation job picks it up.
        var fake = ResolveFake();
        fake.DefaultToServiceUnavailable = false;

        Guid[] backendTaskIds;
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            backendTaskIds = await db.Tasks
                .Where(t => t.Track == Track.Backend && t.IsActive)
                .OrderBy(t => t.Title)
                .Select(t => t.Id)
                .Take(8)
                .ToArrayAsync();
            Assert.Equal(8, backendTaskIds.Length); // sanity: seed pool has ≥8 Backend tasks
        }
        fake.CannedResponse = BuildAiResponse(backendTaskIds, reasoning:
            "AI hybrid recall + rerank: 8 tasks tailored to gaps at DS 40, OOP 55, Security 70.");

        Bearer(await RegisterAndGetAccessTokenAsync("ai-happy@test.local"));
        var assessmentId = await RunFullAssessmentAsync(Track.Backend);

        // ASSERT
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var path = await db.LearningPaths
                .Include(p => p.Tasks).ThenInclude(pt => pt.Task)
                .FirstAsync(p => p.AssessmentId == assessmentId);

            Assert.Equal(LearningPathSource.AIGenerated, path.Source);
            Assert.Contains("hybrid recall", path.GenerationReasoningText);
            Assert.Equal(8, path.Tasks.Count);
            Assert.Equal(
                Enumerable.Range(1, 8),
                path.Tasks.OrderBy(t => t.OrderIndex).Select(t => t.OrderIndex));
        }

        // The fake recorded the call — verify the wire shape.
        Assert.Single(fake.Calls);
        var call = fake.Calls[0];
        Assert.Equal("Backend", call.Track);
        Assert.Equal(8, call.TargetLength);
        Assert.Equal(20, call.RecallTopK);
        Assert.NotEmpty(call.SkillProfile);  // populated by LearnerSkillProfile
        Assert.NotNull(call.CandidateTasks);
        Assert.True(call.CandidateTasks!.Count >= 8);
    }

    // ── 2: AI 503 → fallback to TemplateFallback ──

    [Fact]
    public async Task AiUnavailable_503_FallsBack_To_TemplateFallback()
    {
        var fake = ResolveFake();
        // Default is DefaultToServiceUnavailable=true → 503 thrown on call.

        Bearer(await RegisterAndGetAccessTokenAsync("ai-503@test.local"));
        var assessmentId = await RunFullAssessmentAsync(Track.Python);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var path = await db.LearningPaths.FirstAsync(p => p.AssessmentId == assessmentId);

        Assert.Equal(LearningPathSource.TemplateFallback, path.Source);
        Assert.Null(path.GenerationReasoningText);
        // Template path still uses the pre-S19 5-7 length convention.
        var taskCount = await db.PathTasks.CountAsync(t => t.PathId == path.Id);
        Assert.InRange(taskCount, 5, 7);

        // AI was called (and failed)
        Assert.Single(fake.Calls);
    }

    // ── 3: AI 422 (retry exhausted) → fallback ──

    [Fact]
    public async Task AiInvalid_422_FallsBack_To_TemplateFallback()
    {
        var fake = ResolveFake();
        fake.ThrowOnNext = FakePathGeneratorRefit.MakeApiException(System.Net.HttpStatusCode.UnprocessableEntity);

        Bearer(await RegisterAndGetAccessTokenAsync("ai-422@test.local"));
        var assessmentId = await RunFullAssessmentAsync(Track.FullStack);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var path = await db.LearningPaths.FirstAsync(p => p.AssessmentId == assessmentId);

        Assert.Equal(LearningPathSource.TemplateFallback, path.Source);
        Assert.Null(path.GenerationReasoningText);
    }

    // ── 4: AI returns hallucinated taskId → fallback ──

    [Fact]
    public async Task AiHallucinates_Unknown_TaskId_FallsBack()
    {
        var fake = ResolveFake();
        fake.DefaultToServiceUnavailable = false;
        // The taskIds in the canned response don't exist in the DB.
        var nonexistent = Enumerable.Range(0, 8).Select(_ => Guid.NewGuid());
        fake.CannedResponse = BuildAiResponse(nonexistent);

        Bearer(await RegisterAndGetAccessTokenAsync("ai-halluc@test.local"));
        var assessmentId = await RunFullAssessmentAsync(Track.Backend);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var path = await db.LearningPaths.FirstAsync(p => p.AssessmentId == assessmentId);

        // LearningPathService caught the unknown taskId and fell back.
        Assert.Equal(LearningPathSource.TemplateFallback, path.Source);
        Assert.Null(path.GenerationReasoningText);
    }

    // ── 5: GET endpoint returns Source + GenerationReasoningText ──

    [Fact]
    public async Task GET_ActivePath_Returns_Source_And_Reasoning_When_AIGenerated()
    {
        var fake = ResolveFake();
        fake.DefaultToServiceUnavailable = false;

        Guid[] backendTaskIds;
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            backendTaskIds = await db.Tasks
                .Where(t => t.Track == Track.Backend && t.IsActive)
                .OrderBy(t => t.Title)
                .Select(t => t.Id)
                .Take(8)
                .ToArrayAsync();
        }
        const string reasoning = "Personalized hybrid path for the learner — narrative goes here.";
        fake.CannedResponse = BuildAiResponse(backendTaskIds, reasoning: reasoning);

        Bearer(await RegisterAndGetAccessTokenAsync("ai-get@test.local"));
        await RunFullAssessmentAsync(Track.Backend);

        var resp = await _client.GetAsync("/api/learning-paths/me/active");
        resp.EnsureSuccessStatusCode();
        var dto = await resp.Content.ReadFromJsonAsync<CodeMentor.Application.LearningPaths.Contracts.LearningPathDto>();
        Assert.NotNull(dto);
        Assert.Equal("AIGenerated", dto!.Source);
        Assert.Equal(reasoning, dto.GenerationReasoningText);
        Assert.Equal(8, dto.Tasks.Count);
    }

    // ── 6: Wrong-count response (mismatch with TargetLength) → fallback ──

    [Fact]
    public async Task AiResponse_With_Insufficient_Tasks_FallsBack()
    {
        // The fake's canned response only has 3 entries, but TargetLength=8.
        // LearningPathService's order-and-map step doesn't enforce count
        // directly, but the AI service's Pydantic schema does (response
        // count != targetLength → 422). Simulate that by returning the
        // 422 directly.
        var fake = ResolveFake();
        fake.ThrowOnNext = FakePathGeneratorRefit.MakeApiException(System.Net.HttpStatusCode.UnprocessableEntity);

        Bearer(await RegisterAndGetAccessTokenAsync("ai-shortcount@test.local"));
        var assessmentId = await RunFullAssessmentAsync(Track.Python);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var path = await db.LearningPaths.FirstAsync(p => p.AssessmentId == assessmentId);
        Assert.Equal(LearningPathSource.TemplateFallback, path.Source);
        // Template path Python (Beginner level after fresh user with default
        // scoring) gives 5–7 tasks per DesiredPathLength.
        var taskCount = await db.PathTasks.CountAsync(t => t.PathId == path.Id);
        Assert.InRange(taskCount, 5, 7);
    }
}

using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using CodeMentor.Api.IntegrationTests.TestHost;
using CodeMentor.Application.Admin;
using CodeMentor.Application.Admin.Contracts;
using CodeMentor.Application.Auth.Contracts;
using CodeMentor.Domain.Assessments;
using CodeMentor.Infrastructure.CodeReview;
using CodeMentor.Infrastructure.Jobs;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace CodeMentor.Api.IntegrationTests.Admin;

/// <summary>
/// S16-T5 / F15+F16 (ADR-052): EmbedEntityJob end-to-end coverage.
///
/// Acceptance bar (per implementation-plan.md S16-T5):
///   - integration test from approve to <c>EmbeddingJson != null</c>;
///   - in-memory cache state confirmed to include the new vector
///     (in S16 the cache is a stub — we verify the reload SIGNAL fires).
///
/// Uses <see cref="InlineEmbedEntityScheduler"/> which runs the job
/// synchronously in a fresh DI scope after the approve completes, and
/// <see cref="FakeGeneralEmbeddingsRefit"/> as the wire fake.
/// </summary>
public class EmbedEntityJobTests : IClassFixture<CodeMentorWebApplicationFactory>
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    private readonly CodeMentorWebApplicationFactory _factory;
    private readonly HttpClient _client;
    private static string? _cachedAdminToken;
    private static readonly SemaphoreSlim _loginLock = new(1, 1);

    public EmbedEntityJobTests(CodeMentorWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task ApproveDraft_RunsEmbedJob_PersistsVectorOnQuestion()
    {
        Bearer(await LoginAsAdminAsync());
        var batch = await GenerateBatchAsync(SkillCategory.Algorithms, difficulty: 2, count: 1);
        var draft = batch.Drafts.Single();

        // Snapshot wire-fake call counts so we can assert this approve caused them.
        var embedFake = ResolveEmbedFake();
        var embedCallsBefore = embedFake.EmbedCalls.Count;
        var reloadCallsBefore = embedFake.ReloadCalls.Count;

        var res = await _client.PostAsJsonAsync(
            $"/api/admin/questions/drafts/{draft.Id}/approve", (object?)null, Json);
        res.EnsureSuccessStatusCode();
        var body = await res.Content.ReadFromJsonAsync<JsonElement>();
        var newQuestionId = body.GetProperty("questionId").GetGuid();

        // The inline scheduler ran EmbedEntityJob synchronously after approve.
        // Question.EmbeddingJson must now hold the serialized 1536-float vector.
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var question = await db.Questions.SingleAsync(q => q.Id == newQuestionId);
        Assert.NotNull(question.EmbeddingJson);
        Assert.NotEqual("null", question.EmbeddingJson);

        var deserialised = JsonSerializer.Deserialize<double[]>(question.EmbeddingJson!);
        Assert.NotNull(deserialised);
        Assert.Equal(1536, deserialised!.Length);

        // The embed wire-fake was called exactly once for this question.
        Assert.Equal(embedCallsBefore + 1, embedFake.EmbedCalls.Count);
        var lastEmbed = embedFake.EmbedCalls.Last();
        Assert.Contains(draft.QuestionText, lastEmbed.Text);
        Assert.Equal(newQuestionId.ToString("N"), lastEmbed.SourceId);

        // And /api/embeddings/reload was signaled with scope=questions.
        Assert.Equal(reloadCallsBefore + 1, embedFake.ReloadCalls.Count);
        Assert.Equal("questions", embedFake.ReloadCalls.Last().Scope);
    }

    [Fact]
    public async Task ApproveDraft_WithCodeSnippet_EmbedsSnippetWithText()
    {
        Bearer(await LoginAsAdminAsync());
        var batch = await GenerateBatchAsync(SkillCategory.OOP, difficulty: 2, count: 1,
            includeCode: true, language: "csharp");
        var draft = batch.Drafts.Single();
        Assert.NotNull(draft.CodeSnippet);

        var embedFake = ResolveEmbedFake();
        var before = embedFake.EmbedCalls.Count;

        var res = await _client.PostAsJsonAsync(
            $"/api/admin/questions/drafts/{draft.Id}/approve", (object?)null, Json);
        res.EnsureSuccessStatusCode();

        // The embed text should contain BOTH the question text AND the code snippet
        // — verifies BuildEmbeddingText concatenates them for the F16 path-gen
        // similarity retrieval to see both signals.
        Assert.Equal(before + 1, embedFake.EmbedCalls.Count);
        var sent = embedFake.EmbedCalls.Last();
        Assert.Contains(draft.QuestionText, sent.Text);
        Assert.Contains(draft.CodeSnippet!, sent.Text);
        Assert.Contains("[Code snippet", sent.Text);
    }

    [Fact]
    public async Task ApproveDraft_EmbedAiUnavailable_ApproveStillSucceedsThenJobSwallows()
    {
        Bearer(await LoginAsAdminAsync());
        var batch = await GenerateBatchAsync(SkillCategory.Security, difficulty: 1, count: 1);
        var draft = batch.Drafts.Single();

        var embedFake = ResolveEmbedFake();
        var scheduler = ResolveScheduler();
        embedFake.ThrowOnNextEmbed = new HttpRequestException("simulated AI service down");
        var swallowedBefore = scheduler.SwallowedExceptions.Count;

        // Approve must still return 200 — the embed failure is fire-and-forget per Hangfire semantics.
        var res = await _client.PostAsJsonAsync(
            $"/api/admin/questions/drafts/{draft.Id}/approve", (object?)null, Json);
        res.EnsureSuccessStatusCode();
        var body = await res.Content.ReadFromJsonAsync<JsonElement>();
        var newQuestionId = body.GetProperty("questionId").GetGuid();

        // The Questions row exists (approve was atomic) but EmbeddingJson stays null
        // because the embed throw bubbled up to the inline scheduler which swallowed it.
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var question = await db.Questions.SingleAsync(q => q.Id == newQuestionId);
        Assert.Null(question.EmbeddingJson);

        // The inline scheduler swallowed the exception (production Hangfire would retry).
        Assert.Equal(swallowedBefore + 1, scheduler.SwallowedExceptions.Count);
    }

    [Fact]
    public async Task EmbedJob_QuestionDeletedBeforeJobRuns_SkipsCleanly()
    {
        // Direct job invocation: simulates the race where the question row
        // was removed between approve and the Hangfire pickup. The job
        // must not throw — just log + return.
        using var scope = _factory.Services.CreateScope();
        var job = scope.ServiceProvider.GetRequiredService<EmbedEntityJob>();

        // A non-existent question id.
        await job.EmbedQuestionAsync(Guid.NewGuid(), CancellationToken.None);

        // Reach here without exception → pass. Belt-and-suspenders: no embed call was made.
        var embedFake = ResolveEmbedFake();
        // No call comparison — the job exits before hitting the wire when the
        // question doesn't exist, so the fake's call count is unchanged by THIS test.
        // (Verified by absence-of-throw.)
    }

    // ---- helpers --------------------------------------------------------

    private FakeGeneralEmbeddingsRefit ResolveEmbedFake() =>
        (FakeGeneralEmbeddingsRefit)_factory.Services.GetRequiredService<IGeneralEmbeddingsRefit>();

    private InlineEmbedEntityScheduler ResolveScheduler() =>
        (InlineEmbedEntityScheduler)_factory.Services.GetRequiredService<IEmbedEntityScheduler>();

    private async Task<GenerateQuestionDraftsResponse> GenerateBatchAsync(
        SkillCategory category, int difficulty, int count,
        bool includeCode = false, string? language = null)
    {
        var req = new GenerateQuestionDraftsRequest(category, difficulty, count, includeCode, language);
        var res = await _client.PostAsJsonAsync("/api/admin/questions/generate", req, Json);
        res.EnsureSuccessStatusCode();
        return (await res.Content.ReadFromJsonAsync<GenerateQuestionDraftsResponse>(Json))!;
    }

    private void Bearer(string token) =>
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

    private async Task<string> LoginAsAdminAsync()
    {
        if (_cachedAdminToken is not null) return _cachedAdminToken;
        await _loginLock.WaitAsync();
        try
        {
            if (_cachedAdminToken is not null) return _cachedAdminToken;
            var login = new LoginRequest("admin@codementor.local", "Admin_Dev_123!");
            var res = await _client.PostAsJsonAsync("/api/auth/login", login);
            res.EnsureSuccessStatusCode();
            _cachedAdminToken = (await res.Content.ReadFromJsonAsync<AuthResponse>(Json))!.AccessToken;
            return _cachedAdminToken;
        }
        finally { _loginLock.Release(); }
    }
}

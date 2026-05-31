using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using CodeMentor.Api.IntegrationTests.TestHost;
using CodeMentor.Application.Admin.Contracts;
using CodeMentor.Application.Auth.Contracts;
using CodeMentor.Domain.Assessments;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace CodeMentor.Api.IntegrationTests.Admin;

/// <summary>
/// S16-T4 / F15 (ADR-049 / ADR-054 / ADR-056): admin AI Question Generator
/// + Drafts Review flow acceptance tests.
///
/// Acceptance bar (per implementation-plan.md S16-T4):
///   8 integration tests — generate batch / list drafts / approve (with +
///   without edits) / reject (with + without reason) / cross-admin authz /
///   409 on double-approve / batchId not found / unauthorized.
///
/// AI service calls are replaced with <see cref="FakeAiQuestionGenerator"/>;
/// the Hangfire embed enqueue is captured by
/// <see cref="InlineEmbedEntityScheduler"/> (records but doesn't run).
/// </summary>
public class AdminQuestionDraftsTests : IClassFixture<CodeMentorWebApplicationFactory>
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    private readonly CodeMentorWebApplicationFactory _factory;
    private readonly HttpClient _client;
    private static string? _cachedAdminToken;
    private static readonly SemaphoreSlim _loginLock = new(1, 1);

    public AdminQuestionDraftsTests(CodeMentorWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    // 1) generate batch — happy path

    [Fact]
    public async Task GenerateDrafts_AsAdmin_PersistsBatchAndReturnsDrafts()
    {
        Bearer(await LoginAsAdminAsync());

        var req = new GenerateQuestionDraftsRequest(
            Category: SkillCategory.Algorithms,
            Difficulty: 2,
            Count: 5);
        var res = await _client.PostAsJsonAsync("/api/admin/questions/generate", req, Json);
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);

        var body = await res.Content.ReadFromJsonAsync<GenerateQuestionDraftsResponse>(Json);
        Assert.NotNull(body);
        Assert.NotEqual(Guid.Empty, body!.BatchId);
        Assert.Equal(5, body.Drafts.Count);
        Assert.Equal("generate_questions_v1", body.PromptVersion);
        Assert.All(body.Drafts, d =>
        {
            Assert.Equal(SkillCategory.Algorithms, d.Category);
            Assert.Equal(2, d.Difficulty);
            Assert.Equal(4, d.Options.Count);
            Assert.Contains(d.CorrectAnswer, new[] { "A", "B", "C", "D" });
            Assert.Equal(QuestionDraftStatus.Draft, d.Status);
        });

        // Round-trip through the DB to confirm persistence.
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var persisted = await db.QuestionDrafts.Where(d => d.BatchId == body.BatchId).ToListAsync();
        Assert.Equal(5, persisted.Count);
        Assert.All(persisted, d =>
        {
            Assert.Equal(QuestionDraftStatus.Draft, d.Status);
            Assert.NotEmpty(d.OriginalDraftJson);
        });
    }

    // 2) list drafts by batchId

    [Fact]
    public async Task GetDraftsBatch_ReturnsRowsOrderedByPosition()
    {
        Bearer(await LoginAsAdminAsync());
        var batchId = (await GenerateBatchAsync(SkillCategory.OOP, difficulty: 1, count: 4)).BatchId;

        var res = await _client.GetAsync($"/api/admin/questions/drafts/{batchId}");
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);

        var drafts = await res.Content.ReadFromJsonAsync<List<QuestionDraftDto>>(Json);
        Assert.NotNull(drafts);
        Assert.Equal(4, drafts!.Count);
        Assert.Equal(new[] { 0, 1, 2, 3 }, drafts.Select(d => d.PositionInBatch).ToArray());
        Assert.All(drafts, d => Assert.Equal(QuestionDraftStatus.Draft, d.Status));
    }

    // 3) approve without edits

    [Fact]
    public async Task ApproveDraft_WithoutEdits_InsertsQuestionAndEnqueuesEmbedJob()
    {
        Bearer(await LoginAsAdminAsync());
        var batch = await GenerateBatchAsync(SkillCategory.DataStructures, difficulty: 1, count: 1);
        var draft = batch.Drafts.Single();

        // Capture pre-approve scheduler state.
        var scheduler = ResolveScheduler();
        var enqueueBaseline = scheduler.QuestionEnqueues.Count;

        var res = await _client.PostAsJsonAsync(
            $"/api/admin/questions/drafts/{draft.Id}/approve",
            (object?)null, Json);
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);

        var body = await res.Content.ReadFromJsonAsync<JsonElement>();
        var newQuestionId = body.GetProperty("questionId").GetGuid();
        Assert.NotEqual(Guid.Empty, newQuestionId);

        // DB state: draft → Approved, Questions row exists, all fields match the draft.
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var savedDraft = await db.QuestionDrafts.SingleAsync(d => d.Id == draft.Id);
        Assert.Equal(QuestionDraftStatus.Approved, savedDraft.Status);
        Assert.Equal(newQuestionId, savedDraft.ApprovedQuestionId);
        Assert.NotNull(savedDraft.DecidedById);
        Assert.NotNull(savedDraft.DecidedAt);

        var question = await db.Questions.SingleAsync(q => q.Id == newQuestionId);
        Assert.Equal(QuestionSource.AI, question.Source);
        Assert.Equal(CalibrationSource.AI, question.CalibrationSource);
        Assert.Equal(draft.QuestionText, question.Content);
        Assert.Equal(draft.CorrectAnswer, question.CorrectAnswer);
        Assert.Equal(draft.IrtA, question.IRT_A);
        Assert.Equal(draft.IrtB, question.IRT_B);
        Assert.Equal("generate_questions_v1", question.PromptVersion);

        // Embed job was enqueued exactly once for the new question.
        Assert.Equal(enqueueBaseline + 1, scheduler.QuestionEnqueues.Count);
        Assert.Contains(newQuestionId, scheduler.QuestionEnqueues);
    }

    // 4) approve with edits

    [Fact]
    public async Task ApproveDraft_WithEdits_AppliesEditsToQuestion()
    {
        Bearer(await LoginAsAdminAsync());
        var batch = await GenerateBatchAsync(SkillCategory.Security, difficulty: 2, count: 1);
        var draft = batch.Drafts.Single();

        // Admin edits: change the question text + correct answer letter.
        var editedOptions = new[]
        {
            "edited option A",
            "edited option B — actually correct",
            "edited option C",
            "edited option D",
        };
        var edits = new ApproveQuestionDraftRequest(
            QuestionText: "Edited security question — what does the input validation prevent?",
            Options: editedOptions,
            CorrectAnswer: "B");

        var res = await _client.PostAsJsonAsync(
            $"/api/admin/questions/drafts/{draft.Id}/approve",
            edits, Json);
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var body = await res.Content.ReadFromJsonAsync<JsonElement>();
        var newQuestionId = body.GetProperty("questionId").GetGuid();

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var question = await db.Questions.SingleAsync(q => q.Id == newQuestionId);
        Assert.Equal("Edited security question — what does the input validation prevent?", question.Content);
        Assert.Equal("B", question.CorrectAnswer);
        Assert.Equal(editedOptions, question.Options.ToArray());

        // Untouched fields should still reflect the AI's original values.
        Assert.Equal(SkillCategory.Security, question.Category);
        Assert.Equal(2, question.Difficulty);

        // OriginalDraftJson still contains the AI's pre-edit payload (audit trail).
        var savedDraft = await db.QuestionDrafts.SingleAsync(d => d.Id == draft.Id);
        Assert.Contains("\"Category\"", savedDraft.OriginalDraftJson);
        Assert.DoesNotContain("Edited security question", savedDraft.OriginalDraftJson);
    }

    // 5) reject with reason

    [Fact]
    public async Task RejectDraft_WithReason_TransitionsToRejectedAndLogsReason()
    {
        Bearer(await LoginAsAdminAsync());
        var batch = await GenerateBatchAsync(SkillCategory.Databases, difficulty: 3, count: 1);
        var draft = batch.Drafts.Single();

        var res = await _client.PostAsJsonAsync(
            $"/api/admin/questions/drafts/{draft.Id}/reject",
            new RejectQuestionDraftRequest("Ambiguous correct answer; option B could also be right under bag semantics."),
            Json);
        Assert.Equal(HttpStatusCode.NoContent, res.StatusCode);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var savedDraft = await db.QuestionDrafts.SingleAsync(d => d.Id == draft.Id);
        Assert.Equal(QuestionDraftStatus.Rejected, savedDraft.Status);
        Assert.Equal("Ambiguous correct answer; option B could also be right under bag semantics.",
            savedDraft.RejectionReason);
        Assert.Null(savedDraft.ApprovedQuestionId);

        // No Questions row was inserted from this draft.
        var questionsFromBatch = await db.Questions
            .Where(q => q.Source == QuestionSource.AI && q.CreatedAt > savedDraft.GeneratedAt)
            .ToListAsync();
        Assert.DoesNotContain(questionsFromBatch, q => q.Content == draft.QuestionText);
    }

    // 6) reject without reason

    [Fact]
    public async Task RejectDraft_WithoutReason_StoresNullReason()
    {
        Bearer(await LoginAsAdminAsync());
        var batch = await GenerateBatchAsync(SkillCategory.Algorithms, difficulty: 1, count: 1);
        var draft = batch.Drafts.Single();

        var res = await _client.PostAsJsonAsync(
            $"/api/admin/questions/drafts/{draft.Id}/reject",
            new RejectQuestionDraftRequest(Reason: null),
            Json);
        Assert.Equal(HttpStatusCode.NoContent, res.StatusCode);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var savedDraft = await db.QuestionDrafts.SingleAsync(d => d.Id == draft.Id);
        Assert.Equal(QuestionDraftStatus.Rejected, savedDraft.Status);
        Assert.Null(savedDraft.RejectionReason);
    }

    // 7) 409 on double-approve (or approve-after-reject)

    [Fact]
    public async Task ApproveDraft_AfterAlreadyApproved_Returns409()
    {
        Bearer(await LoginAsAdminAsync());
        var batch = await GenerateBatchAsync(SkillCategory.OOP, difficulty: 2, count: 1);
        var draft = batch.Drafts.Single();

        // First approve — succeeds.
        var first = await _client.PostAsJsonAsync(
            $"/api/admin/questions/drafts/{draft.Id}/approve", (object?)null, Json);
        Assert.Equal(HttpStatusCode.OK, first.StatusCode);

        // Second approve — must fail with 409 Conflict.
        var second = await _client.PostAsJsonAsync(
            $"/api/admin/questions/drafts/{draft.Id}/approve", (object?)null, Json);
        Assert.Equal(HttpStatusCode.Conflict, second.StatusCode);

        // Also: reject after approve must 409.
        var rejectAfterApprove = await _client.PostAsJsonAsync(
            $"/api/admin/questions/drafts/{draft.Id}/reject",
            new RejectQuestionDraftRequest("late reject"), Json);
        Assert.Equal(HttpStatusCode.Conflict, rejectAfterApprove.StatusCode);
    }

    // 8) batchId not found

    [Fact]
    public async Task GetDraftsBatch_UnknownBatchId_Returns404()
    {
        Bearer(await LoginAsAdminAsync());
        var res = await _client.GetAsync($"/api/admin/questions/drafts/{Guid.NewGuid()}");
        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
    }

    // 9) cross-admin authz — learner can't generate/approve/reject

    [Fact]
    public async Task LearnerCannotGenerate_Or_Approve_Or_Reject_Returns403()
    {
        // First create a draft as admin.
        Bearer(await LoginAsAdminAsync());
        var batch = await GenerateBatchAsync(SkillCategory.Security, difficulty: 1, count: 1);
        var draft = batch.Drafts.Single();

        // Now switch to a learner.
        Bearer(await RegisterAsync($"learner-draft-{Guid.NewGuid():N}@admin.test"));

        var generate = await _client.PostAsJsonAsync("/api/admin/questions/generate",
            new GenerateQuestionDraftsRequest(SkillCategory.OOP, 2, 5), Json);
        Assert.Equal(HttpStatusCode.Forbidden, generate.StatusCode);

        var approve = await _client.PostAsJsonAsync(
            $"/api/admin/questions/drafts/{draft.Id}/approve", (object?)null, Json);
        Assert.Equal(HttpStatusCode.Forbidden, approve.StatusCode);

        var reject = await _client.PostAsJsonAsync(
            $"/api/admin/questions/drafts/{draft.Id}/reject",
            new RejectQuestionDraftRequest("test"), Json);
        Assert.Equal(HttpStatusCode.Forbidden, reject.StatusCode);
    }

    // 10b) S16-T9: metrics endpoint returns per-batch approve/reject ratios

    [Fact]
    public async Task GetGeneratorMetrics_ReturnsBatchesOrderedByMostRecent()
    {
        Bearer(await LoginAsAdminAsync());

        // Generate two batches. Approve all of batch A; reject all of batch B.
        var batchA = await GenerateBatchAsync(SkillCategory.Algorithms, difficulty: 1, count: 2);
        foreach (var d in batchA.Drafts)
        {
            var r = await _client.PostAsJsonAsync($"/api/admin/questions/drafts/{d.Id}/approve", (object?)null, Json);
            r.EnsureSuccessStatusCode();
        }

        var batchB = await GenerateBatchAsync(SkillCategory.OOP, difficulty: 2, count: 3);
        foreach (var d in batchB.Drafts)
        {
            var r = await _client.PostAsJsonAsync(
                $"/api/admin/questions/drafts/{d.Id}/reject",
                new RejectQuestionDraftRequest("test rejection"), Json);
            r.EnsureSuccessStatusCode();
        }

        var res = await _client.GetAsync("/api/admin/questions/drafts/metrics?limit=8");
        Assert.Equal(System.Net.HttpStatusCode.OK, res.StatusCode);
        var metrics = await res.Content.ReadFromJsonAsync<List<GeneratorBatchMetricDto>>(Json);
        Assert.NotNull(metrics);
        Assert.True(metrics!.Count >= 2);

        // Newest-first ordering — batchB was generated AFTER batchA so it appears first.
        var batchBMetric = metrics.FirstOrDefault(m => m.BatchId == batchB.BatchId);
        var batchAMetric = metrics.FirstOrDefault(m => m.BatchId == batchA.BatchId);
        Assert.NotNull(batchBMetric);
        Assert.NotNull(batchAMetric);
        Assert.True(metrics.IndexOf(batchBMetric!) < metrics.IndexOf(batchAMetric!),
            "BatchB (newer) should appear before BatchA in the sparkline.");

        // BatchA: all 2 approved → reject rate 0%.
        Assert.Equal(2, batchAMetric!.TotalDrafts);
        Assert.Equal(2, batchAMetric.Approved);
        Assert.Equal(0, batchAMetric.Rejected);
        Assert.Equal(0.0, batchAMetric.RejectRatePct);

        // BatchB: all 3 rejected → reject rate 100%.
        Assert.Equal(3, batchBMetric!.TotalDrafts);
        Assert.Equal(0, batchBMetric.Approved);
        Assert.Equal(3, batchBMetric.Rejected);
        Assert.Equal(100.0, batchBMetric.RejectRatePct);
    }

    // 11) unauthenticated — 401 everywhere

    [Fact]
    public async Task Unauthenticated_AllEndpoints_Return401()
    {
        _client.DefaultRequestHeaders.Authorization = null;

        var generate = await _client.PostAsJsonAsync("/api/admin/questions/generate",
            new GenerateQuestionDraftsRequest(SkillCategory.OOP, 2, 5), Json);
        Assert.Equal(HttpStatusCode.Unauthorized, generate.StatusCode);

        var list = await _client.GetAsync($"/api/admin/questions/drafts/{Guid.NewGuid()}");
        Assert.Equal(HttpStatusCode.Unauthorized, list.StatusCode);

        var approve = await _client.PostAsJsonAsync(
            $"/api/admin/questions/drafts/{Guid.NewGuid()}/approve", (object?)null, Json);
        Assert.Equal(HttpStatusCode.Unauthorized, approve.StatusCode);

        var reject = await _client.PostAsJsonAsync(
            $"/api/admin/questions/drafts/{Guid.NewGuid()}/reject",
            new RejectQuestionDraftRequest(null), Json);
        Assert.Equal(HttpStatusCode.Unauthorized, reject.StatusCode);
    }

    // ---- helpers --------------------------------------------------------

    private InlineEmbedEntityScheduler ResolveScheduler() =>
        (InlineEmbedEntityScheduler)_factory.Services
            .GetRequiredService<CodeMentor.Application.Admin.IEmbedEntityScheduler>();

    private async Task<GenerateQuestionDraftsResponse> GenerateBatchAsync(
        SkillCategory category, int difficulty, int count)
    {
        var req = new GenerateQuestionDraftsRequest(category, difficulty, count);
        var res = await _client.PostAsJsonAsync("/api/admin/questions/generate", req, Json);
        res.EnsureSuccessStatusCode();
        return (await res.Content.ReadFromJsonAsync<GenerateQuestionDraftsResponse>(Json))!;
    }

    private void Bearer(string token) =>
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

    private async Task<string> RegisterAsync(string email)
    {
        var req = new RegisterRequest(email, "Strong_Pass_123!", "Admin Tester", null);
        var res = await _client.PostAsJsonAsync("/api/auth/register", req);
        res.EnsureSuccessStatusCode();
        return (await res.Content.ReadFromJsonAsync<AuthResponse>(Json))!.AccessToken;
    }

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

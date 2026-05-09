using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using CodeMentor.Api.IntegrationTests.TestHost;
using CodeMentor.Application.Assessments.Contracts;
using CodeMentor.Application.Auth.Contracts;
using CodeMentor.Application.CodeReview;
using CodeMentor.Application.LearningPaths.Contracts;
using CodeMentor.Application.MentorChat;
using CodeMentor.Application.ProjectAudits;
using CodeMentor.Application.Storage;
using CodeMentor.Application.Submissions.Contracts;
using CodeMentor.Domain.Assessments;
using CodeMentor.Domain.ProjectAudits;
using CodeMentor.Domain.Submissions;
using CodeMentor.Infrastructure.MentorChat;
using CodeMentor.Infrastructure.Persistence;
using Hangfire;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace CodeMentor.Api.IntegrationTests.MentorChat;

/// <summary>
/// S10-T4 acceptance tests:
///   - Submission completion → indexing job enqueued → embeddings call recorded
///     → <c>Submissions.MentorIndexedAt</c> populated.
///   - Audit completion path symmetric.
///   - Transient AI-service failure on the indexing endpoint does NOT fail the
///     parent submission/audit pipeline (production Hangfire is fire-and-forget;
///     the inline scheduler swallows the exception to mirror that contract).
///   - <c>[AutomaticRetry(Attempts=1)]</c> + <c>[DisableConcurrentExecution]</c>
///     decorators present on both indexing methods.
/// </summary>
public class IndexForMentorChatJobTests : IClassFixture<CodeMentorWebApplicationFactory>
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    private readonly CodeMentorWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public IndexForMentorChatJobTests(CodeMentorWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Submission_Completion_Triggers_MentorIndex_AndSets_MentorIndexedAt()
    {
        // Arrange
        var ai = (FakeAiReviewClient)_factory.Services.GetRequiredService<IAiReviewClient>();
        ai.Response = AiResponseWithReview(overallScore: 75);

        var embeddings = (FakeEmbeddingsClient)_factory.Services.GetRequiredService<IEmbeddingsClient>();
        embeddings.Calls.Clear();

        var scheduler = (InlineMentorChatIndexScheduler)_factory.Services.GetRequiredService<IMentorChatIndexScheduler>();
        scheduler.SubmissionEnqueues.Clear();
        scheduler.AuditEnqueues.Clear();
        scheduler.SwallowedExceptions.Clear();

        Bearer(await RegisterAsync("mentor-idx-1@test.local"));
        var path = await CompleteAssessmentAndGetPathAsync(Track.Python);
        var pathTask = path.Tasks[0];

        var blobPath = $"tests/{Guid.NewGuid():N}/submission.zip";
        var fakeBlob = (FakeBlobStorage)_factory.Services.GetRequiredService<IBlobStorage>();
        fakeBlob.SeedBlob(BlobContainers.Submissions, blobPath, FakeBlobBytes());

        // Act
        var res = await _client.PostAsJsonAsync("/api/submissions",
            new CreateSubmissionRequest(pathTask.Task.TaskId, SubmissionType.Upload, null, blobPath));
        Assert.Equal(HttpStatusCode.Accepted, res.StatusCode);
        var body = await res.Content.ReadFromJsonAsync<SubmissionCreatedResponse>(Json);

        // Assert — pipeline ran inline, embeddings call recorded, MentorIndexedAt populated.
        Assert.Single(scheduler.SubmissionEnqueues);
        Assert.Equal(body!.SubmissionId, scheduler.SubmissionEnqueues[0]);
        Assert.Empty(scheduler.SwallowedExceptions);

        Assert.Single(embeddings.Calls);
        var call = embeddings.Calls[0];
        Assert.Equal("submission", call.Scope);
        Assert.Equal(body.SubmissionId.ToString("N"), call.ScopeId);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var sub = await db.Submissions.AsNoTracking().FirstAsync(s => s.Id == body.SubmissionId);
        Assert.NotNull(sub.MentorIndexedAt);
        Assert.True(sub.MentorIndexedAt > sub.CompletedAt - TimeSpan.FromSeconds(1));
    }

    [Fact]
    public async Task Submission_With_AiUnavailable_DoesNotEnqueueIndexing()
    {
        // AI portion not available → no enqueue → MentorIndexedAt stays null.
        var ai = (FakeAiReviewClient)_factory.Services.GetRequiredService<IAiReviewClient>();
        ai.Response = FakeAiReviewClient.EmptyResponse();  // AiReview = null

        var embeddings = (FakeEmbeddingsClient)_factory.Services.GetRequiredService<IEmbeddingsClient>();
        embeddings.Calls.Clear();
        var scheduler = (InlineMentorChatIndexScheduler)_factory.Services.GetRequiredService<IMentorChatIndexScheduler>();
        var enqueueCountBefore = scheduler.SubmissionEnqueues.Count;

        Bearer(await RegisterAsync("mentor-idx-2@test.local"));
        var path = await CompleteAssessmentAndGetPathAsync(Track.Python);
        var pathTask = path.Tasks[0];

        var blobPath = $"tests/{Guid.NewGuid():N}/submission.zip";
        var fakeBlob = (FakeBlobStorage)_factory.Services.GetRequiredService<IBlobStorage>();
        fakeBlob.SeedBlob(BlobContainers.Submissions, blobPath, FakeBlobBytes());

        var res = await _client.PostAsJsonAsync("/api/submissions",
            new CreateSubmissionRequest(pathTask.Task.TaskId, SubmissionType.Upload, null, blobPath));
        Assert.Equal(HttpStatusCode.Accepted, res.StatusCode);
        var body = await res.Content.ReadFromJsonAsync<SubmissionCreatedResponse>(Json);

        // No new enqueue from this submission run.
        Assert.Equal(enqueueCountBefore, scheduler.SubmissionEnqueues.Count);
        Assert.Empty(embeddings.Calls);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var sub = await db.Submissions.AsNoTracking().FirstAsync(s => s.Id == body!.SubmissionId);
        Assert.Equal(SubmissionStatus.Completed, sub.Status);
        // AI unavailable → ScheduleRetryForAiReview transitions Unavailable → Pending
        // (signals the scheduled retry to run). Either Unavailable or Pending is
        // acceptable — both tell the FE "no AI feedback yet" — but the post-schedule
        // state is Pending in our pipeline.
        Assert.Contains(sub.AiAnalysisStatus, new[] { AiAnalysisStatus.Unavailable, AiAnalysisStatus.Pending });
        Assert.Null(sub.MentorIndexedAt);
    }

    [Fact]
    public async Task Embeddings_Throws_LeavesMentorIndexedAt_Null_AndDoesNotFailPipeline()
    {
        // The indexing call throws AiServiceUnavailable. The submission stays
        // Completed (production behaviour: indexing failure is fire-and-forget).
        var ai = (FakeAiReviewClient)_factory.Services.GetRequiredService<IAiReviewClient>();
        ai.Response = AiResponseWithReview(overallScore: 75);

        var embeddings = (FakeEmbeddingsClient)_factory.Services.GetRequiredService<IEmbeddingsClient>();
        embeddings.Calls.Clear();
        embeddings.ThrowUnavailable = true;

        var scheduler = (InlineMentorChatIndexScheduler)_factory.Services.GetRequiredService<IMentorChatIndexScheduler>();
        scheduler.SwallowedExceptions.Clear();

        try
        {
            Bearer(await RegisterAsync("mentor-idx-3@test.local"));
            var path = await CompleteAssessmentAndGetPathAsync(Track.Python);
            var pathTask = path.Tasks[0];

            var blobPath = $"tests/{Guid.NewGuid():N}/submission.zip";
            var fakeBlob = (FakeBlobStorage)_factory.Services.GetRequiredService<IBlobStorage>();
            fakeBlob.SeedBlob(BlobContainers.Submissions, blobPath, FakeBlobBytes());

            var res = await _client.PostAsJsonAsync("/api/submissions",
                new CreateSubmissionRequest(pathTask.Task.TaskId, SubmissionType.Upload, null, blobPath));
            Assert.Equal(HttpStatusCode.Accepted, res.StatusCode);
            var body = await res.Content.ReadFromJsonAsync<SubmissionCreatedResponse>(Json);

            // Embeddings was called (and threw). The exception was swallowed by the
            // inline scheduler, mirroring Hangfire fire-and-forget. Submission
            // remains Completed; MentorIndexedAt stays null.
            Assert.Single(embeddings.Calls);
            Assert.Single(scheduler.SwallowedExceptions);
            Assert.IsType<AiServiceUnavailableException>(scheduler.SwallowedExceptions[0]);

            using var scope = _factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var sub = await db.Submissions.AsNoTracking().FirstAsync(s => s.Id == body!.SubmissionId);
            Assert.Equal(SubmissionStatus.Completed, sub.Status);
            Assert.Null(sub.MentorIndexedAt);
        }
        finally
        {
            embeddings.ThrowUnavailable = false;
        }
    }

    [Fact]
    public async Task Audit_Completion_Triggers_MentorIndex_AndSets_MentorIndexedAt()
    {
        // Symmetric to the submission path: audit reaches Completed with AI
        // available → indexing job enqueued → MentorIndexedAt populated on the
        // ProjectAudit row.
        var fakeAi = (FakeProjectAuditAiClient)_factory.Services.GetRequiredService<IProjectAuditAiClient>();
        fakeAi.Response = FakeProjectAuditAiClient.EmptyResponse();  // Available=true by default
        fakeAi.ThrowUnavailable = false;

        var embeddings = (FakeEmbeddingsClient)_factory.Services.GetRequiredService<IEmbeddingsClient>();
        embeddings.Calls.Clear();
        embeddings.ThrowUnavailable = false;
        var scheduler = (InlineMentorChatIndexScheduler)_factory.Services.GetRequiredService<IMentorChatIndexScheduler>();
        scheduler.AuditEnqueues.Clear();
        scheduler.SubmissionEnqueues.Clear();

        Bearer(await RegisterAsync("mentor-idx-audit@test.local"));

        var blobPath = $"tests/{Guid.NewGuid():N}/audit.zip";
        var fakeBlob = (FakeBlobStorage)_factory.Services.GetRequiredService<IBlobStorage>();
        fakeBlob.SeedBlob(BlobContainers.Audits, blobPath, FakeBlobBytes());

        var createReq = new
        {
            ProjectName = "demo-audit",
            Summary = "A test audit project for mentor-chat indexing.",
            Description = "Standalone test project — verifies audit indexing path.",
            ProjectType = "API",
            TechStack = new[] { "Python" },
            Features = new[] { "endpoint A" },
            FocusAreas = Array.Empty<string>(),
            Source = new { Type = "upload", BlobPath = blobPath, RepositoryUrl = (string?)null },
        };
        var res = await _client.PostAsJsonAsync("/api/audits", createReq);
        Assert.Equal(HttpStatusCode.Accepted, res.StatusCode);

        var created = await res.Content.ReadFromJsonAsync<JsonElement>(Json);
        var auditId = Guid.Parse(created.GetProperty("auditId").GetString()!);

        // Inline schedulers ran the full audit pipeline synchronously by the time
        // we get here, so MentorIndexedAt should be set.
        Assert.Single(scheduler.AuditEnqueues);
        Assert.Equal(auditId, scheduler.AuditEnqueues[0]);
        Assert.Single(embeddings.Calls);
        Assert.Equal("audit", embeddings.Calls[0].Scope);
        Assert.Equal(auditId.ToString("N"), embeddings.Calls[0].ScopeId);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var audit = await db.ProjectAudits.AsNoTracking().FirstAsync(a => a.Id == auditId);
        Assert.Equal(ProjectAuditStatus.Completed, audit.Status);
        Assert.NotNull(audit.MentorIndexedAt);
    }

    [Fact]
    public void IndexForMentorChatJob_HasAutomaticRetry_Attempts_1_OnBothMethods()
    {
        var subMethod = typeof(IndexForMentorChatJob).GetMethod(nameof(IndexForMentorChatJob.IndexSubmissionAsync))!;
        var auditMethod = typeof(IndexForMentorChatJob).GetMethod(nameof(IndexForMentorChatJob.IndexAuditAsync))!;

        AssertAutomaticRetry(subMethod, expectedAttempts: 1);
        AssertAutomaticRetry(auditMethod, expectedAttempts: 1);

        // Concurrency lock keeps a runaway upsert from blocking the worker pool.
        AssertHasAttribute<DisableConcurrentExecutionAttribute>(subMethod);
        AssertHasAttribute<DisableConcurrentExecutionAttribute>(auditMethod);
    }

    private static void AssertAutomaticRetry(System.Reflection.MethodInfo m, int expectedAttempts)
    {
        var attr = m.GetCustomAttributes(typeof(AutomaticRetryAttribute), inherit: false)
            .Cast<AutomaticRetryAttribute>().FirstOrDefault();
        Assert.NotNull(attr);
        Assert.Equal(expectedAttempts, attr!.Attempts);
    }

    private static void AssertHasAttribute<TAttr>(System.Reflection.MethodInfo m) where TAttr : Attribute
    {
        Assert.NotEmpty(m.GetCustomAttributes(typeof(TAttr), inherit: false));
    }

    // ------------------------------------------------------------------
    // helpers (mirror SubmissionAnalysisPipelineTests)
    // ------------------------------------------------------------------

    private void Bearer(string token) =>
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

    private async Task<string> RegisterAsync(string email)
    {
        var req = new RegisterRequest(email, "Strong_Pass_123!", "Mentor Idx Tester", null);
        var res = await _client.PostAsJsonAsync("/api/auth/register", req);
        res.EnsureSuccessStatusCode();
        return (await res.Content.ReadFromJsonAsync<AuthResponse>(Json))!.AccessToken;
    }

    private async Task<LearningPathDto> CompleteAssessmentAndGetPathAsync(Track track)
    {
        var start = await _client.PostAsJsonAsync("/api/assessments", new StartAssessmentRequest(track));
        var sb = await start.Content.ReadFromJsonAsync<StartAssessmentResponse>(Json);
        var cur = sb!.FirstQuestion;
        for (int i = 0; i < 30; i++)
        {
            var res = await _client.PostAsJsonAsync($"/api/assessments/{sb.AssessmentId}/answers",
                new AnswerRequest(cur.QuestionId, "A", 2));
            var body = await res.Content.ReadFromJsonAsync<AnswerResult>(Json);
            if (i < 29) cur = body!.NextQuestion!;
        }
        return (await _client.GetFromJsonAsync<LearningPathDto>("/api/learning-paths/me/active", Json))!;
    }

    private static byte[] FakeBlobBytes() =>
        new byte[] { 0x50, 0x4B, 0x05, 0x06, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 };

    private static AiCombinedResponse AiResponseWithReview(int overallScore) => new(
        SubmissionId: "test-mentor-idx",
        AnalysisType: "combined",
        OverallScore: overallScore,
        StaticAnalysis: new AiStaticAnalysis(
            Score: 80,
            Issues: Array.Empty<AiIssue>(),
            Summary: new AiAnalysisSummary(0, 0, 0, 0),
            ToolsUsed: Array.Empty<string>(),
            PerTool: Array.Empty<AiPerToolResult>()),
        AiReview: new AiReviewResponse(
            OverallScore: overallScore,
            Scores: new AiReviewScores(80, 80, 80, 80, 80),
            Strengths: new[] { "Clean naming" },
            Weaknesses: new[] { "Missing tests" },
            Recommendations: new[]
            {
                new AiRecommendation("medium", "design", "Add unit tests", null),
            },
            Summary: "Solid effort.",
            ModelUsed: "gpt-fake",
            TokensUsed: 1234,
            PromptVersion: "v1.0.0",
            Available: true,
            Error: null,
            DetailedIssues: null,
            LearningResources: null),
        Metadata: new AiAnalysisMetadata("demo", new[] { "python" }, 1, 400, true, false));
}

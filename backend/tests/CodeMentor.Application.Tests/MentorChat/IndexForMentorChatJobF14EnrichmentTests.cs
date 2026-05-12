using System.IO.Compression;
using System.Text;
using System.Text.Json;
using CodeMentor.Application.CodeReview;
using CodeMentor.Application.MentorChat;
using CodeMentor.Application.ProjectAudits;
using CodeMentor.Application.Submissions;
using CodeMentor.Domain.ProjectAudits;
using CodeMentor.Domain.Submissions;
using CodeMentor.Domain.Tasks;
using CodeMentor.Infrastructure.MentorChat;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace CodeMentor.Application.Tests.MentorChat;

/// <summary>
/// S12-T4 / F14 (ADR-040): focused unit tests verifying that
/// <see cref="IndexForMentorChatJob"/> enriches the embeddings upsert
/// request with <c>UserId</c>, <c>TaskId</c>, and <c>TaskName</c> so the
/// indexed Qdrant payload carries enough context for cross-submission
/// RAG retrieval. Companion integration tests in
/// <c>CodeMentor.Api.IntegrationTests.MentorChat.IndexForMentorChatJobTests</c>
/// exercise the same path through the full WebApplicationFactory.
/// </summary>
public class IndexForMentorChatJobF14EnrichmentTests
{
    private static ApplicationDbContext NewDb() => new(
        new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase($"idxf14_{Guid.NewGuid():N}")
            .Options);

    private sealed class CapturingEmbeddingsClient : IEmbeddingsClient
    {
        public List<EmbeddingsUpsertRequest> Calls { get; } = new();

        public Task<EmbeddingsUpsertResult> UpsertAsync(
            EmbeddingsUpsertRequest request, string correlationId, CancellationToken ct = default)
        {
            Calls.Add(request);
            return Task.FromResult(new EmbeddingsUpsertResult(
                Indexed: 5, Skipped: 0, ChunkCount: 5, DurationMs: 100, Collection: "mentor_chunks"));
        }
    }

    private sealed class TinyZipSubmissionLoader : ISubmissionCodeLoader
    {
        public Task<SubmissionCodeLoadResult> LoadAsZipStreamAsync(
            Submission submission, CancellationToken ct = default) =>
            Task.FromResult(SubmissionCodeLoadResult.Ok(BuildTinyZip(), "submission.zip"));
    }

    private sealed class TinyZipAuditLoader : IProjectAuditCodeLoader
    {
        public Task<AuditCodeLoadResult> LoadAsZipStreamAsync(
            ProjectAudit audit, CancellationToken ct = default) =>
            Task.FromResult(AuditCodeLoadResult.Ok(BuildTinyZip(), "audit.zip"));
    }

    private static Stream BuildTinyZip()
    {
        var ms = new MemoryStream();
        using (var archive = new ZipArchive(ms, ZipArchiveMode.Create, leaveOpen: true))
        {
            var entry = archive.CreateEntry("README.md");
            using var writer = new StreamWriter(entry.Open(), Encoding.UTF8);
            writer.Write("# tiny");
        }
        ms.Position = 0;
        return ms;
    }

    [Fact]
    public async Task IndexSubmissionAsync_PopulatesUserIdTaskIdTaskName_OnUpsertRequest()
    {
        using var db = NewDb();
        var userId = Guid.NewGuid();
        var taskId = Guid.NewGuid();
        var submissionId = Guid.NewGuid();
        const string taskTitle = "REST API Authentication";

        db.Tasks.Add(new TaskItem
        {
            Id = taskId,
            Title = taskTitle,
            Description = "stub",
            Difficulty = 2,
            ExpectedLanguage = ProgrammingLanguage.Python,
            EstimatedHours = 4,
        });
        db.Submissions.Add(new Submission
        {
            Id = submissionId,
            UserId = userId,
            TaskId = taskId,
            Status = SubmissionStatus.Completed,
            AiAnalysisStatus = AiAnalysisStatus.Available,
            SubmissionType = SubmissionType.Upload,
            BlobPath = "x/y.zip",
            CompletedAt = DateTime.UtcNow,
        });
        db.AIAnalysisResults.Add(new Domain.Submissions.AIAnalysisResult
        {
            SubmissionId = submissionId,
            OverallScore = 75,
            FeedbackJson = JsonSerializer.Serialize(new
            {
                summary = "stub",
                strengths = new[] { "Clean naming" },
                weaknesses = new[] { "Missing tests" },
                recommendations = new object[]
                {
                    new { priority = "medium", category = "design", message = "Add unit tests" },
                },
            }),
            StrengthsJson = "[]",
            WeaknessesJson = "[]",
            ModelUsed = "test",
            TokensUsed = 100,
            PromptVersion = "v1.0.0",
        });
        await db.SaveChangesAsync();

        var embeddings = new CapturingEmbeddingsClient();
        var job = new IndexForMentorChatJob(
            db,
            new TinyZipSubmissionLoader(),
            new TinyZipAuditLoader(),
            embeddings,
            NullLogger<IndexForMentorChatJob>.Instance);

        await job.IndexSubmissionAsync(submissionId);

        Assert.Single(embeddings.Calls);
        var call = embeddings.Calls[0];

        Assert.Equal("submission", call.Scope);
        Assert.Equal(submissionId.ToString("N"), call.ScopeId);
        Assert.Equal(userId.ToString("N"), call.UserId);
        Assert.Equal(taskId.ToString("N"), call.TaskId);
        Assert.Equal(taskTitle, call.TaskName);

        // MentorIndexedAt populated so the FE chat panel readiness gate flips.
        var sub = await db.Submissions.AsNoTracking().FirstAsync(s => s.Id == submissionId);
        Assert.NotNull(sub.MentorIndexedAt);
    }

    [Fact]
    public async Task IndexAuditAsync_PopulatesUserIdAndProjectName_WithNullTaskId()
    {
        using var db = NewDb();
        var userId = Guid.NewGuid();
        var auditId = Guid.NewGuid();
        const string projectName = "demo-audit-project";

        db.ProjectAudits.Add(new ProjectAudit
        {
            Id = auditId,
            UserId = userId,
            ProjectName = projectName,
            ProjectDescriptionJson = "{}",
            SourceType = AuditSourceType.Upload,
            BlobPath = "x/y.zip",
            Status = ProjectAuditStatus.Completed,
            AiReviewStatus = ProjectAuditAiStatus.Available,
            OverallScore = 72,
            Grade = "C",
        });
        db.ProjectAuditResults.Add(new ProjectAuditResult
        {
            AuditId = auditId,
            ScoresJson = "{}",
            StrengthsJson = "[]",
            CriticalIssuesJson = "[]",
            WarningsJson = "[]",
            SuggestionsJson = "[]",
            MissingFeaturesJson = "[]",
            RecommendedImprovementsJson = "[]",
            TechStackAssessment = "stub",
            ModelUsed = "test",
            TokensInput = 100,
            TokensOutput = 100,
            PromptVersion = "project_audit.v1",
        });
        await db.SaveChangesAsync();

        var embeddings = new CapturingEmbeddingsClient();
        var job = new IndexForMentorChatJob(
            db,
            new TinyZipSubmissionLoader(),
            new TinyZipAuditLoader(),
            embeddings,
            NullLogger<IndexForMentorChatJob>.Instance);

        await job.IndexAuditAsync(auditId);

        Assert.Single(embeddings.Calls);
        var call = embeddings.Calls[0];

        Assert.Equal("audit", call.Scope);
        Assert.Equal(auditId.ToString("N"), call.ScopeId);
        Assert.Equal(userId.ToString("N"), call.UserId);
        Assert.Null(call.TaskId);
        Assert.Equal(projectName, call.TaskName);
    }
}

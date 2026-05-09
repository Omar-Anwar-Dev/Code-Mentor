using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using CodeMentor.Api.IntegrationTests.TestHost;
using CodeMentor.Application.Auth.Contracts;
using CodeMentor.Application.ProjectAudits.Contracts;
using CodeMentor.Application.Storage;
using CodeMentor.Domain.ProjectAudits;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace CodeMentor.Api.IntegrationTests.ProjectAudits;

/// <summary>
/// S9-T3 acceptance:
///   - Happy path (GitHub URL) creates ProjectAudit row + enqueues job; returns 202.
///   - Happy path (ZIP, blob seeded) creates row; returns 202.
///   - Invalid description (missing name / bad ProjectType / empty TechStack) → 400.
///   - Bad GitHub URL → 400 with title=InvalidGitHubUrl.
///   - Missing source.type → 400 with title=InvalidSourceType.
///   - ZIP source with missing blob → 404 with title=BlobNotFound.
///   - Unauth → 401.
///   - InlineProjectAuditScheduler records the schedule call.
/// (Size > 50MB → 413: deferred to S9-T4 worker pipeline; documented in progress.md.)
/// </summary>
public class AuditCreateTests : IClassFixture<CodeMentorWebApplicationFactory>
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    private readonly CodeMentorWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public AuditCreateTests(CodeMentorWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    private async Task<string> RegisterAsync(string emailLocalPart)
    {
        var email = $"{emailLocalPart}-{Guid.NewGuid():N}@audit-test.local";
        var req = new RegisterRequest(email, "Strong_Pass_123!", "Audit Tester", null);
        var res = await _client.PostAsJsonAsync("/api/auth/register", req);
        res.EnsureSuccessStatusCode();
        return (await res.Content.ReadFromJsonAsync<AuthResponse>())!.AccessToken;
    }

    private void Bearer(string token) =>
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

    private static CreateAuditRequest ValidGitHubRequest(string url = "https://github.com/octocat/hello-world") => new(
        ProjectName: "octocat-hello",
        Summary: "A tiny demo repo.",
        Description: "Repository used to validate the audit pipeline end-to-end.",
        ProjectType: "Library",
        TechStack: new[] { "JavaScript" },
        Features: new[] { "Hello world endpoint" },
        TargetAudience: null,
        FocusAreas: null,
        KnownIssues: null,
        Source: new AuditSourceDto("github", url, null));

    private static CreateAuditRequest ValidZipRequest(string blobPath) => new(
        ProjectName: "zip-app",
        Summary: "A small uploaded project.",
        Description: "A short description used to seed the audit context.",
        ProjectType: "WebApp",
        TechStack: new[] { "Python", "Flask" },
        Features: new[] { "Authentication", "Task CRUD" },
        TargetAudience: "Solo dev portfolio",
        FocusAreas: new[] { "Security", "Architecture" },
        KnownIssues: "No tests yet.",
        Source: new AuditSourceDto("zip", null, blobPath));

    [Fact]
    public async Task Post_WithoutAuth_Returns401()
    {
        var res = await _client.PostAsJsonAsync("/api/audits", ValidGitHubRequest(), Json);
        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    [Fact]
    public async Task Post_GitHubHappyPath_Returns202_AndPersistsRow_AndSchedulesJob()
    {
        Bearer(await RegisterAsync("github-happy"));

        var inlineScheduler = (InlineProjectAuditScheduler)_factory.Services
            .GetRequiredService<CodeMentor.Application.ProjectAudits.IProjectAuditScheduler>();
        var beforeCount = inlineScheduler.Scheduled.Count;

        var res = await _client.PostAsJsonAsync("/api/audits", ValidGitHubRequest(), Json);
        Assert.Equal(HttpStatusCode.Accepted, res.StatusCode);

        var body = await res.Content.ReadFromJsonAsync<AuditCreatedResponse>(Json);
        Assert.NotNull(body);
        Assert.NotEqual(Guid.Empty, body!.AuditId);
        Assert.Equal(ProjectAuditStatus.Pending, body.Status);
        Assert.Equal(1, body.AttemptNumber);

        // Row persisted.
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var audit = await db.ProjectAudits.AsNoTracking().FirstOrDefaultAsync(a => a.Id == body.AuditId);
        Assert.NotNull(audit);
        Assert.Equal("octocat-hello", audit!.ProjectName);
        Assert.Equal(AuditSourceType.GitHub, audit.SourceType);
        Assert.Equal("https://github.com/octocat/hello-world", audit.RepositoryUrl);
        Assert.Null(audit.BlobPath);
        Assert.False(audit.IsDeleted);

        // ProjectDescriptionJson contains the structured payload.
        using var doc = JsonDocument.Parse(audit.ProjectDescriptionJson);
        Assert.Equal("Library", doc.RootElement.GetProperty("projectType").GetString());
        Assert.Equal(1, doc.RootElement.GetProperty("techStack").GetArrayLength());

        // Inline scheduler ran the job — at least one new entry for our audit.
        Assert.Contains(body.AuditId, inlineScheduler.Scheduled.Skip(beforeCount));
    }

    [Fact]
    public async Task Post_ZipHappyPath_WithSeededBlob_Returns202()
    {
        Bearer(await RegisterAsync("zip-happy"));

        // Seed a fake blob so ExistsAsync(Audits, ...) returns true.
        var blob = (FakeBlobStorage)_factory.Services.GetRequiredService<IBlobStorage>();
        var blobPath = $"user/{Guid.NewGuid():N}/project.zip";
        blob.SeedBlob(BlobContainers.Audits, blobPath, Encoding.UTF8.GetBytes("PK\x03\x04..."));

        var res = await _client.PostAsJsonAsync("/api/audits", ValidZipRequest(blobPath), Json);
        Assert.Equal(HttpStatusCode.Accepted, res.StatusCode);

        var body = await res.Content.ReadFromJsonAsync<AuditCreatedResponse>(Json);
        Assert.NotNull(body);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var audit = await db.ProjectAudits.AsNoTracking().FirstOrDefaultAsync(a => a.Id == body!.AuditId);
        Assert.NotNull(audit);
        Assert.Equal(AuditSourceType.Upload, audit!.SourceType);
        Assert.Equal(blobPath, audit.BlobPath);
        Assert.Null(audit.RepositoryUrl);
    }

    [Fact]
    public async Task Post_ZipSource_WithMissingBlob_Returns404_BlobNotFound()
    {
        Bearer(await RegisterAsync("zip-missing"));

        var res = await _client.PostAsJsonAsync("/api/audits",
            ValidZipRequest("user/never-uploaded/missing.zip"), Json);
        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
    }

    [Fact]
    public async Task Post_BadGitHubUrl_Returns400_InvalidGitHubUrl()
    {
        Bearer(await RegisterAsync("bad-url"));

        var bad = ValidGitHubRequest("https://gitlab.com/owner/repo");
        var res = await _client.PostAsJsonAsync("/api/audits", bad, Json);
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);

        var problem = await res.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("InvalidGitHubUrl", problem.GetProperty("title").GetString());
    }

    [Fact]
    public async Task Post_InvalidProjectType_Returns400_InvalidProjectType()
    {
        Bearer(await RegisterAsync("bad-type"));

        var bad = ValidGitHubRequest() with { ProjectType = "Game" };
        var res = await _client.PostAsJsonAsync("/api/audits", bad, Json);
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);

        var problem = await res.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("InvalidProjectType", problem.GetProperty("title").GetString());
    }

    [Fact]
    public async Task Post_MissingProjectName_Returns400()
    {
        Bearer(await RegisterAsync("missing-name"));

        var bad = ValidGitHubRequest() with { ProjectName = "" };
        var res = await _client.PostAsJsonAsync("/api/audits", bad, Json);
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }

    [Fact]
    public async Task Post_EmptyTechStack_Returns400()
    {
        Bearer(await RegisterAsync("empty-stack"));

        var bad = ValidGitHubRequest() with { TechStack = Array.Empty<string>() };
        var res = await _client.PostAsJsonAsync("/api/audits", bad, Json);
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }

    [Fact]
    public async Task Post_UnknownSourceType_Returns400_InvalidSourceType()
    {
        Bearer(await RegisterAsync("unknown-source"));

        var bad = ValidGitHubRequest() with
        {
            Source = new AuditSourceDto("ftp", "ftp://example.com/repo", null),
        };
        var res = await _client.PostAsJsonAsync("/api/audits", bad, Json);
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);

        var problem = await res.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("InvalidSourceType", problem.GetProperty("title").GetString());
    }
}

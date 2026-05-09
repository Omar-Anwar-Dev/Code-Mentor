using System.Text.Json;
using CodeMentor.Domain.ProjectAudits;
using CodeMentor.Domain.Submissions;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.Extensions.DependencyInjection;

namespace CodeMentor.Application.Tests.ProjectAudits;

/// <summary>
/// S9-T1 acceptance:
///  - ProjectAudits / ProjectAuditResults / AuditStaticAnalysisResults tables
///    created (implicit via model mapping).
///  - Status + AiReviewStatus + SourceType enums serialized as strings.
///  - Round-trip test for ProjectDescriptionJson, ScoresJson, IssuesJson.
///  - Indexes configured: (UserId, CreatedAt DESC), Status, (IsDeleted, UserId).
///  - Soft-delete query verified.
///  - ProjectAuditResults unique on AuditId.
///  - AuditStaticAnalysisResults unique on (AuditId, Tool).
/// </summary>
public class ProjectAuditEntityTests
{
    private static ApplicationDbContext NewDb()
    {
        var opts = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase($"ProjectAudit_{Guid.NewGuid():N}")
            .Options;
        return new ApplicationDbContext(opts);
    }

    [Fact]
    public async Task ProjectAudit_Persists_And_Reloads_WithEnumStrings_AndJson()
    {
        using var db = NewDb();

        var description = new
        {
            summary = "A small Flask todo API.",
            description = "Stores tasks in SQLite. Auth via JWT.",
            projectType = "API",
            techStack = new[] { "Python", "Flask", "SQLite" },
            features = new[] { "CRUD tasks", "JWT auth", "Health endpoint" },
            focusAreas = new[] { "Security", "Architecture" },
        };

        var original = new ProjectAudit
        {
            UserId = Guid.NewGuid(),
            ProjectName = "todo-api",
            ProjectDescriptionJson = JsonSerializer.Serialize(description),
            SourceType = AuditSourceType.Upload,
            BlobPath = "audit-uploads/user-abc/2026-08-10/todo-api.zip",
            Status = ProjectAuditStatus.Pending,
            AiReviewStatus = ProjectAuditAiStatus.NotAttempted,
        };
        db.ProjectAudits.Add(original);
        await db.SaveChangesAsync();

        var fetched = await db.ProjectAudits.AsNoTracking().SingleAsync(a => a.Id == original.Id);

        Assert.Equal(AuditSourceType.Upload, fetched.SourceType);
        Assert.Equal(ProjectAuditStatus.Pending, fetched.Status);
        Assert.Equal(ProjectAuditAiStatus.NotAttempted, fetched.AiReviewStatus);
        Assert.Equal("todo-api", fetched.ProjectName);
        Assert.Equal(original.BlobPath, fetched.BlobPath);
        Assert.Null(fetched.RepositoryUrl);
        Assert.Null(fetched.OverallScore);
        Assert.Null(fetched.Grade);
        Assert.Null(fetched.CompletedAt);
        Assert.False(fetched.IsDeleted);

        // ProjectDescriptionJson round-trip — exact byte preservation matters
        // because the AI prompt re-serializes from this string.
        Assert.Equal(original.ProjectDescriptionJson, fetched.ProjectDescriptionJson);
        using var doc = JsonDocument.Parse(fetched.ProjectDescriptionJson);
        Assert.Equal("API", doc.RootElement.GetProperty("projectType").GetString());
        Assert.Equal(3, doc.RootElement.GetProperty("techStack").GetArrayLength());
    }

    [Fact]
    public void ProjectAudit_UserCreatedAt_CompoundIndex_IsConfigured_CreatedAtDescending()
    {
        using var db = NewDb();
        var model = db.GetService<IDesignTimeModel>().Model;
        var entityType = model.FindEntityType(typeof(ProjectAudit))!;

        var ix = entityType.GetIndexes().FirstOrDefault(i =>
            i.Properties.Count == 2 &&
            i.Properties[0].Name == nameof(ProjectAudit.UserId) &&
            i.Properties[1].Name == nameof(ProjectAudit.CreatedAt));

        Assert.NotNull(ix);
        var desc = ix!.IsDescending;
        Assert.NotNull(desc);
        Assert.False(desc![0]);
        Assert.True(desc[1]);
    }

    [Fact]
    public void ProjectAudit_Status_Index_IsConfigured()
    {
        using var db = NewDb();
        var model = db.GetService<IDesignTimeModel>().Model;
        var entityType = model.FindEntityType(typeof(ProjectAudit))!;

        var ix = entityType.GetIndexes().FirstOrDefault(i =>
            i.Properties.Count == 1 &&
            i.Properties[0].Name == nameof(ProjectAudit.Status));

        Assert.NotNull(ix);
    }

    [Fact]
    public void ProjectAudit_IsDeletedUserId_Index_IsConfigured()
    {
        using var db = NewDb();
        var model = db.GetService<IDesignTimeModel>().Model;
        var entityType = model.FindEntityType(typeof(ProjectAudit))!;

        var ix = entityType.GetIndexes().FirstOrDefault(i =>
            i.Properties.Count == 2 &&
            i.Properties[0].Name == nameof(ProjectAudit.IsDeleted) &&
            i.Properties[1].Name == nameof(ProjectAudit.UserId));

        Assert.NotNull(ix);
    }

    [Fact]
    public void ProjectAudit_Status_Is_Stored_As_NvarcharString()
    {
        using var db = NewDb();
        var model = db.GetService<IDesignTimeModel>().Model;
        var entityType = model.FindEntityType(typeof(ProjectAudit))!;
        var statusProp = entityType.FindProperty(nameof(ProjectAudit.Status))!;

        Assert.Equal(typeof(string), statusProp.GetProviderClrType() ?? statusProp.ClrType);
        Assert.Equal(20, statusProp.GetMaxLength());
    }

    [Fact]
    public async Task ProjectAudit_SoftDelete_Filter_Excludes_Marked_Rows()
    {
        using var db = NewDb();
        var userId = Guid.NewGuid();

        db.ProjectAudits.AddRange(
            new ProjectAudit { UserId = userId, ProjectName = "live-1", IsDeleted = false },
            new ProjectAudit { UserId = userId, ProjectName = "live-2", IsDeleted = false },
            new ProjectAudit { UserId = userId, ProjectName = "deleted-1", IsDeleted = true });
        await db.SaveChangesAsync();

        var live = await db.ProjectAudits
            .AsNoTracking()
            .Where(a => a.UserId == userId && !a.IsDeleted)
            .OrderBy(a => a.ProjectName)
            .ToListAsync();

        Assert.Equal(2, live.Count);
        Assert.All(live, a => Assert.False(a.IsDeleted));
        Assert.DoesNotContain(live, a => a.ProjectName == "deleted-1");
    }

    [Fact]
    public async Task ProjectAuditResult_Json_RoundTrip_Preserves_All_Sections()
    {
        using var db = NewDb();

        var audit = new ProjectAudit { UserId = Guid.NewGuid(), ProjectName = "audited-app" };
        db.ProjectAudits.Add(audit);
        await db.SaveChangesAsync();

        var result = new ProjectAuditResult
        {
            AuditId = audit.Id,
            ScoresJson = """{"CodeQuality":80,"Security":65,"Performance":75,"ArchitectureDesign":70,"Maintainability":78,"Completeness":82}""",
            StrengthsJson = """["Clean module boundaries","Consistent naming"]""",
            CriticalIssuesJson = """[{"title":"SQL injection in /search","location":"app/search.py:42","fix":"Use parameterized queries"}]""",
            WarningsJson = """[{"title":"N+1 query","location":"app/users.py:88"}]""",
            SuggestionsJson = """[{"title":"Add type hints"}]""",
            MissingFeaturesJson = """["Pagination on /tasks","Rate limiting"]""",
            RecommendedImprovementsJson = """[{"title":"Add input validation layer","howTo":"Introduce Pydantic schemas at every endpoint."}]""",
            TechStackAssessment = "Flask is appropriate for this scale; consider FastAPI for async if traffic grows.",
            InlineAnnotationsJson = """[{"file":"app/search.py","line":42,"severity":"critical","message":"Concatenated SQL"}]""",
            ModelUsed = "gpt-5.1-codex-mini",
            PromptVersion = "project_audit.v1",
            TokensInput = 5400,
            TokensOutput = 1800,
        };
        db.ProjectAuditResults.Add(result);
        await db.SaveChangesAsync();

        var fetched = await db.ProjectAuditResults.AsNoTracking().SingleAsync(r => r.AuditId == audit.Id);

        Assert.Equal(result.ScoresJson, fetched.ScoresJson);
        Assert.Equal(result.CriticalIssuesJson, fetched.CriticalIssuesJson);
        Assert.Equal(result.MissingFeaturesJson, fetched.MissingFeaturesJson);
        Assert.Equal(result.RecommendedImprovementsJson, fetched.RecommendedImprovementsJson);
        Assert.Equal(result.InlineAnnotationsJson, fetched.InlineAnnotationsJson);
        Assert.Equal("project_audit.v1", fetched.PromptVersion);
        Assert.Equal(5400, fetched.TokensInput);
        Assert.Equal(1800, fetched.TokensOutput);

        // Spot-check that the JSON is parseable on read.
        using var scoresDoc = JsonDocument.Parse(fetched.ScoresJson);
        Assert.Equal(82, scoresDoc.RootElement.GetProperty("Completeness").GetInt32());
    }

    [Fact]
    public void ProjectAuditResult_AuditId_Unique_Index_IsConfigured()
    {
        using var db = NewDb();
        var model = db.GetService<IDesignTimeModel>().Model;
        var entityType = model.FindEntityType(typeof(ProjectAuditResult))!;

        var ix = entityType.GetIndexes().FirstOrDefault(i =>
            i.Properties.Count == 1 &&
            i.Properties[0].Name == nameof(ProjectAuditResult.AuditId));

        Assert.NotNull(ix);
        Assert.True(ix!.IsUnique);
    }

    [Fact]
    public async Task AuditStaticAnalysisResult_RoundTrips_Tool_AsString_AndPersistsIssues()
    {
        using var db = NewDb();
        var audit = new ProjectAudit { UserId = Guid.NewGuid(), ProjectName = "tools-test" };
        db.ProjectAudits.Add(audit);
        await db.SaveChangesAsync();

        var bandit = new AuditStaticAnalysisResult
        {
            AuditId = audit.Id,
            Tool = StaticAnalysisTool.Bandit,
            IssuesJson = """[{"rule":"B608","severity":"high","file":"app/search.py","line":42,"message":"Possible SQL injection."}]""",
            ExecutionTimeMs = 1240,
        };
        db.AuditStaticAnalysisResults.Add(bandit);
        await db.SaveChangesAsync();

        var fetched = await db.AuditStaticAnalysisResults.AsNoTracking().SingleAsync(r => r.AuditId == audit.Id);
        Assert.Equal(StaticAnalysisTool.Bandit, fetched.Tool);
        Assert.Contains("SQL injection", fetched.IssuesJson);
        Assert.Equal(1240, fetched.ExecutionTimeMs);
    }

    [Fact]
    public void AuditStaticAnalysisResult_AuditTool_Unique_Index_IsConfigured()
    {
        using var db = NewDb();
        var model = db.GetService<IDesignTimeModel>().Model;
        var entityType = model.FindEntityType(typeof(AuditStaticAnalysisResult))!;

        var ix = entityType.GetIndexes().FirstOrDefault(i =>
            i.Properties.Count == 2 &&
            i.Properties[0].Name == nameof(AuditStaticAnalysisResult.AuditId) &&
            i.Properties[1].Name == nameof(AuditStaticAnalysisResult.Tool));

        Assert.NotNull(ix);
        Assert.True(ix!.IsUnique);
    }
}

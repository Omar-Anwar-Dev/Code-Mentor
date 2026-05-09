using CodeMentor.Domain.Submissions;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.Extensions.DependencyInjection;

namespace CodeMentor.Application.Tests.Submissions;

/// <summary>
/// S5-T2 acceptance:
///  - StaticAnalysisResults table created (implicit via model mapping)
///  - Tool enum serialized as string
///  - One row per (SubmissionId, Tool) — enforced by unique index
///  - IssuesJson stored as JSON (nvarchar(max)) column
/// </summary>
public class StaticAnalysisResultEntityTests
{
    private static ApplicationDbContext NewDb()
    {
        var opts = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase($"StaticAnalysis_{Guid.NewGuid():N}")
            .Options;
        return new ApplicationDbContext(opts);
    }

    [Fact]
    public async Task StaticAnalysisResult_Persists_And_Reloads_WithEnumStrings()
    {
        using var db = NewDb();

        var sub = new Submission
        {
            UserId = Guid.NewGuid(),
            TaskId = Guid.NewGuid(),
            SubmissionType = SubmissionType.Upload,
            BlobPath = "submissions-uploads/u/x.zip",
            Status = SubmissionStatus.Completed,
        };
        db.Submissions.Add(sub);
        await db.SaveChangesAsync();

        var result = new StaticAnalysisResult
        {
            SubmissionId = sub.Id,
            Tool = StaticAnalysisTool.Bandit,
            IssuesJson = "[{\"severity\":\"warning\",\"rule\":\"B101\",\"file\":\"a.py\",\"line\":3,\"message\":\"assert\"}]",
            MetricsJson = "{\"filesScanned\":5}",
            ExecutionTimeMs = 1234,
        };
        db.StaticAnalysisResults.Add(result);
        await db.SaveChangesAsync();

        var fetched = await db.StaticAnalysisResults.AsNoTracking().SingleAsync(r => r.Id == result.Id);
        Assert.Equal(StaticAnalysisTool.Bandit, fetched.Tool);
        Assert.Equal(sub.Id, fetched.SubmissionId);
        Assert.Contains("B101", fetched.IssuesJson);
        Assert.Equal("{\"filesScanned\":5}", fetched.MetricsJson);
        Assert.Equal(1234, fetched.ExecutionTimeMs);
    }

    [Fact]
    public void StaticAnalysisResult_SubmissionTool_UniqueIndex_IsConfigured()
    {
        using var db = NewDb();
        var model = db.GetService<IDesignTimeModel>().Model;
        var entityType = model.FindEntityType(typeof(StaticAnalysisResult))!;

        var ix = entityType.GetIndexes().FirstOrDefault(i =>
            i.Properties.Count == 2 &&
            i.Properties[0].Name == nameof(StaticAnalysisResult.SubmissionId) &&
            i.Properties[1].Name == nameof(StaticAnalysisResult.Tool));

        Assert.NotNull(ix);
        Assert.True(ix!.IsUnique);
    }

    [Fact]
    public void StaticAnalysisResult_Tool_Is_Stored_As_NvarcharString()
    {
        using var db = NewDb();
        var model = db.GetService<IDesignTimeModel>().Model;
        var entityType = model.FindEntityType(typeof(StaticAnalysisResult))!;
        var toolProp = entityType.FindProperty(nameof(StaticAnalysisResult.Tool))!;

        Assert.Equal(typeof(string), toolProp.GetProviderClrType() ?? toolProp.ClrType);
        Assert.Equal(20, toolProp.GetMaxLength());
    }

    [Fact]
    public async Task StaticAnalysisResult_Cascades_WhenSubmissionDeleted()
    {
        using var db = NewDb();

        var sub = new Submission
        {
            UserId = Guid.NewGuid(),
            TaskId = Guid.NewGuid(),
            SubmissionType = SubmissionType.Upload,
            Status = SubmissionStatus.Completed,
        };
        db.Submissions.Add(sub);
        db.StaticAnalysisResults.Add(new StaticAnalysisResult
        {
            SubmissionId = sub.Id,
            Tool = StaticAnalysisTool.Roslyn,
            IssuesJson = "[]",
        });
        await db.SaveChangesAsync();

        db.Submissions.Remove(sub);
        await db.SaveChangesAsync();

        Assert.Empty(db.StaticAnalysisResults.ToList());
    }
}

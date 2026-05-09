using CodeMentor.Domain.Submissions;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.Extensions.DependencyInjection;

namespace CodeMentor.Application.Tests.Submissions;

/// <summary>
/// S6-T3 acceptance:
///  - AIAnalysisResults table created (implicit via model mapping)
///  - Stores OverallScore, JSON feedback payloads, ModelUsed, TokensUsed, PromptVersion, ProcessedAt
///  - One row per submission (unique index on SubmissionId)
///  - Cascade delete from Submission
/// </summary>
public class AIAnalysisResultEntityTests
{
    private static ApplicationDbContext NewDb()
    {
        var opts = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase($"AIAnalysis_{Guid.NewGuid():N}")
            .Options;
        return new ApplicationDbContext(opts);
    }

    [Fact]
    public async Task AIAnalysisResult_Persists_And_Reloads_AllFields()
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

        var ai = new AIAnalysisResult
        {
            SubmissionId = sub.Id,
            OverallScore = 78,
            FeedbackJson = "{\"summary\":\"good\",\"scores\":{\"correctness\":80}}",
            StrengthsJson = "[\"Good naming\",\"Clean structure\"]",
            WeaknessesJson = "[\"Missing tests\"]",
            ModelUsed = "gpt-5.1-codex-mini",
            TokensUsed = 2500,
            PromptVersion = "v1.0.0",
        };
        db.AIAnalysisResults.Add(ai);
        await db.SaveChangesAsync();

        var fetched = await db.AIAnalysisResults.AsNoTracking().SingleAsync(r => r.Id == ai.Id);
        Assert.Equal(sub.Id, fetched.SubmissionId);
        Assert.Equal(78, fetched.OverallScore);
        Assert.Contains("\"correctness\":80", fetched.FeedbackJson);
        Assert.Contains("Good naming", fetched.StrengthsJson);
        Assert.Contains("Missing tests", fetched.WeaknessesJson);
        Assert.Equal("gpt-5.1-codex-mini", fetched.ModelUsed);
        Assert.Equal(2500, fetched.TokensUsed);
        Assert.Equal("v1.0.0", fetched.PromptVersion);
        Assert.True(fetched.ProcessedAt > DateTime.UtcNow.AddMinutes(-1));
    }

    [Fact]
    public void AIAnalysisResult_SubmissionId_UniqueIndex_IsConfigured()
    {
        using var db = NewDb();
        var model = db.GetService<IDesignTimeModel>().Model;
        var entityType = model.FindEntityType(typeof(AIAnalysisResult))!;

        var ix = entityType.GetIndexes().FirstOrDefault(i =>
            i.Properties.Count == 1 &&
            i.Properties[0].Name == nameof(AIAnalysisResult.SubmissionId));

        Assert.NotNull(ix);
        Assert.True(ix!.IsUnique);
    }

    [Fact]
    public void AIAnalysisResult_HasMaxLengths_OnFixedWidthMetadata()
    {
        using var db = NewDb();
        var model = db.GetService<IDesignTimeModel>().Model;
        var entityType = model.FindEntityType(typeof(AIAnalysisResult))!;

        Assert.Equal(50, entityType.FindProperty(nameof(AIAnalysisResult.ModelUsed))!.GetMaxLength());
        Assert.Equal(30, entityType.FindProperty(nameof(AIAnalysisResult.PromptVersion))!.GetMaxLength());
    }

    [Fact]
    public async Task AIAnalysisResult_Cascades_WhenSubmissionDeleted()
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
        db.AIAnalysisResults.Add(new AIAnalysisResult
        {
            SubmissionId = sub.Id,
            OverallScore = 70,
            FeedbackJson = "{}",
            StrengthsJson = "[]",
            WeaknessesJson = "[]",
            ModelUsed = "gpt-5.1-codex-mini",
            PromptVersion = "v1.0.0",
        });
        await db.SaveChangesAsync();

        db.Submissions.Remove(sub);
        await db.SaveChangesAsync();

        Assert.Empty(db.AIAnalysisResults.ToList());
    }
}

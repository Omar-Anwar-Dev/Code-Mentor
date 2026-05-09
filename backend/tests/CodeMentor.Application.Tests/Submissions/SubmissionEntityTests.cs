using CodeMentor.Domain.Submissions;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.Extensions.DependencyInjection;

namespace CodeMentor.Application.Tests.Submissions;

/// <summary>
/// S4-T1 acceptance:
///  - Submissions table created (implicit via model mapping)
///  - Status enum serialized as string
///  - Compound index on (UserId, CreatedAt DESC) configured
///  - Status index configured (worker query path)
/// </summary>
public class SubmissionEntityTests
{
    private static ApplicationDbContext NewDb()
    {
        var opts = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase($"Submission_{Guid.NewGuid():N}")
            .Options;
        return new ApplicationDbContext(opts);
    }

    [Fact]
    public async Task Submission_Persists_And_Reloads_WithEnumStrings()
    {
        using var db = NewDb();

        var original = new Submission
        {
            UserId = Guid.NewGuid(),
            TaskId = Guid.NewGuid(),
            SubmissionType = SubmissionType.Upload,
            BlobPath = "submissions-uploads/user-123/2026-04-21/abc.zip",
            Status = SubmissionStatus.Pending,
            AttemptNumber = 1,
        };
        db.Submissions.Add(original);
        await db.SaveChangesAsync();

        var fetched = await db.Submissions.AsNoTracking().SingleAsync(s => s.Id == original.Id);
        Assert.Equal(SubmissionType.Upload, fetched.SubmissionType);
        Assert.Equal(SubmissionStatus.Pending, fetched.Status);
        Assert.Equal(original.BlobPath, fetched.BlobPath);
        Assert.Null(fetched.RepositoryUrl);
        Assert.Null(fetched.CompletedAt);
    }

    [Fact]
    public void Submission_UserCreatedAt_CompoundIndex_IsConfigured_CreatedAtDescending()
    {
        using var db = NewDb();
        var model = db.GetService<IDesignTimeModel>().Model;
        var entityType = model.FindEntityType(typeof(Submission))!;

        var ix = entityType.GetIndexes().FirstOrDefault(i =>
            i.Properties.Count == 2 &&
            i.Properties[0].Name == nameof(Submission.UserId) &&
            i.Properties[1].Name == nameof(Submission.CreatedAt));

        Assert.NotNull(ix);
        var desc = ix!.IsDescending;
        Assert.NotNull(desc);
        Assert.False(desc![0]);
        Assert.True(desc[1]);
    }

    [Fact]
    public void Submission_Status_Index_IsConfigured()
    {
        using var db = NewDb();
        var model = db.GetService<IDesignTimeModel>().Model;
        var entityType = model.FindEntityType(typeof(Submission))!;

        var ix = entityType.GetIndexes().FirstOrDefault(i =>
            i.Properties.Count == 1 &&
            i.Properties[0].Name == nameof(Submission.Status));

        Assert.NotNull(ix);
    }

    [Fact]
    public void Submission_Status_Is_Stored_As_NvarcharString()
    {
        using var db = NewDb();
        var model = db.GetService<IDesignTimeModel>().Model;
        var entityType = model.FindEntityType(typeof(Submission))!;
        var statusProp = entityType.FindProperty(nameof(Submission.Status))!;

        Assert.Equal(typeof(string), statusProp.GetProviderClrType() ?? statusProp.ClrType);
        Assert.Equal(20, statusProp.GetMaxLength());
    }
}

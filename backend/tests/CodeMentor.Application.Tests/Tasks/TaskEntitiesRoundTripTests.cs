using CodeMentor.Domain.Assessments;
using CodeMentor.Domain.Tasks;
using CodeMentor.Infrastructure.Persistence;
using CodeMentor.Infrastructure.Persistence.Seeds;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;

namespace CodeMentor.Application.Tests.Tasks;

/// <summary>
/// S3-T1 acceptance:
///  - Tables created (implicit: DbContext model maps them)
///  - Prerequisites JSON round-trip preserved
///  - Unique (PathId, OrderIndex) constraint exists in the model
/// </summary>
public class TaskEntitiesRoundTripTests
{
    private static ApplicationDbContext NewDb()
    {
        var opts = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase($"TaskEntities_{Guid.NewGuid():N}")
            .Options;
        return new ApplicationDbContext(opts);
    }

    [Fact]
    public async Task Prerequisites_JsonColumn_RoundTrips_InOrder()
    {
        using var db = NewDb();

        var original = new TaskItem
        {
            Title = "Build a CRUD REST API",
            Description = "## Overview\nBuild a REST endpoint.",
            Difficulty = 3,
            Category = SkillCategory.Databases,
            Track = Track.Backend,
            ExpectedLanguage = ProgrammingLanguage.CSharp,
            EstimatedHours = 6,
            Prerequisites = new[] { "Understanding of HTTP methods", "Basic SQL", "Entity Framework Core basics" },
        };
        db.Tasks.Add(original);
        await db.SaveChangesAsync();

        var fetched = await db.Tasks.AsNoTracking().SingleAsync(t => t.Id == original.Id);
        Assert.Equal(original.Prerequisites, fetched.Prerequisites);
        Assert.Equal(SkillCategory.Databases, fetched.Category);
        Assert.Equal(Track.Backend, fetched.Track);
        Assert.Equal(ProgrammingLanguage.CSharp, fetched.ExpectedLanguage);
    }

    [Fact]
    public void PathTask_UniqueIndex_On_PathId_OrderIndex_IsConfigured()
    {
        using var db = NewDb();
        var entityType = db.Model.FindEntityType(typeof(PathTask))!;

        var uniqueIndex = entityType.GetIndexes().FirstOrDefault(ix =>
            ix.IsUnique &&
            ix.Properties.Count == 2 &&
            ix.Properties[0].Name == nameof(PathTask.PathId) &&
            ix.Properties[1].Name == nameof(PathTask.OrderIndex));

        Assert.NotNull(uniqueIndex);
    }

    [Fact]
    public void LearningPath_ActiveUniqueIndex_Per_User_IsConfigured()
    {
        using var db = NewDb();
        var entityType = db.Model.FindEntityType(typeof(LearningPath))!;

        var uniqueFilteredIndex = entityType.GetIndexes().FirstOrDefault(ix =>
            ix.IsUnique &&
            ix.Properties.Count == 2 &&
            ix.Properties.Any(p => p.Name == nameof(LearningPath.UserId)) &&
            ix.Properties.Any(p => p.Name == nameof(LearningPath.IsActive)));

        Assert.NotNull(uniqueFilteredIndex);
    }

    [Fact]
    public void LearningPath_RecomputeProgress_Reflects_CompletedCount()
    {
        var path = new LearningPath
        {
            UserId = Guid.NewGuid(),
            Track = Track.FullStack,
            Tasks = new List<PathTask>
            {
                new() { OrderIndex = 1, Status = PathTaskStatus.Completed },
                new() { OrderIndex = 2, Status = PathTaskStatus.Completed },
                new() { OrderIndex = 3, Status = PathTaskStatus.InProgress },
                new() { OrderIndex = 4, Status = PathTaskStatus.NotStarted },
            },
        };

        path.RecomputeProgress();
        Assert.Equal(50m, path.ProgressPercent);
    }
}

using CodeMentor.Domain.Assessments;
using CodeMentor.Domain.Tasks;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CodeMentor.Application.Tests.Tasks;

/// <summary>
/// S18-T1 acceptance: round-trip the new AI columns added to Tasks
/// (`SkillTagsJson`, `LearningGainJson`, `Source`, `ApprovedById`,
/// `ApprovedAt`, `EmbeddingJson`, `PromptVersion`) + the new
/// `TaskDrafts` entity end-to-end.
/// </summary>
public class TaskAiColumnsRoundTripTests
{
    private static (ApplicationDbContext db, string dbName) NewDb()
    {
        var dbName = $"TaskAi_{Guid.NewGuid():N}";
        var opts = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(dbName)
            .Options;
        return (new ApplicationDbContext(opts), dbName);
    }

    [Fact]
    public async Task NewTaskItem_Without_Explicit_Ai_Fields_Uses_Entity_Defaults()
    {
        var (db, _) = NewDb();
        using var _ = db;

        var t = new TaskItem
        {
            Title = "Implement a basic CRUD API",
            Description = "Build a REST API for users.",
            Difficulty = 2,
            Category = SkillCategory.Algorithms,
            Track = Track.Backend,
            ExpectedLanguage = ProgrammingLanguage.CSharp,
            EstimatedHours = 6,
        };

        db.Tasks.Add(t);
        await db.SaveChangesAsync();

        var fetched = await db.Tasks.AsNoTracking().SingleAsync(x => x.Id == t.Id);
        Assert.Null(fetched.SkillTagsJson);
        Assert.Null(fetched.LearningGainJson);
        Assert.Equal(TaskSource.Manual, fetched.Source);
        Assert.Null(fetched.ApprovedById);
        Assert.Null(fetched.ApprovedAt);
        Assert.Null(fetched.EmbeddingJson);
        Assert.Null(fetched.PromptVersion);
    }

    [Fact]
    public async Task TaskItem_With_All_New_Fields_Populated_Round_Trips_Cleanly()
    {
        var (db, _) = NewDb();
        using var _ = db;

        var approvedById = Guid.NewGuid();
        var approvedAt = DateTime.UtcNow.AddMinutes(-30);
        var skillTags = """[{"skill":"correctness","weight":0.6},{"skill":"design","weight":0.4}]""";
        var learningGain = """{"correctness":0.4,"design":0.2}""";
        var embedding = "[0.001,0.002,0.003]";

        var t = new TaskItem
        {
            Title = "Refactor a god class",
            Description = "Take the Order god class and split it...",
            Difficulty = 3,
            Category = SkillCategory.OOP,
            Track = Track.Backend,
            ExpectedLanguage = ProgrammingLanguage.CSharp,
            EstimatedHours = 8,
            SkillTagsJson = skillTags,
            LearningGainJson = learningGain,
            Source = TaskSource.AI,
            ApprovedById = approvedById,
            ApprovedAt = approvedAt,
            EmbeddingJson = embedding,
            PromptVersion = "generate_tasks_v1",
        };

        db.Tasks.Add(t);
        await db.SaveChangesAsync();

        var fetched = await db.Tasks.AsNoTracking().SingleAsync(x => x.Id == t.Id);
        Assert.Equal(skillTags, fetched.SkillTagsJson);
        Assert.Equal(learningGain, fetched.LearningGainJson);
        Assert.Equal(TaskSource.AI, fetched.Source);
        Assert.Equal(approvedById, fetched.ApprovedById);
        Assert.Equal(approvedAt, fetched.ApprovedAt);
        Assert.Equal(embedding, fetched.EmbeddingJson);
        Assert.Equal("generate_tasks_v1", fetched.PromptVersion);
    }

    [Theory]
    [InlineData(TaskSource.Manual)]
    [InlineData(TaskSource.AI)]
    public async Task TaskSource_All_Enum_Values_Round_Trip(TaskSource source)
    {
        var (db, _) = NewDb();
        using var _ = db;

        var t = new TaskItem
        {
            Title = "x",
            Description = "y",
            Difficulty = 1,
            Category = SkillCategory.OOP,
            Track = Track.Python,
            ExpectedLanguage = ProgrammingLanguage.Python,
            EstimatedHours = 2,
            Source = source,
        };
        db.Tasks.Add(t);
        await db.SaveChangesAsync();

        var fetched = await db.Tasks.AsNoTracking().SingleAsync(x => x.Id == t.Id);
        Assert.Equal(source, fetched.Source);
    }

    [Fact]
    public async Task TaskDraft_RoundTrip_Approved_Carries_All_Fields()
    {
        var (db, _) = NewDb();
        using var _ = db;

        var generatedBy = Guid.NewGuid();
        var decidedBy = Guid.NewGuid();
        var approvedTaskId = Guid.NewGuid();
        var batchId = Guid.NewGuid();

        var d = new TaskDraft
        {
            BatchId = batchId,
            PositionInBatch = 0,
            Status = TaskDraftStatus.Approved,
            Title = "Build a URL shortener",
            Description = "Build a CRUD API + redirect endpoint...",
            AcceptanceCriteria = "All endpoints return 2xx; tests pass.",
            Deliverables = "GitHub URL with README + tests.",
            Difficulty = 3,
            Category = SkillCategory.Algorithms,
            Track = Track.FullStack,
            ExpectedLanguage = ProgrammingLanguage.TypeScript,
            EstimatedHours = 10,
            Prerequisites = new List<string> { "rest-api-basics" },
            SkillTagsJson = """[{"skill":"correctness","weight":1.0}]""",
            LearningGainJson = """{"correctness":0.5}""",
            Rationale = "AI-suggested defaults",
            PromptVersion = "generate_tasks_v1",
            GeneratedById = generatedBy,
            DecidedById = decidedBy,
            DecidedAt = DateTime.UtcNow,
            OriginalDraftJson = """{"title":"Build a URL shortener"}""",
            ApprovedTaskId = approvedTaskId,
        };
        db.TaskDrafts.Add(d);
        await db.SaveChangesAsync();

        var fetched = await db.TaskDrafts.AsNoTracking().SingleAsync(x => x.Id == d.Id);
        Assert.Equal(TaskDraftStatus.Approved, fetched.Status);
        Assert.Equal(batchId, fetched.BatchId);
        Assert.Equal("Build a URL shortener", fetched.Title);
        Assert.Single(fetched.Prerequisites);
        Assert.Equal("rest-api-basics", fetched.Prerequisites[0]);
        Assert.Equal(approvedTaskId, fetched.ApprovedTaskId);
        Assert.Null(fetched.RejectionReason);
        Assert.Equal("generate_tasks_v1", fetched.PromptVersion);
    }

    [Fact]
    public async Task TaskDraft_RoundTrip_Rejected_Carries_RejectionReason()
    {
        var (db, _) = NewDb();
        using var _ = db;

        var d = new TaskDraft
        {
            BatchId = Guid.NewGuid(),
            PositionInBatch = 0,
            Status = TaskDraftStatus.Rejected,
            Title = "x",
            Description = "y",
            Difficulty = 1,
            Category = SkillCategory.OOP,
            Track = Track.Python,
            ExpectedLanguage = ProgrammingLanguage.Python,
            EstimatedHours = 1,
            SkillTagsJson = "[]",
            LearningGainJson = "{}",
            Rationale = "x",
            PromptVersion = "generate_tasks_v1",
            GeneratedById = Guid.NewGuid(),
            OriginalDraftJson = "{}",
            RejectionReason = "topical overlap > 80% with existing task",
        };
        db.TaskDrafts.Add(d);
        await db.SaveChangesAsync();

        var fetched = await db.TaskDrafts.AsNoTracking().SingleAsync(x => x.Id == d.Id);
        Assert.Equal(TaskDraftStatus.Rejected, fetched.Status);
        Assert.Equal("topical overlap > 80% with existing task", fetched.RejectionReason);
        Assert.Null(fetched.ApprovedTaskId);
    }

    [Theory]
    [InlineData(TaskDraftStatus.Draft)]
    [InlineData(TaskDraftStatus.Approved)]
    [InlineData(TaskDraftStatus.Rejected)]
    public async Task TaskDraftStatus_All_Enum_Values_Round_Trip(TaskDraftStatus s)
    {
        var (db, _) = NewDb();
        using var _ = db;

        var d = new TaskDraft
        {
            BatchId = Guid.NewGuid(),
            PositionInBatch = 0,
            Status = s,
            Title = "x",
            Description = "y",
            Difficulty = 1,
            Category = SkillCategory.OOP,
            Track = Track.Python,
            ExpectedLanguage = ProgrammingLanguage.Python,
            EstimatedHours = 1,
            SkillTagsJson = "[]",
            LearningGainJson = "{}",
            Rationale = "x",
            PromptVersion = "generate_tasks_v1",
            GeneratedById = Guid.NewGuid(),
            OriginalDraftJson = "{}",
        };
        db.TaskDrafts.Add(d);
        await db.SaveChangesAsync();

        var fetched = await db.TaskDrafts.AsNoTracking().SingleAsync(x => x.Id == d.Id);
        Assert.Equal(s, fetched.Status);
    }
}

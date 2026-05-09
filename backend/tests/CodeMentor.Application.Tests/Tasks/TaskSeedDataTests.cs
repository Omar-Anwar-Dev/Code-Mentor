using CodeMentor.Domain.Assessments;
using CodeMentor.Domain.Tasks;
using CodeMentor.Infrastructure.Persistence.Seeds;

namespace CodeMentor.Application.Tests.Tasks;

/// <summary>
/// S3-T2 acceptance: ≥21 tasks, ≥7 per track, all IsActive=true,
/// markdown descriptions look real, no duplicate titles per track.
/// </summary>
public class TaskSeedDataTests
{
    [Fact]
    public void TotalCount_Is_AtLeast_21()
    {
        Assert.True(TaskSeedData.All.Count >= 21, $"Expected ≥21 tasks, got {TaskSeedData.All.Count}");
    }

    [Fact]
    public void Each_Track_Has_AtLeast_7_Tasks()
    {
        foreach (Track track in Enum.GetValues<Track>())
        {
            var count = TaskSeedData.All.Count(t => t.Track == track);
            Assert.True(count >= 7, $"Track {track} has {count} tasks (need ≥7).");
        }
    }

    [Fact]
    public void All_Tasks_Are_Active()
    {
        Assert.All(TaskSeedData.All, t => Assert.True(t.IsActive));
    }

    [Fact]
    public void All_Tasks_Have_Meaningful_Descriptions()
    {
        Assert.All(TaskSeedData.All, t =>
        {
            Assert.False(string.IsNullOrWhiteSpace(t.Title));
            Assert.True(t.Title.Length <= 200, $"Title too long: {t.Title}");
            Assert.True(t.Description.Length >= 200,
                $"Description for '{t.Title}' is too short ({t.Description.Length} chars) — not defense-quality.");
            Assert.Contains("## ", t.Description); // markdown headers present
            Assert.InRange(t.Difficulty, 1, 5);
            Assert.InRange(t.EstimatedHours, 1, 40);
            Assert.NotEmpty(t.Prerequisites);
        });
    }

    [Fact]
    public void No_Duplicate_Titles_Within_Same_Track()
    {
        foreach (var group in TaskSeedData.All.GroupBy(t => t.Track))
        {
            var duplicates = group.GroupBy(t => t.Title)
                .Where(g => g.Count() > 1)
                .Select(g => g.Key)
                .ToList();
            Assert.Empty(duplicates);
        }
    }

    [Fact]
    public void All_Skill_Categories_Represented_Across_Library()
    {
        var categories = TaskSeedData.All.Select(t => t.Category).Distinct().ToList();
        Assert.Equal(5, categories.Count);
    }
}

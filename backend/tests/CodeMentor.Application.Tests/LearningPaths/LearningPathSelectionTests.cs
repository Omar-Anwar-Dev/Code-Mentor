using CodeMentor.Domain.Assessments;
using CodeMentor.Domain.Skills;
using CodeMentor.Domain.Tasks;
using CodeMentor.Infrastructure.LearningPaths;

namespace CodeMentor.Application.Tests.LearningPaths;

/// <summary>
/// S3-T4 acceptance pieces:
///  - Weakest category placed first.
///  - Path length scales with level (Beginner 5 / Intermediate 6 / Advanced 7).
///  - Deterministic tie-breaks.
///  - No duplicates.
/// </summary>
public class LearningPathSelectionTests
{
    private static TaskItem T(string title, Track track, SkillCategory cat, int difficulty) => new()
    {
        Title = title,
        Track = track,
        Category = cat,
        Difficulty = difficulty,
        ExpectedLanguage = ProgrammingLanguage.CSharp,
        EstimatedHours = 3,
    };

    private static SkillScore Score(SkillCategory cat, decimal score) =>
        new() { Category = cat, Score = score, Level = SkillLevel.Beginner };

    [Fact]
    public void Beginner_Gets_5_Tasks_WeakestFirst()
    {
        var tasks = new[]
        {
            T("DS-easy", Track.Backend, SkillCategory.DataStructures, 1),
            T("DS-med",  Track.Backend, SkillCategory.DataStructures, 3),
            T("OOP-easy", Track.Backend, SkillCategory.OOP, 1),
            T("OOP-med",  Track.Backend, SkillCategory.OOP, 2),
            T("Sec-easy", Track.Backend, SkillCategory.Security, 2),
            T("Sec-hard", Track.Backend, SkillCategory.Security, 4),
            T("Algo-med", Track.Backend, SkillCategory.Algorithms, 3),
        };
        var scores = new[]
        {
            Score(SkillCategory.OOP, 30),          // weakest
            Score(SkillCategory.DataStructures, 55),
            Score(SkillCategory.Security, 70),
            Score(SkillCategory.Algorithms, 90),   // strongest
        };

        var picked = LearningPathService.SelectTasks(tasks, scores, SkillLevel.Beginner, pathLength: 5);

        Assert.Equal(5, picked.Count);
        Assert.Equal(SkillCategory.OOP, picked[0].Category); // weakest-first
        Assert.Equal(SkillCategory.OOP, picked[1].Category); // both OOP tasks before others
        Assert.Equal(SkillCategory.DataStructures, picked[2].Category);
    }

    [Fact]
    public void Advanced_Gets_7_Tasks_And_Prefers_HigherDifficulty()
    {
        var tasks = new[]
        {
            T("A", Track.Python, SkillCategory.DataStructures, 1),
            T("B", Track.Python, SkillCategory.DataStructures, 3),
            T("C", Track.Python, SkillCategory.OOP, 2),
            T("D", Track.Python, SkillCategory.OOP, 4),
            T("E", Track.Python, SkillCategory.Security, 5),
            T("F", Track.Python, SkillCategory.Algorithms, 3),
            T("G", Track.Python, SkillCategory.Databases, 4),
        };
        var scores = new[]
        {
            Score(SkillCategory.OOP, 20),
            Score(SkillCategory.DataStructures, 30),
            Score(SkillCategory.Security, 40),
            Score(SkillCategory.Algorithms, 50),
            Score(SkillCategory.Databases, 60),
        };

        var picked = LearningPathService.SelectTasks(tasks, scores, SkillLevel.Advanced, pathLength: 7);
        Assert.Equal(7, picked.Count);

        // weakest (OOP) first — difficulty-4 before difficulty-2 because ideal is 4 for advanced.
        Assert.Equal(SkillCategory.OOP, picked[0].Category);
        Assert.Equal(4, picked[0].Difficulty);
        Assert.Equal(SkillCategory.OOP, picked[1].Category);
        Assert.Equal(2, picked[1].Difficulty);
    }

    [Fact]
    public void Intermediate_Gets_6_Tasks()
    {
        var tasks = Enumerable.Range(1, 8).Select(i =>
            T($"T{i}", Track.FullStack, (SkillCategory)((i % 5) + 1), difficulty: (i % 4) + 1)).ToArray();
        var scores = Array.Empty<SkillScore>(); // no scores → neutral-medium priority for all

        var picked = LearningPathService.SelectTasks(tasks, scores, SkillLevel.Intermediate, pathLength: 6);
        Assert.Equal(6, picked.Count);
        Assert.Equal(6, picked.DistinctBy(t => t.Title).Count());
    }

    [Fact]
    public void Selection_Is_Deterministic_Across_Runs()
    {
        var tasks = new[]
        {
            T("alpha", Track.Backend, SkillCategory.OOP, 2),
            T("bravo", Track.Backend, SkillCategory.OOP, 2),
            T("charlie", Track.Backend, SkillCategory.Databases, 2),
        };
        var scores = new[] { Score(SkillCategory.OOP, 10), Score(SkillCategory.Databases, 10) };

        var a = LearningPathService.SelectTasks(tasks, scores, SkillLevel.Beginner, 3);
        var b = LearningPathService.SelectTasks(tasks, scores, SkillLevel.Beginner, 3);
        Assert.Equal(a.Select(t => t.Title), b.Select(t => t.Title));
    }
}

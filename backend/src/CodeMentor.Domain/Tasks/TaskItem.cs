using CodeMentor.Domain.Assessments;

namespace CodeMentor.Domain.Tasks;

public class TaskItem
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty; // markdown
    public string? AcceptanceCriteria { get; set; } // markdown — done definition surfaced to learners + AI
    public string? Deliverables { get; set; }       // markdown — what the learner is expected to submit
    public int Difficulty { get; set; } // 1..5
    public SkillCategory Category { get; set; }
    public Track Track { get; set; }
    public ProgrammingLanguage ExpectedLanguage { get; set; }
    public int EstimatedHours { get; set; }
    public IReadOnlyList<string> Prerequisites { get; set; } = [];
    public Guid? CreatedBy { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

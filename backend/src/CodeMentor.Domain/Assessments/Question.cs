namespace CodeMentor.Domain.Assessments;

public class Question
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Content { get; set; } = string.Empty;
    public int Difficulty { get; set; } // 1..3
    public SkillCategory Category { get; set; }

    // 4-option multiple choice. Options stored as JSON (EF converts via value converter).
    public IReadOnlyList<string> Options { get; set; } = [];

    public string CorrectAnswer { get; set; } = string.Empty; // "A" | "B" | "C" | "D"
    public string? Explanation { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool IsActive { get; set; } = true;
}

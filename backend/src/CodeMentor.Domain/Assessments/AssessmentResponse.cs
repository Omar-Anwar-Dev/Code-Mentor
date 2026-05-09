namespace CodeMentor.Domain.Assessments;

public class AssessmentResponse
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid AssessmentId { get; set; }
    public Guid QuestionId { get; set; }
    public int OrderIndex { get; set; }
    public string UserAnswer { get; set; } = string.Empty;
    public bool IsCorrect { get; set; }
    public int TimeSpentSec { get; set; }
    public DateTime AnsweredAt { get; set; } = DateTime.UtcNow;

    // Captured at answer time so scoring never re-reads Question (avoids mutation surprises).
    public SkillCategory Category { get; set; }
    public int Difficulty { get; set; }

    // For idempotency — see S2-T12.
    public string? IdempotencyKey { get; set; }

    public Assessment Assessment { get; set; } = null!;
    public Question Question { get; set; } = null!;
}

using CodeMentor.Domain.Assessments;

namespace CodeMentor.Domain.Skills;

public class SkillScore
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public SkillCategory Category { get; set; }
    public decimal Score { get; set; } // 0..100
    public SkillLevel Level { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

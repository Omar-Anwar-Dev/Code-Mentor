namespace CodeMentor.Domain.Assessments;

public class Assessment
{
    public const int TotalQuestions = 30;
    public const int TimeoutMinutes = 40;

    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public Track Track { get; set; }
    public AssessmentStatus Status { get; set; } = AssessmentStatus.InProgress;

    public DateTime StartedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }
    public int DurationSec { get; set; }

    public decimal? TotalScore { get; set; } // 0..100
    public SkillLevel? SkillLevel { get; set; }

    public ICollection<AssessmentResponse> Responses { get; set; } = [];

    public bool IsExpired() => Status == AssessmentStatus.InProgress
                               && DateTime.UtcNow >= StartedAt.AddMinutes(TimeoutMinutes);
}

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

    // S15-T6 / F15 (ADR-049): set to true when at least one selection call during
    // this assessment fell back to LegacyAdaptiveQuestionSelector (AI service was
    // unhealthy or the health probe threw). Sticky once set — does NOT clear if
    // later calls succeed via IRT. Surfaced on /admin so admins can spot
    // assessments where the IRT path was bypassed for retroactive QA.
    public bool IrtFallbackUsed { get; set; }

    public bool IsExpired() => Status == AssessmentStatus.InProgress
                               && DateTime.UtcNow >= StartedAt.AddMinutes(TimeoutMinutes);
}

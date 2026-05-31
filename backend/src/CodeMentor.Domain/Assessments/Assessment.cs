namespace CodeMentor.Domain.Assessments;

public class Assessment
{
    // Legacy const kept for back-compat with pre-S21 callers; equals
    // GetTotalQuestionsForVariant(Initial) and GetTotalQuestionsForVariant(Full).
    public const int TotalQuestions = 30;
    public const int TimeoutMinutes = 40;

    // S21-T1 / F16: Mini variant uses 10 items + a tighter timeout. The
    // public constants drive both BE selection logic + FE progress bar.
    public const int MiniTotalQuestions = 10;
    public const int MiniTimeoutMinutes = 15;

    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public Track Track { get; set; }
    public AssessmentStatus Status { get; set; } = AssessmentStatus.InProgress;

    // S21-T1 / F16: which kind of assessment this row is. Default Initial
    // covers all pre-S21 backfilled rows (single migration default value).
    public AssessmentVariant Variant { get; set; } = AssessmentVariant.Initial;

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

    // S21-T1 / F16: variant-aware accessors so the selector loop + the
    // timeout gate don't have to switch-case at every callsite.
    public int TotalQuestionsForVariant => GetTotalQuestionsForVariant(Variant);
    public int TimeoutMinutesForVariant => GetTimeoutMinutesForVariant(Variant);

    public static int GetTotalQuestionsForVariant(AssessmentVariant variant) => variant switch
    {
        AssessmentVariant.Mini => MiniTotalQuestions,
        _ => TotalQuestions,
    };

    public static int GetTimeoutMinutesForVariant(AssessmentVariant variant) => variant switch
    {
        AssessmentVariant.Mini => MiniTimeoutMinutes,
        _ => TimeoutMinutes,
    };

    public bool IsExpired() => Status == AssessmentStatus.InProgress
                               && DateTime.UtcNow >= StartedAt.AddMinutes(TimeoutMinutesForVariant);
}

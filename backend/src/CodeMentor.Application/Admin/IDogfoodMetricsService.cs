namespace CodeMentor.Application.Admin;

/// <summary>
/// S21-T8 / F16: read-side aggregate for the dogfood Tier-2 metrics
/// dashboard. Surfaces:
///   - DistinctLearners — count of users with at least one Completed
///     Initial assessment AND ≥1 active LearningPath.
///   - LearnersAt100 — count of users with a current path at 100%.
///   - LearnersGraduated — count of users with a Completed Full
///     reassessment.
///   - LearnersOnPhase2 — count of users with a LearningPath where
///     Version >= 2 (Next-Phase activated).
///   - AvgPrePostDelta — average per-category delta between the user's
///     initial profile (LearningPath.InitialSkillProfileJson) and their
///     current LearnerSkillProfile.SmoothedScore. Returned per category
///     plus an overall mean.
///   - PendingProposalApprovalRate — across all users:
///     count(decision=Approved) / (count(Approved)+count(Rejected)).
///   - EmpiricallyCalibratedQuestions — count of Questions where
///     CalibrationSource = Empirical.
///   - AdaptationCyclesPerLearner — average count of PathAdaptationEvents
///     per learner (excludes the no_action cycles).
/// </summary>
public interface IDogfoodMetricsService
{
    Task<DogfoodMetricsDto> GetAsync(CancellationToken ct = default);
}

public sealed record DogfoodMetricsDto(
    int DistinctLearners,
    int LearnersAt100,
    int LearnersGraduated,
    int LearnersOnPhase2,
    decimal AvgPrePostDeltaOverall,
    IReadOnlyList<CategoryDeltaDto> AvgPrePostDeltaByCategory,
    decimal PendingProposalApprovalRate,
    int EmpiricallyCalibratedQuestions,
    decimal AdaptationCyclesPerLearner,
    int TotalBankQuestions,
    int TotalActiveTasks,
    DateTime CapturedAt);

public sealed record CategoryDeltaDto(
    string Category,
    decimal AvgInitial,
    decimal AvgCurrent,
    decimal Delta,
    int SampleSize);

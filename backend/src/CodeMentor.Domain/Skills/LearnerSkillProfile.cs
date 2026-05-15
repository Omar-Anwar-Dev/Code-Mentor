using CodeMentor.Domain.Assessments;

namespace CodeMentor.Domain.Skills;

/// <summary>
/// S19-T3 / F16 (ADR-049 / ADR-052): per-user-per-category running skill
/// profile that the F16 AI Path Generator + Adaptation Engine consume as
/// the authoritative learner signal.
///
/// Distinct from <see cref="SkillScore"/> — that captures a single
/// Assessment's per-category result. This entity captures the
/// **moving average** of those signals across submissions + future
/// assessments, using EMA smoothing with α = 0.4 (per S19 locked
/// answer #3).
///
/// One row per (UserId, Category). Initialised when the learner
/// finishes an Assessment (Source = <see cref="LearnerSkillProfileSource.Assessment"/>);
/// updated after each Submission's <c>ScoringOutcome</c> (Source =
/// <see cref="LearnerSkillProfileSource.SubmissionInferred"/>).
///
/// EMA formula on update: <c>new = α · sample + (1 − α) · old</c>.
/// Initial sample (no prior row): <c>new = sample</c> (no smoothing on
/// first observation).
/// </summary>
public class LearnerSkillProfile
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid UserId { get; set; }

    public SkillCategory Category { get; set; }

    /// <summary>EMA-smoothed score in [0, 100]. Precision (5, 2) to match
    /// <see cref="SkillScore.Score"/>.</summary>
    public decimal SmoothedScore { get; set; }

    /// <summary>Mapped from the smoothed score using the same thresholds
    /// as <see cref="SkillScore.Level"/> (Advanced ≥ 80, Intermediate
    /// 60–79, Beginner &lt; 60).</summary>
    public SkillLevel Level { get; set; }

    /// <summary>Provenance of the **last** sample applied. The Source
    /// changes per update; we don't retain history here — the
    /// :code:`PathAdaptationEvents` table (S20) carries the audit trail.</summary>
    public LearnerSkillProfileSource LastSource { get; set; }

    /// <summary>Number of samples that have been folded into this profile
    /// (1 after first initialise; +1 per submission update). Useful for
    /// the dashboard and for skipping adaptation triggers when n is too
    /// low to be meaningful.</summary>
    public int SampleCount { get; set; }

    public DateTime LastUpdatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>S19-T3: provenance of the most-recent sample folded into a
/// <see cref="LearnerSkillProfile"/>.</summary>
public enum LearnerSkillProfileSource
{
    /// <summary>Initialised from an <see cref="Assessment"/> completion
    /// — the per-category score becomes the seed value.</summary>
    Assessment = 1,

    /// <summary>Updated from a Submission's <c>ScoringOutcome</c>
    /// (per-category mark applied via EMA).</summary>
    SubmissionInferred = 2,
}

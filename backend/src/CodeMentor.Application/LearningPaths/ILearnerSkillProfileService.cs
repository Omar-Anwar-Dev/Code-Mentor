using CodeMentor.Application.LearningPaths.Contracts;
using CodeMentor.Domain.Assessments;

namespace CodeMentor.Application.LearningPaths;

/// <summary>
/// S19-T3 / F16: read/write surface for the
/// <see cref="Domain.Skills.LearnerSkillProfile"/> entity.
///
/// The two write paths model F16's "continuous adaptation":
/// 1. <see cref="InitializeFromAssessmentAsync"/> runs once per
///    Assessment completion — seeds (or re-seeds) the profile per
///    category from the Assessment's <c>SkillScores</c>.
/// 2. <see cref="UpdateFromSubmissionAsync"/> runs after every
///    Submission's scoring step — folds the submission's per-category
///    marks into the profile via EMA smoothing (α = 0.4 per S19
///    locked answer #3).
///
/// Reads are by user: <see cref="GetByUserAsync"/> returns the snapshot
/// keyed by category; the F16 Path Generator job converts this into the
/// 0-100 dict that goes into the AI service request.
/// </summary>
public interface ILearnerSkillProfileService
{
    /// <summary>Seed (or replace) the profile rows for the user from a
    /// completed Assessment's per-category scores. Idempotent: re-running
    /// for the same Assessment overwrites in place rather than
    /// duplicating rows.</summary>
    Task InitializeFromAssessmentAsync(
        Guid userId,
        Guid assessmentId,
        CancellationToken ct = default);

    /// <summary>Apply EMA smoothing to existing profile rows using the
    /// per-category samples from a Submission's scoring outcome.
    /// Categories absent from <paramref name="samples"/> are untouched.
    /// Categories present but with no prior row are seeded with the
    /// sample value (no smoothing on first observation).</summary>
    Task UpdateFromSubmissionAsync(
        Guid userId,
        IReadOnlyDictionary<SkillCategory, decimal> samples,
        CancellationToken ct = default);

    /// <summary>Read the full profile for a user (one row per category).
    /// Empty list when no rows exist yet (e.g., user hasn't completed an
    /// Assessment yet).</summary>
    Task<IReadOnlyList<LearnerSkillProfileSnapshot>> GetByUserAsync(
        Guid userId,
        CancellationToken ct = default);
}

public sealed record LearnerSkillProfileSnapshot(
    SkillCategory Category,
    decimal SmoothedScore,
    string Level,
    string LastSource,
    int SampleCount,
    DateTime LastUpdatedAt);

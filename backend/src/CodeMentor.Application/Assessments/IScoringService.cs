using CodeMentor.Application.Assessments.Contracts;
using CodeMentor.Domain.Assessments;

namespace CodeMentor.Application.Assessments;

public interface IScoringService
{
    /// <summary>Computes per-category and overall scores; also the skill-level bucket.</summary>
    ScoringOutcome Score(IReadOnlyList<AssessmentResponse> responses);
}

public sealed record ScoringOutcome(
    decimal OverallScore,
    SkillLevel Level,
    IReadOnlyList<CategoryScoreDto> CategoryScores);

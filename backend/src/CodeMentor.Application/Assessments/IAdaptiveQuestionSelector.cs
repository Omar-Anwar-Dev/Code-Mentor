using CodeMentor.Domain.Assessments;

namespace CodeMentor.Application.Assessments;

public interface IAdaptiveQuestionSelector
{
    /// <summary>
    /// Chooses the next question given the assessment's current history (ordered by OrderIndex asc).
    /// Returns null if no eligible question remains (which shouldn't happen with a seeded bank).
    /// </summary>
    Question? SelectNext(
        IReadOnlyList<AssessmentResponse> history,
        IReadOnlyList<Question> bank,
        int totalQuestions);

    /// <summary>Chooses the first question at medium difficulty, balanced across categories.</summary>
    Question SelectFirst(IReadOnlyList<Question> bank);
}

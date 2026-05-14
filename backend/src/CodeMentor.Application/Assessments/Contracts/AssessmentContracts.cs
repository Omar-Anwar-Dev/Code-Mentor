using CodeMentor.Domain.Assessments;

namespace CodeMentor.Application.Assessments.Contracts;

public sealed record StartAssessmentRequest(Track Track);

public sealed record QuestionDto(
    Guid QuestionId,
    int OrderIndex,
    int TotalQuestions,
    string Content,
    IReadOnlyList<string> Options,
    int Difficulty,
    string Category,
    // S15-T7 / F15: optional code snippet rendered above the question text
    // by the FE (Prism syntax highlighting). Null for text-only questions.
    string? CodeSnippet = null,
    string? CodeLanguage = null,
    // S15-T8 / F15: most-recent IRT (theta, info) from the IRT engine; null
    // when the legacy fallback selector chose this question. Always sent on
    // the wire (not security-sensitive); the FE shows the diagnostic banner
    // only to admin-role users.
    double? DebugTheta = null,
    double? DebugItemInfo = null);

public sealed record AnswerRequest(Guid QuestionId, string UserAnswer, int TimeSpentSec);

public sealed record AnswerResult(
    bool Completed,
    QuestionDto? NextQuestion,
    Guid AssessmentId);

public sealed record CategoryScoreDto(string Category, decimal Score, int TotalAnswered, int CorrectCount);

public sealed record AssessmentResultDto(
    Guid AssessmentId,
    string Track,
    string Status,
    DateTime StartedAt,
    DateTime? CompletedAt,
    int DurationSec,
    decimal? TotalScore,
    string? SkillLevel,
    int AnsweredCount,
    int TotalQuestions,
    IReadOnlyList<CategoryScoreDto> CategoryScores);

public sealed record StartAssessmentResponse(Guid AssessmentId, QuestionDto FirstQuestion);

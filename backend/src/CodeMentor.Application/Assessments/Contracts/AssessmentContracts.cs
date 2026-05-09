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
    string Category);

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

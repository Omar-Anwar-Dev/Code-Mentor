using CodeMentor.Application.Assessments.Contracts;
using CodeMentor.Application.Auth;

namespace CodeMentor.Application.Assessments;

public interface IAssessmentService
{
    Task<AuthResult<StartAssessmentResponse>> StartAsync(Guid userId, StartAssessmentRequest req, CancellationToken ct = default);
    Task<AuthResult<AnswerResult>> SubmitAnswerAsync(
        Guid userId, Guid assessmentId, AnswerRequest req, string? idempotencyKey, CancellationToken ct = default);
    Task<AuthResult<AssessmentResultDto>> GetByIdAsync(Guid userId, Guid assessmentId, CancellationToken ct = default);
    Task<AuthResult<AssessmentResultDto?>> GetLatestAsync(Guid userId, CancellationToken ct = default);
    Task<AuthResult<AssessmentResultDto>> AbandonAsync(Guid userId, Guid assessmentId, CancellationToken ct = default);
}

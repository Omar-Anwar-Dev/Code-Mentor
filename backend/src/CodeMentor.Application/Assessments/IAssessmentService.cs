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

    /// <summary>
    /// S17-T3: returns the AI summary for one Completed assessment.
    /// Three result shapes:
    /// - <c>Fail(UserNotFound)</c> — assessment does not exist OR is not owned by <paramref name="userId"/>.
    /// - <c>Ok(null)</c>                 — assessment exists but the summary row hasn't been written yet
    ///   (the Hangfire job is in flight or the assessment is non-Completed).
    ///   Controller maps this to HTTP 409 Conflict.
    /// - <c>Ok(value)</c>                — summary row present.
    /// </summary>
    Task<AuthResult<AssessmentSummaryDto?>> GetSummaryAsync(Guid userId, Guid assessmentId, CancellationToken ct = default);
}

using CodeMentor.Application.Assessments.Contracts;
using CodeMentor.Application.Auth;

namespace CodeMentor.Application.Assessments;

public interface IAssessmentService
{
    Task<AuthResult<StartAssessmentResponse>> StartAsync(Guid userId, StartAssessmentRequest req, CancellationToken ct = default);

    /// <summary>
    /// S21-T1 / F16: optional 10-question reassessment at the 50% path-progress
    /// checkpoint. Pulls the user's active <c>LearningPath</c> (must be ≥ 50%
    /// and have no Mini for the current path yet). Bypasses the 30-day cooldown.
    /// Draws items NOT in any prior <c>AssessmentResponses</c> for this user;
    /// seeds IRT theta from the user's <c>LearnerSkillProfile</c> average
    /// (clamped to [-3, +3]). Does NOT enqueue path generation or AI summary
    /// on completion — those are gated to Initial/Full variants only.
    /// </summary>
    Task<AuthResult<StartAssessmentResponse>> StartMiniReassessmentAsync(
        Guid userId, CancellationToken ct = default);

    /// <summary>
    /// S21-T1 / F16: mandatory 30-question reassessment at 100% path completion.
    /// Required before the "Generate Next Phase Path" CTA enables. Bypasses
    /// the 30-day cooldown. Re-anchors the user's <c>LearnerSkillProfile</c>
    /// (InitializeFromAssessmentAsync = full overwrite, not EMA). Enqueues
    /// the AI summary. Does NOT auto-trigger path generation — that's the
    /// job of <c>POST /api/learning-paths/me/next-phase</c> (S21-T4).
    /// </summary>
    Task<AuthResult<StartAssessmentResponse>> StartFullReassessmentAsync(
        Guid userId, CancellationToken ct = default);

    /// <summary>
    /// S21-T2 / F16: lookup for the FE 50% banner — returns true when the
    /// user has an active path with <c>ProgressPercent ≥ 50</c> AND no Mini
    /// variant Assessment exists for this path yet. False otherwise (banner
    /// hidden).
    /// </summary>
    Task<bool> IsMiniReassessmentEligibleAsync(Guid userId, CancellationToken ct = default);

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

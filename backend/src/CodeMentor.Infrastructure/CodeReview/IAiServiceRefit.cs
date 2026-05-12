using CodeMentor.Application.CodeReview;
using Refit;

namespace CodeMentor.Infrastructure.CodeReview;

/// <summary>
/// Refit-backed surface area of the AI service. Paths match architecture §6.10:
///   POST /api/analyze-zip
///   POST /api/analyze-zip-multi  (S11-T4 / F13 / ADR-037 — parallel multi-agent)
///   POST /api/ai-review (not used here; consumed indirectly via analyze-zip)
///   GET  /health
///
/// Public so test harnesses can stub it with NSubstitute or Refit's
/// <see cref="Refit.RestService"/>. Production code should depend on
/// <see cref="CodeMentor.Application.CodeReview.IAiReviewClient"/> instead.
/// </summary>
public interface IAiServiceRefit
{
    /// <summary>
    /// S12 / F14 (ADR-040): the three optional <c>*_json</c> form parts
    /// carry the learner snapshot. When non-null they auto-promote the AI
    /// service to the history-aware enhanced prompt (existing F12 path —
    /// see <c>ai_reviewer.review_code</c>). Null values are NOT serialized
    /// by Refit so a no-snapshot call produces an identical multipart
    /// payload to the pre-F14 baseline.
    /// </summary>
    [Multipart]
    [Post("/api/analyze-zip")]
    Task<AiCombinedResponse> AnalyzeZipAsync(
        [AliasAs("file")] StreamPart file,
        [Header("X-Correlation-Id")] string correlationId,
        CancellationToken ct,
        [AliasAs("learner_profile_json")] string? learnerProfileJson = null,
        [AliasAs("learner_history_json")] string? learnerHistoryJson = null,
        [AliasAs("project_context_json")] string? projectContextJson = null);

    /// <summary>
    /// S11-T4 / F13 (ADR-037): parallel multi-agent counterpart to
    /// <see cref="AnalyzeZipAsync"/>. Same response shape; the AI-review
    /// portion is produced by the orchestrator that runs three specialist
    /// agents in parallel instead of the single-prompt reviewer.
    ///
    /// S12 / F14 (ADR-040): same snapshot-bearing form parts as the
    /// single-prompt variant — forwarded uniformly to all three agents.
    /// </summary>
    [Multipart]
    [Post("/api/analyze-zip-multi")]
    Task<AiCombinedResponse> AnalyzeZipMultiAsync(
        [AliasAs("file")] StreamPart file,
        [Header("X-Correlation-Id")] string correlationId,
        CancellationToken ct,
        [AliasAs("learner_profile_json")] string? learnerProfileJson = null,
        [AliasAs("learner_history_json")] string? learnerHistoryJson = null,
        [AliasAs("project_context_json")] string? projectContextJson = null);

    [Get("/health")]
    Task<HttpResponseMessage> HealthAsync(CancellationToken ct);
}

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
    [Multipart]
    [Post("/api/analyze-zip")]
    Task<AiCombinedResponse> AnalyzeZipAsync(
        [AliasAs("file")] StreamPart file,
        [Header("X-Correlation-Id")] string correlationId,
        CancellationToken ct);

    /// <summary>
    /// S11-T4 / F13 (ADR-037): parallel multi-agent counterpart to
    /// <see cref="AnalyzeZipAsync"/>. Same response shape; the AI-review
    /// portion is produced by the orchestrator that runs three specialist
    /// agents in parallel instead of the single-prompt reviewer.
    /// </summary>
    [Multipart]
    [Post("/api/analyze-zip-multi")]
    Task<AiCombinedResponse> AnalyzeZipMultiAsync(
        [AliasAs("file")] StreamPart file,
        [Header("X-Correlation-Id")] string correlationId,
        CancellationToken ct);

    [Get("/health")]
    Task<HttpResponseMessage> HealthAsync(CancellationToken ct);
}

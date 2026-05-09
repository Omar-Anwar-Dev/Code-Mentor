namespace CodeMentor.Application.CodeReview;

/// <summary>
/// Backend-facing abstraction over the AI service (FastAPI). Shields the
/// SubmissionAnalysisJob from the transport + the service's exact endpoint
/// surface, and lets Sprint-5 tests inject a fake.
///
/// ADR-003: single provider (OpenAI via the AI service) for MVP; multi-provider
/// fallback is a post-MVP swap behind this interface.
/// </summary>
public interface IAiReviewClient
{
    /// <summary>
    /// Uploads a ZIP and returns the combined static + AI review response.
    /// Throws <see cref="AiServiceUnavailableException"/> if the service cannot
    /// be reached or returns a transport-level failure — S5-T5 uses this to
    /// trigger graceful degradation.
    /// </summary>
    Task<AiCombinedResponse> AnalyzeZipAsync(
        Stream zipStream,
        string zipFileName,
        string correlationId,
        CancellationToken ct = default);

    /// <summary>
    /// S11-T4 / F13 (ADR-037): parallel method targeting
    /// <c>/api/analyze-zip-multi</c>. Same input shape and same response
    /// contract as <see cref="AnalyzeZipAsync"/> — the AI-review portion is
    /// produced by the multi-agent orchestrator instead of the single-prompt
    /// reviewer. Used by <c>SubmissionAnalysisJob</c> when
    /// <c>AI_REVIEW_MODE=multi</c>.
    /// </summary>
    Task<AiCombinedResponse> AnalyzeZipMultiAsync(
        Stream zipStream,
        string zipFileName,
        string correlationId,
        CancellationToken ct = default);

    /// <summary>
    /// Cheap liveness probe. Used by S5-T5's degradation path to decide
    /// whether to retry vs mark AI-analysis Unavailable.
    /// </summary>
    Task<bool> IsHealthyAsync(CancellationToken ct = default);
}

public sealed class AiServiceUnavailableException : Exception
{
    public AiServiceUnavailableException(string message) : base(message) { }
    public AiServiceUnavailableException(string message, Exception inner) : base(message, inner) { }
}

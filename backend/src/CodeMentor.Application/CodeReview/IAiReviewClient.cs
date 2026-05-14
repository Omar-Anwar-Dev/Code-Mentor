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
    ///
    /// S12 / F14 (ADR-040): when <paramref name="snapshot"/> is non-null its
    /// profile + history fields are serialized to JSON and forwarded as
    /// optional multipart form parts (<c>learner_profile_json</c>,
    /// <c>learner_history_json</c>, <c>project_context_json</c>). The AI
    /// service auto-promotes to the enhanced history-aware prompt when any
    /// of these are present. When null, the request shape is identical to
    /// the pre-F14 baseline (back-compat preserved).
    /// </summary>
    Task<AiCombinedResponse> AnalyzeZipAsync(
        Stream zipStream,
        string zipFileName,
        string correlationId,
        LearnerSnapshot? snapshot = null,
        TaskBrief? taskBrief = null,
        CancellationToken ct = default);

    /// <summary>
    /// S11-T4 / F13 (ADR-037): parallel method targeting
    /// <c>/api/analyze-zip-multi</c>. Same input shape and same response
    /// contract as <see cref="AnalyzeZipAsync"/> — the AI-review portion is
    /// produced by the multi-agent orchestrator instead of the single-prompt
    /// reviewer. Used by <c>SubmissionAnalysisJob</c> when
    /// <c>AI_REVIEW_MODE=multi</c>.
    ///
    /// S12 / F14 (ADR-040): the same snapshot is forwarded uniformly to all
    /// three specialist agents.
    /// </summary>
    Task<AiCombinedResponse> AnalyzeZipMultiAsync(
        Stream zipStream,
        string zipFileName,
        string correlationId,
        LearnerSnapshot? snapshot = null,
        TaskBrief? taskBrief = null,
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

/// <summary>
/// B-035: thrown when the AI service returns a 4xx (validation / payload-shape
/// failure — e.g. "ZIP has too many analyzable entries", "Malformed JSON in
/// form field 'learner_profile_json'"). Distinct from
/// <see cref="AiServiceUnavailableException"/> because 4xx is a request-shape
/// problem the AI service is correctly diagnosing — the call SHOULD NOT be
/// auto-retried by Hangfire. The FastAPI <c>{"detail": "..."}</c> body is
/// extracted into <see cref="Exception.Message"/> so the FE renders the
/// actual diagnostic instead of a generic "Bad Request" string.
/// </summary>
public sealed class AiServiceBadRequestException : Exception
{
    public int StatusCode { get; }

    public AiServiceBadRequestException(int statusCode, string message) : base(message)
    {
        StatusCode = statusCode;
    }

    public AiServiceBadRequestException(int statusCode, string message, Exception inner)
        : base(message, inner)
    {
        StatusCode = statusCode;
    }
}

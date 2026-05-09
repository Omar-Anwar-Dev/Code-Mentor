namespace CodeMentor.Application.CodeReview;

/// <summary>
/// Backend-facing abstraction over the AI service's project-audit endpoint
/// (POST /api/project-audit — architecture §6.10; ADR-034). Distinct from
/// <see cref="IAiReviewClient"/> because:
///  - audit prompt template differs (senior-reviewer tone vs tutor tone)
///  - audit token caps are higher (10k input / 3k output vs 8k / 2k)
///  - audit has no Task context — only the user-supplied project description
///
/// Throws <see cref="AiServiceUnavailableException"/> on transport failure so
/// <c>ProjectAuditJob</c> can trigger graceful degradation (mirrors the
/// IAiReviewClient pattern from S5-T5).
/// </summary>
public interface IProjectAuditAiClient
{
    /// <summary>
    /// Uploads a ZIP + the structured project description, and returns the
    /// combined static-analysis + LLM audit response. The AI service handles
    /// the internal static-then-audit orchestration so the backend pays one
    /// HTTP round-trip per audit.
    /// </summary>
    Task<AiAuditCombinedResponse> AuditProjectAsync(
        Stream zipStream,
        string zipFileName,
        string projectDescriptionJson,
        string correlationId,
        CancellationToken ct = default);

    /// <summary>Cheap liveness probe — used by graceful-degradation logic.</summary>
    Task<bool> IsHealthyAsync(CancellationToken ct = default);
}

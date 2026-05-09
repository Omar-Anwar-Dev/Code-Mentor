using CodeMentor.Application.CodeReview;
using Refit;

namespace CodeMentor.Infrastructure.CodeReview;

/// <summary>
/// Refit-backed surface area of the AI service's project-audit endpoint
/// (architecture §6.10 + ADR-034). Distinct from <see cref="IAiServiceRefit"/>
/// because the audit endpoint accepts a structured project description and
/// returns a different response schema (8 sections vs review's 5).
///
/// The endpoint itself is implemented by the AI team in S9-T6.
/// </summary>
public interface IProjectAuditServiceRefit
{
    [Multipart]
    [Post("/api/project-audit")]
    Task<AiAuditCombinedResponse> AuditAsync(
        [AliasAs("file")] StreamPart file,
        [AliasAs("description")] string projectDescriptionJson,
        [Header("X-Correlation-Id")] string correlationId,
        CancellationToken ct);

    [Get("/health")]
    Task<HttpResponseMessage> HealthAsync(CancellationToken ct);
}

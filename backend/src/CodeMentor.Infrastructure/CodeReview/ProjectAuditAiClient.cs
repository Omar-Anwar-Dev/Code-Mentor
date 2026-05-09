using CodeMentor.Application.CodeReview;
using Microsoft.Extensions.Logging;
using Refit;

namespace CodeMentor.Infrastructure.CodeReview;

/// <summary>
/// Production implementation of <see cref="IProjectAuditAiClient"/>. Wraps the
/// Refit interface, translates transport-level failures into
/// <see cref="AiServiceUnavailableException"/> so <c>ProjectAuditJob</c> can
/// trigger graceful degradation. Mirrors <see cref="AiReviewClient"/>.
/// </summary>
public sealed class ProjectAuditAiClient : IProjectAuditAiClient
{
    private readonly IProjectAuditServiceRefit _refit;
    private readonly ILogger<ProjectAuditAiClient> _logger;

    public ProjectAuditAiClient(IProjectAuditServiceRefit refit, ILogger<ProjectAuditAiClient> logger)
    {
        _refit = refit;
        _logger = logger;
    }

    public async Task<AiAuditCombinedResponse> AuditProjectAsync(
        Stream zipStream,
        string zipFileName,
        string projectDescriptionJson,
        string correlationId,
        CancellationToken ct = default)
    {
        var part = new StreamPart(zipStream, zipFileName, "application/zip");

        try
        {
            return await _refit.AuditAsync(part, projectDescriptionJson, correlationId, ct);
        }
        catch (ApiException ex) when (ex.StatusCode == System.Net.HttpStatusCode.ServiceUnavailable
                                   || ex.StatusCode == System.Net.HttpStatusCode.BadGateway
                                   || ex.StatusCode == System.Net.HttpStatusCode.GatewayTimeout
                                   || (int)ex.StatusCode >= 500)
        {
            _logger.LogWarning(ex,
                "AI service returned transport error {Status} for /api/project-audit (corr {CorrelationId})",
                ex.StatusCode, correlationId);
            throw new AiServiceUnavailableException(
                $"AI service returned {(int)ex.StatusCode} for /api/project-audit", ex);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex, "AI service unreachable for /api/project-audit (corr {CorrelationId})", correlationId);
            throw new AiServiceUnavailableException("AI service unreachable for project audit", ex);
        }
        catch (TaskCanceledException ex) when (!ct.IsCancellationRequested)
        {
            _logger.LogWarning(ex, "AI service timed out on /api/project-audit (corr {CorrelationId})", correlationId);
            throw new AiServiceUnavailableException("AI service timed out on project audit", ex);
        }
    }

    public async Task<bool> IsHealthyAsync(CancellationToken ct = default)
    {
        try
        {
            using var resp = await _refit.HealthAsync(ct);
            return resp.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "AI service health probe failed (project-audit endpoint)");
            return false;
        }
    }
}

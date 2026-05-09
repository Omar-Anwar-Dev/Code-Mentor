using CodeMentor.Application.CodeReview;
using Microsoft.Extensions.Logging;
using Refit;

namespace CodeMentor.Infrastructure.CodeReview;

/// <summary>
/// Production implementation of <see cref="IAiReviewClient"/>. Wraps the Refit
/// interface, translates transport-level failures into
/// <see cref="AiServiceUnavailableException"/> so S5-T5 can distinguish AI
/// outages from business-layer errors.
/// </summary>
public sealed class AiReviewClient : IAiReviewClient
{
    private readonly IAiServiceRefit _refit;
    private readonly ILogger<AiReviewClient> _logger;

    public AiReviewClient(IAiServiceRefit refit, ILogger<AiReviewClient> logger)
    {
        _refit = refit;
        _logger = logger;
    }

    public Task<AiCombinedResponse> AnalyzeZipAsync(
        Stream zipStream,
        string zipFileName,
        string correlationId,
        CancellationToken ct = default)
        => InvokeAsync(zipStream, zipFileName, correlationId, _refit.AnalyzeZipAsync, "/api/analyze-zip", ct);

    public Task<AiCombinedResponse> AnalyzeZipMultiAsync(
        Stream zipStream,
        string zipFileName,
        string correlationId,
        CancellationToken ct = default)
        => InvokeAsync(zipStream, zipFileName, correlationId, _refit.AnalyzeZipMultiAsync, "/api/analyze-zip-multi", ct);

    private async Task<AiCombinedResponse> InvokeAsync(
        Stream zipStream,
        string zipFileName,
        string correlationId,
        Func<StreamPart, string, CancellationToken, Task<AiCombinedResponse>> refitCall,
        string endpointForLog,
        CancellationToken ct)
    {
        var part = new StreamPart(zipStream, zipFileName, "application/zip");

        try
        {
            return await refitCall(part, correlationId, ct);
        }
        catch (ApiException ex) when (ex.StatusCode == System.Net.HttpStatusCode.ServiceUnavailable
                                    || ex.StatusCode == System.Net.HttpStatusCode.BadGateway
                                    || ex.StatusCode == System.Net.HttpStatusCode.GatewayTimeout
                                    || (int)ex.StatusCode >= 500)
        {
            _logger.LogWarning(ex, "AI service returned transport error {Status} for correlation {CorrelationId} on {Endpoint}",
                ex.StatusCode, correlationId, endpointForLog);
            throw new AiServiceUnavailableException(
                $"AI service returned {(int)ex.StatusCode} for {endpointForLog}", ex);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex, "AI service unreachable for correlation {CorrelationId} on {Endpoint}",
                correlationId, endpointForLog);
            throw new AiServiceUnavailableException("AI service unreachable", ex);
        }
        catch (TaskCanceledException ex) when (!ct.IsCancellationRequested)
        {
            _logger.LogWarning(ex, "AI service timed out for correlation {CorrelationId} on {Endpoint}",
                correlationId, endpointForLog);
            throw new AiServiceUnavailableException("AI service timed out", ex);
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
            _logger.LogDebug(ex, "AI service health probe failed");
            return false;
        }
    }
}

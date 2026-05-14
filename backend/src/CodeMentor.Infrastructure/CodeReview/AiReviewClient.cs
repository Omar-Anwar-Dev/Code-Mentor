using System.Text.Json;
using CodeMentor.Application.CodeReview;
using Microsoft.Extensions.Logging;
using Refit;

namespace CodeMentor.Infrastructure.CodeReview;

/// <summary>
/// Production implementation of <see cref="IAiReviewClient"/>. Wraps the Refit
/// interface, translates transport-level failures into
/// <see cref="AiServiceUnavailableException"/> so S5-T5 can distinguish AI
/// outages from business-layer errors.
///
/// S12 / F14 (ADR-040): forwards optional <see cref="LearnerSnapshot"/> as
/// three multipart form parts (<c>learner_profile_json</c>,
/// <c>learner_history_json</c>, <c>project_context_json</c>) — the AI
/// service auto-promotes to the enhanced history-aware prompt when any are
/// non-null. Pre-F14 callers omitting the snapshot get the same payload as
/// before.
/// </summary>
public sealed class AiReviewClient : IAiReviewClient
{
    private static readonly JsonSerializerOptions _wireSerializer = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull,
    };

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
        LearnerSnapshot? snapshot = null,
        TaskBrief? taskBrief = null,
        CancellationToken ct = default)
        => InvokeAsync(
            zipStream, zipFileName, correlationId, snapshot, taskBrief,
            (part, cid, c, prof, hist, proj) => _refit.AnalyzeZipAsync(part, cid, c, prof, hist, proj),
            "/api/analyze-zip", ct);

    public Task<AiCombinedResponse> AnalyzeZipMultiAsync(
        Stream zipStream,
        string zipFileName,
        string correlationId,
        LearnerSnapshot? snapshot = null,
        TaskBrief? taskBrief = null,
        CancellationToken ct = default)
        => InvokeAsync(
            zipStream, zipFileName, correlationId, snapshot, taskBrief,
            (part, cid, c, prof, hist, proj) => _refit.AnalyzeZipMultiAsync(part, cid, c, prof, hist, proj),
            "/api/analyze-zip-multi", ct);

    private async Task<AiCombinedResponse> InvokeAsync(
        Stream zipStream,
        string zipFileName,
        string correlationId,
        LearnerSnapshot? snapshot,
        TaskBrief? taskBrief,
        Func<StreamPart, string, CancellationToken, string?, string?, string?, Task<AiCombinedResponse>> refitCall,
        string endpointForLog,
        CancellationToken ct)
    {
        var part = new StreamPart(zipStream, zipFileName, "application/zip");

        var (profileJson, historyJson, snapshotProjectJson) = SerializeSnapshot(snapshot);
        // SBF-1 / T5: when a real TaskBrief is provided, override the
        // snapshot's project-context with one that carries the actual task
        // title / description / acceptance criteria / deliverables. Without
        // this the AI saw "Code review for uploaded project" as its only
        // project framing and couldn't grade task fit.
        var projectJson = SerializeTaskBrief(taskBrief) ?? snapshotProjectJson;

        try
        {
            return await refitCall(part, correlationId, ct, profileJson, historyJson, projectJson);
        }
        catch (ApiException ex) when ((int)ex.StatusCode >= 400 && (int)ex.StatusCode < 500
                                      && ex.StatusCode != System.Net.HttpStatusCode.RequestTimeout
                                      && ex.StatusCode != System.Net.HttpStatusCode.TooManyRequests)
        {
            // B-035: the AI service's FastAPI `{"detail": "..."}` body carries
            // the real diagnostic (e.g. "ZIP has too many analyzable entries:
            // 623 > max 500"). Without this catch clause the call escapes as
            // a raw `Refit.ApiException` whose message is just "Response
            // status code does not indicate success: 400 (Bad Request)." —
            // useless to the learner. 408 / 429 are filtered out so they
            // still surface as transient and retry-able through
            // `AiServiceUnavailableException`.
            var detail = TryReadFastApiDetail(ex.Content);
            var human = detail ?? $"AI service returned {(int)ex.StatusCode} for {endpointForLog}";
            _logger.LogWarning(ex,
                "AI service rejected request with {Status} on {Endpoint} for correlation {CorrelationId}: {Detail}",
                ex.StatusCode, endpointForLog, correlationId, human);
            throw new AiServiceBadRequestException((int)ex.StatusCode, human, ex);
        }
        catch (ApiException ex) when (ex.StatusCode == System.Net.HttpStatusCode.ServiceUnavailable
                                    || ex.StatusCode == System.Net.HttpStatusCode.BadGateway
                                    || ex.StatusCode == System.Net.HttpStatusCode.GatewayTimeout
                                    || ex.StatusCode == System.Net.HttpStatusCode.RequestTimeout
                                    || ex.StatusCode == System.Net.HttpStatusCode.TooManyRequests
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

    /// <summary>
    /// B-035: extract the FastAPI <c>{"detail": "..."}</c> field from a 4xx
    /// response body. Returns null when the body is empty, when it isn't
    /// JSON, or when there's no <c>detail</c> field. Non-string
    /// <c>detail</c> values (FastAPI returns arrays for Pydantic validation
    /// errors) are stringified via <see cref="JsonElement.GetRawText()"/>.
    /// Truncates over-long bodies to keep exception messages bounded.
    /// </summary>
    internal static string? TryReadFastApiDetail(string? content)
    {
        if (string.IsNullOrWhiteSpace(content)) return null;
        try
        {
            using var doc = JsonDocument.Parse(content);
            if (doc.RootElement.ValueKind == JsonValueKind.Object
                && doc.RootElement.TryGetProperty("detail", out var d))
            {
                var raw = d.ValueKind switch
                {
                    JsonValueKind.String => d.GetString(),
                    _ => d.GetRawText(),
                };
                if (string.IsNullOrWhiteSpace(raw)) return null;
                return raw.Length > 500 ? raw[..500] + "…" : raw;
            }
        }
        catch (JsonException)
        {
            // Non-JSON body — fall through to the raw-text path below.
        }
        var trimmed = content.Trim();
        return trimmed.Length > 500 ? trimmed[..500] + "…" : trimmed;
    }

    /// <summary>
    /// S12 / F14 (ADR-040): serialize the snapshot's profile + history sub-payloads
    /// into the three multipart form-field JSON strings the AI service consumes.
    /// Returns <c>(null, null, null)</c> when <paramref name="snapshot"/> is null so
    /// callers that don't use F14 get a wire-identical request to the pre-F14
    /// baseline.
    /// </summary>
    public static (string? ProfileJson, string? HistoryJson, string? ProjectJson) SerializeSnapshot(LearnerSnapshot? snapshot)
    {
        if (snapshot is null) return (null, null, null);

        var profile = snapshot.ToAiProfilePayload();
        var history = snapshot.ToAiHistoryPayload();

        var profileJson = JsonSerializer.Serialize(profile, _wireSerializer);
        var historyJson = JsonSerializer.Serialize(history, _wireSerializer);

        // SBF-1 / T5: ProjectContext is now built from the TaskBrief
        // (`SerializeTaskBrief`) on the SubmissionAnalysisJob side. Snapshot
        // alone doesn't carry the task details — the snapshot's path is
        // history-aware-only.
        return (profileJson, historyJson, null);
    }

    /// <summary>
    /// SBF-1 / T5: serialize a TaskBrief into the AI service's ProjectContext
    /// wire shape. The brief's AcceptanceCriteria + Deliverables are folded
    /// into a single composite Description (the AI service's Pydantic schema
    /// has one Description field) with clear section markers the prompt
    /// templates can reference. ExpectedOutcomes is left empty (the brief
    /// doesn't carry structured outcomes today); FocusAreas defaults to the
    /// three universal pillars so off-topic detection still kicks in.
    /// </summary>
    internal static string? SerializeTaskBrief(TaskBrief? brief)
    {
        if (brief is null) return null;

        var parts = new List<string> { brief.Description.Trim() };
        if (!string.IsNullOrWhiteSpace(brief.AcceptanceCriteria))
        {
            parts.Add("## Acceptance Criteria\n" + brief.AcceptanceCriteria.Trim());
        }
        if (!string.IsNullOrWhiteSpace(brief.Deliverables))
        {
            parts.Add("## Deliverables\n" + brief.Deliverables.Trim());
        }
        var composite = string.Join("\n\n", parts);

        var payload = new AiProjectContextPayload(
            Name: brief.Title,
            Description: composite,
            LearningTrack: brief.Track,
            Difficulty: MapDifficulty(brief.Difficulty),
            ExpectedOutcomes: Array.Empty<string>(),
            FocusAreas: new[] { "task_fit", "correctness", "design" });

        return JsonSerializer.Serialize(payload, _wireSerializer);
    }

    private static string MapDifficulty(int level) => level switch
    {
        <= 1 => "Beginner",
        2 => "Beginner",
        3 => "Intermediate",
        4 => "Advanced",
        _ => "Advanced",
    };

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

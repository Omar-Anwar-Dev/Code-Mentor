using Refit;

namespace CodeMentor.Infrastructure.CodeReview;

/// <summary>
/// S15-T5 / F15 (ADR-049 / ADR-050 / ADR-051): Refit surface for the AI service's
/// 2PL IRT-lite endpoints.
///
///   POST /api/irt/select-next   — adaptive item selection (Fisher max at θ)
///   POST /api/irt/recalibrate    — joint MLE refresh of (a, b) for one item
///
/// Both are pure-CPU on the AI service side (no OpenAI / Qdrant). Production
/// callers go through <see cref="IrtAiClient"/> rather than this interface
/// directly — the wrapper centralizes the fallback policy + error mapping.
/// </summary>
public interface IIrtRefit
{
    [Post("/api/irt/select-next")]
    Task<IrtSelectNextResponse> SelectNextAsync(
        [Body] IrtSelectNextRequest body,
        [Header("X-Correlation-Id")] string correlationId,
        CancellationToken ct);

    [Post("/api/irt/recalibrate")]
    Task<IrtRecalibrateResponse> RecalibrateAsync(
        [Body] IrtRecalibrateRequest body,
        [Header("X-Correlation-Id")] string correlationId,
        CancellationToken ct);
}

// ── Wire DTOs (match the FastAPI Pydantic schemas in ai-service/app/domain/schemas/irt.py). ──

public sealed record IrtBankItem(string Id, double A, double B, string? Category = null);

/// <summary>
/// One past (a, b, correct) tuple — sent in the SelectNext call so the
/// AI service MLE-estimates theta from the learner's history when the BE
/// doesn't have a cached theta.
/// </summary>
public sealed record IrtPriorResponseDto(double A, double B, bool Correct);

/// <summary>
/// Production callers leave <c>Theta</c> null + populate <c>Responses</c>;
/// the engine MLE-estimates theta. Tests can pass <c>Theta</c> directly.
/// </summary>
public sealed record IrtSelectNextRequest(
    double? Theta,
    IReadOnlyList<IrtBankItem> Bank,
    IReadOnlyList<IrtPriorResponseDto>? Responses = null);

public sealed record IrtSelectNextResponse(
    string Id,
    double A,
    double B,
    string? Category,
    double ItemInfo,
    double ThetaUsed);

public sealed record IrtItemResponse(double Theta, bool Correct);

public sealed record IrtRecalibrateRequest(IReadOnlyList<IrtItemResponse> Responses);

public sealed record IrtRecalibrateResponse(
    double A,
    double B,
    double LogLikelihood,
    int NResponses);

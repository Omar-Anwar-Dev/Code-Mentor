using CodeMentor.Application.Assessments;
using CodeMentor.Application.CodeReview;
using Microsoft.Extensions.Logging;

namespace CodeMentor.Infrastructure.Assessments;

/// <summary>
/// S15-T5 / F15 (ADR-049): per-call AI-health-probed selector picker.
///
/// On each call:
///   1. Probe <see cref="IAiReviewClient.IsHealthyAsync"/> (existing AI service /health hook).
///   2. Healthy → return <see cref="IrtAdaptiveQuestionSelector"/>.
///   3. Unhealthy or probe threw → return <see cref="LegacyAdaptiveQuestionSelector"/>.
///
/// Both selectors honour the same <see cref="IAdaptiveQuestionSelector"/>
/// contract so the caller (<c>AssessmentService</c>) is identical for either path.
///
/// S15-T6 will add the <c>Assessment.IrtFallbackUsed</c> persistence + the
/// option to short-circuit the probe when the AI is known down within a
/// configurable window.
/// </summary>
public sealed class AdaptiveQuestionSelectorFactory : IAdaptiveQuestionSelectorFactory
{
    private readonly IAiReviewClient _aiHealth;
    private readonly IrtAdaptiveQuestionSelector _irt;
    private readonly LegacyAdaptiveQuestionSelector _legacy;
    private readonly ILogger<AdaptiveQuestionSelectorFactory> _logger;

    public AdaptiveQuestionSelectorFactory(
        IAiReviewClient aiHealth,
        IrtAdaptiveQuestionSelector irt,
        LegacyAdaptiveQuestionSelector legacy,
        ILogger<AdaptiveQuestionSelectorFactory> logger)
    {
        _aiHealth = aiHealth;
        _irt = irt;
        _legacy = legacy;
        _logger = logger;
    }

    public async Task<AdaptiveSelectorChoice> GetSelectorAsync(CancellationToken ct = default)
    {
        bool healthy;
        try
        {
            healthy = await _aiHealth.IsHealthyAsync(ct);
        }
        catch (Exception ex)
        {
            // Network blip / DNS / timeout — treat as unhealthy. This is an
            // expected fallback path, not an error worth a 500.
            _logger.LogInformation(
                ex, "AI service health probe threw; falling back to legacy adaptive selector.");
            healthy = false;
        }

        if (healthy)
        {
            _logger.LogDebug("AI service healthy → using IrtAdaptiveQuestionSelector.");
            return new AdaptiveSelectorChoice(_irt, IrtFallbackUsed: false);
        }

        _logger.LogInformation("AI service unhealthy → using LegacyAdaptiveQuestionSelector.");
        return new AdaptiveSelectorChoice(_legacy, IrtFallbackUsed: true);
    }
}

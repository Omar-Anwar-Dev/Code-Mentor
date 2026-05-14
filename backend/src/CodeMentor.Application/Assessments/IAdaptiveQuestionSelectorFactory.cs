namespace CodeMentor.Application.Assessments;

/// <summary>
/// S15-T5 / F15 (ADR-049): picks between the IRT-driven selector and the
/// legacy heuristic on each call, based on AI service availability.
///
/// Production wiring: per-call health probe of the AI service. Healthy →
/// IRT. Unhealthy / probe failed → Legacy. The probe runs on every call
/// (no caching in v1) — at ~10–50 ms locally and one call per question in
/// a 30-question assessment, the overhead is acceptable.
/// </summary>
public interface IAdaptiveQuestionSelectorFactory
{
    /// <summary>
    /// Returns the selector to use for the current call PLUS a flag indicating
    /// whether this call had to fall back to the legacy heuristic. Callers
    /// (currently <c>AssessmentService</c>) use the flag to set
    /// <c>Assessment.IrtFallbackUsed</c> for admin awareness (S15-T6).
    /// </summary>
    Task<AdaptiveSelectorChoice> GetSelectorAsync(CancellationToken ct = default);
}

/// <summary>
/// Result of <see cref="IAdaptiveQuestionSelectorFactory.GetSelectorAsync"/>.
/// <see cref="IrtFallbackUsed"/> is true when this call routed to the legacy
/// heuristic because the AI service was unhealthy / the probe threw.
/// </summary>
/// <param name="Selector">The selector to use for this call.</param>
/// <param name="IrtFallbackUsed">True iff the call fell back to legacy.</param>
public sealed record AdaptiveSelectorChoice(
    IAdaptiveQuestionSelector Selector,
    bool IrtFallbackUsed);

using CodeMentor.Domain.Assessments;

namespace CodeMentor.Application.Assessments;

/// <summary>
/// Adaptive item selector for the assessment loop.
///
/// Two production implementations:
///   * <c>LegacyAdaptiveQuestionSelector</c> — the original PRD-F2 heuristic
///     (S2). Pure-CPU, sync logic wrapped in async wrappers via Task.FromResult.
///   * <c>IrtAdaptiveQuestionSelector</c> — S15 / F15 (ADR-049 / ADR-050).
///     Delegates to the AI service's `/api/irt/select-next` endpoint for
///     2PL IRT-lite Fisher-info maximisation.
///
/// `IAdaptiveQuestionSelectorFactory` picks between the two on each call,
/// based on AI service health (S15-T6 wires the persisted IrtFallbackUsed flag).
/// </summary>
public interface IAdaptiveQuestionSelector
{
    /// <summary>
    /// Chooses the next question given the assessment's current history (ordered by OrderIndex asc).
    /// Returns null if no eligible question remains (which shouldn't happen with a seeded bank).
    /// </summary>
    Task<Question?> SelectNextAsync(
        IReadOnlyList<AssessmentResponse> history,
        IReadOnlyList<Question> bank,
        int totalQuestions,
        CancellationToken ct = default);

    /// <summary>Chooses the first question for a fresh assessment, balanced across categories.</summary>
    Task<Question> SelectFirstAsync(
        IReadOnlyList<Question> bank,
        CancellationToken ct = default);

    /// <summary>
    /// S21-T1 / F16: variant-aware first-question pick that lets the caller
    /// seed the engine's prior with a non-zero theta. Used by the Mini
    /// reassessment flow — <c>AssessmentService</c> reads the user's
    /// <see cref="LearnerSkillProfile"/> average and passes it through here
    /// so the IRT engine starts at the learner's known ability (biasing toward
    /// harder b) rather than the default θ = 0 prior.
    ///
    /// Default impl falls back to the unseeded <see cref="SelectFirstAsync"/>
    /// so legacy / non-IRT selectors don't need changes; only the IRT
    /// selector overrides this with a real seeded call.
    /// </summary>
    Task<Question> SelectFirstWithThetaAsync(
        IReadOnlyList<Question> bank,
        double? thetaSeed,
        CancellationToken ct = default)
        => SelectFirstAsync(bank, ct);
}

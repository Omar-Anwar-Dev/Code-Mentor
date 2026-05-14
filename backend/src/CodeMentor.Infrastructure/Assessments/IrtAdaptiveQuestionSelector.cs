using CodeMentor.Application.Assessments;
using CodeMentor.Domain.Assessments;
using CodeMentor.Infrastructure.CodeReview;
using Microsoft.Extensions.Logging;

namespace CodeMentor.Infrastructure.Assessments;

/// <summary>
/// S15-T5 / F15 (ADR-049 / ADR-050 / ADR-051): IRT-driven adaptive selector.
///
/// Sends the response history + the unanswered bank to the AI service's
/// `/api/irt/select-next` endpoint. The engine MLE-estimates theta from the
/// history, picks the unanswered item with maximum Fisher information at
/// theta, and returns the chosen question id (which we map back to the
/// in-memory <see cref="Question"/>).
///
/// PRD-F2 invariants preserved alongside the IRT math:
///   * IsActive=true filter on Questions (S15 hard rule from kickoff).
///   * Never repeat a question (we filter out already-answered ids before
///     building the bank payload).
///   * 30-question total enforced upstream by AssessmentService.
///
/// On AI-service failure (<see cref="AiServiceUnavailableException"/> /
/// transport errors) the call PROPAGATES — the factory's per-call health
/// probe is the primary fall-back point. S15-T6 will add the
/// `Assessment.IrtFallbackUsed` persistence + an in-call retry path.
/// </summary>
public sealed class IrtAdaptiveQuestionSelector : IAdaptiveQuestionSelector
{
    private const int MediumDifficulty = 2;

    private readonly IIrtRefit _irt;
    private readonly ILogger<IrtAdaptiveQuestionSelector> _logger;

    // S15-T8 side-channel: most-recent theta + Fisher-info from the last
    // SelectFirst/SelectNext call. AssessmentService reads these post-call to
    // surface the admin-only debug banner on the assessment FE. Updated
    // whenever the AI service returns successfully; cleared on failure.
    public double? LastTheta { get; private set; }
    public double? LastItemInfo { get; private set; }

    public IrtAdaptiveQuestionSelector(
        IIrtRefit irt,
        ILogger<IrtAdaptiveQuestionSelector> logger)
    {
        _irt = irt;
        _logger = logger;
    }

    public async Task<Question> SelectFirstAsync(
        IReadOnlyList<Question> bank,
        CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(bank);
        var active = bank.Where(q => q.IsActive).ToList();
        if (active.Count == 0)
            throw new InvalidOperationException("Question bank is empty.");

        // First question: theta defaults to 0 prior; engine picks the item with
        // smallest |IRT_B| under the maximum-info rule. We let the AI service
        // compute that — same code path as SelectNext but with empty responses.
        var bankPayload = active
            .Select(q => new IrtBankItem(q.Id.ToString(), q.IRT_A, q.IRT_B, q.Category.ToString()))
            .ToList();

        var resp = await _irt.SelectNextAsync(
            new IrtSelectNextRequest(Theta: 0.0, Bank: bankPayload),
            correlationId: Guid.NewGuid().ToString("N"),
            ct);
        LastTheta = resp.ThetaUsed;
        LastItemInfo = resp.ItemInfo;

        var chosen = active.FirstOrDefault(q => q.Id.ToString() == resp.Id);
        if (chosen is null)
        {
            _logger.LogWarning(
                "IRT first-question selection returned id={ChosenId} not in active bank ({BankSize}); falling back to medium-difficulty random.",
                resp.Id, active.Count);
            // Defensive fallback so a stale-cache mismatch can't 500 the assessment kickoff.
            var mediums = active.Where(q => q.Difficulty == MediumDifficulty).ToList();
            if (mediums.Count == 0) mediums = active;
            return mediums[Random.Shared.Next(mediums.Count)];
        }
        return chosen;
    }

    public async Task<Question?> SelectNextAsync(
        IReadOnlyList<AssessmentResponse> history,
        IReadOnlyList<Question> bank,
        int totalQuestions,
        CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(history);
        ArgumentNullException.ThrowIfNull(bank);

        var remaining = totalQuestions - history.Count;
        if (remaining <= 0) return null;

        // Build the unanswered subset, keeping the IsActive filter (S15 hard rule).
        var usedIds = history.Select(r => r.QuestionId).ToHashSet();
        var unanswered = bank
            .Where(q => q.IsActive)
            .Where(q => !usedIds.Contains(q.Id))
            .ToList();
        if (unanswered.Count == 0) return null;

        // Build the response history payload — engine uses it to MLE-estimate theta.
        // We need the (a, b) of the question each response was about; look them up
        // from the bank by QuestionId. Responses to inactive/missing questions are
        // skipped (defensive — shouldn't happen with normal seed data).
        var bankById = bank.ToDictionary(q => q.Id);
        var responsesPayload = new List<IrtPriorResponseDto>(history.Count);
        foreach (var r in history)
        {
            if (!bankById.TryGetValue(r.QuestionId, out var q)) continue;
            responsesPayload.Add(new IrtPriorResponseDto(q.IRT_A, q.IRT_B, r.IsCorrect));
        }

        var bankPayload = unanswered
            .Select(q => new IrtBankItem(q.Id.ToString(), q.IRT_A, q.IRT_B, q.Category.ToString()))
            .ToList();

        var resp = await _irt.SelectNextAsync(
            new IrtSelectNextRequest(
                Theta: null,
                Responses: responsesPayload,
                Bank: bankPayload),
            correlationId: Guid.NewGuid().ToString("N"),
            ct);
        LastTheta = resp.ThetaUsed;
        LastItemInfo = resp.ItemInfo;

        var chosen = unanswered.FirstOrDefault(q => q.Id.ToString() == resp.Id);
        if (chosen is null)
        {
            _logger.LogWarning(
                "IRT selection returned id={ChosenId} not in unanswered bank ({UnansweredSize}); returning null so AssessmentService can decide.",
                resp.Id, unanswered.Count);
            return null;
        }

        _logger.LogDebug(
            "IRT picked id={QuestionId} theta_used={Theta:F3} info={Info:F4} (unanswered={Unanswered}, history={HistoryCount})",
            chosen.Id, resp.ThetaUsed, resp.ItemInfo, unanswered.Count, responsesPayload.Count);

        return chosen;
    }
}

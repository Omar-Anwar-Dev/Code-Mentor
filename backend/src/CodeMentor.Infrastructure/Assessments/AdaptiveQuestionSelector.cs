using CodeMentor.Application.Assessments;
using CodeMentor.Domain.Assessments;

namespace CodeMentor.Infrastructure.Assessments;

/// <summary>
/// Heuristic adaptive selector — matches PRD F2 rules:
///   * First question: random medium-difficulty (2).
///   * After each answer, look at the running history for this category:
///       - 2+ consecutive correct in-category → escalate difficulty.
///       - 2+ consecutive wrong in-category → de-escalate.
///       - Otherwise hold difficulty.
///   * Maintain category balance — no category may exceed 30 % of total questions.
///   * Never repeat a question.
/// </summary>
public sealed class AdaptiveQuestionSelector : IAdaptiveQuestionSelector
{
    private const int MediumDifficulty = 2;
    private const int MinDifficulty = 1;
    private const int MaxDifficulty = 3;

    public Question SelectFirst(IReadOnlyList<Question> bank)
    {
        ArgumentNullException.ThrowIfNull(bank);
        if (bank.Count == 0)
            throw new InvalidOperationException("Question bank is empty.");

        var mediums = bank.Where(q => q.Difficulty == MediumDifficulty && q.IsActive).ToList();
        if (mediums.Count == 0) mediums = bank.Where(q => q.IsActive).ToList();
        return mediums[Random.Shared.Next(mediums.Count)];
    }

    public Question? SelectNext(
        IReadOnlyList<AssessmentResponse> history,
        IReadOnlyList<Question> bank,
        int totalQuestions)
    {
        ArgumentNullException.ThrowIfNull(history);
        ArgumentNullException.ThrowIfNull(bank);

        var usedIds = history.Select(r => r.QuestionId).ToHashSet();
        var remaining = totalQuestions - history.Count;
        if (remaining <= 0) return null;

        var lastAnswered = history.LastOrDefault();
        var lastCategory = lastAnswered?.Category;

        var targetDifficulty = ComputeNextDifficulty(history, lastCategory);
        var disallowedCategories = BannedCategories(history, totalQuestions);
        var mustBackfill = ForcedCategoriesForFinalSlots(history, totalQuestions);

        var eligible = bank
            .Where(q => q.IsActive)
            .Where(q => !usedIds.Contains(q.Id))
            .ToList();

        if (eligible.Count == 0) return null;

        // Priority 1: if we have forced back-fill categories, restrict to those.
        if (mustBackfill.Count > 0)
        {
            var forced = eligible.Where(q => mustBackfill.Contains(q.Category)).ToList();
            if (forced.Count > 0) eligible = forced;
        }

        // Priority 2: enforce category balance cap.
        if (disallowedCategories.Count > 0)
        {
            var filtered = eligible.Where(q => !disallowedCategories.Contains(q.Category)).ToList();
            if (filtered.Count > 0) eligible = filtered;
        }

        // Priority 3: pick target difficulty, then fall back to nearest.
        var atDifficulty = eligible.Where(q => q.Difficulty == targetDifficulty).ToList();
        if (atDifficulty.Count > 0) return atDifficulty[Random.Shared.Next(atDifficulty.Count)];

        // Fallback: closest available difficulty.
        return eligible
            .OrderBy(q => Math.Abs(q.Difficulty - targetDifficulty))
            .ThenBy(_ => Random.Shared.Next())
            .First();
    }

    private static int ComputeNextDifficulty(IReadOnlyList<AssessmentResponse> history, SkillCategory? lastCategory)
    {
        if (lastCategory is null) return MediumDifficulty;

        var sameCategory = history.Where(r => r.Category == lastCategory).ToList();
        var lastDifficulty = sameCategory.Last().Difficulty;

        var streak = 0;
        var streakIsCorrect = sameCategory[^1].IsCorrect;
        for (var i = sameCategory.Count - 1; i >= 0; i--)
        {
            if (sameCategory[i].IsCorrect == streakIsCorrect) streak++;
            else break;
        }

        if (streak >= 2 && streakIsCorrect) return Math.Min(MaxDifficulty, lastDifficulty + 1);
        if (streak >= 2 && !streakIsCorrect) return Math.Max(MinDifficulty, lastDifficulty - 1);
        return lastDifficulty;
    }

    private static HashSet<SkillCategory> BannedCategories(IReadOnlyList<AssessmentResponse> history, int totalQuestions)
    {
        // PRD F2: no category may exceed 30 % of total questions.
        var cap = (int)Math.Floor(totalQuestions * 0.30);
        var counts = history.GroupBy(r => r.Category).ToDictionary(g => g.Key, g => g.Count());
        return counts
            .Where(kvp => kvp.Value >= cap)
            .Select(kvp => kvp.Key)
            .ToHashSet();
    }

    private static HashSet<SkillCategory> ForcedCategoriesForFinalSlots(
        IReadOnlyList<AssessmentResponse> history,
        int totalQuestions)
    {
        // Ensure all 5 categories are covered by the end: if #remaining slots == #uncovered categories,
        // restrict selection to uncovered ones.
        var answered = history.Select(r => r.Category).ToHashSet();
        var allCats = Enum.GetValues<SkillCategory>();
        var missing = allCats.Where(c => !answered.Contains(c)).ToHashSet();
        var remaining = totalQuestions - history.Count;
        if (remaining <= missing.Count) return missing;
        return new HashSet<SkillCategory>();
    }
}

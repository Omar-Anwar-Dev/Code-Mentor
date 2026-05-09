using CodeMentor.Application.Assessments;
using CodeMentor.Application.Assessments.Contracts;
using CodeMentor.Domain.Assessments;

namespace CodeMentor.Infrastructure.Assessments;

public sealed class ScoringService : IScoringService
{
    public ScoringOutcome Score(IReadOnlyList<AssessmentResponse> responses)
    {
        ArgumentNullException.ThrowIfNull(responses);

        var totalWeight = 0m;
        var earned = 0m;

        var categoryGroups = responses.GroupBy(r => r.Category);
        var perCategory = new List<CategoryScoreDto>();

        foreach (var group in categoryGroups.OrderBy(g => g.Key.ToString()))
        {
            var rs = group.ToList();
            var groupWeight = 0m;
            var groupEarned = 0m;
            foreach (var r in rs)
            {
                var weight = DifficultyWeight(r.Difficulty);
                groupWeight += weight;
                if (r.IsCorrect) groupEarned += weight;
            }

            var catPct = groupWeight == 0 ? 0 : Math.Round(groupEarned / groupWeight * 100, 2);
            perCategory.Add(new CategoryScoreDto(group.Key.ToString(), catPct, rs.Count, rs.Count(r => r.IsCorrect)));

            totalWeight += groupWeight;
            earned += groupEarned;
        }

        var overall = totalWeight == 0 ? 0 : Math.Round(earned / totalWeight * 100, 2);
        var level = overall switch
        {
            >= 80 => SkillLevel.Advanced,
            >= 60 => SkillLevel.Intermediate,
            _ => SkillLevel.Beginner,
        };

        return new ScoringOutcome(overall, level, perCategory);
    }

    private static decimal DifficultyWeight(int difficulty) => difficulty switch
    {
        1 => 1.0m,
        2 => 1.5m,
        3 => 2.0m,
        _ => 1.0m,
    };
}

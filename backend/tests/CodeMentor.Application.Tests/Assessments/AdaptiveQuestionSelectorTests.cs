using CodeMentor.Domain.Assessments;
using CodeMentor.Infrastructure.Assessments;

namespace CodeMentor.Application.Tests.Assessments;

public class AdaptiveQuestionSelectorTests
{
    private readonly AdaptiveQuestionSelector _sel = new();

    private static List<Question> BuildBank()
    {
        var list = new List<Question>();
        foreach (var cat in Enum.GetValues<SkillCategory>())
        {
            for (int d = 1; d <= 3; d++)
            {
                for (int i = 0; i < 6; i++)
                {
                    list.Add(new Question
                    {
                        Id = Guid.NewGuid(),
                        Content = $"{cat}-d{d}-#{i}",
                        Category = cat,
                        Difficulty = d,
                        CorrectAnswer = "A",
                        Options = new[] { "A", "B", "C", "D" },
                        IsActive = true,
                    });
                }
            }
        }
        return list;
    }

    private static AssessmentResponse Resp(Question q, bool correct, int order) => new()
    {
        Id = Guid.NewGuid(),
        QuestionId = q.Id,
        OrderIndex = order,
        Category = q.Category,
        Difficulty = q.Difficulty,
        IsCorrect = correct,
        UserAnswer = correct ? "A" : "B",
    };

    [Fact]
    public void SelectFirst_ReturnsMediumDifficulty()
    {
        var bank = BuildBank();
        var first = _sel.SelectFirst(bank);
        Assert.Equal(2, first.Difficulty);
    }

    [Fact]
    public void TwoConsecutiveCorrectSameCategory_EscalatesDifficulty()
    {
        var bank = BuildBank();
        var cat = SkillCategory.Algorithms;
        var q1 = bank.First(q => q.Category == cat && q.Difficulty == 2);
        var q2 = bank.First(q => q.Category == cat && q.Difficulty == 2 && q.Id != q1.Id);
        var history = new List<AssessmentResponse> { Resp(q1, true, 1), Resp(q2, true, 2) };

        var next = _sel.SelectNext(history, bank, 30);

        Assert.NotNull(next);
        Assert.Equal(3, next!.Difficulty);
    }

    [Fact]
    public void TwoConsecutiveWrongSameCategory_DeEscalatesDifficulty()
    {
        var bank = BuildBank();
        var cat = SkillCategory.Algorithms;
        var q1 = bank.First(q => q.Category == cat && q.Difficulty == 2);
        var q2 = bank.First(q => q.Category == cat && q.Difficulty == 2 && q.Id != q1.Id);
        var history = new List<AssessmentResponse> { Resp(q1, false, 1), Resp(q2, false, 2) };

        var next = _sel.SelectNext(history, bank, 30);

        Assert.NotNull(next);
        Assert.Equal(1, next!.Difficulty);
    }

    [Fact]
    public void NextQuestion_IsNeverARepeatOfAlreadyAnswered()
    {
        var bank = BuildBank();
        var history = new List<AssessmentResponse>();
        var used = new HashSet<Guid>();
        for (int i = 0; i < 20; i++)
        {
            var pick = i == 0 ? _sel.SelectFirst(bank) : _sel.SelectNext(history, bank, 30);
            Assert.NotNull(pick);
            Assert.DoesNotContain(pick!.Id, used);
            used.Add(pick.Id);
            history.Add(Resp(pick, i % 2 == 0, i + 1));
        }
    }

    [Fact]
    public void CategoryBalance_PreventsSingleCategoryFrom30PercentLimit()
    {
        var bank = BuildBank();
        // 9 prior responses all in Security (cap = floor(30*0.30) = 9 => banned at 9).
        var sec = bank.Where(q => q.Category == SkillCategory.Security).Take(9).ToList();
        var history = sec.Select((q, i) => Resp(q, true, i + 1)).ToList();

        var next = _sel.SelectNext(history, bank, 30);

        Assert.NotNull(next);
        Assert.NotEqual(SkillCategory.Security, next!.Category);
    }

    [Fact]
    public void FinalSlot_ForcesLastMissingCategory()
    {
        // 29 answered, Security missing, 1 slot remaining → must pick Security.
        var bank = BuildBank();
        var history = new List<AssessmentResponse>();
        foreach (var cat in new[] {
            SkillCategory.DataStructures, SkillCategory.Algorithms,
            SkillCategory.OOP, SkillCategory.Databases })
        {
            // 8 per category = 32 total; take 8 (cap is 9, 8 is under).
            foreach (var q in bank.Where(q => q.Category == cat).Take(8))
                history.Add(Resp(q, true, history.Count + 1));
        }
        // Shave to exactly 29 answered.
        while (history.Count > 29) history.RemoveAt(history.Count - 1);

        Assert.Equal(29, history.Count);
        Assert.DoesNotContain(history, r => r.Category == SkillCategory.Security);

        var next = _sel.SelectNext(history, bank, 30);
        Assert.NotNull(next);
        Assert.Equal(SkillCategory.Security, next!.Category);
    }

    [Fact]
    public void FullAssessment_CoversAllCategories_ByTheEnd()
    {
        var bank = BuildBank();
        var history = new List<AssessmentResponse>();
        var first = _sel.SelectFirst(bank);
        history.Add(Resp(first, correct: true, order: 1));

        for (var i = 1; i < 30; i++)
        {
            var next = _sel.SelectNext(history, bank, 30);
            Assert.NotNull(next);
            history.Add(Resp(next!, correct: i % 3 == 0, order: i + 1));
        }

        var coveredCategories = history.Select(r => r.Category).Distinct().Count();
        Assert.Equal(Enum.GetValues<SkillCategory>().Length, coveredCategories);
    }

    [Fact]
    public void SelectNext_ReturnsNull_WhenAssessmentFull()
    {
        var bank = BuildBank();
        var history = bank.Take(30).Select((q, i) => Resp(q, true, i + 1)).ToList();

        var next = _sel.SelectNext(history, bank, 30);

        Assert.Null(next);
    }
}

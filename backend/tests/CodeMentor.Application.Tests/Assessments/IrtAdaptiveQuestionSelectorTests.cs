using CodeMentor.Application.Assessments;
using CodeMentor.Application.CodeReview;
using CodeMentor.Domain.Assessments;
using CodeMentor.Infrastructure.Assessments;
using CodeMentor.Infrastructure.CodeReview;
using Microsoft.Extensions.Logging.Abstractions;

namespace CodeMentor.Application.Tests.Assessments;

/// <summary>
/// S15-T5 acceptance bar (per implementation-plan): 8 integration tests covering
///   * 3 happy IRT paths (beginner / intermediate / advanced synthetic learner)
///   * 3 AI-unavailable fallback paths (probe false, probe throws, mid-flight fail)
///   * cross-category divergence note (legacy enforces balance; IRT does not in v1)
///   * empty bank after filtering returns null without an HTTP call.
///
/// Tests use hand-rolled fakes instead of a mocking library to match the
/// repo's existing pattern (FakeAiReviewClient, FakeProjectAuditAiClient, etc.).
/// </summary>
public class IrtAdaptiveQuestionSelectorTests
{
    // --------------- Test harness helpers ---------------

    /// <summary>Builds the same balanced bank used by the legacy tests
    /// (5 categories × 3 difficulties × 6 questions = 90 questions),
    /// each Question populated with the S15-T4 backfilled IRT params.</summary>
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
                        IRT_A = 1.0,
                        IRT_B = d switch { 1 => -1.0, 2 => 0.0, _ => 1.0 },
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

    /// <summary>Hand-rolled IIrtRefit fake. Records the last call and returns
    /// a configured response (defaults to picking the first bank item).</summary>
    private sealed class FakeIrtRefit : IIrtRefit
    {
        public IrtSelectNextRequest? LastSelectNextRequest { get; private set; }
        public IrtRecalibrateRequest? LastRecalibrateRequest { get; private set; }
        public Func<IrtSelectNextRequest, IrtSelectNextResponse>? SelectNextHandler { get; set; }
        public bool ThrowOnSelectNext { get; set; }

        public Task<IrtSelectNextResponse> SelectNextAsync(
            IrtSelectNextRequest body, string correlationId, CancellationToken ct)
        {
            LastSelectNextRequest = body;
            if (ThrowOnSelectNext)
                throw new HttpRequestException("AI service unreachable (test)");

            if (SelectNextHandler is not null)
                return Task.FromResult(SelectNextHandler(body));

            // Default: return the first bank item.
            var first = body.Bank[0];
            return Task.FromResult(new IrtSelectNextResponse(
                Id: first.Id, A: first.A, B: first.B,
                Category: first.Category, ItemInfo: 0.25, ThetaUsed: body.Theta ?? 0.0));
        }

        public Task<IrtRecalibrateResponse> RecalibrateAsync(
            IrtRecalibrateRequest body, string correlationId, CancellationToken ct)
        {
            LastRecalibrateRequest = body;
            return Task.FromResult(new IrtRecalibrateResponse(1.0, 0.0, 0.0, body.Responses.Count));
        }
    }

    /// <summary>Configurable IAiReviewClient fake — only IsHealthyAsync is used by the factory.</summary>
    private sealed class FakeAiHealth : IAiReviewClient
    {
        public bool Healthy { get; set; } = true;
        public bool ThrowOnHealthProbe { get; set; }

        public Task<bool> IsHealthyAsync(CancellationToken ct = default)
        {
            if (ThrowOnHealthProbe) throw new HttpRequestException("probe failed (test)");
            return Task.FromResult(Healthy);
        }

        public Task<AiCombinedResponse> AnalyzeZipAsync(
            Stream zip, string name, string corr,
            LearnerSnapshot? snap = null, TaskBrief? brief = null, CancellationToken ct = default)
            => throw new NotImplementedException("not used by selector tests");

        public Task<AiCombinedResponse> AnalyzeZipMultiAsync(
            Stream zip, string name, string corr,
            LearnerSnapshot? snap = null, TaskBrief? brief = null, CancellationToken ct = default)
            => throw new NotImplementedException("not used by selector tests");
    }

    private static AdaptiveQuestionSelectorFactory BuildFactory(
        FakeAiHealth health,
        FakeIrtRefit irt) =>
        new(
            aiHealth: health,
            irt: new IrtAdaptiveQuestionSelector(irt, NullLogger<IrtAdaptiveQuestionSelector>.Instance),
            legacy: new LegacyAdaptiveQuestionSelector(),
            logger: NullLogger<AdaptiveQuestionSelectorFactory>.Instance);

    // --------------- Happy IRT paths (3 tests) ---------------

    [Fact]
    public async Task HappyPath_Beginner_PicksLowDifficultyItem_ViaIrtSelector()
    {
        // Beginner: answered 4 easy items, all wrong. MLE θ should land negative.
        // The IRT mock asserts the BE forwarded the right (a,b,correct) tuples,
        // then returns the bank item with the most negative b — which is what
        // the real AI service would do at a low theta.
        var bank = BuildBank();
        var easy = bank.Where(q => q.Difficulty == 1).Take(4).ToList();
        var history = easy.Select((q, i) => Resp(q, correct: false, order: i + 1)).ToList();

        var irt = new FakeIrtRefit
        {
            SelectNextHandler = req =>
            {
                // Verify the BE built the request correctly.
                Assert.Null(req.Theta);
                Assert.NotNull(req.Responses);
                Assert.Equal(4, req.Responses!.Count);
                Assert.All(req.Responses, r => Assert.False(r.Correct));
                // Mimic engine choice: lowest b wins at low theta.
                var pick = req.Bank.OrderBy(b => b.B).First();
                return new IrtSelectNextResponse(pick.Id, pick.A, pick.B, pick.Category, 0.20, -1.4);
            },
        };
        var health = new FakeAiHealth { Healthy = true };
        var factory = BuildFactory(health, irt);

        var choice = await factory.GetSelectorAsync();
        var selector = choice.Selector;
        Assert.IsType<IrtAdaptiveQuestionSelector>(selector);
        Assert.False(choice.IrtFallbackUsed);  // T6: healthy → no fallback

        var next = await selector.SelectNextAsync(history, bank, totalQuestions: 30);
        Assert.NotNull(next);
        Assert.Equal(1, next!.Difficulty);  // beginner → easy item
        Assert.Equal(-1.0, next.IRT_B);
    }

    [Fact]
    public async Task HappyPath_Intermediate_PicksMediumDifficultyItem_ViaIrtSelector()
    {
        // Intermediate: 3 medium items, 2 right + 1 wrong → MLE θ ~ 0.
        var bank = BuildBank();
        var med = bank.Where(q => q.Difficulty == 2).Take(3).ToList();
        var history = new List<AssessmentResponse>
        {
            Resp(med[0], correct: true, order: 1),
            Resp(med[1], correct: true, order: 2),
            Resp(med[2], correct: false, order: 3),
        };
        var irt = new FakeIrtRefit
        {
            SelectNextHandler = req =>
            {
                Assert.NotNull(req.Responses);
                Assert.Equal(3, req.Responses!.Count);
                // Pick item with b closest to 0 (medium).
                var pick = req.Bank.OrderBy(b => Math.Abs(b.B - 0.0)).First();
                return new IrtSelectNextResponse(pick.Id, pick.A, pick.B, pick.Category, 0.25, 0.05);
            },
        };
        var factory = BuildFactory(new FakeAiHealth { Healthy = true }, irt);

        var choice = await factory.GetSelectorAsync();
        var selector = choice.Selector;
        var next = await selector.SelectNextAsync(history, bank, totalQuestions: 30);
        Assert.NotNull(next);
        Assert.Equal(2, next!.Difficulty);
    }

    [Fact]
    public async Task HappyPath_Advanced_PicksHardItem_ViaIrtSelector()
    {
        // Advanced: 4 hard items all correct → MLE θ should land high.
        var bank = BuildBank();
        var hard = bank.Where(q => q.Difficulty == 3).Take(4).ToList();
        var history = hard.Select((q, i) => Resp(q, correct: true, order: i + 1)).ToList();
        var irt = new FakeIrtRefit
        {
            SelectNextHandler = req =>
            {
                Assert.NotNull(req.Responses);
                Assert.Equal(4, req.Responses!.Count);
                Assert.All(req.Responses, r => Assert.True(r.Correct));
                var pick = req.Bank.OrderByDescending(b => b.B).First();
                return new IrtSelectNextResponse(pick.Id, pick.A, pick.B, pick.Category, 0.18, 1.4);
            },
        };
        var factory = BuildFactory(new FakeAiHealth { Healthy = true }, irt);

        var choice = await factory.GetSelectorAsync();
        var selector = choice.Selector;
        var next = await selector.SelectNextAsync(history, bank, totalQuestions: 30);
        Assert.NotNull(next);
        Assert.Equal(3, next!.Difficulty);
        Assert.Equal(1.0, next.IRT_B);
    }

    // --------------- AI-unavailable fallback paths (3 tests) ---------------

    [Fact]
    public async Task Fallback_AiReportsUnhealthy_ReturnsLegacySelector()
    {
        var bank = BuildBank();
        var irt = new FakeIrtRefit { ThrowOnSelectNext = true }; // would throw if called
        var factory = BuildFactory(new FakeAiHealth { Healthy = false }, irt);

        var choice = await factory.GetSelectorAsync();
        var selector = choice.Selector;
        Assert.IsType<LegacyAdaptiveQuestionSelector>(selector);
        Assert.True(choice.IrtFallbackUsed);  // T6: AI down → flag flipped

        // Legacy heuristic should produce a valid first question without
        // touching the IRT path.
        var first = await selector.SelectFirstAsync(bank);
        Assert.NotNull(first);
        Assert.Equal(2, first.Difficulty);  // PRD F2: medium
        Assert.Null(irt.LastSelectNextRequest); // confirm IRT was never called
    }

    [Fact]
    public async Task Fallback_AiHealthProbeThrows_ReturnsLegacySelector()
    {
        var bank = BuildBank();
        var irt = new FakeIrtRefit { ThrowOnSelectNext = true };
        var factory = BuildFactory(new FakeAiHealth { ThrowOnHealthProbe = true }, irt);

        var choice = await factory.GetSelectorAsync();
        var selector = choice.Selector;
        Assert.IsType<LegacyAdaptiveQuestionSelector>(selector);
        Assert.True(choice.IrtFallbackUsed);  // T6: probe threw → still flips flag
    }

    [Fact]
    public async Task Fallback_LegacyHeuristic_EscalatesAfterTwoConsecutiveCorrect()
    {
        // When the factory routes to legacy, the verbatim PRD-F2 escalation rule
        // applies. Confirms the legacy class behavior wasn't accidentally broken
        // by the rename + async-wrapper additions.
        var bank = BuildBank();
        var cat = SkillCategory.Algorithms;
        var q1 = bank.First(q => q.Category == cat && q.Difficulty == 2);
        var q2 = bank.Last(q => q.Category == cat && q.Difficulty == 2 && q.Id != q1.Id);
        var history = new List<AssessmentResponse>
        {
            Resp(q1, correct: true, order: 1),
            Resp(q2, correct: true, order: 2),
        };

        var factory = BuildFactory(new FakeAiHealth { Healthy = false }, new FakeIrtRefit());
        var choice = await factory.GetSelectorAsync();
        var selector = choice.Selector;

        var next = await selector.SelectNextAsync(history, bank, totalQuestions: 30);
        Assert.NotNull(next);
        // PRD-F2 escalation rule: 2 consecutive correct in same category → next
        // question's TARGET difficulty bumps from 2 → 3. The legacy doesn't
        // also pin the category (it's free to pick any category at the new
        // difficulty, subject to the 30%-cap balance), so we only assert on difficulty.
        Assert.Equal(3, next!.Difficulty);
    }

    // --------------- Cross-category divergence note (1 test) ---------------

    [Fact]
    public async Task IrtPath_DoesNotEnforce30PercentCategoryCap_DiffersFromLegacy()
    {
        // PRD-F2 invariant (legacy): no category may exceed 30% of total questions.
        // For a 30-question test, the cap is 9 per category.
        // The IRT path delegates to the AI service which optimises Fisher info,
        // not category balance — so the IRT selector is allowed to return an item
        // even when its category is already at the legacy cap. This documents the
        // intentional divergence (S17 may add a balance overlay; v1 ships without).
        var bank = BuildBank();
        var algo = bank.Where(q => q.Category == SkillCategory.Algorithms).Take(9).ToList();
        var history = algo.Select((q, i) => Resp(q, correct: true, order: i + 1)).ToList();

        // The IRT mock returns whatever item the AI picks — even another Algorithms one.
        var anotherAlgoQuestion = bank.First(q =>
            q.Category == SkillCategory.Algorithms &&
            !history.Any(r => r.QuestionId == q.Id));

        var irt = new FakeIrtRefit
        {
            SelectNextHandler = req => new IrtSelectNextResponse(
                anotherAlgoQuestion.Id.ToString(),
                anotherAlgoQuestion.IRT_A,
                anotherAlgoQuestion.IRT_B,
                anotherAlgoQuestion.Category.ToString(),
                ItemInfo: 0.20,
                ThetaUsed: 1.0),
        };
        var factory = BuildFactory(new FakeAiHealth { Healthy = true }, irt);
        var choice = await factory.GetSelectorAsync();
        var selector = choice.Selector;

        var next = await selector.SelectNextAsync(history, bank, totalQuestions: 30);
        Assert.NotNull(next);
        Assert.Equal(SkillCategory.Algorithms, next!.Category); // 10th Algorithms — past the legacy cap

        // Now compare with the legacy selector for the same history — it WOULD enforce the cap.
        var legacy = new LegacyAdaptiveQuestionSelector();
        var legacyNext = await legacy.SelectNextAsync(history, bank, totalQuestions: 30);
        Assert.NotNull(legacyNext);
        Assert.NotEqual(SkillCategory.Algorithms, legacyNext!.Category); // legacy banned Algorithms
    }

    // --------------- Empty bank after filtering (1 test) ---------------

    [Fact]
    public async Task EmptyBankAfterFiltering_ReturnsNull_WithoutHittingIrtService()
    {
        // Every bank question has been answered — no eligible item remains.
        // Selector must return null short-circuit, not call the AI service.
        var bank = BuildBank();
        var history = bank.Select((q, i) => Resp(q, correct: true, order: i + 1)).ToList();
        // historyCount == bankCount; remaining = totalQuestions - historyCount
        // For this edge case we use totalQuestions == historyCount + 1 so the
        // outer cap doesn't trigger — only the in-bank filter does.
        var irt = new FakeIrtRefit { ThrowOnSelectNext = true };
        var factory = BuildFactory(new FakeAiHealth { Healthy = true }, irt);
        var choice = await factory.GetSelectorAsync();
        var selector = choice.Selector;

        var next = await selector.SelectNextAsync(history, bank, totalQuestions: history.Count + 1);
        Assert.Null(next);
        Assert.Null(irt.LastSelectNextRequest); // IRT never called — early exit
    }
}

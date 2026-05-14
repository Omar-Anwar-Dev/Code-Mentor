using CodeMentor.Application.Assessments;
using CodeMentor.Infrastructure.Assessments;

namespace CodeMentor.Api.IntegrationTests.TestHost;

/// <summary>
/// Test-only <see cref="IAdaptiveQuestionSelectorFactory"/> that always returns
/// the <see cref="LegacyAdaptiveQuestionSelector"/>. Wired by
/// <c>CodeMentorWebApplicationFactory</c> so existing integration tests
/// continue to exercise the verbatim PRD-F2 heuristic. The IRT path is covered
/// by S15-T5's targeted unit-style tests in <c>CodeMentor.Application.Tests</c>
/// (with mocked <c>IIrtRefit</c>).
/// </summary>
internal sealed class LegacyOnlyAdaptiveQuestionSelectorFactory : IAdaptiveQuestionSelectorFactory
{
    private readonly LegacyAdaptiveQuestionSelector _legacy;

    public LegacyOnlyAdaptiveQuestionSelectorFactory(LegacyAdaptiveQuestionSelector legacy)
    {
        _legacy = legacy;
    }

    public Task<AdaptiveSelectorChoice> GetSelectorAsync(CancellationToken ct = default)
        // Test integration tests pretend AI is fine; we just always pick legacy
        // to match pre-S15 behavior. Set IrtFallbackUsed=false so existing
        // assertions on Assessment shape don't see a surprising flip.
        => Task.FromResult(new AdaptiveSelectorChoice(_legacy, IrtFallbackUsed: false));
}

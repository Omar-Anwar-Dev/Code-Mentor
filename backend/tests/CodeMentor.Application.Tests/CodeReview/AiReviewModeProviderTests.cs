using CodeMentor.Application.CodeReview;
using CodeMentor.Infrastructure.CodeReview;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;

namespace CodeMentor.Application.Tests.CodeReview;

/// <summary>
/// S11-T4 / F13 (ADR-037): the mode provider is the single source of truth for
/// whether <see cref="SubmissionAnalysisJob"/> calls the single-prompt path or
/// the multi-agent path. It is read on every job invocation (env var change +
/// restart is the contract — no migration needed per S11-T4 acceptance).
/// </summary>
public class AiReviewModeProviderTests
{
    private static IConfiguration BuildConfig(IDictionary<string, string?> kv) =>
        new ConfigurationBuilder().AddInMemoryCollection(kv).Build();

    [Fact]
    public void Default_When_NoConfig_IsSingle()
    {
        var provider = new AiReviewModeProvider(BuildConfig(new Dictionary<string, string?>()), NullLogger<AiReviewModeProvider>.Instance);

        Assert.Equal(AiReviewMode.Single, provider.Current);
    }

    [Theory]
    [InlineData("multi")]
    [InlineData("MULTI")]
    [InlineData("Multi")]
    public void When_AI_REVIEW_MODE_Is_Multi_ReturnsMulti(string raw)
    {
        var provider = new AiReviewModeProvider(
            BuildConfig(new Dictionary<string, string?> { ["AI_REVIEW_MODE"] = raw }),
            NullLogger<AiReviewModeProvider>.Instance);

        Assert.Equal(AiReviewMode.Multi, provider.Current);
    }

    [Theory]
    [InlineData("single")]
    [InlineData("SINGLE")]
    public void When_AI_REVIEW_MODE_Is_Single_ReturnsSingle(string raw)
    {
        var provider = new AiReviewModeProvider(
            BuildConfig(new Dictionary<string, string?> { ["AI_REVIEW_MODE"] = raw }),
            NullLogger<AiReviewModeProvider>.Instance);

        Assert.Equal(AiReviewMode.Single, provider.Current);
    }

    [Fact]
    public void Hierarchical_AiService_ReviewMode_Multi_AlsoWorks()
    {
        // Some deployments map env vars hierarchically via the standard
        // ASP.NET binder — the provider supports both forms.
        var provider = new AiReviewModeProvider(
            BuildConfig(new Dictionary<string, string?> { ["AiService:ReviewMode"] = "multi" }),
            NullLogger<AiReviewModeProvider>.Instance);

        Assert.Equal(AiReviewMode.Multi, provider.Current);
    }

    [Fact]
    public void Flat_Env_Var_Wins_Over_Hierarchical_When_Both_Set()
    {
        // First non-empty wins; AI_REVIEW_MODE comes first.
        var provider = new AiReviewModeProvider(
            BuildConfig(new Dictionary<string, string?>
            {
                ["AI_REVIEW_MODE"] = "multi",
                ["AiService:ReviewMode"] = "single",
            }),
            NullLogger<AiReviewModeProvider>.Instance);

        Assert.Equal(AiReviewMode.Multi, provider.Current);
    }

    [Theory]
    [InlineData("garbage")]
    [InlineData("dual")]
    [InlineData("3")]
    public void Unrecognized_Value_Defaults_To_Single(string raw)
    {
        var provider = new AiReviewModeProvider(
            BuildConfig(new Dictionary<string, string?> { ["AI_REVIEW_MODE"] = raw }),
            NullLogger<AiReviewModeProvider>.Instance);

        Assert.Equal(AiReviewMode.Single, provider.Current);
    }
}

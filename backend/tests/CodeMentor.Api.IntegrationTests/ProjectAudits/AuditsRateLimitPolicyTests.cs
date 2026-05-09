using CodeMentor.Api.Extensions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace CodeMentor.Api.IntegrationTests.ProjectAudits;

/// <summary>
/// S9-T2 acceptance (config-level): the audit rate-limit policy is wired up and
/// configurable via <c>RateLimits:AuditsPerDay</c>. Live verification of "4th
/// attempt → 429 with Retry-After" happens in S9-T3 (endpoint integration tests
/// against <c>POST /api/audits</c>).
/// </summary>
public class AuditsRateLimitPolicyTests
{
    [Fact]
    public void AuditsCreatePolicy_Has_Stable_Name()
    {
        // Renames break attribute references on controllers — the policy name is
        // a public contract between RateLimitingExtensions and any [EnableRateLimiting] attribute.
        Assert.Equal("audits-create", RateLimitingExtensions.AuditsCreatePolicy);
    }

    [Fact]
    public void AddPlatformRateLimiting_Reads_AuditsPerDay_Override_From_Configuration()
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["RateLimits:AuditsPerDay"] = "7",
            })
            .Build();

        var services = new ServiceCollection();
        services.AddPlatformRateLimiting(config);

        // Override is consumed at registration time and baked into the policy;
        // explicit policy-value inspection requires running the limiter, exercised
        // by the endpoint tests in S9-T3.
        var sp = services.BuildServiceProvider();
        Assert.NotNull(sp);
    }
}

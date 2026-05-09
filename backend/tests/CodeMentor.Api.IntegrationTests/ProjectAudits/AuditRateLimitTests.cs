using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using CodeMentor.Api.IntegrationTests.TestHost;
using CodeMentor.Application.Auth.Contracts;
using CodeMentor.Application.ProjectAudits.Contracts;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;

namespace CodeMentor.Api.IntegrationTests.ProjectAudits;

/// <summary>
/// Closes the S9-T2 acceptance loop (deferred from S9-T2 to S9-T3 because it
/// needs a real endpoint to exercise): 4th audit attempt within the same
/// 24-hour window → 429 with a Retry-After header.
///
/// Uses a per-class factory variant that lowers <c>RateLimits:AuditsPerDay</c>
/// to 3 (the production default), overriding the shared factory's 1M test cap.
/// </summary>
public class AuditRateLimitTests : IClassFixture<AuditRateLimitFactory>
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    private readonly AuditRateLimitFactory _factory;
    private readonly HttpClient _client;

    public AuditRateLimitTests(AuditRateLimitFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    private async Task<string> RegisterAsync()
    {
        var email = $"rate-{Guid.NewGuid():N}@audit-test.local";
        var req = new RegisterRequest(email, "Strong_Pass_123!", "Rate Tester", null);
        var res = await _client.PostAsJsonAsync("/api/auth/register", req);
        res.EnsureSuccessStatusCode();
        return (await res.Content.ReadFromJsonAsync<AuthResponse>())!.AccessToken;
    }

    private static CreateAuditRequest MakeRequest(int seq) => new(
        ProjectName: $"rate-test-{seq}",
        Summary: "rate-limit test",
        Description: "rate-limit test description",
        ProjectType: "Library",
        TechStack: new[] { "JavaScript" },
        Features: new[] { "feature" },
        TargetAudience: null,
        FocusAreas: null,
        KnownIssues: null,
        Source: new AuditSourceDto("github", $"https://github.com/octocat/repo-{seq}", null));

    [Fact]
    public async Task FourthAuditWithin24h_Returns429_WithRetryAfter()
    {
        var token = await RegisterAsync();
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        // First three audits: 202 Accepted.
        for (int i = 1; i <= 3; i++)
        {
            var ok = await _client.PostAsJsonAsync("/api/audits", MakeRequest(i), Json);
            Assert.Equal(HttpStatusCode.Accepted, ok.StatusCode);
        }

        // Fourth: 429.
        var blocked = await _client.PostAsJsonAsync("/api/audits", MakeRequest(4), Json);
        Assert.Equal(HttpStatusCode.TooManyRequests, blocked.StatusCode);
        Assert.True(blocked.Headers.Contains("Retry-After"),
            "Rate-limited response must include Retry-After header.");
    }
}

/// <summary>
/// Test-class fixture that lowers <c>RateLimits:AuditsPerDay</c> back to the
/// production default (3) so the limiter actually fires. The shared factory
/// disables the limiter (1M) so the rest of the suite isn't slowed by it.
/// </summary>
public sealed class AuditRateLimitFactory : CodeMentorWebApplicationFactory
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        base.ConfigureWebHost(builder);

        builder.ConfigureAppConfiguration((_, cfg) =>
        {
            cfg.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["RateLimits:AuditsPerDay"] = "3",
            });
        });
    }
}

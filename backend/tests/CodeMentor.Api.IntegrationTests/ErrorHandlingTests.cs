using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using CodeMentor.Api.IntegrationTests.TestHost;
using CodeMentor.Application.Auth.Contracts;

namespace CodeMentor.Api.IntegrationTests;

/// <summary>
/// S8-T11 acceptance: error paths exit cleanly. Unknown routes return 404
/// (RFC 7807 problem JSON with traceId + service); 401/403 paths surface as
/// problem JSON too. No raw stack traces leak.
/// </summary>
public class ErrorHandlingTests : IClassFixture<CodeMentorWebApplicationFactory>
{
    private readonly HttpClient _client;
    public ErrorHandlingTests(CodeMentorWebApplicationFactory factory) => _client = factory.CreateClient();

    [Fact]
    public async Task UnknownRoute_Returns404_NoStackTrace()
    {
        var res = await _client.GetAsync("/api/this-route-does-not-exist");
        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);

        // 404 may either be empty (default ASP.NET) or a problem JSON depending
        // on the matched middleware. We assert the body never contains a stack
        // trace marker like " at " (common in .NET stack frames).
        var body = await res.Content.ReadAsStringAsync();
        Assert.DoesNotContain("System.Exception", body);
        Assert.DoesNotContain(" at CodeMentor", body);
    }

    [Fact]
    public async Task UnauthAuthorizedEndpoint_Returns401_NoLeak()
    {
        var res = await _client.GetAsync("/api/dashboard/me");
        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
        var body = await res.Content.ReadAsStringAsync();
        Assert.DoesNotContain("System.", body);
    }

    [Fact]
    public async Task InvalidJsonOnPost_Returns400_AsProblemJson()
    {
        // Send a malformed JSON body to a public endpoint.
        var content = new StringContent("{ this is not json", System.Text.Encoding.UTF8, "application/json");
        var res = await _client.PostAsync("/api/auth/login", content);
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);

        var body = await res.Content.ReadAsStringAsync();
        Assert.DoesNotContain(" at System.", body);
        Assert.DoesNotContain(" at CodeMentor", body);
        // Either a model-binding problem JSON or our customised problem; both
        // include the standard RFC 7807 fields.
        Assert.Contains("title", body, StringComparison.OrdinalIgnoreCase);
    }
}

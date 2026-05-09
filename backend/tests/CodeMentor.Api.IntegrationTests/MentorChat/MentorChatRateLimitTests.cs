using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using CodeMentor.Api.IntegrationTests.TestHost;
using CodeMentor.Application.Auth.Contracts;
using CodeMentor.Application.MentorChat.Contracts;
using CodeMentor.Domain.Submissions;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace CodeMentor.Api.IntegrationTests.MentorChat;

/// <summary>
/// S10-T7 acceptance: 31st message → 429 + Retry-After; counter scoped per
/// session (different sessions independent).
/// </summary>
public class MentorChatRateLimitTests : IClassFixture<MentorChatRateLimitFactory>
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    private readonly MentorChatRateLimitFactory _factory;
    private readonly HttpClient _client;

    public MentorChatRateLimitTests(MentorChatRateLimitFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task FourthMessageInWindow_Returns_429_WithRetryAfter()
    {
        // Per-class factory caps mentor-chat at 3 per hour so we don't have to
        // fire 30 messages to trip the limiter.
        Bearer(await RegisterAsync("mc-rl-1@test.local"));
        var (submissionId, _) = await SeedReadySubmissionAsync(mentorIndexed: true);
        var session = await CreateSessionAsync("submission", submissionId);

        for (var i = 1; i <= 3; i++)
        {
            var ok = await _client.PostAsJsonAsync(
                $"/api/mentor-chat/{session.SessionId}/messages",
                new SendMessageRequest($"msg {i}"));
            Assert.True(ok.IsSuccessStatusCode, $"message {i} failed with {ok.StatusCode}");
        }

        var rejected = await _client.PostAsJsonAsync(
            $"/api/mentor-chat/{session.SessionId}/messages",
            new SendMessageRequest("msg 4"));

        Assert.Equal((HttpStatusCode)429, rejected.StatusCode);
        Assert.True(rejected.Headers.Contains("Retry-After")
                    || rejected.Headers.RetryAfter is not null,
            "expected Retry-After header on 429");
    }

    [Fact]
    public async Task DifferentSessions_HaveIndependent_Counters()
    {
        Bearer(await RegisterAsync("mc-rl-2@test.local"));
        var (subA, _) = await SeedReadySubmissionAsync(mentorIndexed: true);
        var sessionA = await CreateSessionAsync("submission", subA);
        var (subB, _) = await SeedReadySubmissionAsync(mentorIndexed: true);
        var sessionB = await CreateSessionAsync("submission", subB);

        // Burn session A's quota.
        for (var i = 1; i <= 3; i++)
        {
            var ok = await _client.PostAsJsonAsync(
                $"/api/mentor-chat/{sessionA.SessionId}/messages",
                new SendMessageRequest($"a-{i}"));
            Assert.True(ok.IsSuccessStatusCode, $"a-{i} failed with {ok.StatusCode}");
        }
        var ARejected = await _client.PostAsJsonAsync(
            $"/api/mentor-chat/{sessionA.SessionId}/messages",
            new SendMessageRequest("a-4"));
        Assert.Equal((HttpStatusCode)429, ARejected.StatusCode);

        // Session B is still under its own (independent) quota.
        var bOk = await _client.PostAsJsonAsync(
            $"/api/mentor-chat/{sessionB.SessionId}/messages",
            new SendMessageRequest("b-1"));
        Assert.True(bOk.IsSuccessStatusCode, $"session B should not be rate-limited; got {bOk.StatusCode}");
    }

    // ------------------------------------------------------------------

    private void Bearer(string token) =>
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

    private async Task<string> RegisterAsync(string email)
    {
        var req = new RegisterRequest(email, "Strong_Pass_123!", "RateLimitTester", null);
        var res = await _client.PostAsJsonAsync("/api/auth/register", req);
        res.EnsureSuccessStatusCode();
        return (await res.Content.ReadFromJsonAsync<AuthResponse>(Json))!.AccessToken;
    }

    private async Task<(Guid submissionId, Guid userId)> SeedReadySubmissionAsync(bool mentorIndexed)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var meRes = await _client.GetAsync("/api/auth/me");
        meRes.EnsureSuccessStatusCode();
        var me = await meRes.Content.ReadFromJsonAsync<JsonElement>(Json);
        var userId = Guid.Parse(me.GetProperty("id").GetString()!);
        var sub = new Submission
        {
            UserId = userId,
            TaskId = Guid.NewGuid(),
            SubmissionType = SubmissionType.Upload,
            BlobPath = $"tests/{Guid.NewGuid():N}/x.zip",
            Status = SubmissionStatus.Completed,
            MentorIndexedAt = mentorIndexed ? DateTime.UtcNow : null,
        };
        db.Submissions.Add(sub);
        await db.SaveChangesAsync();
        return (sub.Id, userId);
    }

    private async Task<MentorChatSessionDto> CreateSessionAsync(string scope, Guid scopeId)
    {
        var resp = await _client.PostAsJsonAsync("/api/mentor-chat/sessions", new { scope, scopeId });
        resp.EnsureSuccessStatusCode();
        return (await resp.Content.ReadFromJsonAsync<MentorChatSessionDto>(Json))!;
    }
}

/// <summary>
/// Test-class fixture that lowers <c>RateLimits:MentorChatPerHour</c> to 3 so
/// the limiter actually fires inside a feasible test run. Mirrors
/// <c>AuditRateLimitFactory</c>.
/// </summary>
public sealed class MentorChatRateLimitFactory : CodeMentorWebApplicationFactory
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        base.ConfigureWebHost(builder);

        builder.ConfigureAppConfiguration((_, cfg) =>
        {
            cfg.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["RateLimits:MentorChatPerHour"] = "3",
            });
        });
    }
}

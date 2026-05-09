using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using CodeMentor.Api.IntegrationTests.TestHost;
using CodeMentor.Application.Auth.Contracts;
using CodeMentor.Application.MentorChat;
using CodeMentor.Application.MentorChat.Contracts;
using CodeMentor.Domain.MentorChat;
using CodeMentor.Domain.Submissions;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace CodeMentor.Api.IntegrationTests.MentorChat;

/// <summary>
/// S10-T6 acceptance: 4 endpoints × happy + 3 error cases each.
///   GET    /api/mentor-chat/{sessionId}             — load history
///   POST   /api/mentor-chat/sessions                  — idempotent create
///   POST   /api/mentor-chat/{sessionId}/messages       — proxy SSE stream
///   DELETE /api/mentor-chat/{sessionId}/messages       — clear history
/// </summary>
public class MentorChatEndpointTests : IClassFixture<CodeMentorWebApplicationFactory>
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    private readonly CodeMentorWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public MentorChatEndpointTests(CodeMentorWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task GetSession_Unknown_Returns_404()
    {
        Bearer(await RegisterAsync("mc-1@test.local"));
        var resp = await _client.GetAsync($"/api/mentor-chat/{Guid.NewGuid()}");
        Assert.Equal(HttpStatusCode.NotFound, resp.StatusCode);
    }

    [Fact]
    public async Task CreateSession_HappyPath_Then_Idempotent_ReturnsSameSessionId()
    {
        Bearer(await RegisterAsync("mc-2@test.local"));
        var (submissionId, _) = await SeedReadySubmissionAsync(mentorIndexed: true);

        var first = await _client.PostAsJsonAsync("/api/mentor-chat/sessions",
            new { scope = "submission", scopeId = submissionId });
        first.EnsureSuccessStatusCode();
        var firstSession = await first.Content.ReadFromJsonAsync<MentorChatSessionDto>(Json);
        Assert.Equal(submissionId, firstSession!.ScopeId);
        Assert.True(firstSession.IsReady);

        // Second call returns the same SessionId — idempotent.
        var second = await _client.PostAsJsonAsync("/api/mentor-chat/sessions",
            new { scope = "submission", scopeId = submissionId });
        second.EnsureSuccessStatusCode();
        var secondSession = await second.Content.ReadFromJsonAsync<MentorChatSessionDto>(Json);
        Assert.Equal(firstSession.SessionId, secondSession!.SessionId);
    }

    [Fact]
    public async Task CreateSession_InvalidScope_Returns_400()
    {
        Bearer(await RegisterAsync("mc-3@test.local"));
        var resp = await _client.PostAsJsonAsync("/api/mentor-chat/sessions",
            new { scope = "wat", scopeId = Guid.NewGuid() });
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
    }

    [Fact]
    public async Task CreateSession_UnknownSubmission_Returns_404()
    {
        Bearer(await RegisterAsync("mc-4@test.local"));
        var resp = await _client.PostAsJsonAsync("/api/mentor-chat/sessions",
            new { scope = "submission", scopeId = Guid.NewGuid() });
        Assert.Equal(HttpStatusCode.NotFound, resp.StatusCode);
    }

    [Fact]
    public async Task GetSession_Owned_Returns_HistoryAndReadyFlag()
    {
        Bearer(await RegisterAsync("mc-5@test.local"));
        var (submissionId, _) = await SeedReadySubmissionAsync(mentorIndexed: true);
        var session = await CreateSessionAsync("submission", submissionId);

        var resp = await _client.GetAsync($"/api/mentor-chat/{session.SessionId}");
        resp.EnsureSuccessStatusCode();
        var history = await resp.Content.ReadFromJsonAsync<MentorChatHistoryResponse>(Json);
        Assert.NotNull(history);
        Assert.Equal(session.SessionId, history!.Session.SessionId);
        Assert.True(history.Session.IsReady);
        Assert.Empty(history.Messages);
    }

    [Fact]
    public async Task GetSession_OtherUsers_Session_Returns_404_NoOwnershipLeak()
    {
        Bearer(await RegisterAsync("mc-owner-6@test.local"));
        var (subA, _) = await SeedReadySubmissionAsync(mentorIndexed: true);
        var owned = await CreateSessionAsync("submission", subA);

        // Switch users.
        Bearer(await RegisterAsync("mc-other-6@test.local"));
        var resp = await _client.GetAsync($"/api/mentor-chat/{owned.SessionId}");
        Assert.Equal(HttpStatusCode.NotFound, resp.StatusCode);
    }

    [Fact]
    public async Task SendMessage_NotReady_Returns_409()
    {
        Bearer(await RegisterAsync("mc-7@test.local"));
        var (submissionId, _) = await SeedReadySubmissionAsync(mentorIndexed: false);  // NOT indexed
        var session = await CreateSessionAsync("submission", submissionId);

        var resp = await _client.PostAsJsonAsync(
            $"/api/mentor-chat/{session.SessionId}/messages",
            new SendMessageRequest("why is this risky?"));
        Assert.Equal(HttpStatusCode.Conflict, resp.StatusCode);
    }

    [Fact]
    public async Task SendMessage_HappyPath_StreamsSse_AndPersistsAssistantTurn()
    {
        Bearer(await RegisterAsync("mc-8@test.local"));
        var (submissionId, _) = await SeedReadySubmissionAsync(mentorIndexed: true);
        var session = await CreateSessionAsync("submission", submissionId);

        var stream = (FakeMentorChatStreamClient)_factory.Services.GetRequiredService<IMentorChatStreamClient>();
        stream.Calls.Clear();
        stream.ScriptedEvents = new List<string>
        {
            "data: {\"type\":\"token\",\"content\":\"Line \"}\n\n",
            "data: {\"type\":\"token\",\"content\":\"42 \"}\n\n",
            "data: {\"type\":\"token\",\"content\":\"is risky.\"}\n\n",
            "data: {\"done\":true,\"messageId\":\"" + Guid.NewGuid().ToString() + "\",\"tokensInput\":120,\"tokensOutput\":24,\"contextMode\":\"Rag\",\"chunkIds\":[\"chunk-1\",\"chunk-2\"],\"promptVersion\":\"mentor_chat.v1\"}\n\n",
        };

        var resp = await _client.PostAsJsonAsync(
            $"/api/mentor-chat/{session.SessionId}/messages",
            new SendMessageRequest("why is line 42 risky?"));
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        Assert.StartsWith("text/event-stream", resp.Content.Headers.ContentType?.MediaType ?? "");

        var body = await resp.Content.ReadAsStringAsync();
        Assert.Contains("\"content\":\"Line \"", body);
        Assert.Contains("\"done\":true", body);

        // Verify the request shape that reached the stream client.
        Assert.Single(stream.Calls);
        var sent = stream.Calls[0];
        Assert.Equal("submission", sent.Scope);
        Assert.Equal(submissionId.ToString("N"), sent.ScopeId);
        Assert.Equal("why is line 42 risky?", sent.Message);

        // Both messages persisted: the user's input AND the assistant's reply.
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var msgs = await db.MentorChatMessages
            .AsNoTracking()
            .Where(m => m.SessionId == session.SessionId)
            .OrderBy(m => m.CreatedAt)
            .ToListAsync();
        Assert.Equal(2, msgs.Count);
        Assert.Equal(MentorChatRole.User, msgs[0].Role);
        Assert.Equal("why is line 42 risky?", msgs[0].Content);
        Assert.Equal(MentorChatRole.Assistant, msgs[1].Role);
        Assert.Equal("Line 42 is risky.", msgs[1].Content);
        Assert.Equal(MentorChatContextMode.Rag, msgs[1].ContextMode);
        Assert.Equal(120, msgs[1].TokensInput);
        Assert.Equal(24, msgs[1].TokensOutput);
        Assert.NotNull(msgs[1].RetrievedChunkIds);
        Assert.Equal(2, msgs[1].RetrievedChunkIds!.Count);
    }

    [Fact]
    public async Task SendMessage_OtherUsers_Session_Returns_404()
    {
        Bearer(await RegisterAsync("mc-owner-9@test.local"));
        var (sub, _) = await SeedReadySubmissionAsync(mentorIndexed: true);
        var session = await CreateSessionAsync("submission", sub);

        Bearer(await RegisterAsync("mc-other-9@test.local"));
        var resp = await _client.PostAsJsonAsync(
            $"/api/mentor-chat/{session.SessionId}/messages",
            new SendMessageRequest("hi"));
        Assert.Equal(HttpStatusCode.NotFound, resp.StatusCode);
    }

    [Fact]
    public async Task SendMessage_EmptyContent_Returns_400()
    {
        Bearer(await RegisterAsync("mc-10@test.local"));
        var (submissionId, _) = await SeedReadySubmissionAsync(mentorIndexed: true);
        var session = await CreateSessionAsync("submission", submissionId);

        var resp = await _client.PostAsJsonAsync(
            $"/api/mentor-chat/{session.SessionId}/messages",
            new SendMessageRequest(""));
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
    }

    [Fact]
    public async Task ClearHistory_Owned_Returns_204_AndDeletesMessages()
    {
        Bearer(await RegisterAsync("mc-11@test.local"));
        var (submissionId, _) = await SeedReadySubmissionAsync(mentorIndexed: true);
        var session = await CreateSessionAsync("submission", submissionId);

        // Seed 2 messages directly through the DB so we have something to delete.
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            db.MentorChatMessages.AddRange(
                new MentorChatMessage { SessionId = session.SessionId, Role = MentorChatRole.User, Content = "q1" },
                new MentorChatMessage { SessionId = session.SessionId, Role = MentorChatRole.Assistant, Content = "a1" });
            await db.SaveChangesAsync();
        }

        var resp = await _client.DeleteAsync($"/api/mentor-chat/{session.SessionId}/messages");
        Assert.Equal(HttpStatusCode.NoContent, resp.StatusCode);

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            Assert.Empty(await db.MentorChatMessages.Where(m => m.SessionId == session.SessionId).ToListAsync());
            // Session row preserved.
            Assert.NotNull(await db.MentorChatSessions.FindAsync(session.SessionId));
        }
    }

    [Fact]
    public async Task ClearHistory_OtherUsers_Session_Returns_404()
    {
        Bearer(await RegisterAsync("mc-owner-12@test.local"));
        var (sub, _) = await SeedReadySubmissionAsync(mentorIndexed: true);
        var session = await CreateSessionAsync("submission", sub);

        Bearer(await RegisterAsync("mc-other-12@test.local"));
        var resp = await _client.DeleteAsync($"/api/mentor-chat/{session.SessionId}/messages");
        Assert.Equal(HttpStatusCode.NotFound, resp.StatusCode);
    }

    // ------------------------------------------------------------------
    // helpers
    // ------------------------------------------------------------------

    private void Bearer(string token) =>
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

    private async Task<string> RegisterAsync(string email)
    {
        var req = new RegisterRequest(email, "Strong_Pass_123!", "Mentor Chat Tester", null);
        var res = await _client.PostAsJsonAsync("/api/auth/register", req);
        res.EnsureSuccessStatusCode();
        return (await res.Content.ReadFromJsonAsync<AuthResponse>(Json))!.AccessToken;
    }

    private async Task<(Guid submissionId, Guid userId)> SeedReadySubmissionAsync(bool mentorIndexed)
    {
        // Seed a submission directly through the DB tied to the *currently-authed* user.
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var userId = await ResolveCurrentUserIdAsync(db);

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

    private async Task<Guid> ResolveCurrentUserIdAsync(ApplicationDbContext db)
    {
        // The Bearer token's `sub` claim is the user's GUID — call /auth/me to read it back.
        var meRes = await _client.GetAsync("/api/auth/me");
        meRes.EnsureSuccessStatusCode();
        var me = await meRes.Content.ReadFromJsonAsync<JsonElement>(Json);
        return Guid.Parse(me.GetProperty("id").GetString()!);
    }

    private async Task<MentorChatSessionDto> CreateSessionAsync(string scope, Guid scopeId)
    {
        var resp = await _client.PostAsJsonAsync("/api/mentor-chat/sessions", new { scope, scopeId });
        resp.EnsureSuccessStatusCode();
        return (await resp.Content.ReadFromJsonAsync<MentorChatSessionDto>(Json))!;
    }
}

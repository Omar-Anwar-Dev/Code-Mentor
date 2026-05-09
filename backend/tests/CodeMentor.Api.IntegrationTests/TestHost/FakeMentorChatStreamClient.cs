using CodeMentor.Application.MentorChat;

namespace CodeMentor.Api.IntegrationTests.TestHost;

/// <summary>
/// S10-T6: scripted SSE stream for integration tests. Test sets the
/// <see cref="ScriptedEvents"/> list before exercising the controller.
/// Default script emits one token + a `done` event so happy-path tests
/// don't have to set anything.
/// </summary>
public sealed class FakeMentorChatStreamClient : IMentorChatStreamClient
{
    public List<string> ScriptedEvents { get; set; } = new()
    {
        "data: {\"type\":\"token\",\"content\":\"Hello from the mentor.\"}\n\n",
        "data: {\"done\":true,\"messageId\":\"00000000-0000-0000-0000-000000000000\",\"tokensInput\":100,\"tokensOutput\":12,\"contextMode\":\"Rag\",\"chunkIds\":[\"abc\"],\"promptVersion\":\"mentor_chat.v1\"}\n\n",
    };

    public List<MentorChatStreamRequest> Calls { get; } = new();

    public async IAsyncEnumerable<string> StreamAsync(
        MentorChatStreamRequest request,
        string correlationId,
        [System.Runtime.CompilerServices.EnumeratorCancellation] CancellationToken ct = default)
    {
        Calls.Add(request);
        foreach (var ev in ScriptedEvents)
        {
            ct.ThrowIfCancellationRequested();
            await Task.Yield();
            yield return ev;
        }
    }
}

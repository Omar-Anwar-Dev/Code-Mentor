using CodeMentor.Application.CodeReview;
using CodeMentor.Application.MentorChat;

namespace CodeMentor.Api.IntegrationTests.TestHost;

/// <summary>
/// S10-T4: test replacement for <see cref="EmbeddingsClient"/>. Records the
/// call so the test can assert the indexing pipeline ran end-to-end, and lets
/// the test trigger <see cref="AiServiceUnavailableException"/> to exercise
/// the AutomaticRetry path.
/// </summary>
public sealed class FakeEmbeddingsClient : IEmbeddingsClient
{
    public List<EmbeddingsUpsertRequest> Calls { get; } = new();

    /// <summary>Set true to make the next <see cref="UpsertAsync"/> throw.</summary>
    public bool ThrowUnavailable { get; set; }

    /// <summary>Tunable response — defaults to a healthy upsert with 5 chunks.</summary>
    public EmbeddingsUpsertResult Response { get; set; } =
        new(Indexed: 5, Skipped: 0, ChunkCount: 5, DurationMs: 100, Collection: "mentor_chunks");

    public Task<EmbeddingsUpsertResult> UpsertAsync(
        EmbeddingsUpsertRequest request,
        string correlationId,
        CancellationToken ct = default)
    {
        Calls.Add(request);
        if (ThrowUnavailable)
        {
            throw new AiServiceUnavailableException("Fake: AI service unavailable");
        }
        return Task.FromResult(Response);
    }
}

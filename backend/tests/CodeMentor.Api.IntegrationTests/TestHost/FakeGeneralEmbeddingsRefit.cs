using CodeMentor.Infrastructure.CodeReview;

namespace CodeMentor.Api.IntegrationTests.TestHost;

/// <summary>
/// S16-T5: test replacement for <see cref="IGeneralEmbeddingsRefit"/>.
///
/// Returns a fixed 1536-float vector so the <c>EmbedEntityJob</c> can
/// run end-to-end without a live AI service / OpenAI key. Records every
/// embed + reload call so tests can assert the job invoked them.
/// </summary>
public sealed class FakeGeneralEmbeddingsRefit : IGeneralEmbeddingsRefit
{
    public List<EmbedTextRequest> EmbedCalls { get; } = new();
    public List<EmbeddingsReloadRequest> ReloadCalls { get; } = new();

    /// <summary>Set to throw on the next embed call (then auto-clears).</summary>
    public Exception? ThrowOnNextEmbed { get; set; }

    public Task<EmbedTextResponse> EmbedAsync(
        EmbedTextRequest body,
        string correlationId,
        CancellationToken ct)
    {
        EmbedCalls.Add(body);
        if (ThrowOnNextEmbed is { } exc)
        {
            ThrowOnNextEmbed = null;
            throw exc;
        }
        // Deterministic 1536-float vector — value irrelevant to tests; what
        // matters is that the job round-trips a non-null vector through
        // EmbeddingJson on the question row.
        var vector = Enumerable.Range(0, 1536).Select(i => 0.001 + i * 1e-6).ToArray();
        return Task.FromResult(new EmbedTextResponse(
            Vector: vector,
            Dims: 1536,
            Model: "text-embedding-3-small",
            TokensUsed: 47));
    }

    public Task<EmbeddingsReloadResponse> ReloadAsync(
        EmbeddingsReloadRequest body,
        string correlationId,
        CancellationToken ct)
    {
        ReloadCalls.Add(body);
        return Task.FromResult(new EmbeddingsReloadResponse(
            Ok: true,
            Refreshed: body.Scope,
            CachePresent: false));
    }
}

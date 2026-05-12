using System.Net;
using CodeMentor.Application.CodeReview;
using CodeMentor.Infrastructure.CodeReview;
using Microsoft.Extensions.Logging.Abstractions;
using Refit;

namespace CodeMentor.Application.Tests.CodeReview;

/// <summary>
/// S12-T5 / F14 (ADR-040, ADR-043): tests for the production
/// <see cref="FeedbackHistoryRetriever"/>. Mocks the Refit interface
/// directly so each failure path can be reproduced without a live AI
/// service. Verifies the contract that the retriever NEVER throws (except
/// for caller cancellation) and ALWAYS returns an empty list on failure
/// per ADR-043.
/// </summary>
public class FeedbackHistoryRetrieverTests
{
    /// <summary>
    /// In-memory Refit fake: either returns a fixed response or throws a
    /// configurable exception. Records call count for short-circuit
    /// assertions.
    /// </summary>
    private sealed class FakeRefit : IFeedbackHistorySearchRefit
    {
        public Func<FeedbackHistorySearchRefitRequest, FeedbackHistorySearchRefitResponse>? OnCall { get; set; }
        public Exception? Throw { get; set; }
        public int CallCount { get; private set; }
        public List<FeedbackHistorySearchRefitRequest> Calls { get; } = new();

        public Task<FeedbackHistorySearchRefitResponse> SearchAsync(
            FeedbackHistorySearchRefitRequest body, string correlationId, CancellationToken ct)
        {
            CallCount++;
            Calls.Add(body);
            if (Throw is not null) throw Throw;
            var resp = OnCall?.Invoke(body)
                      ?? new FeedbackHistorySearchRefitResponse(
                          Chunks: Array.Empty<FeedbackHistoryRefitChunk>(),
                          PromptVersion: "feedback-history.v1");
            return Task.FromResult(resp);
        }
    }

    private static FeedbackHistoryRetriever NewRetriever(FakeRefit refit) =>
        new(refit, NullLogger<FeedbackHistoryRetriever>.Instance);

    [Fact]
    public async Task RetrieveAsync_EmptyAnchor_ShortCircuits_NoHttp()
    {
        var refit = new FakeRefit();
        var sut = NewRetriever(refit);

        var result = await sut.RetrieveAsync(Guid.NewGuid(), "", topK: 5);

        Assert.Empty(result.Chunks);
        Assert.Equal(FeedbackHistoryRetrievalStatus.AnchorEmpty, result.Status);
        Assert.Equal(0, refit.CallCount);
    }

    [Fact]
    public async Task RetrieveAsync_WhitespaceAnchor_ShortCircuits_NoHttp()
    {
        var refit = new FakeRefit();
        var sut = NewRetriever(refit);

        var result = await sut.RetrieveAsync(Guid.NewGuid(), "   \t\n  ", topK: 5);

        Assert.Empty(result.Chunks);
        Assert.Equal(FeedbackHistoryRetrievalStatus.AnchorEmpty, result.Status);
        Assert.Equal(0, refit.CallCount);
    }

    [Fact]
    public async Task RetrieveAsync_HappyPath_MapsChunks_ToApplicationShape()
    {
        var userId = Guid.NewGuid();
        var sourceSubmissionId = Guid.NewGuid();
        var refit = new FakeRefit
        {
            OnCall = _ => new FeedbackHistorySearchRefitResponse(
                Chunks: new[]
                {
                    new FeedbackHistoryRefitChunk(
                        SourceSubmissionId: sourceSubmissionId.ToString("N"),
                        TaskName: "REST API Auth",
                        TaskId: Guid.NewGuid().ToString("N"),
                        ChunkText: "Race condition in checkout flow",
                        Kind: "weakness",
                        SimilarityScore: 0.87,
                        SourceDate: "2026-04-15T12:00:00Z"),
                    new FeedbackHistoryRefitChunk(
                        SourceSubmissionId: Guid.NewGuid().ToString("N"),
                        TaskName: "Dashboard",
                        TaskId: null,
                        ChunkText: "Missing CSRF token",
                        Kind: "annotation",
                        SimilarityScore: 0.74,
                        SourceDate: "2026-04-22T08:30:00Z"),
                },
                PromptVersion: "feedback-history.v1"),
        };
        var sut = NewRetriever(refit);

        var result = await sut.RetrieveAsync(userId, "static findings anchor", topK: 5);

        Assert.Equal(FeedbackHistoryRetrievalStatus.RetrievalCompleted, result.Status);
        Assert.Equal(2, result.Chunks.Count);
        Assert.Equal(sourceSubmissionId, result.Chunks[0].SourceSubmissionId);
        Assert.Equal("REST API Auth", result.Chunks[0].TaskName);
        Assert.Equal("Race condition in checkout flow", result.Chunks[0].ChunkText);
        Assert.Equal("weakness", result.Chunks[0].Kind);
        Assert.Equal(0.87, result.Chunks[0].SimilarityScore);
        Assert.Equal(new DateTime(2026, 4, 15, 12, 0, 0, DateTimeKind.Utc), result.Chunks[0].SourceDate);
    }

    [Fact]
    public async Task RetrieveAsync_ForwardsCorrectRequestBody()
    {
        var refit = new FakeRefit();
        var sut = NewRetriever(refit);
        var userId = Guid.NewGuid();

        await sut.RetrieveAsync(userId, "anchor text", topK: 3);

        Assert.Single(refit.Calls);
        var sent = refit.Calls[0];
        Assert.Equal(userId.ToString("N"), sent.UserId);
        Assert.Equal("anchor text", sent.AnchorText);
        Assert.Equal(3, sent.TopK);
        Assert.Contains("code", sent.ExcludeKinds);
    }

    [Fact]
    public async Task RetrieveAsync_TopKClampedToMinimumOne()
    {
        var refit = new FakeRefit();
        var sut = NewRetriever(refit);

        await sut.RetrieveAsync(Guid.NewGuid(), "anchor", topK: -5);

        Assert.Equal(1, refit.Calls[0].TopK);
    }

    [Fact]
    public async Task RetrieveAsync_ApiException5xx_FallsBack_Unavailable()
    {
        var refit = new FakeRefit
        {
            Throw = await ApiException.Create(
                new HttpRequestMessage(),
                HttpMethod.Post,
                new HttpResponseMessage(HttpStatusCode.ServiceUnavailable),
                new RefitSettings()),
        };
        var sut = NewRetriever(refit);

        var result = await sut.RetrieveAsync(Guid.NewGuid(), "anchor", topK: 5);

        Assert.Empty(result.Chunks);
        Assert.Equal(FeedbackHistoryRetrievalStatus.Unavailable, result.Status);
    }

    [Fact]
    public async Task RetrieveAsync_HttpRequestException_FallsBack_Unavailable()
    {
        var refit = new FakeRefit
        {
            Throw = new HttpRequestException("connection refused"),
        };
        var sut = NewRetriever(refit);

        var result = await sut.RetrieveAsync(Guid.NewGuid(), "anchor", topK: 5);

        Assert.Empty(result.Chunks);
        Assert.Equal(FeedbackHistoryRetrievalStatus.Unavailable, result.Status);
    }

    [Fact]
    public async Task RetrieveAsync_TimeoutException_FallsBack_Unavailable()
    {
        var refit = new FakeRefit
        {
            Throw = new TaskCanceledException("request timed out"),
        };
        var sut = NewRetriever(refit);

        var result = await sut.RetrieveAsync(Guid.NewGuid(), "anchor", topK: 5);

        Assert.Empty(result.Chunks);
        Assert.Equal(FeedbackHistoryRetrievalStatus.Unavailable, result.Status);
    }

    [Fact]
    public async Task RetrieveAsync_GenericException_FallsBack_Unavailable()
    {
        var refit = new FakeRefit
        {
            Throw = new InvalidOperationException("malformed response"),
        };
        var sut = NewRetriever(refit);

        var result = await sut.RetrieveAsync(Guid.NewGuid(), "anchor", topK: 5);

        Assert.Empty(result.Chunks);
        Assert.Equal(FeedbackHistoryRetrievalStatus.Unavailable, result.Status);
    }

    [Fact]
    public async Task RetrieveAsync_CallerCancellation_Propagates()
    {
        var refit = new FakeRefit
        {
            Throw = new OperationCanceledException(),
        };
        var sut = NewRetriever(refit);
        var cts = new CancellationTokenSource();
        cts.Cancel();

        await Assert.ThrowsAsync<OperationCanceledException>(
            () => sut.RetrieveAsync(Guid.NewGuid(), "anchor", topK: 5, ct: cts.Token));
    }

    [Fact]
    public async Task RetrieveAsync_EmptyChunksFromServer_ReturnsCompletedStatus()
    {
        // Post-S12 polish: empty chunks with a healthy service is
        // RetrievalCompleted, not Unavailable. This is the "no relevant
        // embeddings indexed yet for this learner" case the narrative
        // must distinguish from "service down".
        var refit = new FakeRefit
        {
            OnCall = _ => new FeedbackHistorySearchRefitResponse(
                Chunks: Array.Empty<FeedbackHistoryRefitChunk>(),
                PromptVersion: "feedback-history.v1"),
        };
        var sut = NewRetriever(refit);

        var result = await sut.RetrieveAsync(Guid.NewGuid(), "anchor", topK: 5);

        Assert.Empty(result.Chunks);
        Assert.Equal(FeedbackHistoryRetrievalStatus.RetrievalCompleted, result.Status);
    }

    [Fact]
    public async Task RetrieveAsync_WhitespaceChunkText_FilteredOut()
    {
        var refit = new FakeRefit
        {
            OnCall = _ => new FeedbackHistorySearchRefitResponse(
                Chunks: new[]
                {
                    new FeedbackHistoryRefitChunk(
                        SourceSubmissionId: Guid.NewGuid().ToString("N"),
                        TaskName: "x",
                        TaskId: null,
                        ChunkText: "   ",                      // whitespace → filtered
                        Kind: "weakness",
                        SimilarityScore: 0.5,
                        SourceDate: null),
                    new FeedbackHistoryRefitChunk(
                        SourceSubmissionId: Guid.NewGuid().ToString("N"),
                        TaskName: "y",
                        TaskId: null,
                        ChunkText: "real content",
                        Kind: "weakness",
                        SimilarityScore: 0.4,
                        SourceDate: null),
                },
                PromptVersion: "feedback-history.v1"),
        };
        var sut = NewRetriever(refit);

        var result = await sut.RetrieveAsync(Guid.NewGuid(), "anchor", topK: 5);

        Assert.Equal(FeedbackHistoryRetrievalStatus.RetrievalCompleted, result.Status);
        Assert.Single(result.Chunks);
        Assert.Equal("real content", result.Chunks[0].ChunkText);
    }
}

using System.Net;
using CodeMentor.Infrastructure.CodeReview;
using Refit;

namespace CodeMentor.Api.IntegrationTests.TestHost;

/// <summary>
/// S19-T4 / F16: test replacement for <see cref="IPathGeneratorRefit"/>.
///
/// **Default behaviour:** throws an <see cref="ApiException"/> with
/// HTTP 503 on every call, so tests that don't explicitly opt into the
/// AI path naturally land on the template fallback (matches the
/// pre-S19 deterministic-path behaviour). This keeps the pre-existing
/// integration tests stable without per-test plumbing.
///
/// **Opt-in for AI happy paths:** set <see cref="CannedResponse"/>.
/// The fake then returns that response on the next call (and
/// subsequent calls, until reset).
///
/// **Opt-in for retries / 4xx:** set <see cref="ThrowOnNext"/> to a
/// scripted exception or assign a different <see cref="ApiException"/>
/// instance.
///
/// Singleton lifetime (registered with AddSingleton in the test factory)
/// so tests can resolve the concrete type and read <see cref="Calls"/>
/// to assert what the service called with.
/// </summary>
public sealed class FakePathGeneratorRefit : IPathGeneratorRefit
{
    public List<PGenerateRequest> Calls { get; } = new();
    public Exception? ThrowOnNext { get; set; }
    public PGenerateResponse? CannedResponse { get; set; }

    /// <summary>When true (default), every call throws an HTTP 503 ApiException
    /// — the LearningPathService catches that and falls back to template.
    /// Set to false when <see cref="CannedResponse"/> is in play.</summary>
    public bool DefaultToServiceUnavailable { get; set; } = true;

    public Task<PGenerateResponse> GenerateAsync(
        PGenerateRequest body, string correlationId, CancellationToken ct)
    {
        Calls.Add(body);

        if (ThrowOnNext is { } exc)
        {
            ThrowOnNext = null;
            throw exc;
        }

        if (CannedResponse is not null)
            return Task.FromResult(CannedResponse);

        if (DefaultToServiceUnavailable)
            throw MakeApiException(HttpStatusCode.ServiceUnavailable);

        // Last-resort default: pick the first `targetLength` candidates in
        // submission order. Used by tests that want a *trivial* AI happy
        // path without scripting a canned response.
        var picks = body.CandidateTasks!.Take(body.TargetLength).ToList();
        var entries = picks
            .Select((c, idx) => new PGeneratedEntry(
                TaskId: c.TaskId,
                OrderIndex: idx + 1,
                Reasoning: $"Pick #{idx + 1}: targets the learner's weakest scores."))
            .ToList();
        return Task.FromResult(new PGenerateResponse(
            PathTasks: entries,
            OverallReasoning: "Stub AI rerank: forward-order pick from candidates.",
            RecallSize: body.CandidateTasks?.Count ?? 0,
            PromptVersion: "generate_path_v1",
            TokensUsed: 700,
            RetryCount: 0));
    }

    public void Reset()
    {
        Calls.Clear();
        ThrowOnNext = null;
        CannedResponse = null;
        DefaultToServiceUnavailable = true;
    }

    public static ApiException MakeApiException(HttpStatusCode code = HttpStatusCode.ServiceUnavailable)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/generate-path");
        var response = new HttpResponseMessage(code) { RequestMessage = request };
        return ApiException.Create(request, HttpMethod.Post, response, new RefitSettings()).GetAwaiter().GetResult();
    }
}

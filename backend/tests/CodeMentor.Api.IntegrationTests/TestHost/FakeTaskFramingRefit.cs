using System.Net;
using CodeMentor.Infrastructure.CodeReview;
using Refit;

namespace CodeMentor.Api.IntegrationTests.TestHost;

/// <summary>
/// S19-T5 / F16: test replacement for <see cref="ITaskFramingRefit"/>.
/// Returns a deterministic framing payload so the job + endpoint flow can
/// run end-to-end without a live AI service / OpenAI key.
/// </summary>
public sealed class FakeTaskFramingRefit : ITaskFramingRefit
{
    public List<TFFramingRequest> Calls { get; } = new();
    public Exception? ThrowOnNext { get; set; }
    public TFFramingResponse? CannedResponse { get; set; }

    public Task<TFFramingResponse> FrameAsync(
        TFFramingRequest body, string correlationId, CancellationToken ct)
    {
        Calls.Add(body);
        if (ThrowOnNext is { } exc)
        {
            ThrowOnNext = null;
            throw exc;
        }
        if (CannedResponse is not null)
            return Task.FromResult(CannedResponse);

        var profileSnippet = body.LearnerProfile.Count > 0
            ? string.Join(", ", body.LearnerProfile.Select(kv => $"{kv.Key}={kv.Value:F0}"))
            : "(no profile)";
        return Task.FromResult(new TFFramingResponse(
            WhyThisMatters:
                $"This task targets the gaps you showed at {profileSnippet}. "
                + "Spend the next focused session on the highest-impact skill listed.",
            FocusAreas: new List<string>
            {
                "Validate every input at the boundary before doing real work.",
                "Keep state changes inside a single transactional unit.",
            },
            CommonPitfalls: new List<string>
            {
                "Skipping idempotency keys on retried requests.",
                "Logging secrets to stdout under exception paths.",
            },
            PromptVersion: "task_framing_v1",
            TokensUsed: 320,
            RetryCount: 0));
    }

    public void Reset()
    {
        Calls.Clear();
        ThrowOnNext = null;
        CannedResponse = null;
    }

    public static ApiException MakeApiException(HttpStatusCode code = HttpStatusCode.ServiceUnavailable)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/task-framing");
        var response = new HttpResponseMessage(code) { RequestMessage = request };
        return ApiException.Create(request, HttpMethod.Post, response, new RefitSettings()).GetAwaiter().GetResult();
    }
}

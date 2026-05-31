using System.Net;
using CodeMentor.Infrastructure.CodeReview;
using Refit;

namespace CodeMentor.Api.IntegrationTests.TestHost;

/// <summary>
/// S17-T2: test replacement for <see cref="IAssessmentSummaryRefit"/>.
///
/// Returns a deterministic 3-paragraph summary so the
/// <c>GenerateAssessmentSummaryJob</c> can run end-to-end without a
/// live AI service / OpenAI key. Records every call so tests can
/// assert the job invoked the AI service correctly.
/// </summary>
public sealed class FakeAssessmentSummaryRefit : IAssessmentSummaryRefit
{
    public List<AssessmentSummaryRequestDto> Calls { get; } = new();

    /// <summary>Set to throw on the next call (then auto-clears). Use to
    /// simulate AI service down (Hangfire would retry in production —
    /// the inline scheduler swallows the exception in tests).</summary>
    public Exception? ThrowOnNext { get; set; }

    /// <summary>Override the response shape returned to the job. If null,
    /// a deterministic default response is returned.</summary>
    public AssessmentSummaryResponseDto? CannedResponse { get; set; }

    public Task<AssessmentSummaryResponseDto> SummarizeAsync(
        AssessmentSummaryRequestDto body,
        string correlationId,
        CancellationToken ct)
    {
        Calls.Add(body);

        if (ThrowOnNext is { } exc)
        {
            ThrowOnNext = null;
            throw exc;
        }

        var response = CannedResponse ?? new AssessmentSummaryResponseDto(
            StrengthsParagraph: (
                "The candidate's strongest area is OOP, where they answered correctly across multiple "
                + "difficulty tiers. This translates to building service-layer code that other engineers "
                + "can extend without surprise."),
            WeaknessesParagraph: (
                "The lowest scoring area was Databases, suggesting that schema design and indexing have "
                + "not yet had hands-on practice. In a Backend role this surfaces as queries that work in "
                + "development but slow under real-world data volumes."),
            PathGuidanceParagraph: (
                "Start with a focused project that exercises both query design and indexing on a small "
                + "synthetic dataset. Then move on to OOP refactoring on an existing codebase, applying "
                + "single responsibility and dependency injection. Consistent practice will compound quickly."),
            PromptVersion: "assessment_summary_v1",
            TokensUsed: 1234,
            RetryCount: 0);

        return Task.FromResult(response);
    }

    /// <summary>Helper for tests that want to simulate a 5xx HTTP response from the AI service.</summary>
    public static ApiException MakeApiException(HttpStatusCode code = HttpStatusCode.ServiceUnavailable)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/assessment-summary");
        var response = new HttpResponseMessage(code) { RequestMessage = request };
        return ApiException.Create(request, HttpMethod.Post, response, new RefitSettings()).GetAwaiter().GetResult();
    }
}

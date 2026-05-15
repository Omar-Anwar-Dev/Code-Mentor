using System.Net;
using CodeMentor.Infrastructure.CodeReview;
using Refit;

namespace CodeMentor.Api.IntegrationTests.TestHost;

/// <summary>
/// S18-T4 / F16: test replacement for <see cref="ITaskGeneratorRefit"/>.
/// Returns a deterministic batch of drafts so the AdminTaskDraftService
/// can run end-to-end without a live AI service / OpenAI key.
/// </summary>
public sealed class FakeTaskGeneratorRefit : ITaskGeneratorRefit
{
    public List<TGenerateRequest> Calls { get; } = new();
    public Exception? ThrowOnNext { get; set; }
    public TGenerateResponse? CannedResponse { get; set; }

    public Task<TGenerateResponse> GenerateAsync(
        TGenerateRequest body, string correlationId, CancellationToken ct)
    {
        Calls.Add(body);

        if (ThrowOnNext is { } exc)
        {
            ThrowOnNext = null;
            throw exc;
        }

        if (CannedResponse is not null)
            return Task.FromResult(CannedResponse);

        // Default: return `body.Count` clone-like drafts matching the request.
        var drafts = new List<TGeneratedDraft>(body.Count);
        for (int i = 0; i < body.Count; i++)
        {
            drafts.Add(new TGeneratedDraft(
                Title: $"Build a CRUD API #{i}",
                Description: new string('x', 250),
                AcceptanceCriteria: "- All endpoints return 2xx for valid input",
                Deliverables: "GitHub URL with README + 5 tests",
                Difficulty: body.Difficulty,
                Category: "Algorithms",
                Track: body.Track,
                ExpectedLanguage: "Python",
                EstimatedHours: body.Difficulty == 1 ? 2 : body.Difficulty == 2 ? 6 : body.Difficulty == 3 ? 10 : body.Difficulty == 4 ? 20 : 30,
                Prerequisites: new List<string>(),
                SkillTags: new List<TSkillTag> { new("correctness", 0.6), new("design", 0.4) },
                LearningGain: new Dictionary<string, double> { ["correctness"] = 0.4, ["design"] = 0.2 },
                Rationale: $"Realistic CRUD task for diff={body.Difficulty} {body.Track}."));
        }
        return Task.FromResult(new TGenerateResponse(
            Drafts: drafts,
            PromptVersion: "generate_tasks_v1",
            TokensUsed: 1500,
            RetryCount: 0,
            BatchId: Guid.NewGuid().ToString("N")[..12]));
    }

    public static ApiException MakeApiException(HttpStatusCode code = HttpStatusCode.ServiceUnavailable)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/generate-tasks");
        var response = new HttpResponseMessage(code) { RequestMessage = request };
        return ApiException.Create(request, HttpMethod.Post, response, new RefitSettings()).GetAwaiter().GetResult();
    }
}

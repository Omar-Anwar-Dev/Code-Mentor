using CodeMentor.Application.Assessments;
using CodeMentor.Infrastructure.Assessments;
using Microsoft.Extensions.DependencyInjection;

namespace CodeMentor.Api.IntegrationTests.TestHost;

/// <summary>
/// S17-T2: test replacement for <c>HangfireAssessmentSummaryScheduler</c>.
///
/// Records every enqueue AND runs <see cref="GenerateAssessmentSummaryJob.ExecuteAsync"/>
/// synchronously in a fresh DI scope so tests can assert that the
/// completion → summary pipeline lands end-to-end (mirrors
/// <see cref="InlineEmbedEntityScheduler"/>). The AI service call goes
/// through the test fake <see cref="FakeAssessmentSummaryRefit"/> — no
/// live OpenAI / network.
/// </summary>
public sealed class InlineAssessmentSummaryScheduler : IAssessmentSummaryScheduler
{
    private readonly IServiceScopeFactory _scopes;

    public InlineAssessmentSummaryScheduler(IServiceScopeFactory scopes) => _scopes = scopes;

    public List<(Guid UserId, Guid AssessmentId)> Enqueues { get; } = new();
    public List<Exception> SwallowedExceptions { get; } = new();

    public void EnqueueGeneration(Guid userId, Guid assessmentId)
    {
        Enqueues.Add((userId, assessmentId));
        try
        {
            using var scope = _scopes.CreateScope();
            var job = scope.ServiceProvider.GetRequiredService<GenerateAssessmentSummaryJob>();
            job.ExecuteAsync(userId, assessmentId, CancellationToken.None).GetAwaiter().GetResult();
        }
        catch (Exception ex)
        {
            // Production Hangfire is fire-and-forget — the parent
            // CompleteAsFinishedAsync request never sees the indexing
            // failure. Mirror that here so a swallowed AI-down doesn't
            // break the assessment-completion HTTP path test-side.
            SwallowedExceptions.Add(ex);
        }
    }
}

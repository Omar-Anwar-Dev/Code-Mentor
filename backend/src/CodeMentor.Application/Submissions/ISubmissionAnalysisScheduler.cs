namespace CodeMentor.Application.Submissions;

/// <summary>
/// Abstracts the Hangfire enqueue so tests can run the analysis job inline.
/// Prod impl enqueues <c>SubmissionAnalysisJob</c>; test impl invokes the
/// analyzer synchronously in a scoped DI container.
/// </summary>
public interface ISubmissionAnalysisScheduler
{
    void Schedule(Guid submissionId);

    /// <summary>
    /// S5-T5: delayed retry used by the graceful-degradation path (AI service
    /// was unavailable → schedule a re-run 15 min later). Inline test impls
    /// can execute immediately; prod uses <c>IBackgroundJobClient.Schedule</c>.
    /// </summary>
    void ScheduleAfter(Guid submissionId, TimeSpan delay);
}

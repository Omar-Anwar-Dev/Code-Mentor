namespace CodeMentor.Application.ProjectAudits;

/// <summary>
/// S9-T3: abstracts the Hangfire enqueue for <c>ProjectAuditJob</c> so tests can
/// run the audit job inline. Mirrors <see cref="Submissions.ISubmissionAnalysisScheduler"/>
/// — same separation pattern (ADR-016 / ADR-021 carried into F11).
/// </summary>
public interface IProjectAuditScheduler
{
    void Schedule(Guid auditId);

    /// <summary>
    /// Delayed retry used by the graceful-degradation path (AI service was
    /// unavailable → schedule a re-run 15 min later). Mirrors
    /// <c>ISubmissionAnalysisScheduler.ScheduleAfter</c>.
    /// </summary>
    void ScheduleAfter(Guid auditId, TimeSpan delay);
}

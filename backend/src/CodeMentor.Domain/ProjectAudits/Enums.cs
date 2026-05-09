namespace CodeMentor.Domain.ProjectAudits;

public enum AuditSourceType
{
    GitHub = 1,
    Upload = 2,
}

public enum ProjectAuditStatus
{
    Pending = 1,
    Processing = 2,
    Completed = 3,
    Failed = 4,
}

/// <summary>
/// Mirrors <see cref="Submissions.AiAnalysisStatus"/>. Tracks availability of the
/// AI audit portion independently of overall <see cref="ProjectAuditStatus"/>.
/// A Completed audit may have AI status <see cref="Unavailable"/> when the AI
/// service was down and only static analysis succeeded (graceful degradation per
/// architecture §4.4 and ADR-031).
/// </summary>
public enum ProjectAuditAiStatus
{
    NotAttempted = 1,
    Available = 2,
    Unavailable = 3,
    Pending = 4,
}

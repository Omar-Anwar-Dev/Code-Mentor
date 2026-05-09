using CodeMentor.Domain.ProjectAudits;

namespace CodeMentor.Application.ProjectAudits;

/// <summary>
/// S9-T4: loads a project-audit's code as a ZIP stream for the AI service.
/// Mirrors <see cref="Submissions.ISubmissionCodeLoader"/> but operates on
/// <see cref="ProjectAudit"/> instead of <see cref="Submissions.Submission"/>
/// — separate per ADR-031 (parallel pipeline, not branched).
/// </summary>
public interface IProjectAuditCodeLoader
{
    Task<AuditCodeLoadResult> LoadAsZipStreamAsync(ProjectAudit audit, CancellationToken ct = default);
}

public enum AuditCodeLoadErrorCode
{
    None = 0,
    BlobMissing,
    InvalidZip,
    GitHubFetchFailed,
    GitHubOversize,
    GitHubAccessDenied,
    Unknown,
}

public sealed record AuditCodeLoadResult(
    Stream? ZipStream,
    string FileName,
    bool Success,
    AuditCodeLoadErrorCode ErrorCode,
    string? ErrorMessage)
{
    public static AuditCodeLoadResult Ok(Stream zip, string fileName) =>
        new(zip, fileName, true, AuditCodeLoadErrorCode.None, null);

    public static AuditCodeLoadResult Fail(AuditCodeLoadErrorCode code, string message) =>
        new(null, string.Empty, false, code, message);
}

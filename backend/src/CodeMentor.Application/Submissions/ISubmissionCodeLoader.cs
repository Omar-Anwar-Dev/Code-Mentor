using CodeMentor.Domain.Submissions;

namespace CodeMentor.Application.Submissions;

/// <summary>
/// Loads a submission's code as a ZIP stream for the AI service. Abstracts
/// the SubmissionType discriminator: Upload → download from blob; GitHub →
/// fetch tarball + repackage. Sprint 5's analysis job talks only to this
/// interface and <see cref="CodeMentor.Application.CodeReview.IAiReviewClient"/>.
/// </summary>
public interface ISubmissionCodeLoader
{
    /// <summary>
    /// Returns a seekable ZIP stream for the submission. Caller owns disposal.
    /// Throws <see cref="SubmissionCodeLoadException"/> for transport / format
    /// failures (network, oversize, missing blob, etc.) with a typed error code
    /// so the job can set a meaningful <see cref="Submission.ErrorMessage"/>.
    /// </summary>
    Task<SubmissionCodeLoadResult> LoadAsZipStreamAsync(Submission submission, CancellationToken ct = default);
}

public enum SubmissionCodeLoadErrorCode
{
    None = 0,
    BlobMissing,
    InvalidZip,
    GitHubFetchFailed,
    GitHubOversize,
    GitHubAccessDenied,
    Unknown,
}

public sealed record SubmissionCodeLoadResult(
    Stream? ZipStream,
    string FileName,
    bool Success,
    SubmissionCodeLoadErrorCode ErrorCode,
    string? ErrorMessage)
{
    public static SubmissionCodeLoadResult Ok(Stream zip, string fileName) =>
        new(zip, fileName, true, SubmissionCodeLoadErrorCode.None, null);

    public static SubmissionCodeLoadResult Fail(SubmissionCodeLoadErrorCode code, string message) =>
        new(null, string.Empty, false, code, message);
}

public sealed class SubmissionCodeLoadException : Exception
{
    public SubmissionCodeLoadErrorCode ErrorCode { get; }

    public SubmissionCodeLoadException(SubmissionCodeLoadErrorCode code, string message)
        : base(message)
    {
        ErrorCode = code;
    }
}

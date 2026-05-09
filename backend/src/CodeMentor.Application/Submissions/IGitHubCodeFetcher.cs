namespace CodeMentor.Application.Submissions;

/// <summary>
/// Fetches GitHub repo source into a destination directory, rejecting oversize
/// repos and missing/private-without-token cases. Sprint 4 builds this as a
/// standalone tested utility; Sprint 5 wires it into SubmissionAnalysisJob.
/// </summary>
public interface IGitHubCodeFetcher
{
    Task<GitHubFetchResult> FetchAsync(
        string repositoryUrl,
        Guid userId,
        string destinationDirectory,
        CancellationToken ct = default);
}

public enum GitHubFetchErrorCode
{
    None = 0,
    InvalidUrl,
    RepoNotFound,
    AccessDenied,
    Oversize,
    NetworkError,
}

public record GitHubFetchResult(
    bool Success,
    long SizeBytes,
    GitHubFetchErrorCode ErrorCode,
    string? ErrorMessage)
{
    public static GitHubFetchResult Ok(long sizeBytes) =>
        new(true, sizeBytes, GitHubFetchErrorCode.None, null);

    public static GitHubFetchResult Fail(GitHubFetchErrorCode code, string message) =>
        new(false, 0, code, message);
}

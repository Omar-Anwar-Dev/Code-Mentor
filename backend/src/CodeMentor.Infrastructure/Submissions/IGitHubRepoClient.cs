namespace CodeMentor.Infrastructure.Submissions;

/// <summary>
/// Thin seam over Octokit so GitHubCodeFetcher is unit-testable without HTTP.
/// </summary>
public interface IGitHubRepoClient
{
    Task<GitHubRepoMetadata?> GetRepositoryAsync(
        string owner, string name, string? accessToken, CancellationToken ct);

    Task<Stream> DownloadTarballAsync(
        string owner, string name, string? accessToken, CancellationToken ct);
}

/// <summary>Repo metadata subset we care about. Size from GitHub API is in KB.</summary>
public record GitHubRepoMetadata(long SizeKilobytes, string DefaultBranch, bool IsPrivate);

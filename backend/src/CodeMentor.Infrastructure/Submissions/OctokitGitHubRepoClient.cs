using Octokit;

namespace CodeMentor.Infrastructure.Submissions;

/// <summary>Prod impl backed by Octokit. Not exercised in integration tests (mocked).</summary>
public class OctokitGitHubRepoClient : IGitHubRepoClient
{
    private const string UserAgent = "CodeMentor";

    public async Task<GitHubRepoMetadata?> GetRepositoryAsync(
        string owner, string name, string? accessToken, CancellationToken ct)
    {
        var client = new GitHubClient(new ProductHeaderValue(UserAgent));
        if (!string.IsNullOrWhiteSpace(accessToken))
            client.Credentials = new Credentials(accessToken);

        try
        {
            var repo = await client.Repository.Get(owner, name);
            return new GitHubRepoMetadata(repo.Size, repo.DefaultBranch ?? "main", repo.Private);
        }
        catch (NotFoundException) { return null; }
    }

    public async Task<Stream> DownloadTarballAsync(
        string owner, string name, string? accessToken, CancellationToken ct)
    {
        var client = new GitHubClient(new ProductHeaderValue(UserAgent));
        if (!string.IsNullOrWhiteSpace(accessToken))
            client.Credentials = new Credentials(accessToken);

        var bytes = await client.Repository.Content.GetArchive(owner, name, ArchiveFormat.Tarball);
        return new MemoryStream(bytes);
    }
}

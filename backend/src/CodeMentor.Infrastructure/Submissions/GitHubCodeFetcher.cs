using CodeMentor.Application.Submissions;
using CodeMentor.Infrastructure.Auth;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CodeMentor.Infrastructure.Submissions;

public class GitHubCodeFetcher : IGitHubCodeFetcher
{
    public const long MaxRepoSizeBytes = 50L * 1024 * 1024; // 50 MB
    private const string ProviderName = "GitHub";

    private readonly IGitHubRepoClient _repoClient;
    private readonly ApplicationDbContext _db;
    private readonly IOAuthTokenEncryptor _encryptor;

    public GitHubCodeFetcher(
        IGitHubRepoClient repoClient,
        ApplicationDbContext db,
        IOAuthTokenEncryptor encryptor)
    {
        _repoClient = repoClient;
        _db = db;
        _encryptor = encryptor;
    }

    public async Task<GitHubFetchResult> FetchAsync(
        string repositoryUrl,
        Guid userId,
        string destinationDirectory,
        CancellationToken ct = default)
    {
        if (!TryParseRepo(repositoryUrl, out var owner, out var name))
            return GitHubFetchResult.Fail(GitHubFetchErrorCode.InvalidUrl,
                "Repository URL must be https://github.com/{owner}/{repo}.");

        string? accessToken = null;
        var storedToken = await _db.OAuthTokens
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.UserId == userId && t.Provider == ProviderName, ct);
        if (storedToken is not null)
        {
            try { accessToken = _encryptor.Decrypt(storedToken.AccessTokenCipher); }
            catch { /* fall back to anonymous — public repos still reachable */ }
        }

        GitHubRepoMetadata? metadata;
        try
        {
            metadata = await _repoClient.GetRepositoryAsync(owner, name, accessToken, ct);
        }
        catch (Octokit.AuthorizationException ex)
        {
            return GitHubFetchResult.Fail(GitHubFetchErrorCode.AccessDenied, ex.Message);
        }
        catch (Octokit.ApiException ex)
        {
            return GitHubFetchResult.Fail(GitHubFetchErrorCode.NetworkError, ex.Message);
        }

        if (metadata is null)
            return GitHubFetchResult.Fail(GitHubFetchErrorCode.RepoNotFound,
                $"Repository {owner}/{name} not found or inaccessible.");

        if (metadata.IsPrivate && accessToken is null)
            return GitHubFetchResult.Fail(GitHubFetchErrorCode.AccessDenied,
                "Private repository requires a GitHub OAuth token — re-authenticate with GitHub.");

        var sizeBytes = metadata.SizeKilobytes * 1024L;
        if (sizeBytes > MaxRepoSizeBytes)
            return GitHubFetchResult.Fail(GitHubFetchErrorCode.Oversize,
                $"Repository size {sizeBytes / (1024 * 1024)} MB exceeds {MaxRepoSizeBytes / (1024 * 1024)} MB limit.");

        Directory.CreateDirectory(destinationDirectory);
        var tarballPath = Path.Combine(destinationDirectory, "repo.tar.gz");

        try
        {
            using var stream = await _repoClient.DownloadTarballAsync(owner, name, accessToken, ct);
            await using var fs = File.Create(tarballPath);
            await stream.CopyToAsync(fs, ct);
        }
        catch (Exception ex)
        {
            return GitHubFetchResult.Fail(GitHubFetchErrorCode.NetworkError,
                $"Failed to download repo archive: {ex.Message}");
        }

        var actualBytes = new FileInfo(tarballPath).Length;
        return GitHubFetchResult.Ok(actualBytes);
    }

    internal static bool TryParseRepo(string url, out string owner, out string name)
    {
        owner = name = string.Empty;
        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri)) return false;
        if (uri.Scheme != Uri.UriSchemeHttps) return false;
        if (!uri.Host.Equals("github.com", StringComparison.OrdinalIgnoreCase)) return false;

        var segments = uri.AbsolutePath.Trim('/').Split('/');
        if (segments.Length < 2) return false;
        if (string.IsNullOrWhiteSpace(segments[0]) || string.IsNullOrWhiteSpace(segments[1])) return false;

        owner = segments[0];
        name = segments[1].EndsWith(".git", StringComparison.OrdinalIgnoreCase)
            ? segments[1][..^4]
            : segments[1];
        return true;
    }
}

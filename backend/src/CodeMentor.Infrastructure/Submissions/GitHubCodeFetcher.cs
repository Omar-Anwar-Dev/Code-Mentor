using CodeMentor.Application.Submissions;
using CodeMentor.Infrastructure.Auth;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;

namespace CodeMentor.Infrastructure.Submissions;

public class GitHubCodeFetcher : IGitHubCodeFetcher
{
    // SBF-1 bumped 2026-05-14: 50 MB → 100 MB, matches ZipSubmissionValidator + ai-service `max_zip_size_bytes`.
    public const long MaxRepoSizeBytes = 100L * 1024 * 1024; // 100 MB
    private const string ProviderName = "GitHub";

    // B-038: retry schedule for transient codeload.github.com failures.
    // Observed 2026-05-12: a 23-second Windows WSAETIMEDOUT (3-SYN cadence
    // 3+6+12 s) on a single transient blip turned an otherwise valid
    // submission into Status=Failed. With this retry, the same blip costs
    // ~17 s of wall time before the second attempt usually succeeds.
    public const int MaxFetchAttempts = 3;
    private static readonly TimeSpan[] _retryDelays =
    [
        TimeSpan.FromSeconds(2),
        TimeSpan.FromSeconds(5),
        TimeSpan.FromSeconds(10),
    ];

    private readonly IGitHubRepoClient _repoClient;
    private readonly ApplicationDbContext _db;
    private readonly IOAuthTokenEncryptor _encryptor;
    private readonly ILogger<GitHubCodeFetcher> _logger;

    public GitHubCodeFetcher(
        IGitHubRepoClient repoClient,
        ApplicationDbContext db,
        IOAuthTokenEncryptor encryptor,
        ILogger<GitHubCodeFetcher>? logger = null)
    {
        _repoClient = repoClient;
        _db = db;
        _encryptor = encryptor;
        _logger = logger ?? NullLogger<GitHubCodeFetcher>.Instance;
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

        // B-038: retry the tarball download on transient network failures
        // (TCP-connect timeouts, mid-transfer resets, codeload-side 5xx /
        // 429). The metadata call above already succeeded, so the
        // owner/name pair is valid — we're only defending against
        // intermittent transport breakage on the second hop.
        Exception? lastException = null;
        for (var attempt = 1; attempt <= MaxFetchAttempts; attempt++)
        {
            try
            {
                using var stream = await _repoClient.DownloadTarballAsync(owner, name, accessToken, ct);
                await using var fs = File.Create(tarballPath);
                await stream.CopyToAsync(fs, ct);
                lastException = null;
                break;
            }
            catch (Exception ex) when (attempt < MaxFetchAttempts
                                       && !ct.IsCancellationRequested
                                       && IsTransientFetchFailure(ex))
            {
                lastException = ex;
                var baseDelay = _retryDelays[attempt - 1];
                var jitter = TimeSpan.FromMilliseconds(Random.Shared.Next(0, 500));
                var delay = baseDelay + jitter;
                _logger.LogWarning(ex,
                    "GitHub tarball download attempt {Attempt}/{MaxAttempts} failed for {Owner}/{Name}: {Message}. Retrying in {Delay}.",
                    attempt, MaxFetchAttempts, owner, name, ex.Message, delay);

                // Clean the partial file before the next attempt so the
                // re-download writes into a fresh tarball.
                TryDeleteFile(tarballPath);

                try
                {
                    await Task.Delay(delay, ct);
                }
                catch (TaskCanceledException)
                {
                    // Caller cancelled mid-wait — surface as a clean NetworkError.
                    return GitHubFetchResult.Fail(GitHubFetchErrorCode.NetworkError,
                        "Repo archive download cancelled.");
                }
            }
            catch (Exception ex)
            {
                lastException = ex;
                break;
            }
        }

        if (lastException is not null)
        {
            return GitHubFetchResult.Fail(GitHubFetchErrorCode.NetworkError,
                $"Failed to download repo archive after {MaxFetchAttempts} attempts: {lastException.Message}");
        }

        var actualBytes = new FileInfo(tarballPath).Length;
        return GitHubFetchResult.Ok(actualBytes);
    }

    /// <summary>
    /// B-038: identify exceptions worth retrying. TCP-connect timeouts,
    /// socket resets, IO faults mid-stream, and the rate-limit / 5xx codes
    /// Octokit surfaces all qualify. AuthorizationException + NotFound are
    /// terminal — already handled upstream by `_repoClient.GetRepositoryAsync`,
    /// but we still filter them here defensively.
    /// </summary>
    public static bool IsTransientFetchFailure(Exception ex)
    {
        return ex switch
        {
            HttpRequestException => true,
            System.Net.Sockets.SocketException => true,
            TaskCanceledException => true,
            IOException => true,
            Octokit.AuthorizationException => false,
            Octokit.NotFoundException => false,
            Octokit.ApiException apiEx => apiEx.HttpResponse?.StatusCode is null
                || (int)apiEx.HttpResponse.StatusCode >= 500
                || (int)apiEx.HttpResponse.StatusCode == 429,
            _ => false,
        };
    }

    private static void TryDeleteFile(string path)
    {
        try { if (File.Exists(path)) File.Delete(path); }
        catch { /* best-effort cleanup; the next File.Create overwrites anyway */ }
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

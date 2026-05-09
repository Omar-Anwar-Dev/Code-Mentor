using System.Text;
using CodeMentor.Application.Submissions;
using CodeMentor.Infrastructure.Auth;
using CodeMentor.Infrastructure.Identity;
using CodeMentor.Infrastructure.Persistence;
using CodeMentor.Infrastructure.Submissions;
using Microsoft.EntityFrameworkCore;

namespace CodeMentor.Application.Tests.Submissions;

/// <summary>
/// S4-T5 acceptance:
///  - Clone works for public repo without auth
///  - Private repo with stored token works
///  - Over-size rejected (>50MB)
///  - Invalid URL rejected
///  - Repo-not-found rejected
/// Tests use a hand-rolled <see cref="FakeGitHubRepoClient"/> so the real
/// Octokit client + network calls stay out of scope.
/// </summary>
public class GitHubCodeFetcherTests
{
    private static (ApplicationDbContext Db, FakeGitHubRepoClient Client, GitHubCodeFetcher Fetcher)
        Scaffold(IOAuthTokenEncryptor? encryptor = null)
    {
        var opts = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase($"ghfetcher_{Guid.NewGuid():N}")
            .Options;
        var db = new ApplicationDbContext(opts);
        var fake = new FakeGitHubRepoClient();
        var enc = encryptor ?? new RoundTripEncryptor();
        var fetcher = new GitHubCodeFetcher(fake, db, enc);
        return (db, fake, fetcher);
    }

    private static string TempDir()
    {
        var dir = Path.Combine(Path.GetTempPath(), $"gh-test-{Guid.NewGuid():N}");
        return dir;
    }

    [Theory]
    [InlineData("not-a-url")]
    [InlineData("http://github.com/a/b")]
    [InlineData("https://gitlab.com/a/b")]
    [InlineData("https://github.com/onlyowner")]
    public async Task Fetch_InvalidUrl_ReturnsInvalidUrl(string url)
    {
        var (db, _, fetcher) = Scaffold();
        using var _db = db;

        var res = await fetcher.FetchAsync(url, Guid.NewGuid(), TempDir());

        Assert.False(res.Success);
        Assert.Equal(GitHubFetchErrorCode.InvalidUrl, res.ErrorCode);
    }

    [Fact]
    public async Task Fetch_PublicRepo_NoAuth_Succeeds()
    {
        var (db, fake, fetcher) = Scaffold();
        using var _db = db;

        fake.Metadata["openai/openai-python"] = new GitHubRepoMetadata(1024, "main", false); // 1 MB
        fake.Tarballs["openai/openai-python"] = Encoding.UTF8.GetBytes("fake-tarball-contents");

        var dest = TempDir();
        try
        {
            var res = await fetcher.FetchAsync(
                "https://github.com/openai/openai-python",
                Guid.NewGuid(),
                dest);

            Assert.True(res.Success);
            Assert.True(File.Exists(Path.Combine(dest, "repo.tar.gz")));
            Assert.Null(fake.LastAccessToken);
        }
        finally { if (Directory.Exists(dest)) Directory.Delete(dest, true); }
    }

    [Fact]
    public async Task Fetch_Oversize_Rejected_Before_Download()
    {
        var (db, fake, fetcher) = Scaffold();
        using var _db = db;

        // 60 MB — exceeds 50 MB cap.
        fake.Metadata["bigowner/bigrepo"] = new GitHubRepoMetadata(60 * 1024, "main", false);

        var res = await fetcher.FetchAsync(
            "https://github.com/bigowner/bigrepo",
            Guid.NewGuid(),
            TempDir());

        Assert.False(res.Success);
        Assert.Equal(GitHubFetchErrorCode.Oversize, res.ErrorCode);
        Assert.Equal(0, fake.DownloadCount); // short-circuited — never hit tarball endpoint
    }

    [Fact]
    public async Task Fetch_RepoNotFound_ReturnsRepoNotFound()
    {
        var (db, _, fetcher) = Scaffold();
        using var _db = db;

        var res = await fetcher.FetchAsync(
            "https://github.com/ghost/nothing-here",
            Guid.NewGuid(),
            TempDir());

        Assert.False(res.Success);
        Assert.Equal(GitHubFetchErrorCode.RepoNotFound, res.ErrorCode);
    }

    [Fact]
    public async Task Fetch_PrivateRepo_WithStoredToken_Succeeds()
    {
        var encryptor = new RoundTripEncryptor();
        var (db, fake, fetcher) = Scaffold(encryptor);
        using var _db = db;

        var userId = Guid.NewGuid();
        // Create user first — FK requires it.
        var user = new ApplicationUser
        {
            Id = userId,
            Email = "gh-private@test.local",
            NormalizedEmail = "GH-PRIVATE@TEST.LOCAL",
            UserName = "gh-private@test.local",
            FullName = "GH Private",
        };
        db.Users.Add(user);

        db.OAuthTokens.Add(new OAuthToken
        {
            UserId = userId,
            Provider = "GitHub",
            AccessTokenCipher = encryptor.Encrypt("ghp_real_access_token_here"),
        });
        await db.SaveChangesAsync();

        fake.Metadata["secretowner/secretrepo"] = new GitHubRepoMetadata(512, "main", IsPrivate: true);
        fake.Tarballs["secretowner/secretrepo"] = new byte[] { 0x1, 0x2, 0x3 };

        var dest = TempDir();
        try
        {
            var res = await fetcher.FetchAsync(
                "https://github.com/secretowner/secretrepo",
                userId,
                dest);

            Assert.True(res.Success);
            Assert.Equal("ghp_real_access_token_here", fake.LastAccessToken);
        }
        finally { if (Directory.Exists(dest)) Directory.Delete(dest, true); }
    }

    [Fact]
    public async Task Fetch_PrivateRepo_WithoutToken_Returns_AccessDenied()
    {
        var (db, fake, fetcher) = Scaffold();
        using var _db = db;

        fake.Metadata["secretowner/secretrepo"] = new GitHubRepoMetadata(512, "main", IsPrivate: true);

        var res = await fetcher.FetchAsync(
            "https://github.com/secretowner/secretrepo",
            Guid.NewGuid(),
            TempDir());

        Assert.False(res.Success);
        Assert.Equal(GitHubFetchErrorCode.AccessDenied, res.ErrorCode);
    }

    [Fact]
    public async Task Fetch_GitSuffix_IsStripped_From_RepoName()
    {
        var (db, fake, fetcher) = Scaffold();
        using var _db = db;

        fake.Metadata["a/b"] = new GitHubRepoMetadata(1, "main", false);
        fake.Tarballs["a/b"] = new byte[] { 1 };

        var dest = TempDir();
        try
        {
            var res = await fetcher.FetchAsync("https://github.com/a/b.git", Guid.NewGuid(), dest);
            Assert.True(res.Success);
            Assert.Equal("a/b", fake.LastLookupKey);
        }
        finally { if (Directory.Exists(dest)) Directory.Delete(dest, true); }
    }
}

// ----- test doubles -----

internal class FakeGitHubRepoClient : IGitHubRepoClient
{
    public Dictionary<string, GitHubRepoMetadata> Metadata { get; } = new();
    public Dictionary<string, byte[]> Tarballs { get; } = new();
    public int DownloadCount { get; private set; }
    public string? LastAccessToken { get; private set; }
    public string? LastLookupKey { get; private set; }

    public Task<GitHubRepoMetadata?> GetRepositoryAsync(string owner, string name, string? accessToken, CancellationToken ct)
    {
        LastAccessToken = accessToken;
        LastLookupKey = $"{owner}/{name}";
        Metadata.TryGetValue(LastLookupKey, out var meta);
        return Task.FromResult(meta);
    }

    public Task<Stream> DownloadTarballAsync(string owner, string name, string? accessToken, CancellationToken ct)
    {
        DownloadCount++;
        Tarballs.TryGetValue($"{owner}/{name}", out var bytes);
        return Task.FromResult<Stream>(new MemoryStream(bytes ?? Array.Empty<byte>()));
    }
}

/// <summary>Fake encryptor: base64-round-trips instead of AES — deterministic for tests.</summary>
internal class RoundTripEncryptor : IOAuthTokenEncryptor
{
    public string Encrypt(string plaintext) => Convert.ToBase64String(Encoding.UTF8.GetBytes(plaintext));
    public string Decrypt(string cipher) => Encoding.UTF8.GetString(Convert.FromBase64String(cipher));
}

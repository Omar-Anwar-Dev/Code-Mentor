using System.Formats.Tar;
using System.IO.Compression;
using CodeMentor.Application.Storage;
using CodeMentor.Application.Submissions;
using CodeMentor.Domain.Submissions;
using Microsoft.Extensions.Logging;

namespace CodeMentor.Infrastructure.Submissions;

/// <summary>
/// Default <see cref="ISubmissionCodeLoader"/> wiring blob downloads and
/// GitHub tarball fetches, repackaging GitHub tarballs to ZIP so the
/// AI service's <c>/api/analyze-zip</c> endpoint can consume them.
/// </summary>
public sealed class SubmissionCodeLoader : ISubmissionCodeLoader
{
    private readonly IBlobStorage _blobs;
    private readonly IGitHubCodeFetcher _gitHubFetcher;
    private readonly ILogger<SubmissionCodeLoader> _logger;

    public SubmissionCodeLoader(
        IBlobStorage blobs,
        IGitHubCodeFetcher gitHubFetcher,
        ILogger<SubmissionCodeLoader> logger)
    {
        _blobs = blobs;
        _gitHubFetcher = gitHubFetcher;
        _logger = logger;
    }

    public async Task<SubmissionCodeLoadResult> LoadAsZipStreamAsync(Submission submission, CancellationToken ct = default)
    {
        return submission.SubmissionType switch
        {
            SubmissionType.Upload => await LoadFromBlobAsync(submission, ct),
            SubmissionType.GitHub => await LoadFromGitHubAsync(submission, ct),
            _ => SubmissionCodeLoadResult.Fail(
                    SubmissionCodeLoadErrorCode.Unknown,
                    $"Unsupported submission type: {submission.SubmissionType}"),
        };
    }

    private async Task<SubmissionCodeLoadResult> LoadFromBlobAsync(Submission submission, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(submission.BlobPath))
            return SubmissionCodeLoadResult.Fail(
                SubmissionCodeLoadErrorCode.BlobMissing,
                "Upload submission has no BlobPath.");

        if (!await _blobs.ExistsAsync(BlobContainers.Submissions, submission.BlobPath, ct))
            return SubmissionCodeLoadResult.Fail(
                SubmissionCodeLoadErrorCode.BlobMissing,
                $"Blob '{submission.BlobPath}' not found in {BlobContainers.Submissions}.");

        // Buffer into a seekable MemoryStream so the AI client (and downstream
        // retries) can rewind. Submissions are capped at 50 MB (S4-T11 /
        // ZipSubmissionValidator) so in-memory is fine.
        var ms = new MemoryStream();
        await using (var source = await _blobs.DownloadAsync(BlobContainers.Submissions, submission.BlobPath, ct))
        {
            await source.CopyToAsync(ms, ct);
        }
        ms.Position = 0;

        var fileName = Path.GetFileName(submission.BlobPath);
        if (string.IsNullOrEmpty(fileName)) fileName = "submission.zip";
        return SubmissionCodeLoadResult.Ok(ms, fileName);
    }

    private async Task<SubmissionCodeLoadResult> LoadFromGitHubAsync(Submission submission, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(submission.RepositoryUrl))
            return SubmissionCodeLoadResult.Fail(
                SubmissionCodeLoadErrorCode.GitHubFetchFailed,
                "GitHub submission has no RepositoryUrl.");

        var workDir = Path.Combine(Path.GetTempPath(), $"cm-submission-{submission.Id:N}");
        Directory.CreateDirectory(workDir);

        try
        {
            var fetchResult = await _gitHubFetcher.FetchAsync(
                submission.RepositoryUrl, submission.UserId, workDir, ct);

            if (!fetchResult.Success)
            {
                var mapped = fetchResult.ErrorCode switch
                {
                    GitHubFetchErrorCode.Oversize => SubmissionCodeLoadErrorCode.GitHubOversize,
                    GitHubFetchErrorCode.AccessDenied => SubmissionCodeLoadErrorCode.GitHubAccessDenied,
                    _ => SubmissionCodeLoadErrorCode.GitHubFetchFailed,
                };
                return SubmissionCodeLoadResult.Fail(mapped, fetchResult.ErrorMessage ?? "GitHub fetch failed");
            }

            var tarballPath = Path.Combine(workDir, "repo.tar.gz");
            var extractDir = Path.Combine(workDir, "src");
            Directory.CreateDirectory(extractDir);

            await ExtractTarGzAsync(tarballPath, extractDir, ct);

            var ms = new MemoryStream();
            ZipDirectoryContents(extractDir, ms);
            ms.Position = 0;

            return SubmissionCodeLoadResult.Ok(ms, "repo.zip");
        }
        finally
        {
            // Fire-and-forget cleanup; the caller owns the returned Stream (MemoryStream)
            // so the temp dir is safe to delete immediately.
            TryDeleteDirectory(workDir);
        }
    }

    private static async Task ExtractTarGzAsync(string tarGzPath, string destination, CancellationToken ct)
    {
        await using var file = File.OpenRead(tarGzPath);
        await using var gz = new GZipStream(file, CompressionMode.Decompress);
        await TarFile.ExtractToDirectoryAsync(gz, destination, overwriteFiles: true, ct);
    }

    private static void ZipDirectoryContents(string directory, Stream outputStream)
    {
        using var archive = new ZipArchive(outputStream, ZipArchiveMode.Create, leaveOpen: true);
        var root = Path.GetFullPath(directory);

        foreach (var filePath in Directory.EnumerateFiles(directory, "*", SearchOption.AllDirectories))
        {
            var relative = Path.GetRelativePath(root, filePath).Replace('\\', '/');
            var entry = archive.CreateEntry(relative, CompressionLevel.Fastest);
            using var entryStream = entry.Open();
            using var source = File.OpenRead(filePath);
            source.CopyTo(entryStream);
        }
    }

    private void TryDeleteDirectory(string path)
    {
        try { if (Directory.Exists(path)) Directory.Delete(path, recursive: true); }
        catch (Exception ex) { _logger.LogDebug(ex, "Failed to clean up {Path}", path); }
    }
}

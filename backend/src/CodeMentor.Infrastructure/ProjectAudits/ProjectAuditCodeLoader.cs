using System.Formats.Tar;
using System.IO.Compression;
using CodeMentor.Application.ProjectAudits;
using CodeMentor.Application.Storage;
using CodeMentor.Application.Submissions;
using CodeMentor.Domain.ProjectAudits;
using Microsoft.Extensions.Logging;

namespace CodeMentor.Infrastructure.ProjectAudits;

/// <summary>
/// S9-T4: loads a project-audit's code as a ZIP stream for the AI service.
/// Mirrors <see cref="Submissions.SubmissionCodeLoader"/> but operates against
/// <see cref="BlobContainers.Audits"/> and <see cref="ProjectAudit"/>. Reuses
/// the existing <see cref="IBlobStorage"/> and <see cref="IGitHubCodeFetcher"/>
/// infrastructure per ADR-031.
///
/// Some duplication with SubmissionCodeLoader is intentional — keeps the audit
/// pipeline isolated from the submission pipeline. A post-MVP refactor could
/// consolidate via a generic IZipSourceLoader if both pipelines stabilize.
/// </summary>
public sealed class ProjectAuditCodeLoader : IProjectAuditCodeLoader
{
    private readonly IBlobStorage _blobs;
    private readonly IGitHubCodeFetcher _gitHubFetcher;
    private readonly ILogger<ProjectAuditCodeLoader> _logger;

    public ProjectAuditCodeLoader(
        IBlobStorage blobs,
        IGitHubCodeFetcher gitHubFetcher,
        ILogger<ProjectAuditCodeLoader> logger)
    {
        _blobs = blobs;
        _gitHubFetcher = gitHubFetcher;
        _logger = logger;
    }

    public async Task<AuditCodeLoadResult> LoadAsZipStreamAsync(ProjectAudit audit, CancellationToken ct = default)
    {
        return audit.SourceType switch
        {
            AuditSourceType.Upload => await LoadFromBlobAsync(audit, ct),
            AuditSourceType.GitHub => await LoadFromGitHubAsync(audit, ct),
            _ => AuditCodeLoadResult.Fail(
                    AuditCodeLoadErrorCode.Unknown,
                    $"Unsupported audit source type: {audit.SourceType}"),
        };
    }

    private async Task<AuditCodeLoadResult> LoadFromBlobAsync(ProjectAudit audit, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(audit.BlobPath))
            return AuditCodeLoadResult.Fail(
                AuditCodeLoadErrorCode.BlobMissing,
                "Upload audit has no BlobPath.");

        if (!await _blobs.ExistsAsync(BlobContainers.Audits, audit.BlobPath, ct))
            return AuditCodeLoadResult.Fail(
                AuditCodeLoadErrorCode.BlobMissing,
                $"Blob '{audit.BlobPath}' not found in {BlobContainers.Audits}. " +
                "(Note: 90-day cleanup per ADR-033 may have removed it.)");

        // Buffer into a seekable MemoryStream so the AI client can rewind.
        // 50MB cap shared with submissions — see S4-T11 / IZipSubmissionValidator.
        var ms = new MemoryStream();
        await using (var source = await _blobs.DownloadAsync(BlobContainers.Audits, audit.BlobPath, ct))
        {
            await source.CopyToAsync(ms, ct);
        }
        ms.Position = 0;

        var fileName = Path.GetFileName(audit.BlobPath);
        if (string.IsNullOrEmpty(fileName)) fileName = "audit.zip";
        return AuditCodeLoadResult.Ok(ms, fileName);
    }

    private async Task<AuditCodeLoadResult> LoadFromGitHubAsync(ProjectAudit audit, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(audit.RepositoryUrl))
            return AuditCodeLoadResult.Fail(
                AuditCodeLoadErrorCode.GitHubFetchFailed,
                "GitHub audit has no RepositoryUrl.");

        var workDir = Path.Combine(Path.GetTempPath(), $"cm-audit-{audit.Id:N}");
        Directory.CreateDirectory(workDir);

        try
        {
            var fetchResult = await _gitHubFetcher.FetchAsync(
                audit.RepositoryUrl, audit.UserId, workDir, ct);

            if (!fetchResult.Success)
            {
                var mapped = fetchResult.ErrorCode switch
                {
                    GitHubFetchErrorCode.Oversize => AuditCodeLoadErrorCode.GitHubOversize,
                    GitHubFetchErrorCode.AccessDenied => AuditCodeLoadErrorCode.GitHubAccessDenied,
                    _ => AuditCodeLoadErrorCode.GitHubFetchFailed,
                };
                return AuditCodeLoadResult.Fail(mapped, fetchResult.ErrorMessage ?? "GitHub fetch failed");
            }

            var tarballPath = Path.Combine(workDir, "repo.tar.gz");
            var extractDir = Path.Combine(workDir, "src");
            Directory.CreateDirectory(extractDir);

            await ExtractTarGzAsync(tarballPath, extractDir, ct);

            var ms = new MemoryStream();
            ZipDirectoryContents(extractDir, ms);
            ms.Position = 0;

            return AuditCodeLoadResult.Ok(ms, "repo.zip");
        }
        finally
        {
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

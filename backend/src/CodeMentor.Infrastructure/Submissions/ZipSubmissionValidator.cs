using System.IO.Compression;
using CodeMentor.Application.Submissions;

namespace CodeMentor.Infrastructure.Submissions;

public class ZipSubmissionValidator : IZipSubmissionValidator
{
    // SBF-1 bumped 2026-05-14: structural caps raised to match the
    // ai-service defaults (`max_zip_size_bytes`, `max_zip_entries`). Keeps
    // the upload-time gate aligned with the analysis-time gate so a ZIP
    // that the backend accepts won't get rejected downstream by the AI
    // service for a structural reason. Owner picked 1000 (2× original) —
    // comfortable for realistic graduation-project repos (~200-800 files
    // post-filter), still tight on attack payloads.
    public const long MaxSizeBytes = 100L * 1024 * 1024;  // 100 MB
    public const int MaxEntries = 1000;

    // ZIP local-file-header signature PK\x03\x04.
    private static readonly byte[] ZipSignature = { 0x50, 0x4B, 0x03, 0x04 };

    public async Task<ZipValidationResult> ValidateAsync(
        Stream zipStream,
        long sizeBytes,
        CancellationToken ct = default)
    {
        if (sizeBytes > MaxSizeBytes)
            return ZipValidationResult.Fail(
                ZipValidationErrorCode.Oversize,
                $"Submission size {sizeBytes / (1024 * 1024)} MB exceeds {MaxSizeBytes / (1024 * 1024)} MB limit.");

        if (!zipStream.CanSeek)
            throw new ArgumentException("Stream must be seekable.", nameof(zipStream));

        var signature = new byte[4];
        zipStream.Position = 0;
        var read = await zipStream.ReadAsync(signature.AsMemory(0, 4), ct);
        if (read < 4 || !signature.AsSpan().SequenceEqual(ZipSignature))
        {
            return ZipValidationResult.Fail(
                ZipValidationErrorCode.NotAZipFile,
                "Upload is not a valid ZIP archive (missing PK signature).");
        }

        zipStream.Position = 0;
        int entryCount = 0;
        try
        {
            using var archive = new ZipArchive(zipStream, ZipArchiveMode.Read, leaveOpen: true);
            foreach (var entry in archive.Entries)
            {
                entryCount++;
                if (entryCount > MaxEntries)
                    return ZipValidationResult.Fail(
                        ZipValidationErrorCode.TooManyEntries,
                        $"Archive has more than {MaxEntries} entries.");

                var name = entry.FullName;
                if (string.IsNullOrEmpty(name)) continue;

                if (Path.IsPathRooted(name) || name.StartsWith('/') || name.StartsWith('\\') ||
                    (name.Length >= 2 && name[1] == ':'))
                {
                    return ZipValidationResult.Fail(
                        ZipValidationErrorCode.AbsolutePath,
                        $"Archive contains absolute path entry '{name}'.",
                        entryCount);
                }

                // Normalize + detect '..' traversal. Split on both separators.
                foreach (var segment in name.Split('/', '\\'))
                {
                    if (segment == "..")
                    {
                        return ZipValidationResult.Fail(
                            ZipValidationErrorCode.PathTraversal,
                            $"Archive contains path-traversal entry '{name}'.",
                            entryCount);
                    }
                }
            }
        }
        catch (InvalidDataException ex)
        {
            return ZipValidationResult.Fail(
                ZipValidationErrorCode.ReadError,
                $"Corrupt ZIP: {ex.Message}",
                entryCount);
        }

        return ZipValidationResult.Ok(entryCount);
    }
}

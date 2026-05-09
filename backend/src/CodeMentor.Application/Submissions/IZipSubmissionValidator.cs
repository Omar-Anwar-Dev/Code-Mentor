namespace CodeMentor.Application.Submissions;

/// <summary>
/// Validates an uploaded ZIP submission before it reaches the analysis job:
/// size cap, ZIP signature, no path-traversal entries. Sprint 4 ships this
/// as a standalone unit-tested service; Sprint 5 wires it into the analysis
/// job when real file extraction happens.
/// </summary>
public interface IZipSubmissionValidator
{
    Task<ZipValidationResult> ValidateAsync(Stream zipStream, long sizeBytes, CancellationToken ct = default);
}

public enum ZipValidationErrorCode
{
    None = 0,
    Oversize,
    NotAZipFile,
    PathTraversal,
    AbsolutePath,
    TooManyEntries,
    ReadError,
}

public record ZipValidationResult(
    bool Success,
    ZipValidationErrorCode ErrorCode,
    string? ErrorMessage,
    int EntryCount)
{
    public static ZipValidationResult Ok(int entryCount) =>
        new(true, ZipValidationErrorCode.None, null, entryCount);

    public static ZipValidationResult Fail(ZipValidationErrorCode code, string message, int entryCount = 0) =>
        new(false, code, message, entryCount);
}

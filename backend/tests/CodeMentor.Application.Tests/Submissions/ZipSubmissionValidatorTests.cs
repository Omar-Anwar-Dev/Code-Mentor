using System.IO.Compression;
using System.Text;
using CodeMentor.Application.Submissions;
using CodeMentor.Infrastructure.Submissions;

namespace CodeMentor.Application.Tests.Submissions;

/// <summary>
/// S4-T11 acceptance:
///   - ZIP with '../../etc/passwd' entry → rejected with PathTraversal code
///   - File >50 MB → rejected with Oversize code
///   - Non-ZIP file → NotAZipFile
///   - Clean ZIP → succeeds + entry count correct
/// Plus: absolute paths, too many entries, corrupt data.
/// </summary>
public class ZipSubmissionValidatorTests
{
    private static readonly IZipSubmissionValidator Validator = new ZipSubmissionValidator();

    private static MemoryStream BuildZip(params (string Name, string Content)[] entries)
    {
        var ms = new MemoryStream();
        using (var archive = new ZipArchive(ms, ZipArchiveMode.Create, leaveOpen: true))
        {
            foreach (var (name, content) in entries)
            {
                var entry = archive.CreateEntry(name);
                using var s = entry.Open();
                var bytes = Encoding.UTF8.GetBytes(content);
                s.Write(bytes, 0, bytes.Length);
            }
        }
        ms.Position = 0;
        return ms;
    }

    [Fact]
    public async Task CleanZip_PassesWithExpectedEntryCount()
    {
        using var zip = BuildZip(
            ("src/Program.cs", "class P {}"),
            ("src/README.md", "hello"),
            ("tests/TestFile.cs", "test"));

        var result = await Validator.ValidateAsync(zip, zip.Length);

        Assert.True(result.Success);
        Assert.Equal(ZipValidationErrorCode.None, result.ErrorCode);
        Assert.Equal(3, result.EntryCount);
    }

    [Fact]
    public async Task PathTraversalEntry_Rejected_WithPathTraversalCode()
    {
        using var zip = BuildZip(
            ("src/OK.cs", "ok"),
            ("../../etc/passwd", "bad"));

        var result = await Validator.ValidateAsync(zip, zip.Length);

        Assert.False(result.Success);
        Assert.Equal(ZipValidationErrorCode.PathTraversal, result.ErrorCode);
        Assert.Contains("path-traversal", result.ErrorMessage!, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task DoubleDotSegment_MidPath_Rejected()
    {
        using var zip = BuildZip(("a/b/../c/file.txt", "sneaky"));

        var result = await Validator.ValidateAsync(zip, zip.Length);

        Assert.False(result.Success);
        Assert.Equal(ZipValidationErrorCode.PathTraversal, result.ErrorCode);
    }

    [Fact]
    public async Task BackslashTraversal_Rejected()
    {
        // Malicious Windows-style traversal — must be caught regardless of separator.
        using var zip = BuildZip(("..\\..\\etc\\passwd", "x"));

        var result = await Validator.ValidateAsync(zip, zip.Length);

        Assert.False(result.Success);
        Assert.Equal(ZipValidationErrorCode.PathTraversal, result.ErrorCode);
    }

    [Theory]
    [InlineData("/etc/passwd")]
    [InlineData("\\windows\\system32\\config")]
    [InlineData("C:\\bad\\file.txt")]
    public async Task AbsolutePath_Rejected(string entryName)
    {
        using var zip = BuildZip((entryName, "x"));

        var result = await Validator.ValidateAsync(zip, zip.Length);

        Assert.False(result.Success);
        Assert.Equal(ZipValidationErrorCode.AbsolutePath, result.ErrorCode);
    }

    [Fact]
    public async Task Oversize_RejectedBeforeZipParsing()
    {
        using var zip = BuildZip(("a.txt", "x"));  // small file
        var fakeSize = ZipSubmissionValidator.MaxSizeBytes + 1;

        var result = await Validator.ValidateAsync(zip, fakeSize);

        Assert.False(result.Success);
        Assert.Equal(ZipValidationErrorCode.Oversize, result.ErrorCode);
    }

    [Fact]
    public async Task NonZip_Rejected_WithNotAZipFile()
    {
        var bytes = Encoding.UTF8.GetBytes("this is definitely not a zip file");
        using var ms = new MemoryStream(bytes);

        var result = await Validator.ValidateAsync(ms, ms.Length);

        Assert.False(result.Success);
        Assert.Equal(ZipValidationErrorCode.NotAZipFile, result.ErrorCode);
    }

    [Fact]
    public async Task TooManyEntries_Rejected()
    {
        var entries = Enumerable.Range(0, ZipSubmissionValidator.MaxEntries + 5)
            .Select(i => ($"file{i}.txt", "x"))
            .ToArray();
        using var zip = BuildZip(entries);

        var result = await Validator.ValidateAsync(zip, zip.Length);

        Assert.False(result.Success);
        Assert.Equal(ZipValidationErrorCode.TooManyEntries, result.ErrorCode);
    }

    [Fact]
    public async Task CorruptZip_WithValidSignatureButBadData_ReturnsReadError()
    {
        // Valid ZIP signature + garbage after.
        var corrupt = new byte[] { 0x50, 0x4B, 0x03, 0x04, 0xFF, 0xFF, 0xFF, 0xFF, 0xDE, 0xAD, 0xBE, 0xEF };
        using var ms = new MemoryStream(corrupt);

        var result = await Validator.ValidateAsync(ms, corrupt.Length);

        Assert.False(result.Success);
        // Either ReadError (InvalidDataException thrown during enumeration) or NotAZipFile.
        Assert.Contains(result.ErrorCode, new[] { ZipValidationErrorCode.ReadError, ZipValidationErrorCode.NotAZipFile });
    }
}

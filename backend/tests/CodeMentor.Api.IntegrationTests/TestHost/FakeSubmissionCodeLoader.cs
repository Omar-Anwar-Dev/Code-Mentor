using CodeMentor.Application.Submissions;
using CodeMentor.Domain.Submissions;

namespace CodeMentor.Api.IntegrationTests.TestHost;

/// <summary>
/// Integration-test fake — returns a minimal-but-valid ZIP stream regardless of
/// submission type. Avoids needing a live GitHub / Azurite during tests.
/// Individual tests can replace this via <c>services.AddScoped&lt;ISubmissionCodeLoader&gt;</c>.
/// </summary>
public sealed class FakeSubmissionCodeLoader : ISubmissionCodeLoader
{
    private static readonly byte[] TinyZip = {
        // "PK\x03\x04" local file header signature + minimum valid empty ZIP.
        0x50, 0x4B, 0x05, 0x06, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    };

    public Task<SubmissionCodeLoadResult> LoadAsZipStreamAsync(Submission submission, CancellationToken ct = default)
    {
        var ms = new MemoryStream(TinyZip.ToArray()); // copy so MemoryStream is writable
        var name = submission.SubmissionType switch
        {
            SubmissionType.Upload => Path.GetFileName(submission.BlobPath ?? "submission.zip"),
            SubmissionType.GitHub => "repo.zip",
            _ => "submission.zip",
        };
        return Task.FromResult(SubmissionCodeLoadResult.Ok(ms, name));
    }
}

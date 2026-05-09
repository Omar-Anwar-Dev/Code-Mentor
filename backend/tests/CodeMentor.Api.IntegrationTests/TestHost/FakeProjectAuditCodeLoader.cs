using CodeMentor.Application.ProjectAudits;
using CodeMentor.Domain.ProjectAudits;

namespace CodeMentor.Api.IntegrationTests.TestHost;

/// <summary>
/// Integration-test fake — returns a tiny valid ZIP regardless of audit source.
/// Avoids needing live Azurite / GitHub during pipeline tests. Mirrors
/// <see cref="FakeSubmissionCodeLoader"/>.
/// </summary>
public sealed class FakeProjectAuditCodeLoader : IProjectAuditCodeLoader
{
    private static readonly byte[] TinyZip = {
        // "PK\x05\x06" end-of-central-directory signature + minimum valid empty ZIP.
        0x50, 0x4B, 0x05, 0x06, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    };

    public Task<AuditCodeLoadResult> LoadAsZipStreamAsync(ProjectAudit audit, CancellationToken ct = default)
    {
        var ms = new MemoryStream(TinyZip.ToArray());
        var name = audit.SourceType switch
        {
            AuditSourceType.Upload => Path.GetFileName(audit.BlobPath ?? "audit.zip"),
            AuditSourceType.GitHub => "repo.zip",
            _ => "audit.zip",
        };
        return Task.FromResult(AuditCodeLoadResult.Ok(ms, name));
    }
}

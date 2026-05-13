namespace CodeMentor.Application.Storage;

/// <summary>
/// Abstraction over blob storage for submission uploads + downloads.
/// Azurite in dev; Azure Blob Storage in prod. Pre-signed URLs let the
/// browser upload directly to storage without flowing bytes through the API.
/// </summary>
public interface IBlobStorage
{
    Task EnsureContainerAsync(string container, CancellationToken ct = default);

    Task UploadAsync(
        string container,
        string blobPath,
        Stream content,
        string? contentType = null,
        CancellationToken ct = default);

    Task<Stream> DownloadAsync(string container, string blobPath, CancellationToken ct = default);

    Task<bool> ExistsAsync(string container, string blobPath, CancellationToken ct = default);

    Task DeleteAsync(string container, string blobPath, CancellationToken ct = default);

    /// <summary>Generates a pre-signed URL that allows a PUT with a short validity window.</summary>
    Uri GenerateUploadSasUrl(string container, string blobPath, TimeSpan validity);

    /// <summary>Generates a pre-signed URL that allows a GET with a short validity window.</summary>
    Uri GenerateDownloadSasUrl(string container, string blobPath, TimeSpan validity);

    /// <summary>
    /// Sets browser-side CORS rules at the storage-account level so the FE
    /// can PUT directly to a SAS URL. Idempotent; safe to call on every dev
    /// boot. In prod, CORS is set once via the Azure Portal/CLI and this
    /// method becomes a no-op.
    /// </summary>
    Task EnsureCorsAsync(IEnumerable<string> allowedOrigins, CancellationToken ct = default);
}

public static class BlobContainers
{
    public const string Submissions = "submissions-uploads";

    /// <summary>S9 / F11: project-audit ZIP uploads. 90-day retention (ADR-033).</summary>
    public const string Audits = "audit-uploads";

    /// <summary>S14-T8 / ADR-046: per-user data-export ZIPs. 7-day retention (cleaned by post-MVP sweep).</summary>
    public const string UserExports = "user-exports";
}

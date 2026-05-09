using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Azure.Storage.Sas;
using CodeMentor.Application.Storage;
using Microsoft.Extensions.Options;

namespace CodeMentor.Infrastructure.Storage;

public class AzureBlobStorage : IBlobStorage
{
    private readonly BlobServiceClient _service;

    public AzureBlobStorage(IOptions<BlobStorageOptions> options)
    {
        _service = new BlobServiceClient(options.Value.ConnectionString);
    }

    public async Task EnsureContainerAsync(string container, CancellationToken ct = default)
    {
        var client = _service.GetBlobContainerClient(container);
        await client.CreateIfNotExistsAsync(cancellationToken: ct);
    }

    public async Task UploadAsync(
        string container,
        string blobPath,
        Stream content,
        string? contentType = null,
        CancellationToken ct = default)
    {
        await EnsureContainerAsync(container, ct);
        var blob = _service.GetBlobContainerClient(container).GetBlobClient(blobPath);
        var headers = contentType is null ? null : new BlobHttpHeaders { ContentType = contentType };
        await blob.UploadAsync(content, new BlobUploadOptions { HttpHeaders = headers }, ct);
    }

    public async Task<Stream> DownloadAsync(string container, string blobPath, CancellationToken ct = default)
    {
        var blob = _service.GetBlobContainerClient(container).GetBlobClient(blobPath);
        var response = await blob.DownloadStreamingAsync(cancellationToken: ct);
        return response.Value.Content;
    }

    public async Task<bool> ExistsAsync(string container, string blobPath, CancellationToken ct = default)
    {
        var blob = _service.GetBlobContainerClient(container).GetBlobClient(blobPath);
        return await blob.ExistsAsync(ct);
    }

    public async Task DeleteAsync(string container, string blobPath, CancellationToken ct = default)
    {
        var blob = _service.GetBlobContainerClient(container).GetBlobClient(blobPath);
        await blob.DeleteIfExistsAsync(cancellationToken: ct);
    }

    public Uri GenerateUploadSasUrl(string container, string blobPath, TimeSpan validity)
        => GenerateSas(container, blobPath, validity, BlobSasPermissions.Write | BlobSasPermissions.Create);

    public Uri GenerateDownloadSasUrl(string container, string blobPath, TimeSpan validity)
        => GenerateSas(container, blobPath, validity, BlobSasPermissions.Read);

    private Uri GenerateSas(string container, string blobPath, TimeSpan validity, BlobSasPermissions permissions)
    {
        var blob = _service.GetBlobContainerClient(container).GetBlobClient(blobPath);

        if (!blob.CanGenerateSasUri)
        {
            throw new InvalidOperationException(
                "Blob client cannot generate SAS URIs — connection string must include AccountKey.");
        }

        var sas = new BlobSasBuilder
        {
            BlobContainerName = container,
            BlobName = blobPath,
            Resource = "b",
            ExpiresOn = DateTimeOffset.UtcNow.Add(validity),
            Protocol = SasProtocol.HttpsAndHttp, // dev over http; prod connections always go https
        };
        sas.SetPermissions(permissions);

        return blob.GenerateSasUri(sas);
    }

    public async Task EnsureCorsAsync(IEnumerable<string> allowedOrigins, CancellationToken ct = default)
    {
        // Azurite ships with no CORS rules — without this, browser PUTs to
        // SAS URLs are blocked by the preflight 403. Setting these rules is
        // idempotent: the SDK overwrites the full ServiceProperties object,
        // so re-running on every boot is fine.
        var origins = string.Join(",", allowedOrigins);
        var properties = (await _service.GetPropertiesAsync(ct)).Value;
        properties.Cors.Clear();
        properties.Cors.Add(new BlobCorsRule
        {
            AllowedOrigins = origins,
            AllowedMethods = "GET,PUT,POST,HEAD,OPTIONS",
            AllowedHeaders = "*",
            ExposedHeaders = "*",
            MaxAgeInSeconds = 3600,
        });
        await _service.SetPropertiesAsync(properties, ct);
    }
}

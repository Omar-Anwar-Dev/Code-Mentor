using System.Security.Claims;
using System.Text.RegularExpressions;
using CodeMentor.Application.Storage;
using CodeMentor.Application.Submissions.Contracts;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CodeMentor.Api.Controllers;

[ApiController]
[Route("api/uploads")]
[Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
public class UploadsController : ControllerBase
{
    private static readonly Regex SafeFileNameChars = new(@"[^A-Za-z0-9._-]", RegexOptions.Compiled);
    private static readonly TimeSpan UploadSasValidity = TimeSpan.FromMinutes(10);

    private readonly IBlobStorage _blobStorage;

    public UploadsController(IBlobStorage blobStorage) => _blobStorage = blobStorage;

    /// <summary>
    /// S4-T3: issue a pre-signed URL the frontend can PUT a ZIP to directly.
    /// Upload URL valid for 10 min. The caller then submits the returned
    /// <c>blobPath</c> via <c>POST /api/submissions</c> OR (S9-T8 / F11)
    /// <c>POST /api/audits</c>, depending on <see cref="RequestUploadUrlRequest.Purpose"/>.
    ///
    /// Backwards compatible: when <c>purpose</c> is omitted or "submission", the
    /// URL targets <see cref="BlobContainers.Submissions"/>. When "audit", it
    /// targets <see cref="BlobContainers.Audits"/> (90-day retention per ADR-033).
    /// </summary>
    [HttpPost("request-url")]
    [ProducesResponseType(typeof(UploadUrlResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> RequestUrl(
        [FromBody] RequestUploadUrlRequest? request,
        CancellationToken ct)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();

        var container = ResolveContainer(request?.Purpose);
        if (container is null)
            return Problem(
                detail: "purpose must be 'submission' or 'audit'.",
                statusCode: StatusCodes.Status400BadRequest,
                title: "InvalidPurpose");

        await _blobStorage.EnsureContainerAsync(container, ct);

        var safeName = SanitizeFileName(request?.FileName);
        var blobPath = $"{userId:D}/{DateTime.UtcNow:yyyy-MM-dd}/{Guid.NewGuid():N}-{safeName}";

        var uri = _blobStorage.GenerateUploadSasUrl(
            container,
            blobPath,
            UploadSasValidity);

        var response = new UploadUrlResponse(
            UploadUrl: uri.ToString(),
            BlobPath: blobPath,
            Container: container,
            ExpiresAt: DateTimeOffset.UtcNow.Add(UploadSasValidity));

        return Ok(response);
    }

    private static string? ResolveContainer(string? purpose)
    {
        if (string.IsNullOrWhiteSpace(purpose) || purpose.Equals("submission", StringComparison.OrdinalIgnoreCase))
            return BlobContainers.Submissions;
        if (purpose.Equals("audit", StringComparison.OrdinalIgnoreCase))
            return BlobContainers.Audits;
        return null;
    }

    private static string SanitizeFileName(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return "upload.zip";
        var trimmed = Path.GetFileName(raw.Trim());
        if (string.IsNullOrWhiteSpace(trimmed)) return "upload.zip";
        var sanitized = SafeFileNameChars.Replace(trimmed, "_");
        if (sanitized.Length > 100) sanitized = sanitized[..100];
        return sanitized;
    }

    private bool TryGetUserId(out Guid userId)
    {
        userId = Guid.Empty;
        var sub = User.FindFirstValue(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)
            ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        return sub is not null && Guid.TryParse(sub, out userId);
    }
}

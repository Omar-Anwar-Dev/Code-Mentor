namespace CodeMentor.Application.Submissions.Contracts;

/// <summary>
/// S4-T3 / S9-T8: pre-signed URL request. <see cref="Purpose"/> selects the
/// blob container — "submission" (default, back-compat) targets
/// <c>BlobContainers.Submissions</c>; "audit" targets <c>BlobContainers.Audits</c>
/// for the F11 audit-upload flow (ADR-031, ADR-033).
/// </summary>
public record RequestUploadUrlRequest(string? FileName, string? Purpose = null);

public record UploadUrlResponse(
    string UploadUrl,
    string BlobPath,
    string Container,
    DateTimeOffset ExpiresAt);

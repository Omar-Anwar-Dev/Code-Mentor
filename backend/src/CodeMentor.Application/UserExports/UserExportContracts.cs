namespace CodeMentor.Application.UserExports;

/// <summary>
/// S14-T8 / ADR-046: response from <c>POST /api/user/export</c> — the export
/// runs async via Hangfire; the controller acknowledges receipt and the user
/// gets a notification + email when the ZIP is ready.
/// </summary>
public sealed record InitiateExportResponse(
    bool Accepted,
    string Message);

public interface IUserDataExportService
{
    /// <summary>
    /// Enqueues a background job that compiles the user's data export.
    /// Returns immediately after scheduling — completion is signaled via
    /// the data-export-ready notification + email.
    /// </summary>
    Task<InitiateExportResponse> InitiateAsync(Guid userId, CancellationToken ct = default);
}

public interface IUserDataExportScheduler
{
    /// <summary>Schedule the data-export job for <paramref name="userId"/>.</summary>
    void Schedule(Guid userId);
}

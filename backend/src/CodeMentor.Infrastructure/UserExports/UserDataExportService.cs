using CodeMentor.Application.UserExports;
using Microsoft.Extensions.Logging;

namespace CodeMentor.Infrastructure.UserExports;

/// <summary>
/// S14-T8 / ADR-046: thin facade that the controller calls. Delegates the
/// heavy collection to <see cref="UserDataExportJob"/> via the scheduler so
/// HTTP requests stay sub-100ms. The user gets a notification + email when
/// the job completes.
/// </summary>
public sealed class UserDataExportService : IUserDataExportService
{
    private readonly IUserDataExportScheduler _scheduler;
    private readonly ILogger<UserDataExportService> _log;

    public UserDataExportService(IUserDataExportScheduler scheduler, ILogger<UserDataExportService> log)
    {
        _scheduler = scheduler;
        _log = log;
    }

    public Task<InitiateExportResponse> InitiateAsync(Guid userId, CancellationToken ct = default)
    {
        _scheduler.Schedule(userId);
        _log.LogInformation("UserDataExport: scheduled for {UserId}", userId);
        return Task.FromResult(new InitiateExportResponse(
            Accepted: true,
            Message: "Your data export is being prepared. We'll email you the download link when it's ready (usually within a minute)."));
    }
}

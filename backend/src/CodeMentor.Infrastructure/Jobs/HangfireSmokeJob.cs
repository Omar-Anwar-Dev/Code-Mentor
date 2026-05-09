using Microsoft.Extensions.Logging;

namespace CodeMentor.Infrastructure.Jobs;

/// <summary>
/// Enqueued once on startup in Development to prove the Hangfire worker is alive
/// and the server → SQL storage round-trip works. Safe to run on every boot (no side effects).
/// </summary>
public sealed class HangfireSmokeJob
{
    private readonly ILogger<HangfireSmokeJob> _logger;

    public HangfireSmokeJob(ILogger<HangfireSmokeJob> logger) => _logger = logger;

    public void Ping() => _logger.LogInformation("Hangfire smoke job executed at {Now:o}", DateTime.UtcNow);
}

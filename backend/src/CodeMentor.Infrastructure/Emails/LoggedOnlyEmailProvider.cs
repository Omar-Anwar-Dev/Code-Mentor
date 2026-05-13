using CodeMentor.Application.Emails;
using Microsoft.Extensions.Logging;

namespace CodeMentor.Infrastructure.Emails;

/// <summary>
/// S14-T3 / ADR-046: dev / test / R18-fallback email provider. Logs the email
/// metadata + first 80 chars of the plain-text body and returns success
/// synchronously. The FULL body is preserved on the EmailDelivery row, so
/// admin tooling can read the exact payload that would have shipped — making
/// this provider equivalent to "wired end-to-end, SMTP deferred."
///
/// Used by default when <c>EmailDelivery:Provider</c> is unset or set to
/// <c>LoggedOnly</c>. Flip <c>EmailDelivery:Provider=SendGrid</c> + provide
/// <c>EmailDelivery:SendGridApiKey</c> to switch to real delivery.
/// </summary>
public sealed class LoggedOnlyEmailProvider : IEmailProvider
{
    private readonly ILogger<LoggedOnlyEmailProvider> _log;

    public LoggedOnlyEmailProvider(ILogger<LoggedOnlyEmailProvider> log)
    {
        _log = log;
    }

    public string Name => "LoggedOnly";

    public Task<EmailDispatchResult> SendAsync(EmailMessage message, CancellationToken ct = default)
    {
        _log.LogInformation(
            "Email LOGGED-ONLY (type={Type} to={ToRedacted}) Subject=\"{Subject}\" Body=\"{BodyPreview}\"",
            message.Type,
            RedactEmail(message.ToAddress),
            message.Subject,
            Truncate(message.BodyText, 80));

        // Synthetic message id makes admin log search consistent across providers
        // and lets EmailDelivery.ProviderMessageId stay non-null on success.
        var syntheticId = $"logged-only-{Guid.NewGuid():N}";
        return Task.FromResult(new EmailDispatchResult(true, syntheticId, null));
    }

    private static string RedactEmail(string email)
    {
        var at = email.IndexOf('@');
        if (at <= 0) return "***";
        return $"{email[..1]}***{email[at..]}";
    }

    private static string Truncate(string s, int max) =>
        s.Length <= max ? s : s[..max] + "…";
}

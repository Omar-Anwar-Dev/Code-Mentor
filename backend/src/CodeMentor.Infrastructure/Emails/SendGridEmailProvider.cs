using CodeMentor.Application.Emails;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using SendGrid;
using SendGrid.Helpers.Mail;

namespace CodeMentor.Infrastructure.Emails;

/// <summary>
/// S14-T3 / ADR-046: production email provider using SendGrid v3 API
/// (free tier: 100 emails/day). API key read from
/// <c>EmailDelivery:SendGridApiKey</c> (env: <c>EmailDelivery__SendGridApiKey</c>).
/// "From" address + display name read from <c>EmailDelivery:FromAddress</c>
/// and <c>EmailDelivery:FromName</c>; sensible defaults if either is unset.
///
/// Returns <c>(success=false, error)</c> on non-2xx responses or transport
/// exceptions so <c>EmailDeliveryService</c> can persist the failure and
/// <c>EmailRetryJob</c> can retry. R18 demo-day fallback: flip
/// <c>EmailDelivery:Provider=LoggedOnly</c> via env var — takes effect at the
/// next request (scoped DI lifetime).
/// </summary>
public sealed class SendGridEmailProvider : IEmailProvider
{
    private readonly ISendGridClient _client;
    private readonly EmailAddress _from;
    private readonly ILogger<SendGridEmailProvider> _log;

    public SendGridEmailProvider(
        IConfiguration config,
        ILogger<SendGridEmailProvider> log)
    {
        var apiKey = config["EmailDelivery:SendGridApiKey"]
            ?? throw new InvalidOperationException(
                "EmailDelivery:SendGridApiKey is not configured. Set the env var "
                + "EmailDelivery__SendGridApiKey or revert EmailDelivery:Provider to LoggedOnly.");
        _client = new SendGridClient(apiKey);
        var fromAddress = config["EmailDelivery:FromAddress"] ?? "noreply@code-mentor.local";
        var fromName = config["EmailDelivery:FromName"] ?? "Code Mentor";
        _from = new EmailAddress(fromAddress, fromName);
        _log = log;
    }

    public string Name => "SendGrid";

    public async Task<EmailDispatchResult> SendAsync(EmailMessage message, CancellationToken ct = default)
    {
        var msg = MailHelper.CreateSingleEmail(
            _from,
            new EmailAddress(message.ToAddress),
            message.Subject,
            message.BodyText,
            message.BodyHtml);

        try
        {
            var response = await _client.SendEmailAsync(msg, ct);
            var ok = (int)response.StatusCode >= 200 && (int)response.StatusCode < 300;
            if (!ok)
            {
                var body = await response.Body.ReadAsStringAsync(ct);
                _log.LogWarning(
                    "SendGrid send failed for type={Type}: status={Status} body={Body}",
                    message.Type, response.StatusCode, body);
                return new EmailDispatchResult(false, null, $"sendgrid_status_{(int)response.StatusCode}: {body}");
            }

            string? messageId = null;
            if (response.Headers?.TryGetValues("X-Message-Id", out var values) == true)
            {
                messageId = values.FirstOrDefault();
            }
            return new EmailDispatchResult(true, messageId, null);
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _log.LogWarning(ex, "SendGrid send threw for type={Type}", message.Type);
            return new EmailDispatchResult(false, null, $"sendgrid_exception: {ex.Message}");
        }
    }
}

namespace CodeMentor.Infrastructure.Emails;

/// <summary>
/// S14-T4 / ADR-046: shared brand wrapper for all email templates. Provides
/// the gradient header + footer block + a primary-button helper. Layout is
/// table-based with inline CSS (no &lt;div&gt; / flex / grid) so Outlook and
/// Gmail both render consistently. The signature 4-stop cyan→blue→violet→fuchsia
/// gradient appears in the header background and the primary button.
///
/// CSS fallbacks:
///   - background:#8b5cf6 — solid violet for clients that strip linear-gradient
///   - font-family chain — Inter (web) → Segoe UI / Helvetica Neue / Arial
///   - background:#f5f3ff (outer) + #ffffff (card) — light mode only; clients
///     with dark-mode preference will auto-invert but inline colors stay legible.
/// </summary>
internal static class BrandLayout
{
    public const string PlatformName = "Code Mentor";
    public const string FooterCredits =
        "Benha University graduation project — Prof. Mostafa El-Gendy + Eng. Fatma Ibrahim.";

    /// <summary>The signature 4-stop cyan→blue→violet→fuchsia gradient.</summary>
    public const string SignatureGradient =
        "linear-gradient(135deg,#06b6d4 0%,#3b82f6 33%,#8b5cf6 66%,#ec4899 100%)";

    /// <summary>Solid-color fallback for clients that strip CSS gradients (some older Outlook builds).</summary>
    public const string SignatureGradientFallback = "#8b5cf6";

    public static string WrapHtml(
        string subject,
        string headerTag,
        string contentHtml,
        string settingsUrl)
    {
        return $@"<!DOCTYPE html>
<html><head><meta charset=""utf-8""/><title>{Esc(subject)}</title></head>
<body style=""margin:0;padding:0;font-family:Inter,'Segoe UI','Helvetica Neue',Arial,sans-serif;background:#f5f3ff;color:#1f2937;"">
<table role=""presentation"" cellspacing=""0"" cellpadding=""0"" border=""0"" width=""100%"" style=""background:#f5f3ff;"">
<tr><td align=""center"" style=""padding:24px 16px;"">
<table role=""presentation"" cellspacing=""0"" cellpadding=""0"" border=""0"" width=""600"" style=""max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(139,92,246,0.12);"">
<tr><td style=""background:{SignatureGradientFallback};background-image:{SignatureGradient};padding:24px 28px;"">
<table role=""presentation"" cellspacing=""0"" cellpadding=""0"" border=""0"" width=""100%"">
<tr>
<td style=""color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.4px;"">{PlatformName}</td>
<td align=""right"" style=""color:rgba(255,255,255,0.85);font-size:11px;letter-spacing:1.2px;text-transform:uppercase;"">{Esc(headerTag)}</td>
</tr></table>
</td></tr>
<tr><td style=""padding:32px 28px;color:#1f2937;font-size:15px;line-height:1.55;"">{contentHtml}</td></tr>
<tr><td style=""padding:16px 28px 24px 28px;background:#faf5ff;color:#6b7280;font-size:12px;line-height:1.5;border-top:1px solid #f3e8ff;"">{Esc(FooterCredits)} Manage notification preferences in your <a href=""{Esc(settingsUrl)}"" style=""color:#7c3aed;text-decoration:none;"">settings</a>.</td></tr>
</table>
</td></tr></table>
</body></html>";
    }

    public static string WrapText(string headerTag, string contentText, string settingsUrl)
    {
        return $@"{PlatformName}
{headerTag}
========================

{contentText}

--
{FooterCredits}
Manage preferences: {settingsUrl}
";
    }

    /// <summary>Inline brand-gradient primary CTA. Safe in Outlook (table-based layout).</summary>
    public static string PrimaryButton(string href, string text) =>
        $@"<table role=""presentation"" cellspacing=""0"" cellpadding=""0"" border=""0"">
<tr><td style=""background:{SignatureGradientFallback};background-image:{SignatureGradient};border-radius:8px;"">
<a href=""{Esc(href)}"" style=""display:inline-block;padding:12px 24px;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;"">{Esc(text)}</a>
</td></tr></table>";

    public static string Esc(string s) => System.Net.WebUtility.HtmlEncode(s);
}

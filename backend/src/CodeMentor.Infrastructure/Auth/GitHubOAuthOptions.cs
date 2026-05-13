namespace CodeMentor.Infrastructure.Auth;

public class GitHubOAuthOptions
{
    public const string SectionName = "GitHubOAuth";

    public string ClientId { get; set; } = string.Empty;
    public string ClientSecret { get; set; } = string.Empty;
    public string RedirectUri { get; set; } = "http://localhost:5000/api/auth/github/callback";
    public string Scopes { get; set; } = "read:user user:email";

    // S14-T11 hotfix (2026-05-13 walkthrough, v2): LINK flow re-uses the SAME
    // callback URL as login because classic GitHub OAuth Apps only allow ONE
    // registered callback URL per app. AuthController.GitHubCallback inspects
    // the gh_link_* cookies set at POST /api/user/connected-accounts/github
    // time to dispatch link-vs-login. Keep the field for env-override
    // compatibility but default it to the login callback.
    public string LinkRedirectUri { get; set; } = "http://localhost:5000/api/auth/github/callback";

    // Where to send the user after successful callback. Frontend URL.
    public string FrontendSuccessUrl { get; set; } = "http://localhost:5173/auth/github/success";
    public string FrontendErrorUrl { get; set; } = "http://localhost:5173/login?error=github_oauth_failed";

    // S14-T7 hotfix: the Settings page is where the FE renders the link
    // success/error fragment for the LINK flow. Distinct from FrontendSuccessUrl
    // (which is the login-flow success surface that consumes #access=...&refresh=...).
    public string FrontendSettingsUrl { get; set; } = "http://localhost:5173/settings";

    // Base64-encoded 32-byte AES-256 key for encrypting stored tokens.
    public string TokenEncryptionKey { get; set; } = string.Empty;

    public bool IsConfigured => !string.IsNullOrWhiteSpace(ClientId)
                                && !string.IsNullOrWhiteSpace(ClientSecret)
                                && !string.IsNullOrWhiteSpace(TokenEncryptionKey);
}

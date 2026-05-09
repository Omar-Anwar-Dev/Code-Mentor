namespace CodeMentor.Infrastructure.Auth;

public class GitHubOAuthOptions
{
    public const string SectionName = "GitHubOAuth";

    public string ClientId { get; set; } = string.Empty;
    public string ClientSecret { get; set; } = string.Empty;
    public string RedirectUri { get; set; } = "http://localhost:5000/api/auth/github/callback";
    public string Scopes { get; set; } = "read:user user:email";

    // Where to send the user after successful callback. Frontend URL.
    public string FrontendSuccessUrl { get; set; } = "http://localhost:5173/auth/github/success";
    public string FrontendErrorUrl { get; set; } = "http://localhost:5173/login?error=github_oauth_failed";

    // Base64-encoded 32-byte AES-256 key for encrypting stored tokens.
    public string TokenEncryptionKey { get; set; } = string.Empty;

    public bool IsConfigured => !string.IsNullOrWhiteSpace(ClientId)
                                && !string.IsNullOrWhiteSpace(ClientSecret)
                                && !string.IsNullOrWhiteSpace(TokenEncryptionKey);
}

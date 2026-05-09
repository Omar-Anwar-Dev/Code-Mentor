namespace CodeMentor.Infrastructure.Identity;

public class OAuthToken
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public string Provider { get; set; } = "GitHub";
    public string AccessTokenCipher { get; set; } = string.Empty;
    public string? RefreshTokenCipher { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public string? Scopes { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ApplicationUser User { get; set; } = null!;
}

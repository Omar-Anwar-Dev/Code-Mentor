using Microsoft.AspNetCore.Identity;

namespace CodeMentor.Infrastructure.Identity;

public class ApplicationUser : IdentityUser<Guid>
{
    public string FullName { get; set; } = string.Empty;
    public string? GitHubUsername { get; set; }
    public string? ProfilePictureUrl { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // S14-T1 / ADR-046: soft-delete + 30-day cooling-off (Spotify model). Login
    // path bypasses any IsDeleted filter so re-login auto-cancels via the
    // UserAccountDeletionRequest hook (S14-T9). Admin listings + public CV slug
    // paths explicitly filter IsDeleted=false to hide the soft-deleted user.
    public bool IsDeleted { get; set; } = false;
    public DateTime? DeletedAt { get; set; }
    public DateTime? HardDeleteAt { get; set; }

    public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
}

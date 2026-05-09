namespace CodeMentor.Domain.LearningCV;

/// <summary>
/// S7: lightweight CV metadata row. The aggregated view (profile + skill axes
/// + verified projects + stats) is computed at request time by the CV service —
/// only metadata persists here so the public slug, privacy flag, and view
/// counter survive across requests.
///
/// Architecture §5.1 column set: CVId, UserId, PublicSlug, IsPublic,
/// LastGeneratedAt, ViewCount. CreatedAt added so the public CV can render a
/// meaningful "joined" date independent of the underlying user record.
/// </summary>
public class LearningCV
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }

    /// <summary>URL-safe slug, set on first <see cref="IsPublic"/>=true publish (S7-T3).</summary>
    public string? PublicSlug { get; set; }

    public bool IsPublic { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime LastGeneratedAt { get; set; } = DateTime.UtcNow;
    public int ViewCount { get; set; }
}

/// <summary>
/// S7-T4: per-IP view dedupe — one increment per IP per 24h window.
/// </summary>
public class LearningCVView
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid CVId { get; set; }
    public string IpAddressHash { get; set; } = string.Empty;
    public DateTime ViewedAt { get; set; } = DateTime.UtcNow;
}

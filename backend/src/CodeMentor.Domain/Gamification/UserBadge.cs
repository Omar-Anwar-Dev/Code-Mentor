namespace CodeMentor.Domain.Gamification;

/// <summary>
/// S8-T3: a learner's earned badge. Unique on <c>(UserId, BadgeId)</c> so the
/// awarding service is naturally idempotent — second insert violates the
/// unique index and is caught.
/// </summary>
public class UserBadge
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public Guid BadgeId { get; set; }
    public DateTime EarnedAt { get; set; } = DateTime.UtcNow;

    public Badge? Badge { get; set; }
}

namespace CodeMentor.Domain.Gamification;

/// <summary>
/// S8-T3: append-only ledger of XP awards. Total XP is computed from this
/// table (sum), keeping the source of truth in the transaction history rather
/// than a denormalized counter that could drift.
/// </summary>
public class XpTransaction
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }

    /// <summary>Positive integer; XP only goes up in MVP.</summary>
    public int Amount { get; set; }

    /// <summary>Stable reason key, e.g. "AssessmentCompleted", "SubmissionAccepted".</summary>
    public string Reason { get; set; } = string.Empty;

    /// <summary>The Assessment / Submission / etc. that triggered the award.</summary>
    public Guid? RelatedEntityId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>Stable string keys for <see cref="XpTransaction.Reason"/>.</summary>
public static class XpReasons
{
    public const string AssessmentCompleted = "AssessmentCompleted";
    public const string SubmissionAccepted = "SubmissionAccepted";
}

public static class XpAmounts
{
    public const int AssessmentCompleted = 100;
    public const int SubmissionAccepted = 50;
}

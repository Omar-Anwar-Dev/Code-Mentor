namespace CodeMentor.Application.Gamification;

public interface IXpService
{
    /// <summary>
    /// Append-only XP grant. <paramref name="amount"/> must be positive.
    /// Returns the user's running total after the write.
    /// </summary>
    Task<int> AwardAsync(
        Guid userId,
        int amount,
        string reason,
        Guid? relatedEntityId,
        CancellationToken ct = default);

    /// <summary>Sum of all XP transactions for the user.</summary>
    Task<int> GetTotalAsync(Guid userId, CancellationToken ct = default);
}

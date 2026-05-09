namespace CodeMentor.Application.Gamification;

public interface IBadgeService
{
    /// <summary>
    /// Awards the badge identified by <paramref name="badgeKey"/> to the user
    /// if they don't already have it. Idempotent — returns <c>true</c> only on
    /// the first call (which actually wrote the row), <c>false</c> if the user
    /// already had it. Unknown badge keys throw <see cref="InvalidOperationException"/>.
    /// </summary>
    Task<bool> AwardIfEligibleAsync(Guid userId, string badgeKey, CancellationToken ct = default);
}

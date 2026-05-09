namespace CodeMentor.Application.Gamification.Contracts;

public sealed record GamificationProfileDto(
    int TotalXp,
    int Level,
    int XpForCurrentLevel,
    int XpForNextLevel,
    IReadOnlyList<EarnedBadgeDto> EarnedBadges,
    IReadOnlyList<XpTransactionDto> RecentTransactions);

public sealed record EarnedBadgeDto(
    string Key,
    string Name,
    string Description,
    string IconUrl,
    string Category,
    DateTime EarnedAt);

public sealed record CatalogBadgeDto(
    string Key,
    string Name,
    string Description,
    string IconUrl,
    string Category,
    bool IsEarned,
    DateTime? EarnedAt);

public sealed record XpTransactionDto(
    int Amount,
    string Reason,
    Guid? RelatedEntityId,
    DateTime CreatedAt);

public sealed record BadgeCatalogDto(IReadOnlyList<CatalogBadgeDto> Badges);

using CodeMentor.Application.Gamification.Contracts;

namespace CodeMentor.Application.Gamification;

public interface IGamificationProfileService
{
    Task<GamificationProfileDto> GetMineAsync(Guid userId, CancellationToken ct = default);

    Task<BadgeCatalogDto> GetCatalogAsync(Guid userId, CancellationToken ct = default);
}

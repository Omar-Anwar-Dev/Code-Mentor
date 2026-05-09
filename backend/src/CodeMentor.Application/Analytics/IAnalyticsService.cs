using CodeMentor.Application.Analytics.Contracts;

namespace CodeMentor.Application.Analytics;

public interface IAnalyticsService
{
    Task<AnalyticsDto> GetMineAsync(Guid userId, CancellationToken ct = default);
}

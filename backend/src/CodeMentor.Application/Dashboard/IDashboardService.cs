using CodeMentor.Application.Dashboard.Contracts;

namespace CodeMentor.Application.Dashboard;

public interface IDashboardService
{
    Task<DashboardDto> GetMineAsync(Guid userId, CancellationToken ct = default);
}

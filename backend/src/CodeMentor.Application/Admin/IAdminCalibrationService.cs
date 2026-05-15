using CodeMentor.Application.Admin.Contracts;

namespace CodeMentor.Application.Admin;

/// <summary>
/// S17-T7 / F15 (ADR-049 / ADR-055): read-side queries for the admin
/// calibration dashboard. Read-only in v1 per S17 locked answer #3 —
/// "force recalibrate now" admin action is deferred to v1.1.
/// </summary>
public interface IAdminCalibrationService
{
    /// <summary>Returns the overview payload (heatmap + items table + last job run timestamp).
    /// Filters are applied to the items table only — the heatmap always reflects the full bank.</summary>
    Task<AdminCalibrationOverviewDto> GetOverviewAsync(
        string? categoryFilter, int? difficultyFilter, string? sourceFilter,
        CancellationToken ct = default);

    /// <summary>Returns the per-Question recalibration history (newest first).</summary>
    Task<IReadOnlyList<CalibrationLogEntryDto>> GetHistoryForQuestionAsync(
        Guid questionId, CancellationToken ct = default);
}

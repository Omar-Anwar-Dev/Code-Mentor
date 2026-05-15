namespace CodeMentor.Application.Admin.Contracts;

/// <summary>
/// S17-T7 / F15: payload for the admin calibration dashboard.
///
/// One round-trip returns the heatmap aggregate + the per-Question
/// calibration metadata table (paged by simple top-N for now). The FE
/// renders a 5-category × 3-difficulty heatmap from <see cref="Heatmap"/>
/// and a scrollable table from <see cref="Items"/>; clicking a row
/// fetches per-Question history via the drilldown endpoint.
/// </summary>
public sealed record AdminCalibrationOverviewDto(
    IReadOnlyList<CalibrationHeatmapCellDto> Heatmap,
    IReadOnlyList<CalibrationItemDto> Items,
    DateTime? LastJobRunAt,
    int TotalItems);

public sealed record CalibrationHeatmapCellDto(
    string Category,
    int Difficulty,
    int Count);

public sealed record CalibrationItemDto(
    Guid QuestionId,
    string QuestionText,
    string Category,
    int Difficulty,
    double IrtA,
    double IrtB,
    string CalibrationSource,
    int ResponseCount,
    DateTime? LastCalibratedAt);

public sealed record CalibrationLogEntryDto(
    Guid Id,
    DateTime CalibratedAt,
    int ResponseCountAtRun,
    double IrtAOld,
    double IrtBOld,
    double IrtANew,
    double IrtBNew,
    double LogLikelihood,
    bool WasRecalibrated,
    string? SkipReason,
    string TriggeredBy);

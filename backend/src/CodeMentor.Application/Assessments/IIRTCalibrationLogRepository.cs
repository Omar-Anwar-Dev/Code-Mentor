using CodeMentor.Domain.Assessments;

namespace CodeMentor.Application.Assessments;

/// <summary>
/// S17-T6 / F15 (ADR-049 / ADR-055): read-side repository for the
/// IRTCalibrationLog table. Writes go through the EF context directly
/// inside <c>RecalibrateIRTJob</c> (single transaction with the Question
/// row update). Reads are surfaced to the admin calibration dashboard.
/// </summary>
public interface IIRTCalibrationLogRepository
{
    /// <summary>Returns the calibration history for one question, newest first.</summary>
    Task<IReadOnlyList<IRTCalibrationLog>> GetForQuestionAsync(Guid questionId, CancellationToken ct = default);

    /// <summary>Returns the most recent N calibration entries across all questions, newest first.</summary>
    Task<IReadOnlyList<IRTCalibrationLog>> GetRecentAsync(int take, CancellationToken ct = default);
}

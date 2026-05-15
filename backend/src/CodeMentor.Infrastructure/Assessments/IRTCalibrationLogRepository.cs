using CodeMentor.Application.Assessments;
using CodeMentor.Domain.Assessments;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CodeMentor.Infrastructure.Assessments;

/// <summary>
/// S17-T6 / F15 (ADR-049 / ADR-055): EF-backed read implementation of
/// <see cref="IIRTCalibrationLogRepository"/>.
/// </summary>
public sealed class IRTCalibrationLogRepository : IIRTCalibrationLogRepository
{
    private readonly ApplicationDbContext _db;

    public IRTCalibrationLogRepository(ApplicationDbContext db) => _db = db;

    public async Task<IReadOnlyList<IRTCalibrationLog>> GetForQuestionAsync(Guid questionId, CancellationToken ct = default)
    {
        return await _db.IRTCalibrationLogs
            .AsNoTracking()
            .Where(l => l.QuestionId == questionId)
            .OrderByDescending(l => l.CalibratedAt)
            .ToListAsync(ct);
    }

    public async Task<IReadOnlyList<IRTCalibrationLog>> GetRecentAsync(int take, CancellationToken ct = default)
    {
        if (take <= 0) take = 50;
        return await _db.IRTCalibrationLogs
            .AsNoTracking()
            .OrderByDescending(l => l.CalibratedAt)
            .Take(take)
            .ToListAsync(ct);
    }
}

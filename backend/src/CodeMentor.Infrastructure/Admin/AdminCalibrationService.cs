using CodeMentor.Application.Admin;
using CodeMentor.Application.Admin.Contracts;
using CodeMentor.Application.Assessments;
using CodeMentor.Domain.Assessments;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CodeMentor.Infrastructure.Admin;

/// <summary>
/// S17-T7 / F15 (ADR-049 / ADR-055): EF-backed read implementation.
///
/// Uses three queries:
///   1. Heatmap — group all active Questions by (Category, Difficulty) and count.
///   2. Items table — Question rows joined with response count + last calibration
///      timestamp (filters applied here).
///   3. LastJobRunAt — max CalibratedAt across all log rows (cheap; one row read).
/// </summary>
public sealed class AdminCalibrationService : IAdminCalibrationService
{
    private const int MaxItems = 200;

    private readonly ApplicationDbContext _db;
    private readonly IIRTCalibrationLogRepository _logs;

    public AdminCalibrationService(ApplicationDbContext db, IIRTCalibrationLogRepository logs)
    {
        _db = db;
        _logs = logs;
    }

    public async Task<AdminCalibrationOverviewDto> GetOverviewAsync(
        string? categoryFilter, int? difficultyFilter, string? sourceFilter, CancellationToken ct = default)
    {
        // Heatmap (always full bank, ignoring filters per the spec).
        var heatmap = await _db.Questions
            .Where(q => q.IsActive)
            .GroupBy(q => new { q.Category, q.Difficulty })
            .Select(g => new CalibrationHeatmapCellDto(
                g.Key.Category.ToString(),
                g.Key.Difficulty,
                g.Count()))
            .ToListAsync(ct);

        // Items query — filters applied.
        IQueryable<Question> itemsQ = _db.Questions.AsNoTracking().Where(q => q.IsActive);
        if (!string.IsNullOrWhiteSpace(categoryFilter)
            && Enum.TryParse<SkillCategory>(categoryFilter, ignoreCase: true, out var cat))
        {
            itemsQ = itemsQ.Where(q => q.Category == cat);
        }
        if (difficultyFilter is int d and >= 1 and <= 3)
        {
            itemsQ = itemsQ.Where(q => q.Difficulty == d);
        }
        if (!string.IsNullOrWhiteSpace(sourceFilter)
            && Enum.TryParse<CalibrationSource>(sourceFilter, ignoreCase: true, out var src))
        {
            itemsQ = itemsQ.Where(q => q.CalibrationSource == src);
        }

        var rawItems = await itemsQ
            .Select(q => new
            {
                q.Id,
                q.Content,
                q.Category,
                q.Difficulty,
                q.IRT_A,
                q.IRT_B,
                q.CalibrationSource,
                ResponseCount = _db.AssessmentResponses.Count(r => r.QuestionId == q.Id),
                LastCalibratedAt = _db.IRTCalibrationLogs
                    .Where(l => l.QuestionId == q.Id)
                    .OrderByDescending(l => l.CalibratedAt)
                    .Select(l => (DateTime?)l.CalibratedAt)
                    .FirstOrDefault(),
            })
            .OrderByDescending(x => x.ResponseCount)
            .ThenByDescending(x => x.LastCalibratedAt)
            .Take(MaxItems)
            .ToListAsync(ct);

        var items = rawItems.Select(x => new CalibrationItemDto(
            QuestionId: x.Id,
            QuestionText: TruncateForList(x.Content),
            Category: x.Category.ToString(),
            Difficulty: x.Difficulty,
            IrtA: x.IRT_A,
            IrtB: x.IRT_B,
            CalibrationSource: x.CalibrationSource.ToString(),
            ResponseCount: x.ResponseCount,
            LastCalibratedAt: x.LastCalibratedAt)).ToList();

        var lastJob = await _db.IRTCalibrationLogs
            .OrderByDescending(l => l.CalibratedAt)
            .Select(l => (DateTime?)l.CalibratedAt)
            .FirstOrDefaultAsync(ct);

        return new AdminCalibrationOverviewDto(
            Heatmap: heatmap,
            Items: items,
            LastJobRunAt: lastJob,
            TotalItems: items.Count);
    }

    public async Task<IReadOnlyList<CalibrationLogEntryDto>> GetHistoryForQuestionAsync(
        Guid questionId, CancellationToken ct = default)
    {
        var entries = await _logs.GetForQuestionAsync(questionId, ct);
        return entries.Select(e => new CalibrationLogEntryDto(
            Id: e.Id,
            CalibratedAt: e.CalibratedAt,
            ResponseCountAtRun: e.ResponseCountAtRun,
            IrtAOld: e.IRT_A_Old,
            IrtBOld: e.IRT_B_Old,
            IrtANew: e.IRT_A_New,
            IrtBNew: e.IRT_B_New,
            LogLikelihood: e.LogLikelihood,
            WasRecalibrated: e.WasRecalibrated,
            SkipReason: e.SkipReason,
            TriggeredBy: e.TriggeredBy)).ToList();
    }

    private static string TruncateForList(string content)
    {
        const int max = 140;
        if (string.IsNullOrEmpty(content)) return string.Empty;
        if (content.Length <= max) return content;
        return content[..max].TrimEnd() + "...";
    }
}

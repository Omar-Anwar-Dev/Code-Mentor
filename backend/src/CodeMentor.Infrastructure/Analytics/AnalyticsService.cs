using System.Text.Json;
using CodeMentor.Application.Analytics;
using CodeMentor.Application.Analytics.Contracts;
using CodeMentor.Domain.Submissions;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CodeMentor.Infrastructure.Analytics;

/// <summary>
/// S8-T1: 12-week analytics aggregate. Reads code-quality category scores from
/// each completed submission's <see cref="AIAnalysisResult.FeedbackJson"/>
/// (the unified payload built by <c>FeedbackAggregator</c> at S6-T5). Builds
/// per-week averages plus stacked counts of submissions by status. Knowledge
/// profile from <c>SkillScores</c> rounds out the dual-axis story per ADR-028.
/// </summary>
public sealed class AnalyticsService : IAnalyticsService
{
    private const int WeekCount = 12;

    private readonly ApplicationDbContext _db;
    private readonly TimeProvider _time;

    public AnalyticsService(ApplicationDbContext db, TimeProvider? time = null)
    {
        _db = db;
        _time = time ?? TimeProvider.System;
    }

    public async Task<AnalyticsDto> GetMineAsync(Guid userId, CancellationToken ct = default)
    {
        var (windowStart, windowEnd) = ComputeWindow(_time.GetUtcNow().UtcDateTime);

        var bucketStarts = new DateTime[WeekCount];
        for (int i = 0; i < WeekCount; i++)
            bucketStarts[i] = windowStart.AddDays(7 * i);

        var subs = await _db.Submissions.AsNoTracking()
            .Where(s => s.UserId == userId
                        && s.CreatedAt >= windowStart
                        && s.CreatedAt < windowEnd)
            .Select(s => new { s.CreatedAt, s.Status })
            .ToListAsync(ct);

        var weeklySubs = bucketStarts.Select(weekStart =>
        {
            var weekEnd = weekStart.AddDays(7);
            var inWeek = subs.Where(s => s.CreatedAt >= weekStart && s.CreatedAt < weekEnd).ToList();
            int Count(SubmissionStatus st) => inWeek.Count(s => s.Status == st);
            return new WeeklySubmissionsPointDto(
                WeekStart: weekStart,
                Total: inWeek.Count,
                Completed: Count(SubmissionStatus.Completed),
                Failed: Count(SubmissionStatus.Failed),
                Processing: Count(SubmissionStatus.Processing),
                Pending: Count(SubmissionStatus.Pending));
        }).ToList();

        // CreatedAt (not ProcessedAt) bins the trend so the chart aligns with
        // the user-meaningful "submitted on …" date even when the AI runs late.
        var aiRows = await _db.Submissions.AsNoTracking()
            .Where(s => s.UserId == userId
                        && s.CreatedAt >= windowStart
                        && s.CreatedAt < windowEnd
                        && s.Status == SubmissionStatus.Completed)
            .Join(_db.Set<AIAnalysisResult>().AsNoTracking(),
                s => s.Id, a => a.SubmissionId,
                (s, a) => new { s.CreatedAt, a.FeedbackJson })
            .ToListAsync(ct);

        var weeklyTrend = bucketStarts.Select(weekStart =>
        {
            var weekEnd = weekStart.AddDays(7);
            var rows = aiRows
                .Where(r => r.CreatedAt >= weekStart && r.CreatedAt < weekEnd)
                .Select(r => ParseCategoryScores(r.FeedbackJson))
                .ToList();

            if (rows.Count == 0)
                return new WeeklyTrendPointDto(weekStart, 0, null, null, null, null, null);

            decimal? Avg(Func<CategoryScores, int?> sel)
            {
                var values = rows.Select(sel).Where(v => v.HasValue).Select(v => v!.Value).ToList();
                return values.Count == 0 ? null : decimal.Round((decimal)values.Average(), 2);
            }
            return new WeeklyTrendPointDto(
                WeekStart: weekStart,
                SampleCount: rows.Count,
                Correctness: Avg(s => s.Correctness),
                Readability: Avg(s => s.Readability),
                Security: Avg(s => s.Security),
                Performance: Avg(s => s.Performance),
                Design: Avg(s => s.Design));
        }).ToList();

        var knowledge = await _db.SkillScores.AsNoTracking()
            .Where(s => s.UserId == userId)
            .OrderBy(s => s.Category)
            .Select(s => new KnowledgeSnapshotItemDto(
                s.Category.ToString(), s.Score, s.Level.ToString(), s.UpdatedAt))
            .ToListAsync(ct);

        return new AnalyticsDto(windowStart, windowEnd, weeklyTrend, weeklySubs, knowledge);
    }

    private static (DateTime WindowStart, DateTime WindowEnd) ComputeWindow(DateTime nowUtc)
    {
        var thisMonday = StartOfWeek(nowUtc);
        var windowStart = thisMonday.AddDays(-7 * (WeekCount - 1));
        var windowEnd = thisMonday.AddDays(7);
        return (windowStart, windowEnd);
    }

    private static DateTime StartOfWeek(DateTime dt)
    {
        var d = DateTime.SpecifyKind(dt.Date, DateTimeKind.Utc);
        var dow = d.DayOfWeek == DayOfWeek.Sunday ? 7 : (int)d.DayOfWeek;
        return d.AddDays(-(dow - 1));
    }

    private readonly record struct CategoryScores(
        int? Correctness, int? Readability, int? Security, int? Performance, int? Design);

    private static CategoryScores ParseCategoryScores(string feedbackJson)
    {
        if (string.IsNullOrWhiteSpace(feedbackJson)) return default;
        try
        {
            using var doc = JsonDocument.Parse(feedbackJson);
            if (!doc.RootElement.TryGetProperty("scores", out var scores)
                || scores.ValueKind != JsonValueKind.Object)
                return default;

            int? Read(string name) =>
                scores.TryGetProperty(name, out var v) && v.TryGetInt32(out var i) ? i : null;

            return new CategoryScores(
                Read("correctness"),
                Read("readability"),
                Read("security"),
                Read("performance"),
                Read("design"));
        }
        catch (JsonException)
        {
            return default;
        }
    }
}

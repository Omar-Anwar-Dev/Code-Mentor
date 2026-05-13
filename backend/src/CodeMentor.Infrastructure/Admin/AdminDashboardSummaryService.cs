using System.Text.Json;
using CodeMentor.Application.Admin;
using CodeMentor.Application.Admin.Contracts;
using CodeMentor.Domain.Assessments;
using CodeMentor.Domain.Submissions;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CodeMentor.Infrastructure.Admin;

/// <summary>
/// Post-S14 follow-up: live aggregates for the admin Overview + Analytics
/// pages, replacing the hardcoded demo data flagged by the amber banner.
///
/// <para>Metric definitions (locked at design time, see ADR record below):</para>
/// <list type="bullet">
///   <item><b>TotalUsers</b>: <c>User.IsDeleted == false</c> count (soft-deleted users in S14 cooling-off are hidden).</item>
///   <item><b>NewUsersThisWeek</b>: users with <c>CreatedAt &gt;= now - 7d</c>, excluding soft-deleted.</item>
///   <item><b>ActiveToday</b>: distinct users with a <c>RefreshToken.CreatedAt &gt;= now - 24h</c> (proxy: user authenticated or refreshed in the last day). Picked over a new <c>LastLoginAt</c> column to avoid a schema migration for one analytics field.</item>
///   <item><b>TotalSubmissions</b>: all-time <c>Submission</c> count.</item>
///   <item><b>SubmissionsThisWeek</b>: <c>Submission.CreatedAt &gt;= now - 7d</c>.</item>
///   <item><b>ActiveTasks</b>: <c>TaskItem.IsActive == true</c>.</item>
///   <item><b>PublishedQuestions</b>: <c>Question.IsActive == true</c>.</item>
///   <item><b>AverageAiScore</b>: mean of <c>AIAnalysisResult.OverallScore</c> over the last 30 days (windowed so the donut + table + card share the same horizon).</item>
///   <item><b>UserGrowth</b>: 6 monthly buckets ending in the current month. Each point reports new-this-month + cumulative-through-end-of-month.</item>
///   <item><b>TrackDistribution</b>: users grouped by their <i>latest completed Assessment</i>'s <c>Track</c>. Users with no completed assessment are excluded from the percentages.</item>
///   <item><b>AiScoreByTrack</b>: for each <see cref="Track"/>, average of correctness/readability/security/performance/design across the last 30 days of completed submissions whose task's track matches. Score JSON shape mirrors <see cref="AIAnalysisResult.FeedbackJson"/>'s <c>{"scores": {"correctness": int, ...}}</c> contract (the same one parsed by <c>AnalyticsService</c>).</item>
/// </list>
/// </summary>
public sealed class AdminDashboardSummaryService : IAdminDashboardSummaryService
{
    private const int UserGrowthMonths = 6;
    private const int AiScoreWindowDays = 30;

    private readonly ApplicationDbContext _db;
    private readonly TimeProvider _time;

    public AdminDashboardSummaryService(ApplicationDbContext db, TimeProvider? time = null)
    {
        _db = db;
        _time = time ?? TimeProvider.System;
    }

    public async Task<AdminDashboardSummaryDto> GetSummaryAsync(CancellationToken ct = default)
    {
        var nowUtc = _time.GetUtcNow().UtcDateTime;
        var sevenDaysAgo = nowUtc.AddDays(-7);
        var oneDayAgo = nowUtc.AddDays(-1);
        var thirtyDaysAgo = nowUtc.AddDays(-AiScoreWindowDays);

        // ── Overview cards (parallel-safe sequential queries; SQL Server is the
        //   bottleneck, not the .NET await chain). ──

        var totalUsers = await _db.Users.AsNoTracking()
            .Where(u => !u.IsDeleted)
            .CountAsync(ct);

        var newUsersThisWeek = await _db.Users.AsNoTracking()
            .Where(u => !u.IsDeleted && u.CreatedAt >= sevenDaysAgo)
            .CountAsync(ct);

        var activeToday = await _db.RefreshTokens.AsNoTracking()
            .Where(t => t.CreatedAt >= oneDayAgo)
            .Select(t => t.UserId)
            .Distinct()
            .CountAsync(ct);

        var totalSubmissions = await _db.Submissions.AsNoTracking().CountAsync(ct);

        var submissionsThisWeek = await _db.Submissions.AsNoTracking()
            .Where(s => s.CreatedAt >= sevenDaysAgo)
            .CountAsync(ct);

        var activeTasks = await _db.Tasks.AsNoTracking()
            .Where(t => t.IsActive)
            .CountAsync(ct);

        var publishedQuestions = await _db.Questions.AsNoTracking()
            .Where(q => q.IsActive)
            .CountAsync(ct);

        // ── Average AI score (last 30 days). Loaded into memory (small bounded
        //   window + admin endpoint with low call frequency) so the same code
        //   path works on the InMemory test provider AND SQL Server. ──

        var aiScores = await _db.Submissions.AsNoTracking()
            .Where(s => s.CreatedAt >= thirtyDaysAgo && s.Status == SubmissionStatus.Completed)
            .Join(_db.Set<AIAnalysisResult>().AsNoTracking(),
                s => s.Id, a => a.SubmissionId,
                (s, a) => a.OverallScore)
            .ToListAsync(ct);
        var averageAiScore = aiScores.Count == 0
            ? 0m
            : decimal.Round((decimal)aiScores.Sum(x => (long)x) / aiScores.Count, 1);

        var cards = new AdminOverviewCardsDto(
            TotalUsers: totalUsers,
            NewUsersThisWeek: newUsersThisWeek,
            ActiveToday: activeToday,
            TotalSubmissions: totalSubmissions,
            SubmissionsThisWeek: submissionsThisWeek,
            ActiveTasks: activeTasks,
            PublishedQuestions: publishedQuestions,
            AverageAiScore: averageAiScore);

        // ── User growth (6-month rolling window, including current month). ──

        var monthAnchors = BuildMonthAnchors(nowUtc, UserGrowthMonths);
        var oldestWindow = monthAnchors[0];

        var monthBuckets = await _db.Users.AsNoTracking()
            .Where(u => !u.IsDeleted && u.CreatedAt >= oldestWindow)
            .GroupBy(u => new { u.CreatedAt.Year, u.CreatedAt.Month })
            .Select(g => new { g.Key.Year, g.Key.Month, Count = g.Count() })
            .ToListAsync(ct);

        var cumulativeBefore = await _db.Users.AsNoTracking()
            .Where(u => !u.IsDeleted && u.CreatedAt < oldestWindow)
            .CountAsync(ct);

        var userGrowth = new List<AdminUserGrowthPointDto>(UserGrowthMonths);
        var running = cumulativeBefore;
        foreach (var anchor in monthAnchors)
        {
            var addedThisMonth = monthBuckets
                .Where(b => b.Year == anchor.Year && b.Month == anchor.Month)
                .Sum(b => b.Count);
            running += addedThisMonth;
            userGrowth.Add(new AdminUserGrowthPointDto(
                MonthLabel: anchor.ToString("MMM", System.Globalization.CultureInfo.InvariantCulture),
                MonthStartUtc: anchor,
                NewUsers: addedThisMonth,
                CumulativeUsers: running));
        }

        // ── Track distribution: users grouped by their latest completed
        //   Assessment's Track. Users without a completed assessment fall out.
        //   In-memory grouping so InMemory + SQL Server share one code path —
        //   the GroupBy().Select(g => g.OrderBy().First()) pattern doesn't
        //   translate on InMemory and is fragile on SQL Server. ──

        var completedAssessments = await _db.Assessments.AsNoTracking()
            .Where(a => a.Status == AssessmentStatus.Completed && a.CompletedAt != null)
            .Select(a => new { a.UserId, a.Track, a.CompletedAt })
            .ToListAsync(ct);

        var perUserTrack = completedAssessments
            .GroupBy(a => a.UserId)
            .Select(g => g.OrderByDescending(a => a.CompletedAt!.Value).First().Track)
            .ToList();

        var trackTotal = perUserTrack.Count;
        var trackDistribution = Enum.GetValues<Track>()
            .Select(t =>
            {
                var c = perUserTrack.Count(x => x == t);
                var pct = trackTotal == 0 ? 0m : decimal.Round(100m * c / trackTotal, 1);
                return new AdminTrackDistributionItemDto(t, c, pct);
            })
            .ToList();

        // ── AI score by track (last 30 days). Loads FeedbackJson + Track for
        //   each completed submission, then parses per row to extract the 5
        //   dimension scores. Same shape as Analytics service's parser. ──

        var aiRows = await _db.Submissions.AsNoTracking()
            .Where(s => s.CreatedAt >= thirtyDaysAgo && s.Status == SubmissionStatus.Completed)
            .Join(_db.Tasks.AsNoTracking(),
                s => s.TaskId, t => t.Id,
                (s, t) => new { s.Id, t.Track })
            .Join(_db.Set<AIAnalysisResult>().AsNoTracking(),
                st => st.Id, a => a.SubmissionId,
                (st, a) => new { st.Track, a.FeedbackJson })
            .ToListAsync(ct);

        var aiScoreByTrack = Enum.GetValues<Track>()
            .Select(track =>
            {
                var perRow = aiRows
                    .Where(r => r.Track == track)
                    .Select(r => ParseCategoryScores(r.FeedbackJson))
                    .ToList();

                if (perRow.Count == 0)
                    return new AdminTrackAiScoresDto(track, null, null, null, null, null, null, 0);

                decimal? Avg(Func<CategoryScores, int?> sel)
                {
                    var values = perRow.Select(sel).Where(v => v.HasValue).Select(v => v!.Value).ToList();
                    return values.Count == 0 ? null : decimal.Round((decimal)values.Average(), 0);
                }

                var c = Avg(s => s.Correctness);
                var r = Avg(s => s.Readability);
                var sec = Avg(s => s.Security);
                var p = Avg(s => s.Performance);
                var d = Avg(s => s.Design);

                var present = new[] { c, r, sec, p, d }.Where(v => v.HasValue).Select(v => v!.Value).ToList();
                decimal? avg = present.Count == 0
                    ? null
                    : decimal.Round(present.Average(), 0);

                return new AdminTrackAiScoresDto(track, c, r, sec, p, d, avg, perRow.Count);
            })
            .ToList();

        return new AdminDashboardSummaryDto(
            Cards: cards,
            UserGrowth: userGrowth,
            TrackDistribution: trackDistribution,
            AiScoreByTrack: aiScoreByTrack,
            GeneratedAtUtc: nowUtc);
    }

    /// <summary>
    /// Returns 6 month-start anchors (UTC midnight) ending with the current month.
    /// E.g., on 2026-05-14 returns {Dec-1, Jan-1, Feb-1, Mar-1, Apr-1, May-1}.
    /// </summary>
    private static DateTime[] BuildMonthAnchors(DateTime nowUtc, int count)
    {
        var thisMonth = new DateTime(nowUtc.Year, nowUtc.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var anchors = new DateTime[count];
        for (int i = 0; i < count; i++)
        {
            anchors[i] = thisMonth.AddMonths(-(count - 1 - i));
        }
        return anchors;
    }

    /// <summary>
    /// Mirrors <c>AnalyticsService.ParseCategoryScores</c>: the unified
    /// FeedbackJson shape is <c>{"scores":{"correctness":int,"readability":int,"security":int,"performance":int,"design":int}}</c>.
    /// Missing/invalid keys silently yield nulls so a malformed row doesn't tank the whole aggregate.
    /// </summary>
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

    private readonly record struct CategoryScores(
        int? Correctness, int? Readability, int? Security, int? Performance, int? Design);
}

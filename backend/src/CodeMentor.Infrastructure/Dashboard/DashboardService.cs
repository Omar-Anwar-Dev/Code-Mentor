using CodeMentor.Application.Dashboard;
using CodeMentor.Application.Dashboard.Contracts;
using CodeMentor.Application.LearningPaths;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CodeMentor.Infrastructure.Dashboard;

public sealed class DashboardService : IDashboardService
{
    private readonly ApplicationDbContext _db;
    private readonly ILearningPathService _paths;

    public DashboardService(ApplicationDbContext db, ILearningPathService paths)
    {
        _db = db;
        _paths = paths;
    }

    public async Task<DashboardDto> GetMineAsync(Guid userId, CancellationToken ct = default)
    {
        var activePath = await _paths.GetActiveAsync(userId, ct);

        var skills = await _db.SkillScores.AsNoTracking()
            .Where(s => s.UserId == userId)
            .OrderBy(s => s.Category)
            .Select(s => new SkillSnapshotItemDto(
                s.Category.ToString(), s.Score, s.Level.ToString(), s.UpdatedAt))
            .ToListAsync(ct);

        // S8-T9 (B-001 fix): join in AIAnalysisResult.OverallScore so the
        // dashboard surfaces the real review score for completed submissions
        // — null when the AI portion never landed (Pending / Unavailable).
        var recent = await _db.Submissions.AsNoTracking()
            .Where(s => s.UserId == userId)
            .OrderByDescending(s => s.CreatedAt)
            .Take(5)
            .Join(_db.Tasks.AsNoTracking(),
                s => s.TaskId, t => t.Id,
                (s, t) => new { Submission = s, t.Title })
            .GroupJoin(_db.AIAnalysisResults.AsNoTracking(),
                joined => joined.Submission.Id, ai => ai.SubmissionId,
                (joined, ais) => new { joined.Submission, joined.Title, Ais = ais })
            .SelectMany(x => x.Ais.DefaultIfEmpty(),
                (x, ai) => new RecentSubmissionDto(
                    x.Submission.Id,
                    x.Submission.TaskId,
                    x.Title,
                    x.Submission.Status.ToString(),
                    ai != null ? (decimal?)ai.OverallScore : null,
                    x.Submission.CreatedAt))
            .ToListAsync(ct);

        return new DashboardDto(activePath, recent, skills);
    }
}

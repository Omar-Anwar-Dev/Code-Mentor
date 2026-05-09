using CodeMentor.Application.CodeReview;
using CodeMentor.Application.Skills;
using CodeMentor.Domain.Skills;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CodeMentor.Infrastructure.Skills;

public sealed class CodeQualityScoreUpdater : ICodeQualityScoreUpdater
{
    private readonly ApplicationDbContext _db;

    public CodeQualityScoreUpdater(ApplicationDbContext db) => _db = db;

    public async Task RecordAiReviewAsync(Guid userId, AiReviewScores scores, CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(scores);

        var contributions = new (CodeQualityCategory Category, int Score)[]
        {
            (CodeQualityCategory.Correctness, scores.Correctness),
            (CodeQualityCategory.Readability, scores.Readability),
            (CodeQualityCategory.Security,    scores.Security),
            (CodeQualityCategory.Performance, scores.Performance),
            (CodeQualityCategory.Design,      scores.Design),
        };

        var existing = await _db.CodeQualityScores
            .Where(s => s.UserId == userId)
            .ToListAsync(ct);
        var byCategory = existing.ToDictionary(s => s.Category);

        var now = DateTime.UtcNow;
        foreach (var (category, value) in contributions)
        {
            var clamped = Math.Clamp(value, 0, 100);
            if (byCategory.TryGetValue(category, out var row))
            {
                // Incremental running mean: newAvg = (oldAvg * n + x) / (n + 1)
                var newCount = row.SampleCount + 1;
                row.Score = Math.Round(((row.Score * row.SampleCount) + clamped) / newCount, 2);
                row.SampleCount = newCount;
                row.UpdatedAt = now;
            }
            else
            {
                _db.CodeQualityScores.Add(new CodeQualityScore
                {
                    UserId = userId,
                    Category = category,
                    Score = clamped,
                    SampleCount = 1,
                    UpdatedAt = now,
                });
            }
        }

        await _db.SaveChangesAsync(ct);
    }
}

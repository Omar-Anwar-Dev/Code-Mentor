using CodeMentor.Application.CodeReview;
using CodeMentor.Application.CodeReview.Contracts;
using CodeMentor.Domain.Skills;
using CodeMentor.Domain.Submissions;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CodeMentor.Infrastructure.CodeReview;

public sealed class FeedbackRatingService : IFeedbackRatingService
{
    private readonly ApplicationDbContext _db;

    public FeedbackRatingService(ApplicationDbContext db) => _db = db;

    public async Task<RateFeedbackResult> RateAsync(
        Guid userId, Guid submissionId, RateFeedbackRequest request, CancellationToken ct = default)
    {
        if (!TryParseCategory(request.Category, out var category) ||
            !TryParseVote(request.Vote, out var vote))
        {
            return RateFeedbackResult.ValidationFailed;
        }

        var submissionOwned = await _db.Submissions.AsNoTracking()
            .AnyAsync(s => s.Id == submissionId && s.UserId == userId, ct);
        if (!submissionOwned) return RateFeedbackResult.NotFound;

        var existing = await _db.Set<FeedbackRating>()
            .FirstOrDefaultAsync(r => r.SubmissionId == submissionId && r.Category == category, ct);

        if (existing is null)
        {
            _db.Set<FeedbackRating>().Add(new FeedbackRating
            {
                SubmissionId = submissionId,
                Category = category,
                Vote = vote,
            });
        }
        else
        {
            existing.Vote = vote;
            existing.UpdatedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync(ct);
        return RateFeedbackResult.Saved;
    }

    public async Task<IReadOnlyList<FeedbackRatingDto>> GetRatingsAsync(
        Guid userId, Guid submissionId, CancellationToken ct = default)
    {
        var submissionOwned = await _db.Submissions.AsNoTracking()
            .AnyAsync(s => s.Id == submissionId && s.UserId == userId, ct);
        if (!submissionOwned) return Array.Empty<FeedbackRatingDto>();

        return await _db.Set<FeedbackRating>().AsNoTracking()
            .Where(r => r.SubmissionId == submissionId)
            .OrderBy(r => r.Category)
            .Select(r => new FeedbackRatingDto(
                r.Category.ToString(), r.Vote.ToString(), r.UpdatedAt))
            .ToListAsync(ct);
    }

    private static bool TryParseCategory(string? raw, out CodeQualityCategory category)
    {
        category = default;
        return !string.IsNullOrWhiteSpace(raw)
            && Enum.TryParse(raw, ignoreCase: true, out category)
            && Enum.IsDefined(typeof(CodeQualityCategory), category);
    }

    private static bool TryParseVote(string? raw, out FeedbackVote vote)
    {
        vote = default;
        if (string.IsNullOrWhiteSpace(raw)) return false;
        var v = raw.Trim().ToLowerInvariant();
        if (v == "up") { vote = FeedbackVote.Up; return true; }
        if (v == "down") { vote = FeedbackVote.Down; return true; }
        return false;
    }
}

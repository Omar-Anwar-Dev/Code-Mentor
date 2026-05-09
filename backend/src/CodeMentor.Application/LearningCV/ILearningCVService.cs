using CodeMentor.Application.LearningCV.Contracts;

namespace CodeMentor.Application.LearningCV;

public interface ILearningCVService
{
    /// <summary>
    /// S7-T2: aggregate the learner's CV view. Owner-scoped (returns the full
    /// payload including <see cref="LearningCVProfileDto.Email"/>). Generates
    /// the underlying <c>LearningCVs</c> row on first call so metadata
    /// (slug, isPublic, viewCount) has somewhere to live.
    /// </summary>
    Task<LearningCVDto> GetMineAsync(Guid userId, CancellationToken ct = default);

    /// <summary>
    /// S7-T3: privacy toggle. Generates and persists a stable
    /// <see cref="LearningCVMetadataDto.PublicSlug"/> on the first
    /// <c>isPublic = true</c> publish. Toggling back to private leaves the
    /// slug intact so the URL stays stable across re-publishes.
    /// </summary>
    Task<LearningCVDto> UpdateMineAsync(Guid userId, UpdateLearningCVRequest request, CancellationToken ct = default);

    /// <summary>
    /// S7-T4: anonymous public read by slug. Returns null when the slug doesn't
    /// resolve OR when the resolved CV is private (callers map both to 404).
    /// On a successful read, increments <see cref="LearningCVMetadataDto.ViewCount"/>
    /// at most once per <paramref name="ipAddress"/> per 24h via the
    /// <c>LearningCVViews</c> dedupe table; a null IP never increments. The
    /// returned payload has <see cref="LearningCVProfileDto.Email"/> redacted.
    /// </summary>
    Task<LearningCVDto?> GetPublicAsync(string slug, string? ipAddress, CancellationToken ct = default);
}

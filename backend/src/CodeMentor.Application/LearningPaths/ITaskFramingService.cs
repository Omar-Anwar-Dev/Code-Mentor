namespace CodeMentor.Application.LearningPaths;

/// <summary>
/// S19-T6 / F16 (ADR-049 / ADR-052): cache-aware service over the
/// :code:`TaskFramings` table.
///
/// The polling pattern:
/// - <see cref="GetFramingAsync"/> returns
///   <see cref="TaskFramingLookupResult.Ready"/> with a payload when a
///   non-expired row exists.
/// - Otherwise enqueues <c>GenerateTaskFramingJob</c> via
///   <see cref="IGenerateTaskFramingScheduler"/> and returns
///   <see cref="TaskFramingLookupResult.Generating"/> so the frontend
///   knows to poll back.
/// - <see cref="GetFramingAsync"/> is idempotent — repeat calls during
///   the regeneration window don't enqueue duplicate jobs (a 5-minute
///   guard suppresses re-enqueue).
///
/// Cross-user isolation: lookups are scoped by <c>userId</c>. The
/// controller enforces JWT identity → no risk of one learner pulling
/// another's framing.
/// </summary>
public interface ITaskFramingService
{
    Task<TaskFramingLookupResult> GetFramingAsync(
        Guid userId,
        Guid taskId,
        CancellationToken ct = default);
}

public enum TaskFramingStatus
{
    Ready = 1,
    Generating = 2,
    TaskNotFound = 3,
    Unauthorized = 4,
}

public sealed record TaskFramingLookupResult(
    TaskFramingStatus Status,
    TaskFramingDto? Payload = null,
    string? RetryAfterHint = null);

public sealed record TaskFramingDto(
    Guid TaskId,
    string WhyThisMatters,
    IReadOnlyList<string> FocusAreas,
    IReadOnlyList<string> CommonPitfalls,
    DateTime GeneratedAt,
    DateTime ExpiresAt,
    string PromptVersion);

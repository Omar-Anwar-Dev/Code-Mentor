using CodeMentor.Application.LearningPaths.Contracts;

namespace CodeMentor.Application.LearningPaths;

public interface ILearningPathService
{
    /// <summary>
    /// Generates (or regenerates) a learning path for the given user based on the most recent
    /// completed assessment. Deactivates any prior active path. Idempotent on repeat calls.
    /// </summary>
    Task<LearningPathDto> GeneratePathAsync(Guid userId, Guid assessmentId, CancellationToken ct = default);

    /// <summary>Returns the user's currently active path, including ordered tasks.</summary>
    Task<LearningPathDto?> GetActiveAsync(Guid userId, CancellationToken ct = default);

    /// <summary>Marks a PathTask as InProgress. Returns false if already started/completed or not found.</summary>
    Task<StartPathTaskResult> StartTaskAsync(Guid userId, Guid pathTaskId, CancellationToken ct = default);

    /// <summary>
    /// S8-T5: append a `Recommendation`'s referenced task to the end of the
    /// caller's active learning path, marking the recommendation `IsAdded=true`.
    /// New <c>PathTask</c> lands at <c>max(OrderIndex) + 1</c> with status
    /// <c>NotStarted</c>. Idempotent — re-adding a recommendation that's
    /// already been added returns <see cref="AddRecommendationResult.AlreadyAdded"/>.
    /// </summary>
    Task<AddRecommendationResult> AddTaskFromRecommendationAsync(
        Guid userId, Guid recommendationId, CancellationToken ct = default);
}

public enum StartPathTaskResult
{
    Started = 0,
    NotFound = 1,
    AlreadyStarted = 2,
    AlreadyCompleted = 3,
}

public enum AddRecommendationResult
{
    Added = 0,
    NotFound = 1,
    NoActivePath = 2,
    RecommendationHasNoTaskId = 3,
    TaskAlreadyOnPath = 4,
    AlreadyAdded = 5,
}

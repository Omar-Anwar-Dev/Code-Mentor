using CodeMentor.Application.LearningPaths;
using Microsoft.Extensions.Logging;

namespace CodeMentor.Infrastructure.LearningPaths;

/// <summary>
/// Hangfire-invokable job: regenerates the learning path for a completed assessment.
/// Accepts userId + assessmentId; delegates to ILearningPathService.
/// </summary>
public sealed class GenerateLearningPathJob
{
    private readonly ILearningPathService _paths;
    private readonly ILogger<GenerateLearningPathJob> _logger;

    public GenerateLearningPathJob(ILearningPathService paths, ILogger<GenerateLearningPathJob> logger)
    {
        _paths = paths;
        _logger = logger;
    }

    // Hangfire serializes method-call expressions; CancellationToken.None is injected at execution time
    // by Hangfire (or we supply it explicitly).
    public async Task ExecuteAsync(Guid userId, Guid assessmentId, CancellationToken ct = default)
    {
        _logger.LogInformation("GenerateLearningPathJob start: user={UserId} assessment={AssessmentId}", userId, assessmentId);
        try
        {
            await _paths.GeneratePathAsync(userId, assessmentId, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate learning path for user {UserId}", userId);
            throw; // surface to Hangfire retry machinery
        }
    }
}

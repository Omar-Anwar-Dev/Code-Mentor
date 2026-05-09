using System.Security.Claims;
using CodeMentor.Application.LearningPaths;
using CodeMentor.Application.LearningPaths.Contracts;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CodeMentor.Api.Controllers;

[ApiController]
[Route("api/learning-paths")]
[Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
public class LearningPathsController : ControllerBase
{
    private readonly ILearningPathService _service;

    public LearningPathsController(ILearningPathService service) => _service = service;

    /// <summary>S3-T5: current user's active path, including ordered tasks.</summary>
    [HttpGet("me/active")]
    [ProducesResponseType(typeof(LearningPathDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetActive(CancellationToken ct)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        var path = await _service.GetActiveAsync(userId, ct);
        return path is null ? NotFound() : Ok(path);
    }

    /// <summary>S3-T6: mark a path task InProgress.</summary>
    [HttpPost("me/tasks/{pathTaskId:guid}/start")]
    [ProducesResponseType(typeof(LearningPathDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> StartTask(Guid pathTaskId, CancellationToken ct)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();

        var result = await _service.StartTaskAsync(userId, pathTaskId, ct);
        return result switch
        {
            StartPathTaskResult.Started => Ok(await _service.GetActiveAsync(userId, ct)),
            StartPathTaskResult.NotFound => NotFound(),
            StartPathTaskResult.AlreadyStarted => Conflict(new { error = "Task already started." }),
            StartPathTaskResult.AlreadyCompleted => Conflict(new { error = "Task already completed." }),
            _ => StatusCode(StatusCodes.Status500InternalServerError),
        };
    }

    /// <summary>S8-T5 / SF3: append a recommendation's task to the end of the
    /// active learning path. Marks the recommendation IsAdded.</summary>
    [HttpPost("me/tasks/from-recommendation/{recommendationId:guid}")]
    [ProducesResponseType(typeof(LearningPathDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> AddFromRecommendation(Guid recommendationId, CancellationToken ct)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();

        var result = await _service.AddTaskFromRecommendationAsync(userId, recommendationId, ct);
        return result switch
        {
            AddRecommendationResult.Added => Ok(await _service.GetActiveAsync(userId, ct)),
            AddRecommendationResult.NotFound => NotFound(),
            AddRecommendationResult.RecommendationHasNoTaskId => BadRequest(new
            {
                error = "Recommendation has no linked task. Free-text suggestions cannot be added directly to your path.",
            }),
            AddRecommendationResult.NoActivePath => Conflict(new
            {
                error = "No active learning path. Take the assessment to generate one.",
            }),
            AddRecommendationResult.TaskAlreadyOnPath => Conflict(new
            {
                error = "That task is already on your path.",
            }),
            AddRecommendationResult.AlreadyAdded => Conflict(new
            {
                error = "This recommendation has already been added.",
            }),
            _ => StatusCode(StatusCodes.Status500InternalServerError),
        };
    }

    private bool TryGetUserId(out Guid userId)
    {
        userId = Guid.Empty;
        var sub = User.FindFirstValue(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)
            ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        return sub is not null && Guid.TryParse(sub, out userId);
    }
}

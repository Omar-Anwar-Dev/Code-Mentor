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
    private readonly IPathAdaptationService _adaptations;
    private readonly IGraduationService _graduation;

    public LearningPathsController(
        ILearningPathService service,
        IPathAdaptationService adaptations,
        IGraduationService graduation)
    {
        _service = service;
        _adaptations = adaptations;
        _graduation = graduation;
    }

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

    // ────────────────────────────────────────────────────────────────────
    // S20-T5 / F16 (ADR-053): adaptation endpoints
    // ────────────────────────────────────────────────────────────────────

    /// <summary>List the caller's pending + history adaptation events.
    /// Optional <c>?status=pending</c> or <c>?status=history</c> returns only
    /// that bucket; omitting returns both.</summary>
    [HttpGet("me/adaptations")]
    [ProducesResponseType(typeof(PathAdaptationListResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> ListAdaptations([FromQuery] string? status, CancellationToken ct)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        var full = await _adaptations.ListForUserAsync(userId, ct);

        var s = (status ?? string.Empty).Trim().ToLowerInvariant();
        return s switch
        {
            "pending" => Ok(new PathAdaptationListResponse(full.Pending, Array.Empty<PathAdaptationEventDto>())),
            "history" => Ok(new PathAdaptationListResponse(Array.Empty<PathAdaptationEventDto>(), full.History)),
            _ => Ok(full),
        };
    }

    /// <summary>Approve or reject a Pending adaptation event. On approve, the
    /// actions are applied transactionally; on reject, no path changes.</summary>
    [HttpPost("me/adaptations/{eventId:guid}/respond")]
    [ProducesResponseType(typeof(PathAdaptationRespondResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> RespondToAdaptation(
        Guid eventId,
        [FromBody] PathAdaptationRespondRequest req,
        CancellationToken ct)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        var result = await _adaptations.RespondAsync(userId, eventId, req?.Decision ?? string.Empty, ct);
        if (result.Ok) return Ok(result.Response);
        return result.Error switch
        {
            "not-found" => NotFound(),
            "forbidden" => Forbid(),
            var s when s != null && s.StartsWith("Event is not pending", StringComparison.OrdinalIgnoreCase)
                => Conflict(new { error = result.Error }),
            _ => BadRequest(new { error = result.Error }),
        };
    }

    /// <summary>Enqueue an on-demand adaptation cycle for the caller's active
    /// path. Bypasses the 24-hour cooldown.</summary>
    [HttpPost("me/refresh")]
    [ProducesResponseType(typeof(PathAdaptationRefreshResponse), StatusCodes.Status202Accepted)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RefreshAdaptation(CancellationToken ct)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        var result = await _adaptations.EnqueueRefreshAsync(userId, ct);
        if (result.Ok) return AcceptedAtAction(nameof(ListAdaptations), new { status = "pending" }, result.Response);
        return NotFound(new { error = result.Error });
    }

    /// <summary>S21-T3 / F16: assemble the Graduation page payload — Before /
    /// After skill radar pair + AI journey summary (when a Full reassessment
    /// has completed) + Next-Phase eligibility flag. 404 when the user has no
    /// active path or the active path is below 100%.</summary>
    [HttpGet("me/graduation")]
    [ProducesResponseType(typeof(GraduationViewDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Graduation(CancellationToken ct)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        var view = await _graduation.GetForUserAsync(userId, ct);
        return view is null
            ? NotFound(new { error = "No graduation-ready path. Reach 100% first." })
            : Ok(view);
    }

    /// <summary>
    /// S21-T4 / F16: generate the Next Phase Path. Archives the current path,
    /// bumps the Version, stamps the lineage, and produces a new path keyed
    /// off the most-recent Completed Full reassessment.
    /// Returns:
    ///   200 OK + NextPhaseResult on success.
    ///   404 Not Found when no active path exists.
    ///   409 Conflict when the path isn't 100% OR the Full reassessment hasn't
    ///   been completed yet (per the gating rule on the graduation page).
    /// </summary>
    [HttpPost("me/next-phase")]
    [ProducesResponseType(typeof(NextPhaseResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> NextPhase(CancellationToken ct)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();

        var outcome = await _service.GenerateNextPhaseAsync(userId, ct);
        if (outcome.Success) return Ok(outcome.Result);

        return outcome.Error switch
        {
            NextPhaseError.NoActivePath => NotFound(new
            {
                error = "No active learning path. Complete the initial assessment first.",
            }),
            NextPhaseError.PathNotComplete => Conflict(new
            {
                error = "Reach 100% path progress before requesting the Next Phase.",
            }),
            NextPhaseError.ReassessmentRequired => Conflict(new
            {
                error = "Complete the 30-question Full reassessment before requesting the Next Phase.",
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

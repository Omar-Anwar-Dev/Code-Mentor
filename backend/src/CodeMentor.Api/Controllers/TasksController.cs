using System.Security.Claims;
using CodeMentor.Application.LearningPaths;
using CodeMentor.Application.Tasks;
using CodeMentor.Application.Tasks.Contracts;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CodeMentor.Api.Controllers;

[ApiController]
[Route("api/tasks")]
[Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
public class TasksController : ControllerBase
{
    private readonly ITaskCatalogService _service;
    private readonly ITaskFramingService _framing;

    public TasksController(ITaskCatalogService service, ITaskFramingService framing)
    {
        _service = service;
        _framing = framing;
    }

    /// <summary>S3-T7: task library list with filters + pagination.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(TaskListResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> List(
        [FromQuery] string? track,
        [FromQuery] int? difficulty,
        [FromQuery] string? category,
        [FromQuery] string? language,
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int size = 20,
        CancellationToken ct = default)
    {
        var filter = new TaskListFilter(track, difficulty, category, language, search, page, size);
        var response = await _service.ListAsync(filter, ct);
        return Ok(response);
    }

    /// <summary>S3-T8: task detail.</summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(TaskDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct)
    {
        var detail = await _service.GetByIdAsync(id, ct);
        return detail is null ? NotFound() : Ok(detail);
    }

    /// <summary>S19-T6 / F16 (ADR-052): per-user-per-task AI framing.
    /// Returns 200 with the payload when a fresh row exists, 409 with a
    /// poll hint when generation was enqueued, 404 when the task isn't
    /// in the catalog.</summary>
    [HttpGet("{id:guid}/framing")]
    [ProducesResponseType(typeof(TaskFramingDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> GetFraming(Guid id, CancellationToken ct)
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdClaim, out var userId))
            return Unauthorized();

        var result = await _framing.GetFramingAsync(userId, id, ct);
        return result.Status switch
        {
            TaskFramingStatus.Ready => Ok(result.Payload),
            TaskFramingStatus.Generating => Conflict(new
            {
                status = "Generating",
                retryAfterHint = result.RetryAfterHint ?? "Retry in 3-6 seconds.",
            }),
            TaskFramingStatus.TaskNotFound => NotFound(),
            _ => Unauthorized(),
        };
    }
}

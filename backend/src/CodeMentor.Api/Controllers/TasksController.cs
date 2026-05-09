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

    public TasksController(ITaskCatalogService service) => _service = service;

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
}

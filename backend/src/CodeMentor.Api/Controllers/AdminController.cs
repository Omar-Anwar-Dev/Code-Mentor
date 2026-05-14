using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using CodeMentor.Application.Admin;
using CodeMentor.Application.Admin.Contracts;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CodeMentor.Api.Controllers;

/// <summary>
/// S7-T9: admin endpoints — Task CRUD, Question CRUD, User list/deactivate.
/// All routes require the <c>RequireAdmin</c> policy; non-admins receive 403.
/// </summary>
[ApiController]
[Route("api/admin")]
[Authorize(Policy = "RequireAdmin")]
public class AdminController : ControllerBase
{
    private readonly IAdminTaskService _tasks;
    private readonly IAdminQuestionService _questions;
    private readonly IAdminUserService _users;
    private readonly IAdminDashboardSummaryService _dashboard;
    private readonly IAdminQuestionDraftService _drafts;

    public AdminController(
        IAdminTaskService tasks,
        IAdminQuestionService questions,
        IAdminUserService users,
        IAdminDashboardSummaryService dashboard,
        IAdminQuestionDraftService drafts)
    {
        _tasks = tasks;
        _questions = questions;
        _users = users;
        _dashboard = dashboard;
        _drafts = drafts;
    }

    // ---- Dashboard summary (post-S14: replaces the amber demo-data banner) ----

    /// <summary>
    /// Single-call summary that powers both /admin (Overview) and /admin/analytics:
    /// totals, weekly counters, last-30-day AI averages, 6-month user growth,
    /// track distribution donut data, and per-track per-dimension AI scores.
    /// </summary>
    [HttpGet("dashboard/summary")]
    [ProducesResponseType(typeof(AdminDashboardSummaryDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<AdminDashboardSummaryDto>> GetDashboardSummary(CancellationToken ct = default)
        => Ok(await _dashboard.GetSummaryAsync(ct));

    // ---- Tasks ----

    [HttpGet("tasks")]
    [ProducesResponseType(typeof(PagedResult<AdminTaskDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<AdminTaskDto>>> ListTasks(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] bool? isActive = null,
        CancellationToken ct = default)
        => Ok(await _tasks.ListAsync(page, pageSize, isActive, ct));

    [HttpPost("tasks")]
    [ProducesResponseType(typeof(AdminTaskDto), StatusCodes.Status201Created)]
    public async Task<ActionResult<AdminTaskDto>> CreateTask([FromBody] CreateTaskRequest request, CancellationToken ct)
    {
        if (!TryGetUserId(out var actor)) return Unauthorized();
        var dto = await _tasks.CreateAsync(request, actor, ct);
        return CreatedAtAction(nameof(CreateTask), new { id = dto.Id }, dto);
    }

    [HttpPut("tasks/{id:guid}")]
    [ProducesResponseType(typeof(AdminTaskDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AdminTaskDto>> UpdateTask(Guid id, [FromBody] UpdateTaskRequest request, CancellationToken ct)
    {
        if (!TryGetUserId(out var actor)) return Unauthorized();
        var dto = await _tasks.UpdateAsync(id, request, actor, ct);
        return dto is null ? NotFound() : Ok(dto);
    }

    [HttpDelete("tasks/{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteTask(Guid id, CancellationToken ct)
    {
        if (!TryGetUserId(out var actor)) return Unauthorized();
        var ok = await _tasks.SoftDeleteAsync(id, actor, ct);
        return ok ? NoContent() : NotFound();
    }

    // ---- Questions ----

    [HttpGet("questions")]
    [ProducesResponseType(typeof(PagedResult<AdminQuestionDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<AdminQuestionDto>>> ListQuestions(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] bool? isActive = null,
        CancellationToken ct = default)
        => Ok(await _questions.ListAsync(page, pageSize, isActive, ct));

    [HttpPost("questions")]
    [ProducesResponseType(typeof(AdminQuestionDto), StatusCodes.Status201Created)]
    public async Task<ActionResult<AdminQuestionDto>> CreateQuestion([FromBody] CreateQuestionRequest request, CancellationToken ct)
    {
        if (!TryGetUserId(out var actor)) return Unauthorized();
        try
        {
            var dto = await _questions.CreateAsync(request, actor, ct);
            return CreatedAtAction(nameof(CreateQuestion), new { id = dto.Id }, dto);
        }
        catch (ArgumentException ex)
        {
            return Problem(detail: ex.Message, statusCode: StatusCodes.Status400BadRequest, title: "InvalidQuestion");
        }
    }

    [HttpPut("questions/{id:guid}")]
    [ProducesResponseType(typeof(AdminQuestionDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AdminQuestionDto>> UpdateQuestion(Guid id, [FromBody] UpdateQuestionRequest request, CancellationToken ct)
    {
        if (!TryGetUserId(out var actor)) return Unauthorized();
        try
        {
            var dto = await _questions.UpdateAsync(id, request, actor, ct);
            return dto is null ? NotFound() : Ok(dto);
        }
        catch (ArgumentException ex)
        {
            return Problem(detail: ex.Message, statusCode: StatusCodes.Status400BadRequest, title: "InvalidQuestion");
        }
    }

    [HttpDelete("questions/{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteQuestion(Guid id, CancellationToken ct)
    {
        if (!TryGetUserId(out var actor)) return Unauthorized();
        var ok = await _questions.SoftDeleteAsync(id, actor, ct);
        return ok ? NoContent() : NotFound();
    }

    // ---- Users ----

    [HttpGet("users")]
    [ProducesResponseType(typeof(PagedResult<AdminUserDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<AdminUserDto>>> ListUsers(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? search = null,
        [FromQuery] bool includeDeleted = false,
        CancellationToken ct = default)
    {
        // S14-T9: ?includeDeleted=true opts in to surfacing soft-deleted users (in 30-day cooling-off).
        var result = await _users.ListAsync(page, pageSize, search, includeDeleted, ct);
        return Ok(result);
    }

    [HttpPatch("users/{id:guid}")]
    [ProducesResponseType(typeof(AdminUserDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AdminUserDto>> UpdateUser(Guid id, [FromBody] UpdateUserRequest request, CancellationToken ct)
    {
        if (!TryGetUserId(out var actor)) return Unauthorized();
        var dto = await _users.UpdateAsync(id, request, actor, ct);
        return dto is null ? NotFound() : Ok(dto);
    }

    // ---- S16-T4: Question Drafts (AI Generator + admin review flow) ----

    /// <summary>S16-T4 / F15: ask the AI service to generate N drafts and
    /// persist them as a batch awaiting admin review.</summary>
    [HttpPost("questions/generate")]
    [ProducesResponseType(typeof(GenerateQuestionDraftsResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
    [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
    [ProducesResponseType(StatusCodes.Status504GatewayTimeout)]
    public async Task<ActionResult<GenerateQuestionDraftsResponse>> GenerateDrafts(
        [FromBody] GenerateQuestionDraftsRequest request,
        CancellationToken ct)
    {
        if (!TryGetUserId(out var actor)) return Unauthorized();
        try
        {
            var response = await _drafts.GenerateAsync(request, actor, ct);
            return Ok(response);
        }
        catch (ArgumentException ex)
        {
            return Problem(detail: ex.Message, statusCode: StatusCodes.Status400BadRequest, title: "InvalidRequest");
        }
        catch (AiGeneratorFailedException ex)
        {
            return Problem(detail: ex.Message, statusCode: ex.HttpStatus, title: "AIGeneratorFailed");
        }
    }

    /// <summary>S16-T4: list the drafts produced by one batch.</summary>
    [HttpGet("questions/drafts/{batchId:guid}")]
    [ProducesResponseType(typeof(IReadOnlyList<QuestionDraftDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IReadOnlyList<QuestionDraftDto>>> GetDraftsBatch(
        Guid batchId,
        CancellationToken ct)
    {
        var rows = await _drafts.GetBatchAsync(batchId, ct);
        return rows is null ? NotFound() : Ok(rows);
    }

    /// <summary>S16-T9: last N batches with their approve/reject ratios — powers
    /// the admin dashboard sparkline widget. Default limit 8; max 50.</summary>
    [HttpGet("questions/drafts/metrics")]
    [ProducesResponseType(typeof(IReadOnlyList<GeneratorBatchMetricDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<GeneratorBatchMetricDto>>> GetGeneratorMetrics(
        [FromQuery] int limit = 8,
        CancellationToken ct = default)
        => Ok(await _drafts.GetRecentBatchMetricsAsync(limit, ct));

    /// <summary>S16-T4: approve a single draft. Atomic: status→Approved +
    /// Questions row inserted + EmbedEntityJob enqueued.</summary>
    [HttpPost("questions/drafts/{id:guid}/approve")]
    [ProducesResponseType(typeof(ApproveResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ApproveResponseDto>> ApproveDraft(
        Guid id,
        [FromBody] ApproveQuestionDraftRequest? edits,
        CancellationToken ct)
    {
        if (!TryGetUserId(out var actor)) return Unauthorized();
        try
        {
            var newId = await _drafts.ApproveAsync(id, edits, actor, ct);
            return newId is null ? NotFound() : Ok(new ApproveResponseDto(newId.Value));
        }
        catch (DraftAlreadyDecidedException ex)
        {
            return Problem(detail: ex.Message, statusCode: StatusCodes.Status409Conflict, title: "DraftAlreadyDecided");
        }
        catch (ArgumentException ex)
        {
            return Problem(detail: ex.Message, statusCode: StatusCodes.Status400BadRequest, title: "InvalidEdit");
        }
    }

    /// <summary>S16-T4: reject a draft (optional reason).</summary>
    [HttpPost("questions/drafts/{id:guid}/reject")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> RejectDraft(
        Guid id,
        [FromBody] RejectQuestionDraftRequest? body,
        CancellationToken ct)
    {
        if (!TryGetUserId(out var actor)) return Unauthorized();
        try
        {
            var ok = await _drafts.RejectAsync(id, body?.Reason, actor, ct);
            return ok ? NoContent() : NotFound();
        }
        catch (DraftAlreadyDecidedException ex)
        {
            return Problem(detail: ex.Message, statusCode: StatusCodes.Status409Conflict, title: "DraftAlreadyDecided");
        }
    }

    public sealed record ApproveResponseDto(Guid QuestionId);

    private bool TryGetUserId(out Guid userId)
    {
        userId = default;
        var sub = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value
                ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(sub, out userId);
    }
}

using System.Security.Claims;
using CodeMentor.Api.Extensions;
using CodeMentor.Application.ProjectAudits;
using CodeMentor.Application.ProjectAudits.Contracts;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace CodeMentor.Api.Controllers;

/// <summary>
/// S9 / F11 (Project Audit — ADR-031). Standalone, learning-path-independent
/// AI audit endpoints. Parallel to <see cref="SubmissionsController"/> but not
/// branched into it.
/// </summary>
[ApiController]
[Route("api/audits")]
[Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
public class AuditsController : ControllerBase
{
    private readonly IProjectAuditService _service;

    public AuditsController(IProjectAuditService service) => _service = service;

    /// <summary>
    /// S9-T3: create a new project audit (GitHub URL or pre-uploaded ZIP).
    /// Persists a <c>ProjectAudit</c> row in Pending state, enqueues
    /// <c>ProjectAuditJob</c>, returns 202 Accepted with the auditId. Rate
    /// limited to 3 audits / 24h / user (S9-T2; ADR-033).
    /// </summary>
    [HttpPost]
    [EnableRateLimiting(RateLimitingExtensions.AuditsCreatePolicy)]
    [ProducesResponseType(typeof(AuditCreatedResponse), StatusCodes.Status202Accepted)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> Create(
        [FromBody] CreateAuditRequest request,
        CancellationToken ct)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();

        var result = await _service.CreateAsync(userId, request, ct);

        if (result.Success)
            return AcceptedAtAction(nameof(Create), new { id = result.Value!.AuditId }, result.Value);

        return result.ErrorCode switch
        {
            AuditErrorCode.BlobNotFound => Problem(
                detail: result.ErrorMessage,
                statusCode: StatusCodes.Status404NotFound,
                title: "BlobNotFound"),
            _ => Problem(
                detail: result.ErrorMessage,
                statusCode: StatusCodes.Status400BadRequest,
                title: result.ErrorCode.ToString()),
        };
    }

    /// <summary>S9-T5: owner-scoped audit detail (status + scores + timestamps).</summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(AuditDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        var dto = await _service.GetAsync(userId, id, ct);
        return dto is null ? NotFound() : Ok(dto);
    }

    /// <summary>
    /// S9-T5: full 8-section audit report. Returns 404 if missing / not owned /
    /// soft-deleted; 409 if not yet Completed (or AI review still pending and no
    /// result row written). Once Completed, returns the structured payload.
    /// </summary>
    [HttpGet("{id:guid}/report")]
    [ProducesResponseType(typeof(AuditReportDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> GetReport(Guid id, CancellationToken ct)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();

        // Distinguish "audit doesn't exist" (404) from "audit exists but isn't ready" (409).
        var summary = await _service.GetAsync(userId, id, ct);
        if (summary is null) return NotFound();

        var report = await _service.GetReportAsync(userId, id, ct);
        if (report is null)
        {
            return Conflict(new
            {
                title = "ReportNotReady",
                status = StatusCodes.Status409Conflict,
                detail = $"Audit is in {summary.Status}/{summary.AiReviewStatus}; report becomes available once Status=Completed and AI review has produced a result row.",
            });
        }

        return Ok(report);
    }

    /// <summary>S9-T5: paginated history (default 20, max 100); excludes soft-deleted.</summary>
    [HttpGet("me")]
    [ProducesResponseType(typeof(AuditListResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> ListMine(
        [FromQuery] int page = 1,
        [FromQuery] int size = 20,
        [FromQuery] DateTime? dateFrom = null,
        [FromQuery] DateTime? dateTo = null,
        [FromQuery] int? scoreMin = null,
        [FromQuery] int? scoreMax = null,
        CancellationToken ct = default)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        var list = await _service.ListMineAsync(
            userId,
            new AuditListQuery(page, size, dateFrom, dateTo, scoreMin, scoreMax),
            ct);
        return Ok(list);
    }

    /// <summary>S9-T5: soft delete (sets <c>IsDeleted=true</c>); 204 on success, 404 if missing/not owned.</summary>
    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        var result = await _service.SoftDeleteAsync(userId, id, ct);
        if (result.Success) return NoContent();
        return result.ErrorCode == AuditErrorCode.NotFound
            ? NotFound()
            : Problem(detail: result.ErrorMessage, statusCode: StatusCodes.Status400BadRequest);
    }

    /// <summary>S9-T5: re-enqueue a Failed audit. 409 on Completed/Pending/Processing.</summary>
    [HttpPost("{id:guid}/retry")]
    [ProducesResponseType(typeof(AuditCreatedResponse), StatusCodes.Status202Accepted)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Retry(Guid id, CancellationToken ct)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();

        var result = await _service.RetryAsync(userId, id, ct);
        if (result.Success)
            return AcceptedAtAction(nameof(GetById), new { id = result.Value!.AuditId }, result.Value);

        return result.ErrorCode switch
        {
            AuditErrorCode.NotFound => NotFound(),
            AuditErrorCode.NotRetryable => Conflict(new { error = result.ErrorMessage }),
            _ => Problem(detail: result.ErrorMessage, statusCode: StatusCodes.Status400BadRequest),
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

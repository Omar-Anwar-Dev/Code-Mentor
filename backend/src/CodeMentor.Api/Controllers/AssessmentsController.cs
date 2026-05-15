using System.Security.Claims;
using CodeMentor.Application.Assessments;
using CodeMentor.Application.Assessments.Contracts;
using CodeMentor.Application.Auth;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CodeMentor.Api.Controllers;

[ApiController]
[Route("api/assessments")]
[Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
public class AssessmentsController : ControllerBase
{
    private readonly IAssessmentService _service;

    public AssessmentsController(IAssessmentService service) => _service = service;

    [HttpPost]
    [ProducesResponseType(typeof(StartAssessmentResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Start([FromBody] StartAssessmentRequest req, CancellationToken ct)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();

        var result = await _service.StartAsync(userId, req, ct);
        if (result.Success) return Ok(result.Value);

        var status = result.ErrorMessage?.StartsWith("You can retake", StringComparison.OrdinalIgnoreCase) == true
            ? StatusCodes.Status409Conflict
            : StatusCodes.Status400BadRequest;
        return Problem(detail: result.ErrorMessage, statusCode: status, title: result.ErrorCode.ToString());
    }

    [HttpPost("{id:guid}/answers")]
    [ProducesResponseType(typeof(AnswerResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Answer(
        Guid id,
        [FromBody] AnswerRequest req,
        [FromHeader(Name = "Idempotency-Key")] string? idempotencyKey,
        CancellationToken ct)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();

        var result = await _service.SubmitAnswerAsync(userId, id, req, idempotencyKey, ct);
        if (result.Success) return Ok(result.Value);

        var status = result.ErrorCode == AuthErrorCode.UserNotFound
            ? StatusCodes.Status404NotFound
            : StatusCodes.Status400BadRequest;
        return Problem(detail: result.ErrorMessage, statusCode: status, title: result.ErrorCode.ToString());
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(AssessmentResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();

        var result = await _service.GetByIdAsync(userId, id, ct);
        return result.Success
            ? Ok(result.Value)
            : NotFound();
    }

    [HttpGet("me/latest")]
    [ProducesResponseType(typeof(AssessmentResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Latest(CancellationToken ct)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();

        var result = await _service.GetLatestAsync(userId, ct);
        if (!result.Success) return NotFound();
        return result.Value is null ? NoContent() : Ok(result.Value);
    }

    [HttpPost("{id:guid}/abandon")]
    [ProducesResponseType(typeof(AssessmentResultDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Abandon(Guid id, CancellationToken ct)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();

        var result = await _service.AbandonAsync(userId, id, ct);
        return result.Success ? Ok(result.Value) : NotFound();
    }

    /// <summary>S17-T3 / F15: returns the AI-generated 3-paragraph summary for one
    /// Completed assessment. 409 Conflict while the Hangfire job is still in flight
    /// (FE polls at 1.5s cadence), 200 OK with payload once the row exists.</summary>
    [HttpGet("{id:guid}/summary")]
    [ProducesResponseType(typeof(AssessmentSummaryDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Summary(Guid id, CancellationToken ct)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();

        var result = await _service.GetSummaryAsync(userId, id, ct);
        if (!result.Success) return NotFound();
        if (result.Value is null)
        {
            return Problem(
                detail: "Summary is being generated. Please retry shortly.",
                statusCode: StatusCodes.Status409Conflict,
                title: "SummaryPending");
        }
        return Ok(result.Value);
    }

    private bool TryGetUserId(out Guid userId)
    {
        userId = Guid.Empty;
        var sub = User.FindFirstValue(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)
            ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        return sub is not null && Guid.TryParse(sub, out userId);
    }
}

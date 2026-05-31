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

    /// <summary>S21-T1 / F16: start the optional 10-question mini reassessment.
    /// Requires an active path at ≥ 50%; no Mini yet for that path. Bypasses
    /// the 30-day cooldown; draws items not in any prior AssessmentResponse;
    /// seeds IRT theta from LearnerSkillProfile.</summary>
    [HttpPost("me/mini-reassessment")]
    [ProducesResponseType(typeof(StartAssessmentResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> StartMiniReassessment(CancellationToken ct)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();

        var result = await _service.StartMiniReassessmentAsync(userId, ct);
        if (result.Success) return Ok(result.Value);

        var msg = result.ErrorMessage ?? string.Empty;
        var status = msg.Contains("already exists", StringComparison.OrdinalIgnoreCase)
                     || msg.Contains("already completed", StringComparison.OrdinalIgnoreCase)
            ? StatusCodes.Status409Conflict
            : StatusCodes.Status400BadRequest;
        return Problem(detail: result.ErrorMessage, statusCode: status, title: result.ErrorCode.ToString());
    }

    /// <summary>S21-T1 / F16: start the mandatory 30-question full reassessment
    /// after path 100%. Required before "Generate Next Phase Path". One per
    /// path; bypasses the 30-day cooldown.</summary>
    [HttpPost("me/full-reassessment")]
    [ProducesResponseType(typeof(StartAssessmentResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> StartFullReassessment(CancellationToken ct)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();

        var result = await _service.StartFullReassessmentAsync(userId, ct);
        if (result.Success) return Ok(result.Value);

        var msg = result.ErrorMessage ?? string.Empty;
        var status = msg.Contains("already completed", StringComparison.OrdinalIgnoreCase)
            ? StatusCodes.Status409Conflict
            : StatusCodes.Status400BadRequest;
        return Problem(detail: result.ErrorMessage, statusCode: status, title: result.ErrorCode.ToString());
    }

    /// <summary>S21-T2 / F16: cheap lookup used by the FE to decide whether to
    /// render the 50% mini-reassessment banner. Returns a single boolean.
    /// </summary>
    [HttpGet("me/mini-reassessment/eligibility")]
    [ProducesResponseType(typeof(MiniReassessmentEligibilityDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> MiniEligibility(CancellationToken ct)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        var eligible = await _service.IsMiniReassessmentEligibleAsync(userId, ct);
        return Ok(new MiniReassessmentEligibilityDto(eligible));
    }

    /// <summary>S21-T2 / F16: response shape for the eligibility endpoint.</summary>
    public sealed record MiniReassessmentEligibilityDto(bool Eligible);

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

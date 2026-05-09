using System.Security.Claims;
using CodeMentor.Api.Extensions;
using CodeMentor.Application.CodeReview;
using CodeMentor.Application.CodeReview.Contracts;
using CodeMentor.Application.Submissions;
using CodeMentor.Application.Submissions.Contracts;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace CodeMentor.Api.Controllers;

[ApiController]
[Route("api/submissions")]
[Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
public class SubmissionsController : ControllerBase
{
    private readonly ISubmissionService _service;
    private readonly IFeedbackRatingService _ratings;
    private readonly ApplicationDbContext _db;

    public SubmissionsController(
        ISubmissionService service,
        IFeedbackRatingService ratings,
        ApplicationDbContext db)
    {
        _service = service;
        _ratings = ratings;
        _db = db;
    }

    /// <summary>
    /// S4-T4: accept a code submission (GitHub URL or pre-uploaded ZIP).
    /// Creates a Submission row in Pending state, enqueues the analysis job
    /// (stub in Sprint 4), and returns 202 Accepted with the submissionId.
    /// </summary>
    [HttpPost]
    [EnableRateLimiting(RateLimitingExtensions.SubmissionsCreatePolicy)]
    [ProducesResponseType(typeof(SubmissionCreatedResponse), StatusCodes.Status202Accepted)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> Create(
        [FromBody] CreateSubmissionRequest request,
        CancellationToken ct)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();

        var result = await _service.CreateAsync(userId, request, ct);

        if (result.Success)
            return AcceptedAtAction(nameof(Create), new { id = result.Value!.SubmissionId }, result.Value);

        return result.ErrorCode switch
        {
            SubmissionErrorCode.TaskNotFound => Problem(
                detail: result.ErrorMessage, statusCode: StatusCodes.Status404NotFound, title: "TaskNotFound"),
            _ => Problem(
                detail: result.ErrorMessage,
                statusCode: StatusCodes.Status400BadRequest,
                title: result.ErrorCode.ToString()),
        };
    }

    /// <summary>S4-T7: submission status + detail (owner-scoped).</summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(SubmissionDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        var dto = await _service.GetAsync(userId, id, ct);
        return dto is null ? NotFound() : Ok(dto);
    }

    /// <summary>S4-T7: paginated history (default 20, max 100).</summary>
    [HttpGet("me")]
    [ProducesResponseType(typeof(SubmissionListResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> ListMine(
        [FromQuery] int page = 1,
        [FromQuery] int size = 20,
        CancellationToken ct = default)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        var list = await _service.ListMineAsync(userId, page, size, ct);
        return Ok(list);
    }

    /// <summary>S4-T7: retry a Failed submission. 409 on Completed/Processing/Pending.</summary>
    [HttpPost("{id:guid}/retry")]
    [ProducesResponseType(typeof(SubmissionCreatedResponse), StatusCodes.Status202Accepted)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Retry(Guid id, CancellationToken ct)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();

        var result = await _service.RetryAsync(userId, id, ct);
        if (result.Success)
            return AcceptedAtAction(nameof(GetById), new { id = result.Value!.SubmissionId }, result.Value);

        return result.ErrorCode switch
        {
            SubmissionErrorCode.NotFound => NotFound(),
            SubmissionErrorCode.NotRetryable => Conflict(new { error = result.ErrorMessage }),
            _ => Problem(detail: result.ErrorMessage, statusCode: StatusCodes.Status400BadRequest),
        };
    }

    /// <summary>
    /// S6-T7: unified feedback payload for a Completed submission.
    /// Returns 404 if the submission is not owned by the caller, doesn't exist,
    /// is not yet <see cref="CodeMentor.Domain.Submissions.SubmissionStatus.Completed"/>,
    /// or has no AI analysis row yet (e.g. AI portion still Unavailable / Pending).
    /// The payload is whatever <c>FeedbackAggregator</c> wrote into
    /// <c>AIAnalysisResult.FeedbackJson</c> on completion (S6-T5).
    /// </summary>
    [HttpGet("{id:guid}/feedback")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetFeedback(Guid id, CancellationToken ct)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();

        var feedbackJson = await _db.Submissions
            .AsNoTracking()
            .Where(s => s.Id == id
                     && s.UserId == userId
                     && s.Status == CodeMentor.Domain.Submissions.SubmissionStatus.Completed)
            .Join(_db.AIAnalysisResults.AsNoTracking(),
                s => s.Id,
                ai => ai.SubmissionId,
                (s, ai) => ai.FeedbackJson)
            .FirstOrDefaultAsync(ct);

        if (feedbackJson is null) return NotFound();

        // FeedbackJson is the canonical unified payload — stream it as-is so we
        // don't pay for a deserialize/re-serialize round-trip on every request.
        return Content(feedbackJson, "application/json");
    }

    /// <summary>S8-T7 / SF4: thumbs up/down per category on feedback. Idempotent
    /// upsert — repeat calls overwrite the existing vote.</summary>
    [HttpPost("{id:guid}/rating")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RateFeedback(
        Guid id, [FromBody] RateFeedbackRequest request, CancellationToken ct)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        if (request is null) return BadRequest(new { error = "Body required." });

        var result = await _ratings.RateAsync(userId, id, request, ct);
        return result switch
        {
            RateFeedbackResult.Saved => NoContent(),
            RateFeedbackResult.NotFound => NotFound(),
            RateFeedbackResult.ValidationFailed => BadRequest(new
            {
                error = "Category must be one of correctness/readability/security/performance/design and Vote must be 'up' or 'down'.",
            }),
            _ => StatusCode(StatusCodes.Status500InternalServerError),
        };
    }

    /// <summary>S8-T7 / SF4: read all current per-category ratings on this submission's feedback.</summary>
    [HttpGet("{id:guid}/rating")]
    [ProducesResponseType(typeof(IReadOnlyList<FeedbackRatingDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetFeedbackRatings(Guid id, CancellationToken ct)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        return Ok(await _ratings.GetRatingsAsync(userId, id, ct));
    }

    /// <summary>
    /// S5-T9: admin-only raw per-tool static-analysis results for a submission.
    /// Used for demo + debugging; NOT part of the public learner API.
    /// Returns 200 with per-tool blocks, 404 if submission missing.
    /// </summary>
    [HttpGet("{id:guid}/static-results")]
    [Authorize(Policy = "RequireAdmin")]
    [ProducesResponseType(typeof(IReadOnlyList<RawStaticResultDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetStaticResults(Guid id, CancellationToken ct)
    {
        var submissionExists = await _db.Submissions.AsNoTracking().AnyAsync(s => s.Id == id, ct);
        if (!submissionExists) return NotFound();

        var rows = await _db.StaticAnalysisResults
            .AsNoTracking()
            .Where(r => r.SubmissionId == id)
            .OrderBy(r => r.Tool)
            .Select(r => new RawStaticResultDto(
                r.Tool.ToString(),
                r.IssuesJson,
                r.MetricsJson,
                r.ExecutionTimeMs,
                r.ProcessedAt))
            .ToListAsync(ct);

        return Ok(rows);
    }

    public record RawStaticResultDto(
        string Tool,
        string IssuesJson,
        string? MetricsJson,
        int ExecutionTimeMs,
        DateTime ProcessedAt);

    private bool TryGetUserId(out Guid userId)
    {
        userId = Guid.Empty;
        var sub = User.FindFirstValue(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)
            ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        return sub is not null && Guid.TryParse(sub, out userId);
    }
}

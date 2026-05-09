using CodeMentor.Application.LearningCV;
using CodeMentor.Application.LearningCV.Contracts;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CodeMentor.Api.Controllers;

/// <summary>
/// S7-T4: anonymous public CV view at <c>GET /api/public/cv/{slug}</c>.
/// Returns 404 for unknown slugs OR private CVs (per architecture §6.6); on a
/// successful read the email field is redacted and the view counter increments
/// once per IP per 24h.
/// </summary>
[ApiController]
[Route("api/public/cv")]
[AllowAnonymous]
public class PublicCVController : ControllerBase
{
    private readonly ILearningCVService _service;

    public PublicCVController(ILearningCVService service) => _service = service;

    [HttpGet("{slug}")]
    [ProducesResponseType(typeof(LearningCVDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<LearningCVDto>> Get(string slug, CancellationToken ct)
    {
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        var cv = await _service.GetPublicAsync(slug, ip, ct);
        return cv is null ? NotFound() : Ok(cv);
    }
}

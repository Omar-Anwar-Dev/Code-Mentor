using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using CodeMentor.Application.LearningCV;
using CodeMentor.Application.LearningCV.Contracts;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CodeMentor.Api.Controllers;

[ApiController]
[Route("api/learning-cv")]
[Authorize]
public class LearningCVController : ControllerBase
{
    private readonly ILearningCVService _service;
    private readonly ILearningCVPdfRenderer _pdf;

    public LearningCVController(ILearningCVService service, ILearningCVPdfRenderer pdf)
    {
        _service = service;
        _pdf = pdf;
    }

    /// <summary>S7-T2: aggregate the learner's CV view (owner-scoped).</summary>
    [HttpGet("me")]
    [ProducesResponseType(typeof(LearningCVDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<LearningCVDto>> GetMine(CancellationToken ct)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        var cv = await _service.GetMineAsync(userId, ct);
        return Ok(cv);
    }

    /// <summary>S7-T3: privacy toggle + lazy slug generation on first publish.</summary>
    [HttpPatch("me")]
    [ProducesResponseType(typeof(LearningCVDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<LearningCVDto>> UpdateMine(
        [FromBody] UpdateLearningCVRequest request,
        CancellationToken ct)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        var cv = await _service.UpdateMineAsync(userId, request, ct);
        return Ok(cv);
    }

    /// <summary>S7-T5: download an A4-styled PDF of the learner's CV.</summary>
    [HttpGet("me/pdf")]
    [ProducesResponseType(typeof(FileContentResult), StatusCodes.Status200OK)]
    public async Task<IActionResult> DownloadPdf(CancellationToken ct)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        var cv = await _service.GetMineAsync(userId, ct);
        var bytes = _pdf.Render(cv);
        var safeName = SafeFileName(cv.Profile.FullName);
        return File(bytes, "application/pdf", $"learning-cv-{safeName}.pdf");
    }

    private static string SafeFileName(string fullName)
    {
        var trimmed = (fullName ?? "learner").Trim();
        var sb = new System.Text.StringBuilder(trimmed.Length);
        foreach (var ch in trimmed)
        {
            if (char.IsLetterOrDigit(ch)) sb.Append(char.ToLowerInvariant(ch));
            else if (sb.Length > 0 && sb[^1] != '-') sb.Append('-');
        }
        var slug = sb.ToString().Trim('-');
        return string.IsNullOrEmpty(slug) ? "learner" : slug;
    }

    private bool TryGetUserId(out Guid userId)
    {
        userId = default;
        var sub = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value
                ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(sub, out userId);
    }
}

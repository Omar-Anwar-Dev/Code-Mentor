using System.Security.Claims;
using CodeMentor.Application.Gamification;
using CodeMentor.Application.Gamification.Contracts;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CodeMentor.Api.Controllers;

[ApiController]
[Route("api/gamification")]
[Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
public class GamificationController : ControllerBase
{
    private readonly IGamificationProfileService _service;

    public GamificationController(IGamificationProfileService service) => _service = service;

    /// <summary>S8-T3: total XP, computed level, earned badges, recent transactions.</summary>
    [HttpGet("me")]
    [ProducesResponseType(typeof(GamificationProfileDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMine(CancellationToken ct)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        return Ok(await _service.GetMineAsync(userId, ct));
    }

    /// <summary>S8-T3: full badge catalog with per-user IsEarned flag (for badge gallery).</summary>
    [HttpGet("badges")]
    [ProducesResponseType(typeof(BadgeCatalogDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetBadges(CancellationToken ct)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        return Ok(await _service.GetCatalogAsync(userId, ct));
    }

    private bool TryGetUserId(out Guid userId)
    {
        userId = Guid.Empty;
        var sub = User.FindFirstValue(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)
            ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        return sub is not null && Guid.TryParse(sub, out userId);
    }
}

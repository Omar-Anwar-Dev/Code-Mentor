using System.Security.Claims;
using CodeMentor.Application.UserSettings;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CodeMentor.Api.Controllers;

/// <summary>
/// S14-T2 / ADR-046: read + partial-update for the caller's
/// <c>UserSettings</c>. GET is idempotent + lazy-inits a default row if absent;
/// PATCH applies only the fields the client supplies. No path-param userId —
/// the endpoint always scopes to the caller (no admin-on-behalf-of pattern).
/// </summary>
[ApiController]
[Route("api/user/settings")]
[Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
public class UserSettingsController : ControllerBase
{
    private readonly IUserSettingsService _service;

    public UserSettingsController(IUserSettingsService service)
    {
        _service = service;
    }

    [HttpGet]
    [ProducesResponseType(typeof(UserSettingsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        var dto = await _service.GetForUserAsync(userId, ct);
        return Ok(dto);
    }

    [HttpPatch]
    [ProducesResponseType(typeof(UserSettingsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Patch(
        [FromBody] UserSettingsPatchRequest patch,
        CancellationToken ct)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        if (patch is null) return BadRequest(new { error = "empty_body" });

        var dto = await _service.UpdateForUserAsync(userId, patch, ct);
        return Ok(dto);
    }

    private bool TryGetUserId(out Guid userId)
    {
        userId = Guid.Empty;
        var sub = User.FindFirstValue(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)
            ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        return sub is not null && Guid.TryParse(sub, out userId);
    }
}

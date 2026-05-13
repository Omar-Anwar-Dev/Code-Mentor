using System.Security.Claims;
using CodeMentor.Application.UserAccountDeletion;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CodeMentor.Api.Controllers;

/// <summary>
/// S14-T9 / ADR-046: account-deletion endpoints. Three surfaces:
/// <list type="bullet">
///   <item><c>POST /api/user/account/delete</c> — request deletion. Idempotent
///   per ADR-046 Q2.</item>
///   <item><c>DELETE /api/user/account/delete</c> — explicit cancel of a
///   pending request (alternative to login-auto-cancel) per ADR-046 Q4.</item>
///   <item><c>GET /api/user/account/delete</c> — read the active request, if
///   any (FE Settings page uses this for the countdown banner).</item>
/// </list>
/// </summary>
[ApiController]
[Route("api/user/account/delete")]
[Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
public class AccountDeletionController : ControllerBase
{
    private readonly IUserAccountDeletionService _service;

    public AccountDeletionController(IUserAccountDeletionService service)
    {
        _service = service;
    }

    public sealed record RequestDeletionBody(string? Reason);

    [HttpPost]
    [ProducesResponseType(typeof(InitiateDeletionResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> RequestDeletion([FromBody] RequestDeletionBody? body, CancellationToken ct)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();

        var result = await _service.RequestDeletionAsync(userId, body?.Reason, ct);
        return Ok(result);
    }

    [HttpDelete]
    [ProducesResponseType(typeof(CancelDeletionResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Cancel(CancellationToken ct)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();

        var result = await _service.CancelDeletionAsync(userId, ct);
        return Ok(result);
    }

    [HttpGet]
    [ProducesResponseType(typeof(DeletionRequestStatus), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetActive(CancellationToken ct)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();

        var result = await _service.GetActiveAsync(userId, ct);
        return Ok(result);
    }

    private bool TryGetUserId(out Guid userId)
    {
        userId = Guid.Empty;
        var sub = User.FindFirstValue(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)
            ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        return sub is not null && Guid.TryParse(sub, out userId);
    }
}

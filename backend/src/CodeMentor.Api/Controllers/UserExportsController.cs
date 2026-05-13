using System.Security.Claims;
using CodeMentor.Application.UserExports;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CodeMentor.Api.Controllers;

/// <summary>
/// S14-T8 / ADR-046: data export. <c>POST /api/user/export</c> enqueues a
/// background job that compiles the user's full account data (6 JSON files +
/// PDF dossier) into a ZIP archive, uploads to blob storage, and emails the
/// user a 1-hour signed download URL. The endpoint returns 202 immediately
/// (or 200 — kept as 200 for FE-toast UX consistency); the user receives a
/// data-export-ready notification + email when the ZIP is ready.
/// </summary>
[ApiController]
[Route("api/user/export")]
[Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
public class UserExportsController : ControllerBase
{
    private readonly IUserDataExportService _service;

    public UserExportsController(IUserDataExportService service)
    {
        _service = service;
    }

    [HttpPost]
    [ProducesResponseType(typeof(InitiateExportResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Initiate(CancellationToken ct)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();

        var response = await _service.InitiateAsync(userId, ct);
        return Ok(response);
    }

    private bool TryGetUserId(out Guid userId)
    {
        userId = Guid.Empty;
        var sub = User.FindFirstValue(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)
            ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        return sub is not null && Guid.TryParse(sub, out userId);
    }
}

using CodeMentor.Application.Admin;
using CodeMentor.Application.Admin.Contracts;
using CodeMentor.Application.Audit;
using CodeMentor.Infrastructure.Identity;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace CodeMentor.Infrastructure.Admin;

/// <summary>
/// S7-T9: admin user list + deactivate.
///
/// Deactivation is implemented via Identity's lockout window — a far-future
/// <see cref="ApplicationUser.LockoutEnd"/> value blocks new logins without
/// touching the row's referential integrity (assessments, submissions, paths,
/// CV all FK on <see cref="ApplicationUser.Id"/>). Reactivating clears the
/// lockout.
/// </summary>
public sealed class AdminUserService : IAdminUserService
{
    /// <summary>
    /// Sentinel "far future" lockout end. Identity treats any future value as
    /// "locked." Picking 100 years out is conservative and easy to recognise.
    /// </summary>
    public static readonly DateTimeOffset DeactivatedLockoutEnd = new(2200, 1, 1, 0, 0, 0, TimeSpan.Zero);

    private readonly ApplicationDbContext _db;
    private readonly UserManager<ApplicationUser> _users;
    private readonly IAuditLogger _audit;

    public AdminUserService(ApplicationDbContext db, UserManager<ApplicationUser> users, IAuditLogger audit)
    {
        _db = db;
        _users = users;
        _audit = audit;
    }

    public async Task<PagedResult<AdminUserDto>> ListAsync(int page, int pageSize, string? search, bool includeDeleted = false, CancellationToken ct = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = _users.Users.AsNoTracking();
        if (!includeDeleted)
        {
            // S14-T9 / ADR-046: hide soft-deleted (in cooling-off) users by default.
            query = query.Where(u => !u.IsDeleted);
        }
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim();
            query = query.Where(u =>
                (u.Email != null && EF.Functions.Like(u.Email, $"%{s}%"))
                || EF.Functions.Like(u.FullName, $"%{s}%"));
        }

        var total = await query.CountAsync(ct);
        var items = await query
            .OrderBy(u => u.Email)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        // Roles are pulled per-user via UserManager so the projection sees the
        // canonical Identity role mapping (joins through UserRoles + Roles).
        var dtos = new List<AdminUserDto>(items.Count);
        foreach (var u in items)
        {
            var roles = await _users.GetRolesAsync(u);
            dtos.Add(Map(u, roles));
        }

        return new PagedResult<AdminUserDto>(dtos, page, pageSize, total);
    }

    public async Task<AdminUserDto?> UpdateAsync(Guid userId, UpdateUserRequest request, Guid actorUserId, CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(request);
        var user = await _users.FindByIdAsync(userId.ToString());
        if (user is null) return null;

        var rolesBefore = await _users.GetRolesAsync(user);
        var before = Map(user, rolesBefore);

        if (request.IsActive.HasValue)
        {
            user.LockoutEnd = request.IsActive.Value ? null : DeactivatedLockoutEnd;
        }

        user.UpdatedAt = DateTime.UtcNow;
        var update = await _users.UpdateAsync(user);
        if (!update.Succeeded) return null;

        if (!string.IsNullOrWhiteSpace(request.Role))
        {
            var existing = await _users.GetRolesAsync(user);
            await _users.RemoveFromRolesAsync(user, existing);
            await _users.AddToRoleAsync(user, request.Role);
        }

        var rolesAfter = await _users.GetRolesAsync(user);
        var after = Map(user, rolesAfter);

        // Action name reflects what actually changed. Reactivation, deactivation,
        // and role change are all surfaced as distinct entries — easier to audit.
        var action = request.IsActive.HasValue
            ? (request.IsActive.Value ? "ActivateUser" : "DeactivateUser")
            : "UpdateUser";
        await _audit.LogAsync(action, "User", user.Id.ToString("N"),
            oldValue: before, newValue: after, actorUserId, ct);

        return after;
    }

    private static AdminUserDto Map(ApplicationUser u, IList<string> roles) => new(
        u.Id,
        u.Email ?? string.Empty,
        u.FullName,
        roles.ToList(),
        IsActive: u.LockoutEnd is null || u.LockoutEnd <= DateTimeOffset.UtcNow,
        IsEmailVerified: u.EmailConfirmed,
        CreatedAt: u.CreatedAt,
        LockoutEndUtc: u.LockoutEnd?.UtcDateTime);
}

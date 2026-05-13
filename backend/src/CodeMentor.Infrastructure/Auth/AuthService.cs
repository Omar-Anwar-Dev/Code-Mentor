using CodeMentor.Application.Auth;
using CodeMentor.Application.Auth.Contracts;
using CodeMentor.Application.UserAccountDeletion;
using CodeMentor.Infrastructure.Identity;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace CodeMentor.Infrastructure.Auth;

public sealed class AuthService : IAuthService
{
    private readonly UserManager<ApplicationUser> _users;
    private readonly ApplicationDbContext _db;
    private readonly IJwtTokenService _jwt;
    private readonly JwtOptions _options;
    private readonly IUserAccountDeletionService _accountDeletion;
    private readonly ILogger<AuthService> _logger;

    public AuthService(
        UserManager<ApplicationUser> users,
        ApplicationDbContext db,
        IJwtTokenService jwt,
        IOptions<JwtOptions> options,
        IUserAccountDeletionService accountDeletion,
        ILogger<AuthService> logger)
    {
        _users = users;
        _db = db;
        _jwt = jwt;
        _options = options.Value;
        _accountDeletion = accountDeletion;
        _logger = logger;
    }

    public async Task<AuthResult<AuthResponse>> RegisterAsync(RegisterRequest request, string? ip, CancellationToken ct = default)
    {
        if (await _users.FindByEmailAsync(request.Email) is not null)
            return AuthResult<AuthResponse>.Fail(AuthErrorCode.EmailAlreadyExists, "Email is already registered.");

        var user = new ApplicationUser
        {
            Id = Guid.NewGuid(),
            UserName = request.Email,
            Email = request.Email,
            FullName = request.FullName,
            GitHubUsername = request.GitHubUsername,
        };

        var result = await _users.CreateAsync(user, request.Password);
        if (!result.Succeeded)
        {
            var msg = string.Join("; ", result.Errors.Select(e => e.Description));
            var isWeak = result.Errors.Any(e => e.Code.StartsWith("Password", StringComparison.OrdinalIgnoreCase));
            return AuthResult<AuthResponse>.Fail(
                isWeak ? AuthErrorCode.WeakPassword : AuthErrorCode.ValidationError, msg);
        }

        await _users.AddToRoleAsync(user, ApplicationRoles.Learner);
        return AuthResult<AuthResponse>.Ok(await IssueTokensAsync(user, ip, ct));
    }

    public async Task<AuthResult<AuthResponse>> LoginAsync(LoginRequest request, string? ip, CancellationToken ct = default)
    {
        var user = await _users.FindByEmailAsync(request.Email);
        if (user is null)
            return AuthResult<AuthResponse>.Fail(AuthErrorCode.InvalidCredentials, "Invalid email or password.");

        if (await _users.IsLockedOutAsync(user))
            return AuthResult<AuthResponse>.Fail(AuthErrorCode.Locked, "Account temporarily locked due to failed attempts.");

        if (!await _users.CheckPasswordAsync(user, request.Password))
        {
            await _users.AccessFailedAsync(user);
            return AuthResult<AuthResponse>.Fail(AuthErrorCode.InvalidCredentials, "Invalid email or password.");
        }

        await _users.ResetAccessFailedCountAsync(user);

        // S14-T9 / ADR-046: Spotify-model auto-cancel hook. If the user has an active
        // deletion request in the 30-day cooling-off window, logging in cancels it.
        // No-op for the vast majority of logins (single indexed lookup, < 1ms).
        await _accountDeletion.AutoCancelOnLoginAsync(user.Id, ct);

        return AuthResult<AuthResponse>.Ok(await IssueTokensAsync(user, ip, ct));
    }

    public async Task<AuthResult<AuthResponse>> RefreshAsync(string refreshToken, string? ip, CancellationToken ct = default)
    {
        var hash = _jwt.Hash(refreshToken);
        var existing = await _db.RefreshTokens
            .Include(rt => rt.User)
            .FirstOrDefaultAsync(rt => rt.TokenHash == hash, ct);

        if (existing is null)
            return AuthResult<AuthResponse>.Fail(AuthErrorCode.InvalidRefreshToken, "Refresh token is invalid.");

        if (existing.IsRevoked)
            return AuthResult<AuthResponse>.Fail(AuthErrorCode.RefreshTokenRevoked, "Refresh token has been revoked.");

        if (existing.IsExpired)
            return AuthResult<AuthResponse>.Fail(AuthErrorCode.RefreshTokenExpired, "Refresh token has expired.");

        existing.RevokedAt = DateTime.UtcNow;
        var newTokens = await IssueTokensAsync(existing.User, ip, ct);
        existing.ReplacedByTokenHash = _jwt.Hash(newTokens.RefreshToken);
        await _db.SaveChangesAsync(ct);

        return AuthResult<AuthResponse>.Ok(newTokens);
    }

    public async Task<bool> LogoutAsync(string refreshToken, CancellationToken ct = default)
    {
        var hash = _jwt.Hash(refreshToken);
        var existing = await _db.RefreshTokens.FirstOrDefaultAsync(rt => rt.TokenHash == hash, ct);
        if (existing is null || existing.IsRevoked) return false;

        existing.RevokedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<AuthResult<UserDto>> GetMeAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await _users.FindByIdAsync(userId.ToString());
        if (user is null)
            return AuthResult<UserDto>.Fail(AuthErrorCode.UserNotFound, "User not found.");

        var roles = await _users.GetRolesAsync(user);
        return AuthResult<UserDto>.Ok(ToDto(user, roles));
    }

    public async Task<AuthResult<UserDto>> UpdateProfileAsync(Guid userId, UpdateProfileRequest request, CancellationToken ct = default)
    {
        var user = await _users.FindByIdAsync(userId.ToString());
        if (user is null)
            return AuthResult<UserDto>.Fail(AuthErrorCode.UserNotFound, "User not found.");

        if (!string.IsNullOrWhiteSpace(request.FullName))
            user.FullName = request.FullName.Trim();

        if (request.GitHubUsername is not null)
            user.GitHubUsername = string.IsNullOrWhiteSpace(request.GitHubUsername) ? null : request.GitHubUsername.Trim();

        if (request.ProfilePictureUrl is not null)
            user.ProfilePictureUrl = string.IsNullOrWhiteSpace(request.ProfilePictureUrl) ? null : request.ProfilePictureUrl.Trim();

        user.UpdatedAt = DateTime.UtcNow;

        var result = await _users.UpdateAsync(user);
        if (!result.Succeeded)
        {
            var msg = string.Join("; ", result.Errors.Select(e => e.Description));
            return AuthResult<UserDto>.Fail(AuthErrorCode.ValidationError, msg);
        }

        var roles = await _users.GetRolesAsync(user);
        return AuthResult<UserDto>.Ok(ToDto(user, roles));
    }

    private async Task<AuthResponse> IssueTokensAsync(ApplicationUser user, string? ip, CancellationToken ct)
    {
        var roles = await _users.GetRolesAsync(user);
        var (access, accessExpires) = _jwt.IssueAccessToken(user.Id, user.Email!, roles);
        var (refreshPlain, refreshHash) = _jwt.IssueRefreshToken();

        _db.RefreshTokens.Add(new RefreshToken
        {
            UserId = user.Id,
            TokenHash = refreshHash,
            ExpiresAt = DateTime.UtcNow.AddDays(_options.RefreshTokenDays),
            CreatedByIp = ip,
        });
        await _db.SaveChangesAsync(ct);

        return new AuthResponse(access, refreshPlain, accessExpires, ToDto(user, roles));
    }

    private static UserDto ToDto(ApplicationUser user, IList<string> roles) => new(
        user.Id,
        user.Email ?? string.Empty,
        user.FullName,
        user.GitHubUsername,
        user.ProfilePictureUrl,
        roles.ToList().AsReadOnly(),
        user.EmailConfirmed,
        user.CreatedAt);
}

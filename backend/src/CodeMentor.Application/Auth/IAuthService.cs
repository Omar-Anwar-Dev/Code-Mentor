using CodeMentor.Application.Auth.Contracts;

namespace CodeMentor.Application.Auth;

public interface IAuthService
{
    Task<AuthResult<AuthResponse>> RegisterAsync(RegisterRequest request, string? ip, CancellationToken ct = default);
    Task<AuthResult<AuthResponse>> LoginAsync(LoginRequest request, string? ip, CancellationToken ct = default);
    Task<AuthResult<AuthResponse>> RefreshAsync(string refreshToken, string? ip, CancellationToken ct = default);
    Task<bool> LogoutAsync(string refreshToken, CancellationToken ct = default);
    Task<AuthResult<UserDto>> GetMeAsync(Guid userId, CancellationToken ct = default);
    Task<AuthResult<UserDto>> UpdateProfileAsync(Guid userId, UpdateProfileRequest request, CancellationToken ct = default);
}

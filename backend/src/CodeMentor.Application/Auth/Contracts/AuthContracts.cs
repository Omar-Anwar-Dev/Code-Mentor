namespace CodeMentor.Application.Auth.Contracts;

public sealed record RegisterRequest(
    string Email,
    string Password,
    string FullName,
    string? GitHubUsername);

public sealed record LoginRequest(string Email, string Password);

public sealed record RefreshRequest(string RefreshToken);

public sealed record UpdateProfileRequest(
    string? FullName,
    string? GitHubUsername,
    string? ProfilePictureUrl);

public sealed record UserDto(
    Guid Id,
    string Email,
    string FullName,
    string? GitHubUsername,
    string? ProfilePictureUrl,
    IReadOnlyList<string> Roles,
    bool IsEmailVerified,
    DateTime CreatedAt);

public sealed record AuthResponse(
    string AccessToken,
    string RefreshToken,
    DateTime AccessTokenExpiresAt,
    UserDto User);

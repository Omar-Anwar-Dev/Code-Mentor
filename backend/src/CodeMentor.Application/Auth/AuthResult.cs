namespace CodeMentor.Application.Auth;

public enum AuthErrorCode
{
    None = 0,
    EmailAlreadyExists,
    InvalidCredentials,
    UserNotFound,
    InvalidRefreshToken,
    RefreshTokenExpired,
    RefreshTokenRevoked,
    WeakPassword,
    ValidationError,
    Locked,
}

public sealed record AuthResult<T>(bool Success, T? Value, AuthErrorCode ErrorCode, string? ErrorMessage)
{
    public static AuthResult<T> Ok(T value) => new(true, value, AuthErrorCode.None, null);

    public static AuthResult<T> Fail(AuthErrorCode code, string message)
        => new(false, default, code, message);
}

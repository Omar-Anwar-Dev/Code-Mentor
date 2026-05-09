using CodeMentor.Application.Auth.Contracts;

namespace CodeMentor.Application.Auth;

public interface IGitHubOAuthService
{
    /// <summary>
    /// Returns the GitHub authorize URL + a state nonce to verify on callback.
    /// </summary>
    (string authorizeUrl, string state) BuildLoginUrl();

    /// <summary>
    /// Exchanges the code for a token, fetches the GitHub profile, creates or links
    /// the local user, and issues our JWT + refresh token pair.
    /// </summary>
    Task<AuthResult<AuthResponse>> HandleCallbackAsync(
        string code,
        string state,
        string? expectedState,
        string? ip,
        CancellationToken ct = default);
}

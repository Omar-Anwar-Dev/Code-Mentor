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

    // ====================================================================
    // S14-T7 / ADR-046: link-mode OAuth for an ALREADY-authenticated user.
    // ====================================================================

    /// <summary>
    /// S14-T7 / ADR-046: builds the GitHub authorize URL for the "link to
    /// existing account" flow (vs <see cref="BuildLoginUrl"/> which is
    /// "log in fresh / create on first sight"). The authorize URL is the same
    /// as login mode; the difference lives entirely in the callback handler
    /// which links to a specific userId instead of find-or-creating by email.
    /// </summary>
    (string authorizeUrl, string state) BuildLinkUrl();

    /// <summary>
    /// S14-T7 / ADR-046: handles the GitHub OAuth callback in LINK mode.
    /// Links the GitHub identity to <paramref name="linkingUserId"/>'s
    /// existing account; never creates a new user. Returns failure if the
    /// returned GitHub identity is already linked to a different local user.
    /// Raises an account-security notification on success.
    /// </summary>
    Task<AuthResult<LinkGitHubResult>> HandleLinkCallbackAsync(
        string code,
        string state,
        string? expectedState,
        Guid linkingUserId,
        CancellationToken ct = default);

    /// <summary>
    /// S14-T7 / ADR-046: unlinks the GitHub identity from the user. Returns
    /// <see cref="UnlinkOutcome.BlockedNoPassword"/> if the user would be
    /// locked out (no password set AND GitHub is the only login path).
    /// Idempotent: <see cref="UnlinkOutcome.NoLink"/> if no GitHub identity
    /// is linked. Raises an account-security notification on successful
    /// unlink.
    /// </summary>
    Task<UnlinkOutcome> UnlinkAsync(Guid userId, CancellationToken ct = default);
}

/// <summary>S14-T7 / ADR-046: outcome of a successful link.</summary>
public sealed record LinkGitHubResult(string GitHubUsername);

/// <summary>S14-T7 / ADR-046: outcome of an unlink attempt.</summary>
public enum UnlinkOutcome
{
    /// <summary>Successfully unlinked.</summary>
    Unlinked,
    /// <summary>No GitHub link existed — idempotent no-op.</summary>
    NoLink,
    /// <summary>Refused: user has no password set, would lose all login methods.</summary>
    BlockedNoPassword,
    /// <summary>User not found.</summary>
    UserNotFound,
}

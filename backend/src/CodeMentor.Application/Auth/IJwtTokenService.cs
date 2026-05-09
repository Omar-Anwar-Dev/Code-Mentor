namespace CodeMentor.Application.Auth;

public interface IJwtTokenService
{
    (string token, DateTime expiresAt) IssueAccessToken(Guid userId, string email, IEnumerable<string> roles);
    (string plainToken, string hash) IssueRefreshToken();
    string Hash(string refreshToken);
}

using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using CodeMentor.Application.Auth;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace CodeMentor.Infrastructure.Auth;

public sealed class JwtTokenService : IJwtTokenService
{
    private readonly JwtOptions _options;
    private readonly RsaKeyProvider _keys;
    private readonly JwtSecurityTokenHandler _handler = new();

    public JwtTokenService(IOptions<JwtOptions> options, RsaKeyProvider keys)
    {
        _options = options.Value;
        _keys = keys;
    }

    public (string token, DateTime expiresAt) IssueAccessToken(Guid userId, string email, IEnumerable<string> roles)
    {
        var signingKey = new RsaSecurityKey(_keys.Rsa);
        var creds = new SigningCredentials(signingKey, SecurityAlgorithms.RsaSha256);

        var now = DateTime.UtcNow;
        var expires = now.AddMinutes(_options.AccessTokenMinutes);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, userId.ToString()),
            new(JwtRegisteredClaimNames.Email, email),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new(JwtRegisteredClaimNames.Iat, new DateTimeOffset(now).ToUnixTimeSeconds().ToString(), ClaimValueTypes.Integer64),
        };
        claims.AddRange(roles.Select(r => new Claim(ClaimTypes.Role, r)));

        var token = new JwtSecurityToken(
            issuer: _options.Issuer,
            audience: _options.Audience,
            claims: claims,
            notBefore: now,
            expires: expires,
            signingCredentials: creds);

        return (_handler.WriteToken(token), expires);
    }

    public (string plainToken, string hash) IssueRefreshToken()
    {
        var bytes = new byte[64];
        RandomNumberGenerator.Fill(bytes);
        var plain = Convert.ToBase64String(bytes);
        return (plain, Hash(plain));
    }

    public string Hash(string refreshToken)
    {
        var bytes = System.Text.Encoding.UTF8.GetBytes(refreshToken);
        return Convert.ToHexString(SHA256.HashData(bytes));
    }
}

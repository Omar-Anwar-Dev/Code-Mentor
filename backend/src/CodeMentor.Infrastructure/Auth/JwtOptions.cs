namespace CodeMentor.Infrastructure.Auth;

public class JwtOptions
{
    public const string SectionName = "Jwt";

    public string Issuer { get; set; } = "CodeMentor";
    public string Audience { get; set; } = "CodeMentor.Api";
    public int AccessTokenMinutes { get; set; } = 60;
    public int RefreshTokenDays { get; set; } = 7;

    // Path to a PEM file containing the RSA private key. If empty/missing on startup,
    // a key is generated and written to this path in Development.
    public string PrivateKeyPath { get; set; } = "keys/dev-rsa.pem";
}

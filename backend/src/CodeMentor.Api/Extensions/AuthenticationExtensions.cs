using CodeMentor.Infrastructure.Auth;
using CodeMentor.Infrastructure.Identity;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace CodeMentor.Api.Extensions;

public static class AuthenticationExtensions
{
    public static IServiceCollection AddApiAuthentication(this IServiceCollection services)
    {
        services
            .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer();

        // DI-aware JwtBearer configuration — avoids services.BuildServiceProvider() anti-pattern.
        services.AddSingleton<IConfigureOptions<JwtBearerOptions>, ConfigureJwtBearerOptions>();

        services.AddAuthorizationBuilder()
            .AddPolicy("RequireLearner", p => p.RequireAuthenticatedUser()
                .RequireRole(ApplicationRoles.Learner, ApplicationRoles.Admin))
            .AddPolicy("RequireAdmin", p => p.RequireAuthenticatedUser()
                .RequireRole(ApplicationRoles.Admin));

        return services;
    }
}

internal sealed class ConfigureJwtBearerOptions : IConfigureNamedOptions<JwtBearerOptions>
{
    private readonly RsaKeyProvider _keys;
    private readonly JwtOptions _jwt;

    public ConfigureJwtBearerOptions(RsaKeyProvider keys, IOptions<JwtOptions> jwt)
    {
        _keys = keys;
        _jwt = jwt.Value;
    }

    public void Configure(string? name, JwtBearerOptions options) => Configure(options);

    public void Configure(JwtBearerOptions options)
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = _jwt.Issuer,
            ValidateAudience = true,
            ValidAudience = _jwt.Audience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new RsaSecurityKey(_keys.Rsa),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromSeconds(30),
        };
    }
}

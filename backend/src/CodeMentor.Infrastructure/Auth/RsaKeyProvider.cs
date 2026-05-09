using System.Security.Cryptography;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace CodeMentor.Infrastructure.Auth;

public sealed class RsaKeyProvider
{
    private readonly JwtOptions _options;
    private readonly IHostEnvironment _env;
    private readonly ILogger<RsaKeyProvider> _logger;
    private readonly Lazy<RSA> _rsa;

    public RsaKeyProvider(IOptions<JwtOptions> options, IHostEnvironment env, ILogger<RsaKeyProvider> logger)
    {
        _options = options.Value;
        _env = env;
        _logger = logger;
        _rsa = new Lazy<RSA>(LoadOrCreate, isThreadSafe: true);
    }

    public RSA Rsa => _rsa.Value;

    private RSA LoadOrCreate()
    {
        var path = ResolvePath(_options.PrivateKeyPath);

        if (File.Exists(path))
        {
            var rsa = RSA.Create();
            rsa.ImportFromPem(File.ReadAllText(path));
            _logger.LogInformation("Loaded JWT RSA key from {Path}", path);
            return rsa;
        }

        if (!_env.IsDevelopment())
        {
            throw new InvalidOperationException(
                $"JWT private key not found at '{path}' and environment='{_env.EnvironmentName}'. " +
                "In non-dev environments, supply the key file or configuration.");
        }

        var created = RSA.Create(2048);
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        File.WriteAllText(path, created.ExportRSAPrivateKeyPem());
        _logger.LogWarning("No JWT key found — generated a dev RSA key at {Path}. DO NOT use in production.", path);
        return created;
    }

    private static string ResolvePath(string configured)
    {
        if (Path.IsPathRooted(configured)) return configured;
        return Path.Combine(AppContext.BaseDirectory, configured);
    }
}

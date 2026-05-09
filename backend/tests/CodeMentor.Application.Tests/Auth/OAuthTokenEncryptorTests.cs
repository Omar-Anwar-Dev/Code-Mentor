using CodeMentor.Infrastructure.Auth;
using Microsoft.Extensions.Options;

namespace CodeMentor.Application.Tests.Auth;

public class OAuthTokenEncryptorTests
{
    private static OAuthTokenEncryptor Create()
    {
        var opts = Options.Create(new GitHubOAuthOptions
        {
            TokenEncryptionKey = Convert.ToBase64String(new byte[32]) // dev test key
        });
        return new OAuthTokenEncryptor(opts);
    }

    [Fact]
    public void EncryptDecrypt_RoundTrips_OriginalPlaintext()
    {
        var enc = Create();
        const string plain = "ghp_thisIsAFakeGithubAccessToken1234567890";
        var cipher = enc.Encrypt(plain);
        Assert.NotEqual(plain, cipher);
        Assert.Equal(plain, enc.Decrypt(cipher));
    }

    [Fact]
    public void Encrypt_SameInputTwice_ProducesDifferentCiphers()
    {
        // AES-GCM with random nonce — ciphers must differ even for identical plaintext.
        var enc = Create();
        const string plain = "deterministic-but-nonce-differs";
        Assert.NotEqual(enc.Encrypt(plain), enc.Encrypt(plain));
    }

    [Fact]
    public void Decrypt_TamperedCipher_Throws()
    {
        var enc = Create();
        var cipher = enc.Encrypt("secret-data");
        var bytes = Convert.FromBase64String(cipher);
        bytes[bytes.Length - 1] ^= 0xFF; // corrupt last byte
        var tampered = Convert.ToBase64String(bytes);
        Assert.ThrowsAny<System.Security.Cryptography.CryptographicException>(
            () => enc.Decrypt(tampered));
    }

    [Fact]
    public void Ctor_WithMissingKey_ThrowsClearError()
    {
        var opts = Options.Create(new GitHubOAuthOptions { TokenEncryptionKey = "" });
        var ex = Assert.Throws<InvalidOperationException>(() => new OAuthTokenEncryptor(opts));
        Assert.Contains("not configured", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void Ctor_WithWrongKeyLength_ThrowsClearError()
    {
        var opts = Options.Create(new GitHubOAuthOptions
        {
            TokenEncryptionKey = Convert.ToBase64String(new byte[16]) // too short
        });
        var ex = Assert.Throws<InvalidOperationException>(() => new OAuthTokenEncryptor(opts));
        Assert.Contains("32 bytes", ex.Message);
    }
}

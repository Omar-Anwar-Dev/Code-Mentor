using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Options;

namespace CodeMentor.Infrastructure.Auth;

public interface IOAuthTokenEncryptor
{
    string Encrypt(string plaintext);
    string Decrypt(string cipher);
}

/// <summary>
/// AES-256-GCM for OAuth token at-rest encryption. Cipher format: base64(nonce(12) | tag(16) | ciphertext).
/// </summary>
public sealed class OAuthTokenEncryptor : IOAuthTokenEncryptor
{
    private const int NonceSize = 12;
    private const int TagSize = 16;

    private readonly byte[] _key;

    public OAuthTokenEncryptor(IOptions<GitHubOAuthOptions> options)
    {
        var keyB64 = options.Value.TokenEncryptionKey;
        if (string.IsNullOrWhiteSpace(keyB64))
        {
            throw new InvalidOperationException(
                "GitHubOAuth:TokenEncryptionKey is not configured. " +
                "Generate with `openssl rand -base64 32` and set in .env or Key Vault.");
        }

        _key = Convert.FromBase64String(keyB64);
        if (_key.Length != 32)
        {
            throw new InvalidOperationException(
                $"GitHubOAuth:TokenEncryptionKey must decode to 32 bytes (AES-256); got {_key.Length} bytes.");
        }
    }

    public string Encrypt(string plaintext)
    {
        ArgumentException.ThrowIfNullOrEmpty(plaintext);

        var plaintextBytes = Encoding.UTF8.GetBytes(plaintext);
        var nonce = new byte[NonceSize];
        RandomNumberGenerator.Fill(nonce);

        var ciphertext = new byte[plaintextBytes.Length];
        var tag = new byte[TagSize];

        using var aes = new AesGcm(_key, TagSize);
        aes.Encrypt(nonce, plaintextBytes, ciphertext, tag);

        var output = new byte[NonceSize + TagSize + ciphertext.Length];
        Buffer.BlockCopy(nonce, 0, output, 0, NonceSize);
        Buffer.BlockCopy(tag, 0, output, NonceSize, TagSize);
        Buffer.BlockCopy(ciphertext, 0, output, NonceSize + TagSize, ciphertext.Length);

        return Convert.ToBase64String(output);
    }

    public string Decrypt(string cipher)
    {
        ArgumentException.ThrowIfNullOrEmpty(cipher);

        var bytes = Convert.FromBase64String(cipher);
        if (bytes.Length < NonceSize + TagSize)
            throw new CryptographicException("Cipher too short.");

        var nonce = bytes[..NonceSize];
        var tag = bytes[NonceSize..(NonceSize + TagSize)];
        var ciphertext = bytes[(NonceSize + TagSize)..];
        var plaintext = new byte[ciphertext.Length];

        using var aes = new AesGcm(_key, TagSize);
        aes.Decrypt(nonce, ciphertext, tag, plaintext);

        return Encoding.UTF8.GetString(plaintext);
    }
}

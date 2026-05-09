using CodeMentor.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;

namespace CodeMentor.Application.Tests.Identity;

public class PasswordHashingTests
{
    private readonly PasswordHasher<ApplicationUser> _hasher = new();

    [Fact]
    public void HashedPassword_IsNotThePlaintext()
    {
        var user = new ApplicationUser { Email = "t@t.local", UserName = "t" };
        var hash = _hasher.HashPassword(user, "MyPass_123!");
        Assert.NotEqual("MyPass_123!", hash);
        Assert.StartsWith("AQAAAA", hash); // Identity's PBKDF2 v3 format prefix
    }

    [Fact]
    public void Verify_ReturnsSuccess_ForCorrectPassword()
    {
        var user = new ApplicationUser { Email = "t@t.local", UserName = "t" };
        var hash = _hasher.HashPassword(user, "MyPass_123!");
        var result = _hasher.VerifyHashedPassword(user, hash, "MyPass_123!");
        Assert.Equal(PasswordVerificationResult.Success, result);
    }

    [Fact]
    public void Verify_ReturnsFailed_ForIncorrectPassword()
    {
        var user = new ApplicationUser { Email = "t@t.local", UserName = "t" };
        var hash = _hasher.HashPassword(user, "MyPass_123!");
        var result = _hasher.VerifyHashedPassword(user, hash, "WrongPass_456!");
        Assert.Equal(PasswordVerificationResult.Failed, result);
    }
}

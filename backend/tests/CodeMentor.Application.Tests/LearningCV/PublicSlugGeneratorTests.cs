using CodeMentor.Infrastructure.LearningCV;

namespace CodeMentor.Application.Tests.LearningCV;

/// <summary>
/// S7-T3: public slug generation rules — URL-safe, derived from User.UserName,
/// strip mail domain, lowercase + hyphen-collapse, fallback for empty input,
/// suffix on collision.
/// </summary>
public class PublicSlugGeneratorTests
{
    [Theory]
    [InlineData("layla.ahmed@example.com", "layla-ahmed")]
    [InlineData("layla", "layla")]
    [InlineData("Layla.Ahmed", "layla-ahmed")]
    [InlineData("layla__ahmed", "layla-ahmed")]
    [InlineData("layla   ahmed", "layla-ahmed")]
    [InlineData("Layla.Ahmed-2024", "layla-ahmed-2024")]
    [InlineData(" prefix-trim @x", "prefix-trim")]
    public void Generate_HappyPaths_ProduceExpectedSlug(string input, string expected)
    {
        Assert.Equal(expected, PublicSlugGenerator.Generate(input, Guid.NewGuid()));
    }

    [Fact]
    public void Generate_EmptyOrPunctOnly_FallsBackToUserIdPrefix()
    {
        var userId = Guid.Parse("12345678-aaaa-bbbb-cccc-1234567890ab");

        Assert.Equal("learner-12345678", PublicSlugGenerator.Generate("@gmail.com", userId));
        Assert.Equal("learner-12345678", PublicSlugGenerator.Generate(string.Empty, userId));
        Assert.Equal("learner-12345678", PublicSlugGenerator.Generate(null, userId));
        Assert.Equal("learner-12345678", PublicSlugGenerator.Generate("...", userId));
    }

    [Fact]
    public void Generate_AppliesSuffix_OnCollision()
    {
        var userId = Guid.NewGuid();
        Assert.Equal("layla-2", PublicSlugGenerator.Generate("layla@example.com", userId, 2));
        Assert.Equal("layla-99", PublicSlugGenerator.Generate("layla@example.com", userId, 99));
    }

    [Theory]
    [InlineData("me@example.com")]
    [InlineData("admin@example.com")]
    [InlineData("settings@x")]
    public void Generate_ReservedSlugs_FallBackToUserIdPrefix(string input)
    {
        var userId = Guid.Parse("99999999-aaaa-bbbb-cccc-1234567890ab");
        Assert.Equal("learner-99999999", PublicSlugGenerator.Generate(input, userId));
    }

    [Fact]
    public void Generate_TrimsToMaxLength()
    {
        var longName = new string('a', 200) + "@x";
        var slug = PublicSlugGenerator.Generate(longName, Guid.NewGuid());
        Assert.True(slug.Length <= 60);
        Assert.All(slug, ch => Assert.True(char.IsLetterOrDigit(ch) || ch == '-'));
    }
}

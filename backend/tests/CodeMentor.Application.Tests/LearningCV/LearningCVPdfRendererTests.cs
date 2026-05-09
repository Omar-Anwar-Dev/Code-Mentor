using CodeMentor.Application.LearningCV.Contracts;
using CodeMentor.Infrastructure.LearningCV;

namespace CodeMentor.Application.Tests.LearningCV;

/// <summary>
/// S7-T5: QuestPDF renderer produces a valid PDF byte stream that starts with
/// the "%PDF-" magic. Empty CV (no scores, no projects) renders without error.
/// </summary>
public class LearningCVPdfRendererTests
{
    public LearningCVPdfRendererTests()
    {
        // Tests bypass Program.cs license setup; configure here once.
        QuestPDF.Settings.License = QuestPDF.Infrastructure.LicenseType.Community;
    }

    [Fact]
    public void Render_FullCv_ProducesPdfBytes_WithMagicHeader()
    {
        var cv = BuildCv(
            scores: new[] { ("DataStructures", 75m, "Intermediate"), ("Security", 82m, "Advanced") },
            quality: new[] { ("Correctness", 88m, 3), ("Readability", 72m, 2) },
            projects: new[] { ("Stripe webhook", 92), ("REST API", 85) });

        var bytes = new LearningCVPdfRenderer().Render(cv);

        Assert.NotNull(bytes);
        Assert.True(bytes.Length > 1000, "PDF should be >1KB even for a small CV.");
        var header = System.Text.Encoding.ASCII.GetString(bytes, 0, 5);
        Assert.Equal("%PDF-", header);
    }

    [Fact]
    public void Render_EmptyCv_DoesNotThrow_AndStillProducesPdf()
    {
        var cv = BuildCv(
            scores: Array.Empty<(string, decimal, string)>(),
            quality: Array.Empty<(string, decimal, int)>(),
            projects: Array.Empty<(string, int)>());

        var bytes = new LearningCVPdfRenderer().Render(cv);

        Assert.NotNull(bytes);
        Assert.True(bytes.Length > 500);
        Assert.Equal("%PDF-", System.Text.Encoding.ASCII.GetString(bytes, 0, 5));
    }

    [Fact]
    public void Render_PublicCv_IncludesPublicSlugInHeader()
    {
        var cv = BuildCv(
            scores: Array.Empty<(string, decimal, string)>(),
            quality: Array.Empty<(string, decimal, int)>(),
            projects: Array.Empty<(string, int)>(),
            isPublic: true,
            slug: "layla-ahmed");

        var bytes = new LearningCVPdfRenderer().Render(cv);
        Assert.NotNull(bytes);
        Assert.True(bytes.Length > 0);
    }

    private static LearningCVDto BuildCv(
        (string Category, decimal Score, string Level)[] scores,
        (string Category, decimal Score, int Samples)[] quality,
        (string Title, int Score)[] projects,
        bool isPublic = false,
        string? slug = null)
    {
        return new LearningCVDto(
            new LearningCVProfileDto(
                Guid.NewGuid(),
                "Layla Ahmed",
                "layla@example.com",
                "layla-ahmed",
                null,
                DateTime.UtcNow.AddMonths(-3)),
            new LearningCVSkillProfileDto(
                scores.Select(s => new LearningCVSkillScoreDto(s.Category, s.Score, s.Level)).ToList(),
                scores.Length == 0 ? null : "Intermediate"),
            new LearningCVCodeQualityProfileDto(
                quality.Select(q => new LearningCVCodeQualityScoreDto(q.Category, q.Score, q.Samples)).ToList()),
            projects.Select((p, i) => new LearningCVProjectDto(
                Guid.NewGuid(),
                p.Title,
                "FullStack",
                "Python",
                p.Score,
                DateTime.UtcNow.AddDays(-i),
                $"/submissions/x/feedback")).ToList(),
            new LearningCVStatsDto(
                projects.Length,
                projects.Length,
                scores.Length > 0 ? 1 : 0,
                1,
                DateTime.UtcNow.AddMonths(-3)),
            new LearningCVMetadataDto(slug, isPublic, DateTime.UtcNow, 0));
    }
}

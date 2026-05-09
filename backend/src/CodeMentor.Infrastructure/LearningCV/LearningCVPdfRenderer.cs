using CodeMentor.Application.LearningCV;
using CodeMentor.Application.LearningCV.Contracts;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace CodeMentor.Infrastructure.LearningCV;

/// <summary>
/// S7-T5: QuestPDF-backed CV renderer. Mirrors the Learning CV web page (S7-T6)
/// at A4 — header card, dual skill axes (knowledge + code-quality), verified
/// projects, activity stats — so a downloaded PDF reads as the same artefact
/// the user sees in browser. License: Community (free; QuestPDF.Settings is
/// configured once at app startup in <c>Program.cs</c>).
/// </summary>
public sealed class LearningCVPdfRenderer : ILearningCVPdfRenderer
{
    private static readonly string AccentBlue = Colors.Blue.Medium;
    private static readonly string TextPrimary = Colors.Grey.Darken4;
    private static readonly string TextSecondary = Colors.Grey.Darken1;
    private static readonly string Surface = Colors.Grey.Lighten4;
    private static readonly string Divider = Colors.Grey.Lighten2;

    public byte[] Render(LearningCVDto cv)
    {
        ArgumentNullException.ThrowIfNull(cv);

        return Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(36);
                page.PageColor(Colors.White);
                page.DefaultTextStyle(t => t.FontSize(10).FontColor(TextPrimary));

                page.Header().Element(c => Header(c, cv));
                page.Content().PaddingVertical(12).Column(col =>
                {
                    col.Spacing(14);
                    col.Item().Element(c => StatsRow(c, cv));
                    col.Item().Element(c => KnowledgeProfileSection(c, cv));
                    col.Item().Element(c => CodeQualitySection(c, cv));
                    col.Item().Element(c => VerifiedProjectsSection(c, cv));
                });
                page.Footer().Element(c => Footer(c, cv));
            });
        }).GeneratePdf();
    }

    private static void Header(IContainer container, LearningCVDto cv)
    {
        container.PaddingBottom(10).BorderBottom(1).BorderColor(Divider).Row(row =>
        {
            row.RelativeItem().Column(col =>
            {
                col.Item().Text(cv.Profile.FullName).FontSize(20).Bold().FontColor(TextPrimary);
                if (cv.SkillProfile.OverallLevel is not null)
                {
                    col.Item().Text($"{cv.SkillProfile.OverallLevel} learner")
                        .FontSize(11).FontColor(AccentBlue);
                }
                col.Item().PaddingTop(6).Text(text =>
                {
                    text.Span("Learning CV · ").FontColor(TextSecondary).FontSize(9);
                    text.Span($"Joined {cv.Profile.CreatedAt:MMMM yyyy}").FontColor(TextSecondary).FontSize(9);
                });

                if (!string.IsNullOrWhiteSpace(cv.Profile.GitHubUsername))
                {
                    col.Item().Text(text =>
                    {
                        text.Span("GitHub: ").FontColor(TextSecondary).FontSize(9);
                        text.Span($"@{cv.Profile.GitHubUsername}").FontSize(9);
                    });
                }
                if (!string.IsNullOrWhiteSpace(cv.Profile.Email))
                {
                    col.Item().Text(text =>
                    {
                        text.Span("Email: ").FontColor(TextSecondary).FontSize(9);
                        text.Span(cv.Profile.Email!).FontSize(9);
                    });
                }
            });

            row.ConstantItem(140).AlignRight().Column(col =>
            {
                col.Item().AlignRight().Text("Code Mentor").FontSize(11).Bold().FontColor(AccentBlue);
                col.Item().AlignRight().Text($"Generated {DateTime.UtcNow:yyyy-MM-dd}")
                    .FontSize(8).FontColor(TextSecondary);
                if (cv.Cv.IsPublic && !string.IsNullOrWhiteSpace(cv.Cv.PublicSlug))
                {
                    col.Item().PaddingTop(4).AlignRight().Text($"/cv/{cv.Cv.PublicSlug}")
                        .FontSize(8).FontColor(TextSecondary);
                }
            });
        });
    }

    private static void StatsRow(IContainer container, LearningCVDto cv)
    {
        container.Row(row =>
        {
            row.Spacing(8);
            row.RelativeItem().Element(c => StatTile(c, "Submissions", cv.Stats.SubmissionsCompleted));
            row.RelativeItem().Element(c => StatTile(c, "Assessments", cv.Stats.AssessmentsCompleted));
            row.RelativeItem().Element(c => StatTile(c, "Active Paths", cv.Stats.LearningPathsActive));
            row.RelativeItem().Element(c => StatTile(c, "Verified Projects", cv.VerifiedProjects.Count));
        });
    }

    private static void StatTile(IContainer container, string label, int value)
    {
        container.Background(Surface).Padding(8).Column(col =>
        {
            col.Item().Text(value.ToString()).FontSize(18).Bold().FontColor(TextPrimary);
            col.Item().Text(label.ToUpperInvariant()).FontSize(8).FontColor(TextSecondary).LetterSpacing(0.5f);
        });
    }

    private static void KnowledgeProfileSection(IContainer container, LearningCVDto cv)
    {
        container.Column(col =>
        {
            col.Item().Element(SectionTitle("Knowledge Profile",
                "Assessment-driven scores across CS domains."));

            if (cv.SkillProfile.Scores.Count == 0)
            {
                col.Item().PaddingTop(4).Text("Take an assessment to populate this section.")
                    .FontColor(TextSecondary).Italic();
                return;
            }

            foreach (var s in cv.SkillProfile.Scores)
            {
                col.Item().Element(c => ScoreRow(c, s.Category, (float)s.Score, $"{s.Level} · {s.Score:0}"));
            }
        });
    }

    private static void CodeQualitySection(IContainer container, LearningCVDto cv)
    {
        container.Column(col =>
        {
            col.Item().Element(SectionTitle("Code-Quality Profile",
                "Running averages from AI-reviewed submissions."));

            if (cv.CodeQualityProfile.Scores.Count == 0)
            {
                col.Item().PaddingTop(4).Text("Submit a project to start your code-quality profile.")
                    .FontColor(TextSecondary).Italic();
                return;
            }

            foreach (var s in cv.CodeQualityProfile.Scores)
            {
                var trailer = $"{s.Score:0} · {s.SampleCount} {(s.SampleCount == 1 ? "sample" : "samples")}";
                col.Item().Element(c => ScoreRow(c, s.Category, (float)s.Score, trailer));
            }
        });
    }

    private static void VerifiedProjectsSection(IContainer container, LearningCVDto cv)
    {
        container.Column(col =>
        {
            col.Item().Element(SectionTitle("Verified Projects",
                $"Top {cv.VerifiedProjects.Count} highest-scoring submissions."));

            if (cv.VerifiedProjects.Count == 0)
            {
                col.Item().PaddingTop(4).Text("No verified projects yet.")
                    .FontColor(TextSecondary).Italic();
                return;
            }

            foreach (var p in cv.VerifiedProjects)
            {
                col.Item().PaddingTop(6).Border(1).BorderColor(Divider).Padding(8).Row(row =>
                {
                    row.RelativeItem().Column(c =>
                    {
                        c.Item().Text(p.TaskTitle).FontSize(11).SemiBold();
                        c.Item().Text($"{p.Track} · {p.Language} · {p.CompletedAt:yyyy-MM-dd}")
                            .FontSize(8).FontColor(TextSecondary);
                    });
                    row.ConstantItem(60).AlignRight().Column(c =>
                    {
                        c.Item().AlignRight().Text(p.OverallScore.ToString())
                            .FontSize(16).Bold().FontColor(AccentBlue);
                        c.Item().AlignRight().Text("/ 100").FontSize(7).FontColor(TextSecondary);
                    });
                });
            }
        });
    }

    private static Action<IContainer> SectionTitle(string title, string subtitle) => container =>
    {
        container.Column(col =>
        {
            col.Item().Text(title).FontSize(13).Bold().FontColor(TextPrimary);
            col.Item().Text(subtitle).FontSize(9).FontColor(TextSecondary);
            col.Item().PaddingTop(2).LineHorizontal(0.5f).LineColor(Divider);
        });
    };

    private static void ScoreRow(IContainer container, string label, float pct, string trailer)
    {
        var filled = Math.Clamp(pct, 0f, 100f);
        var empty = 100f - filled;
        container.PaddingTop(4).Column(col =>
        {
            col.Item().Row(row =>
            {
                row.RelativeItem().Text(label).FontSize(10);
                row.ConstantItem(120).AlignRight().Text(trailer).FontSize(9).FontColor(TextSecondary);
            });
            col.Item().Height(6).Row(row =>
            {
                if (filled > 0) row.RelativeItem(filled).Background(AccentBlue);
                if (empty > 0) row.RelativeItem(empty).Background(Surface);
            });
        });
    }

    private static void Footer(IContainer container, LearningCVDto cv)
    {
        container.PaddingTop(8).BorderTop(0.5f).BorderColor(Divider).Row(row =>
        {
            row.RelativeItem().Text("Generated by Code Mentor — codementor.io")
                .FontSize(8).FontColor(TextSecondary);
            row.RelativeItem().AlignRight().Text(text =>
            {
                text.CurrentPageNumber().FontSize(8).FontColor(TextSecondary);
                text.Span(" / ").FontSize(8).FontColor(TextSecondary);
                text.TotalPages().FontSize(8).FontColor(TextSecondary);
            });
        });
    }
}

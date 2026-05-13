using System.Globalization;
using CodeMentor.Infrastructure.Identity;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace CodeMentor.Infrastructure.UserExports;

/// <summary>
/// S14-T8 / ADR-046: human-readable PDF dossier for the data export. Mirrors
/// the styling pattern of <c>LearningCVPdfRenderer</c> (S7-T5) — single
/// document with a brand-coloured header band + a content stack of sections.
/// Designed to be SCANNABLE by the user (the JSON files in the same ZIP carry
/// the full structured payload). Page count is dynamic but at least 1.
/// </summary>
public sealed class UserDataExportPdfRenderer
{
    // Signature brand colors (matching frontend tokens).
    private static readonly Color BrandViolet = Color.FromHex("#7c3aed");
    private static readonly Color BrandFuchsia = Color.FromHex("#ec4899");
    private static readonly Color BrandCyan = Color.FromHex("#06b6d4");
    private static readonly Color TextPrimary = Color.FromHex("#111827");
    private static readonly Color TextSecondary = Color.FromHex("#6b7280");
    private static readonly Color SurfaceMuted = Color.FromHex("#f5f3ff");

    public byte[] Render(UserDataExportDossier dossier)
    {
        var document = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(40);
                page.PageColor(Colors.White);
                page.DefaultTextStyle(x => x.FontSize(11).FontColor(TextPrimary));

                page.Header().Element(BuildHeader);
                page.Content().Element(c => BuildContent(c, dossier));
                page.Footer().AlignCenter().Text(t =>
                {
                    t.Span("Code Mentor").FontColor(BrandViolet).FontSize(9).SemiBold();
                    t.Span("  ·  ").FontColor(TextSecondary).FontSize(9);
                    t.Span($"Exported {dossier.ExportedAtUtc:yyyy-MM-dd HH:mm} UTC").FontColor(TextSecondary).FontSize(9);
                    t.Span("  ·  page ").FontColor(TextSecondary).FontSize(9);
                    t.CurrentPageNumber().FontColor(TextSecondary).FontSize(9);
                    t.Span(" / ").FontColor(TextSecondary).FontSize(9);
                    t.TotalPages().FontColor(TextSecondary).FontSize(9);
                });
            });
        });

        return document.GeneratePdf();
    }

    private static void BuildHeader(IContainer container)
    {
        container.PaddingBottom(16).Column(col =>
        {
            col.Item().Row(row =>
            {
                row.RelativeItem().Column(c =>
                {
                    c.Item().Text("Code Mentor").FontSize(20).Bold().FontColor(BrandViolet);
                    c.Item().Text("Personal data export").FontSize(10).FontColor(TextSecondary);
                });
                row.ConstantItem(120).AlignRight().AlignMiddle().Text("DOSSIER")
                    .FontSize(9).FontColor(BrandFuchsia).LetterSpacing(0.2f);
            });
            col.Item().PaddingTop(6).LineHorizontal(2).LineColor(BrandViolet);
        });
    }

    private static void BuildContent(IContainer container, UserDataExportDossier d)
    {
        container.PaddingVertical(8).Column(col =>
        {
            col.Spacing(16);

            // Profile section
            col.Item().Element(c => Section(c, "Profile", inner =>
            {
                inner.Item().Element(e => KeyValue(e, "Full name", d.User.FullName));
                inner.Item().Element(e => KeyValue(e, "Email", d.User.Email ?? "(redacted)"));
                inner.Item().Element(e => KeyValue(e, "GitHub username", d.User.GitHubUsername ?? "(not linked)"));
                inner.Item().Element(e => KeyValue(e, "Joined Code Mentor", d.User.CreatedAt.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture)));
            }));

            // Stats summary
            col.Item().Element(c => Section(c, "Activity summary", inner =>
            {
                inner.Item().Element(e => KeyValue(e, "Submissions", d.SubmissionCount.ToString(CultureInfo.InvariantCulture)));
                inner.Item().Element(e => KeyValue(e, "Project audits", d.AuditCount.ToString(CultureInfo.InvariantCulture)));
                inner.Item().Element(e => KeyValue(e, "Assessments completed", d.AssessmentCount.ToString(CultureInfo.InvariantCulture)));
                inner.Item().Element(e => KeyValue(e, "Badges earned", d.BadgeCount.ToString(CultureInfo.InvariantCulture)));
                inner.Item().Element(e => KeyValue(e, "Total XP", d.TotalXp.ToString(CultureInfo.InvariantCulture)));
            }));

            // Top recent submissions
            if (d.RecentSubmissionTitles.Count > 0)
            {
                col.Item().Element(c => Section(c, "Recent submissions", inner =>
                {
                    foreach (var title in d.RecentSubmissionTitles)
                    {
                        inner.Item().Text($"• {title}").FontSize(11);
                    }
                }));
            }

            // What's in the ZIP
            col.Item().Element(c => Section(c, "What's in this export", inner =>
            {
                inner.Item().Text("This dossier is a human-readable summary. The same ZIP archive also contains 6 JSON files with the FULL structured payload:")
                    .FontSize(10).FontColor(TextSecondary);
                inner.Item().PaddingTop(4).Text("• profile.json — User + UserSettings").FontSize(10);
                inner.Item().Text("• submissions.json — All submissions with feedback").FontSize(10);
                inner.Item().Text("• audits.json — All project audits with results").FontSize(10);
                inner.Item().Text("• assessments.json — Assessments + responses + skill scores").FontSize(10);
                inner.Item().Text("• gamification.json — XP transactions + earned badges").FontSize(10);
                inner.Item().Text("• notifications.json — In-app notifications (last 90 days)").FontSize(10);
            }));
        });
    }

    private static void Section(IContainer container, string title, Action<ColumnDescriptor> body)
    {
        container.Background(SurfaceMuted).Padding(14).Column(c =>
        {
            c.Item().Text(title).FontSize(13).Bold().FontColor(BrandViolet);
            c.Item().PaddingTop(6).Column(inner =>
            {
                inner.Spacing(3);
                body(inner);
            });
        });
    }

    private static void KeyValue(IContainer container, string label, string value)
    {
        container.Row(row =>
        {
            row.ConstantItem(140).Text(label).FontSize(10).FontColor(TextSecondary);
            row.RelativeItem().Text(value).FontSize(11);
        });
    }
}

/// <summary>
/// S14-T8 / ADR-046: ready-to-render dossier payload — what
/// <see cref="UserDataExportJob"/> hands to <see cref="UserDataExportPdfRenderer"/>.
/// </summary>
public sealed record UserDataExportDossier(
    ApplicationUser User,
    int SubmissionCount,
    int AuditCount,
    int AssessmentCount,
    int BadgeCount,
    int TotalXp,
    IReadOnlyList<string> RecentSubmissionTitles,
    DateTime ExportedAtUtc);

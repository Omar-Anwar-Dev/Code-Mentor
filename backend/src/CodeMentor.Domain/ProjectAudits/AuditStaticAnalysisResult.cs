using CodeMentor.Domain.Submissions;

namespace CodeMentor.Domain.ProjectAudits;

/// <summary>
/// S9-T1: per-tool static-analysis result for a <see cref="ProjectAudit"/>.
/// Mirrors <see cref="StaticAnalysisResult"/> for Submissions. One row per
/// (AuditId, Tool). The <see cref="StaticAnalysisTool"/> enum is shared with
/// Submissions — both pipelines run identical physical tools per ADR-031
/// (reused via the existing <c>IAiReviewClient</c> calling
/// <c>POST /api/analyze-zip</c>).
/// </summary>
public class AuditStaticAnalysisResult
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid AuditId { get; set; }

    public StaticAnalysisTool Tool { get; set; }

    public string IssuesJson { get; set; } = "[]";
    public string? MetricsJson { get; set; }

    public int ExecutionTimeMs { get; set; }
    public DateTime ProcessedAt { get; set; } = DateTime.UtcNow;

    public ProjectAudit? Audit { get; set; }
}

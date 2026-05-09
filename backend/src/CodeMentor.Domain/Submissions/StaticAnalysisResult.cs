namespace CodeMentor.Domain.Submissions;

public enum StaticAnalysisTool
{
    ESLint = 1,
    Bandit = 2,
    Cppcheck = 3,
    PHPStan = 4,
    PMD = 5,
    Roslyn = 6,
}

public class StaticAnalysisResult
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid SubmissionId { get; set; }

    public StaticAnalysisTool Tool { get; set; }

    public string IssuesJson { get; set; } = "[]";
    public string? MetricsJson { get; set; }

    public int ExecutionTimeMs { get; set; }
    public DateTime ProcessedAt { get; set; } = DateTime.UtcNow;

    public Submission? Submission { get; set; }
}

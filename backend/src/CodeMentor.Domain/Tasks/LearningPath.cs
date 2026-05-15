using CodeMentor.Domain.Assessments;

namespace CodeMentor.Domain.Tasks;

public class LearningPath
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public Track Track { get; set; }
    public Guid? AssessmentId { get; set; }
    public bool IsActive { get; set; } = true;
    public decimal ProgressPercent { get; set; } // 0..100
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;

    // S19-T4 / F16 (ADR-052): provenance + audit. ``Source`` defaults to
    // TemplateFallback to keep pre-S19 paths backwards-compatible (the
    // migration backfills existing rows). ``GenerationReasoningText`` is
    // the LLM's overall narrative when ``Source == AIGenerated``; null
    // otherwise.
    public LearningPathSource Source { get; set; } = LearningPathSource.TemplateFallback;
    public string? GenerationReasoningText { get; set; }

    public ICollection<PathTask> Tasks { get; set; } = [];

    public void RecomputeProgress()
    {
        if (Tasks.Count == 0)
        {
            ProgressPercent = 0;
            return;
        }
        var completed = Tasks.Count(t => t.Status == PathTaskStatus.Completed);
        ProgressPercent = Math.Round((decimal)completed / Tasks.Count * 100, 2);
    }
}

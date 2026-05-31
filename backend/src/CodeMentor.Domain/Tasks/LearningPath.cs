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

    // S20-T3 / F16 (ADR-053): timestamp of the most recent successful
    // PathAdaptationEvent on this path. Null until the first adaptation runs.
    // The 24-hour cooldown in PathAdaptationJob compares
    // ``DateTime.UtcNow - LastAdaptedAt`` against TimeSpan.FromHours(24).
    // Updated transactionally inside PathAdaptationJob alongside the
    // PathAdaptationEvents insert + PathTasks reorder.
    public DateTime? LastAdaptedAt { get; set; }

    // S21-T3 / F16: snapshot of the user's LearnerSkillProfile at path
    // creation time, serialised as JSON. Powers the Before/After skill radar
    // on the graduation page. Null on legacy pre-S21 paths (those render the
    // "Snapshot unavailable for pre-S21 paths" message); populated on every
    // new path created via LearningPathService.GeneratePathAsync.
    // Shape: [{ "category": "Algorithms", "smoothedScore": 65 }, ...].
    public string? InitialSkillProfileJson { get; set; }

    // S21-T4 / F16: lineage chain for the Next Phase flow. New paths
    // generated via POST /api/learning-paths/me/next-phase carry the prior
    // path's Id here + Version bumped by +1. The initial path is Version 1
    // / PreviousLearningPathId null.
    public int Version { get; set; } = 1;
    public Guid? PreviousLearningPathId { get; set; }

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

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

namespace CodeMentor.Domain.Tasks;

public class PathTask
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid PathId { get; set; }
    public LearningPath? Path { get; set; }
    public Guid TaskId { get; set; }
    public TaskItem? Task { get; set; }
    public int OrderIndex { get; set; }
    public PathTaskStatus Status { get; set; } = PathTaskStatus.NotStarted;
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
}

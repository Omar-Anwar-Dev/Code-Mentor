namespace CodeMentor.Domain.Tasks;

public enum ProgrammingLanguage
{
    JavaScript = 1,
    TypeScript = 2,
    Python = 3,
    CSharp = 4,
    Java = 5,
    Cpp = 6,
    Php = 7,
    Go = 8,
    Sql = 9,
}

public enum PathTaskStatus
{
    NotStarted = 1,
    InProgress = 2,
    Completed = 3,
}

// S18 / F16 (ADR-049): provenance for the Task content. Mirrors QuestionSource.
//   Manual = hand-authored from the original 21 seed (or backfilled with AI-suggested metadata via S18-T2).
//   AI     = produced by the S18 AI Task Generator and approved through the admin drafts review flow.
public enum TaskSource
{
    Manual = 1,
    AI = 2,
}

// S18 / F16 (ADR-049): state machine for a TaskDraft in the admin review flow.
// Mirrors QuestionDraftStatus.
public enum TaskDraftStatus
{
    Draft = 1,
    Approved = 2,
    Rejected = 3,
}

// S19-T4 / F16 (ADR-052): provenance for a LearningPath's task ordering.
//   AIGenerated      = produced by the AI service /api/generate-path
//                      (hybrid embedding-recall + LLM rerank).
//   TemplateFallback = AI service was unavailable / produced invalid output
//                      after retries; the legacy template logic in
//                      LearningPathService.SelectTasks was used instead.
//                      Surfaced to the learner UI + admin dashboard for
//                      transparency.
public enum LearningPathSource
{
    AIGenerated = 1,
    TemplateFallback = 2,
}

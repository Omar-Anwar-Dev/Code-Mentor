namespace CodeMentor.Domain.Assessments;

public enum SkillCategory
{
    DataStructures = 1,
    Algorithms = 2,
    OOP = 3,
    Databases = 4,
    Security = 5,
}

public enum Track
{
    FullStack = 1,
    Backend = 2,
    Python = 3,
}

public enum SkillLevel
{
    Beginner = 1,
    Intermediate = 2,
    Advanced = 3,
}

public enum AssessmentStatus
{
    InProgress = 1,
    Completed = 2,
    TimedOut = 3,
    Abandoned = 4,
}

// S15 / F15 (ADR-049 / ADR-050): provenance for the (a, b) parameters on
// a Question. AI = self-rated by the AI Generator at draft time
// (Sprint 16) or backfill default (S15-T4); Admin = manually set/overridden
// by an admin reviewer; Empirical = produced by the RecalibrateIRTJob
// once an item passes the >=1000-response threshold per ADR-055.
public enum CalibrationSource
{
    AI = 1,
    Admin = 2,
    Empirical = 3,
}

// S15 / F15 (ADR-049): provenance for the question content itself.
// Manual = hand-authored by team or imported from the original seed;
// AI = produced by the Sprint-16 AI Question Generator and approved
// through the admin drafts review flow.
public enum QuestionSource
{
    Manual = 1,
    AI = 2,
}

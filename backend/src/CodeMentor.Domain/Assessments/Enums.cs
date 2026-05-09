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

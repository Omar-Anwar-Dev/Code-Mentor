namespace CodeMentor.Domain.Submissions;

public enum SubmissionType
{
    GitHub = 1,
    Upload = 2,
}

public enum SubmissionStatus
{
    Pending = 1,
    Processing = 2,
    Completed = 3,
    Failed = 4,
}

/// <summary>
/// S5-T5: tracks the availability of the AI review portion of a submission
/// independently of the overall SubmissionStatus. A submission can be
/// <see cref="SubmissionStatus.Completed"/> while its AI analysis is still
/// <see cref="Unavailable"/> (static-only) or <see cref="Pending"/> (retry scheduled).
/// </summary>
public enum AiAnalysisStatus
{
    NotAttempted = 1,
    Available = 2,
    Unavailable = 3,
    Pending = 4,
}

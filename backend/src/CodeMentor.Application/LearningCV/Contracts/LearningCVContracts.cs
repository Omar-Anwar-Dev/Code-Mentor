namespace CodeMentor.Application.LearningCV.Contracts;

/// <summary>
/// S7-T2: aggregated payload for <c>GET /api/learning-cv/me</c> and (with
/// redaction) <c>GET /api/public/cv/{slug}</c>. Composes profile + assessment
/// skills + AI code-quality skills + top verified projects + activity stats +
/// CV metadata. PRD F10 + ADR-028 motivate the dual skill-axis layout.
/// </summary>
public sealed record LearningCVDto(
    LearningCVProfileDto Profile,
    LearningCVSkillProfileDto SkillProfile,
    LearningCVCodeQualityProfileDto CodeQualityProfile,
    IReadOnlyList<LearningCVProjectDto> VerifiedProjects,
    LearningCVStatsDto Stats,
    LearningCVMetadataDto Cv);

public sealed record LearningCVProfileDto(
    Guid UserId,
    string FullName,
    string? Email,             // null on the public/redacted view
    string? GitHubUsername,
    string? ProfilePictureUrl,
    DateTime CreatedAt);

public sealed record LearningCVSkillScoreDto(
    string Category,
    decimal Score,
    string Level);

public sealed record LearningCVSkillProfileDto(
    IReadOnlyList<LearningCVSkillScoreDto> Scores,
    string? OverallLevel);     // from latest assessment, null if no assessment yet

public sealed record LearningCVCodeQualityScoreDto(
    string Category,
    decimal Score,
    int SampleCount);

public sealed record LearningCVCodeQualityProfileDto(
    IReadOnlyList<LearningCVCodeQualityScoreDto> Scores);

public sealed record LearningCVProjectDto(
    Guid SubmissionId,
    string TaskTitle,
    string Track,
    string Language,
    int OverallScore,
    DateTime CompletedAt,
    string FeedbackPath);      // relative URL "/submissions/{id}/feedback"

public sealed record LearningCVStatsDto(
    int SubmissionsTotal,
    int SubmissionsCompleted,
    int AssessmentsCompleted,
    int LearningPathsActive,
    DateTime JoinedAt);

public sealed record LearningCVMetadataDto(
    string? PublicSlug,
    bool IsPublic,
    DateTime LastGeneratedAt,
    int ViewCount);

public sealed record UpdateLearningCVRequest(
    bool? IsPublic);

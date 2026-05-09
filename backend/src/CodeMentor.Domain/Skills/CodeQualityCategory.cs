namespace CodeMentor.Domain.Skills;

/// <summary>
/// S7-T1 / ADR-028: code-quality categories produced by the AI review (PRD F6).
/// Distinct from <see cref="CodeMentor.Domain.Assessments.SkillCategory"/>, which
/// holds CS-domain categories (DataStructures, Algorithms, OOP, Databases, Security).
/// </summary>
public enum CodeQualityCategory
{
    Correctness = 1,
    Readability = 2,
    Security = 3,
    Performance = 4,
    Design = 5,
}

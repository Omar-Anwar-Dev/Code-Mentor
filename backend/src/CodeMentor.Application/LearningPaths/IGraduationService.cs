using CodeMentor.Application.LearningPaths.Contracts;

namespace CodeMentor.Application.LearningPaths;

/// <summary>
/// S21-T3 / F16: read-side assembly for the Graduation page. Returns the
/// Before / After skill-radar pair, AI journey summary (when the user's Full
/// reassessment has run), and the Next-Phase eligibility flag.
///
/// Return shape:
///   - <c>Ok(null)</c>  — user has no active path, OR active path is not yet
///     at 100%. Controller maps to 404 Not Found.
///   - <c>Ok(view)</c>  — graduation data assembled. NextPhaseEligible is
///     true only when a Full variant Assessment for this path has Completed.
/// </summary>
public interface IGraduationService
{
    Task<GraduationViewDto?> GetForUserAsync(Guid userId, CancellationToken ct = default);
}

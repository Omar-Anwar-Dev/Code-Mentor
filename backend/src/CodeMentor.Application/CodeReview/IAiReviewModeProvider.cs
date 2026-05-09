namespace CodeMentor.Application.CodeReview;

/// <summary>
/// S11-T4 / F13 (ADR-037): selects between the single-prompt AI review
/// pipeline (`/api/analyze-zip` → `/api/ai-review`) and the parallel
/// multi-agent pipeline (`/api/analyze-zip-multi` → `/api/ai-review-multi`).
///
/// Default <see cref="AiReviewMode.Single"/> in production for cost
/// containment per ADR-037; <see cref="AiReviewMode.Multi"/> is opt-in
/// for thesis evaluation runs (S11-T6) and direct demo flips.
///
/// Sourced from the <c>AI_REVIEW_MODE</c> environment variable (or the
/// equivalent <c>AiService:ReviewMode</c> config key); env var change
/// requires only a service restart — no migration.
/// </summary>
public interface IAiReviewModeProvider
{
    AiReviewMode Current { get; }
}

public enum AiReviewMode
{
    Single = 0,
    Multi = 1,
}

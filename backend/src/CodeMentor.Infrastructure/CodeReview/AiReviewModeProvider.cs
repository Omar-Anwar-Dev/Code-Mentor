using CodeMentor.Application.CodeReview;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace CodeMentor.Infrastructure.CodeReview;

/// <summary>
/// Production <see cref="IAiReviewModeProvider"/>. Reads either the flat
/// <c>AI_REVIEW_MODE</c> env var or the hierarchical
/// <c>AiService:ReviewMode</c> config key — first non-empty wins. Default
/// is <see cref="AiReviewMode.Single"/> per ADR-037.
///
/// Mode is resolved on each access (cheap dictionary lookup) so a config
/// reload is reflected without a service restart, but the env var is
/// captured at process start so live env-var changes still need a restart.
/// </summary>
public sealed class AiReviewModeProvider : IAiReviewModeProvider
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<AiReviewModeProvider>? _logger;

    public AiReviewModeProvider(IConfiguration configuration, ILogger<AiReviewModeProvider>? logger = null)
    {
        _configuration = configuration;
        _logger = logger;
    }

    public AiReviewMode Current
    {
        get
        {
            var raw = _configuration["AI_REVIEW_MODE"]
                   ?? _configuration["AiService:ReviewMode"];
            if (string.IsNullOrWhiteSpace(raw))
            {
                return AiReviewMode.Single;
            }

            if (raw.Equals("multi", System.StringComparison.OrdinalIgnoreCase))
            {
                return AiReviewMode.Multi;
            }

            if (!raw.Equals("single", System.StringComparison.OrdinalIgnoreCase))
            {
                _logger?.LogWarning(
                    "Unrecognized AI_REVIEW_MODE value '{Raw}'; defaulting to single. Allowed: single | multi.",
                    raw);
            }
            return AiReviewMode.Single;
        }
    }
}

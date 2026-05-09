using System.Text;

namespace CodeMentor.Infrastructure.LearningCV;

/// <summary>
/// S7-T3: derive a URL-safe public slug from a user's Identity UserName.
/// UserName is unique (Identity guarantees), but URL-sanitization can collapse
/// distinct usernames onto the same slug. The caller checks for collision and
/// re-runs with <paramref name="suffix"/> set when needed.
/// </summary>
public static class PublicSlugGenerator
{
    private const int MaxLength = 60;

    /// <summary>
    /// Slugs that would shadow frontend routes ("/cv/me", "/cv/admin"). The
    /// generator silently rolls past them onto the userId-suffix fallback.
    /// </summary>
    private static readonly HashSet<string> Reserved = new(StringComparer.OrdinalIgnoreCase)
    {
        "me", "admin", "new", "edit", "settings", "register", "login", "logout",
    };

    public static string Generate(string? userName, Guid userId, int suffix = 0)
    {
        var raw = userName ?? string.Empty;

        // Identity sets UserName == Email by default. Public slugs should not
        // expose mail domains, so strip everything from the '@' onwards.
        var atIndex = raw.IndexOf('@');
        if (atIndex >= 0) raw = raw[..atIndex];

        var sb = new StringBuilder(raw.Length);
        var lastWasDash = false;
        foreach (var ch in raw)
        {
            if (char.IsLetterOrDigit(ch))
            {
                sb.Append(char.ToLowerInvariant(ch));
                lastWasDash = false;
            }
            else if (!lastWasDash && sb.Length > 0)
            {
                sb.Append('-');
                lastWasDash = true;
            }
        }
        if (sb.Length > 0 && sb[^1] == '-') sb.Length--;

        var core = sb.Length == 0 || Reserved.Contains(sb.ToString())
            ? $"learner-{userId.ToString("N")[..8]}"
            : sb.ToString();

        if (core.Length > MaxLength) core = core[..MaxLength];

        if (suffix > 0)
        {
            // -2, -3, ... appended on collision. Cap total at MaxLength.
            var tail = "-" + suffix.ToString();
            if (core.Length + tail.Length > MaxLength)
                core = core[..(MaxLength - tail.Length)];
            core += tail;
        }

        return core;
    }
}

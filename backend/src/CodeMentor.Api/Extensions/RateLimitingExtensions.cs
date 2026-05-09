using System.Globalization;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Configuration;

namespace CodeMentor.Api.Extensions;

public static class RateLimitingExtensions
{
    public const string AuthLoginPolicy = "auth-login";
    public const string GlobalPolicy = "global";
    public const string SubmissionsCreatePolicy = "submissions-create";
    // S9-T2 / F11: Project Audit creation rate limit (3 audits per 24h per user — ADR-031, ADR-033).
    public const string AuditsCreatePolicy = "audits-create";
    // S10-T7 / F12: Mentor chat message rate limit (30 messages per hour per session — ADR-036).
    public const string MentorChatMessagesPolicy = "mentor-chat-messages";

    /// <summary>
    /// S10-T7: matches /api/mentor-chat/{sessionId}/messages so the partition
    /// function can pull the sessionId out of the path before MVC routing has
    /// parsed it. Pre-compiled for the hot path.
    /// </summary>
    private static readonly System.Text.RegularExpressions.Regex MentorChatMessagesPathRegex = new(
        @"^/api/mentor-chat/(?<sessionId>[0-9a-fA-F-]+)/messages/?$",
        System.Text.RegularExpressions.RegexOptions.Compiled | System.Text.RegularExpressions.RegexOptions.IgnoreCase);

    public static IServiceCollection AddPlatformRateLimiting(
        this IServiceCollection services,
        IConfiguration? configuration = null)
    {
        var submissionsPerHour = configuration?.GetValue<int?>("RateLimits:SubmissionsPerHour") ?? 10;
        var auditsPerDay = configuration?.GetValue<int?>("RateLimits:AuditsPerDay") ?? 3;
        var mentorChatPerHour = configuration?.GetValue<int?>("RateLimits:MentorChatPerHour") ?? 30;
        services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

            options.OnRejected = async (context, token) =>
            {
                if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
                {
                    context.HttpContext.Response.Headers["Retry-After"] =
                        ((int)retryAfter.TotalSeconds).ToString(CultureInfo.InvariantCulture);
                }
                context.HttpContext.Response.ContentType = "application/problem+json";
                await context.HttpContext.Response.WriteAsync(
                    """{"title":"TooManyRequests","status":429,"detail":"Rate limit exceeded. Please slow down."}""",
                    token);
            };

            // 5 attempts per 15 minutes per IP for login.
            options.AddPolicy(AuthLoginPolicy, ctx =>
            {
                var ip = ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown";
                return RateLimitPartition.GetFixedWindowLimiter(ip, _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = 5,
                    Window = TimeSpan.FromMinutes(15),
                    QueueLimit = 0,
                    QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                });
            });

            // 10 submissions per hour per user (architecture.md §7.2) by default.
            // Key off Authorization header hash + IP so per-user limits work
            // even when auth middleware hasn't populated ctx.User yet (the
            // built-in rate limiter runs on the routing-pre-auth path).
            options.AddPolicy(SubmissionsCreatePolicy, ctx =>
            {
                var auth = ctx.Request.Headers.Authorization.ToString();
                var key = !string.IsNullOrEmpty(auth)
                    ? $"auth:{auth.GetHashCode()}"
                    : $"ip:{ctx.Connection.RemoteIpAddress?.ToString() ?? "anon"}";

                return RateLimitPartition.GetSlidingWindowLimiter(key, _ => new SlidingWindowRateLimiterOptions
                {
                    PermitLimit = submissionsPerHour,
                    Window = TimeSpan.FromHours(1),
                    SegmentsPerWindow = 6,
                    QueueLimit = 0,
                });
            });

            // S9-T2 / F11: 3 audits per 24h per user (architecture.md §7.2; ADR-031 / ADR-033).
            // Mirrors SubmissionsCreatePolicy partition strategy — keys off Authorization
            // header hash so per-user limits work pre-auth-middleware. Uses FixedWindow
            // because the .NET sliding-window limiter doesn't always populate RetryAfter
            // metadata at the 24h scale; FixedWindow guarantees the Retry-After header
            // (matches the auth-login policy's choice for the same reason).
            options.AddPolicy(AuditsCreatePolicy, ctx =>
            {
                var auth = ctx.Request.Headers.Authorization.ToString();
                var key = !string.IsNullOrEmpty(auth)
                    ? $"auth:{auth.GetHashCode()}"
                    : $"ip:{ctx.Connection.RemoteIpAddress?.ToString() ?? "anon"}";

                return RateLimitPartition.GetFixedWindowLimiter(key, _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = auditsPerDay,
                    Window = TimeSpan.FromHours(24),
                    QueueLimit = 0,
                    QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                });
            });

            // S10-T7 / F12: 30 messages per hour per session (ADR-036).
            // Partition by sessionId-from-path + Authorization-hash so each
            // (user, session) pair gets its own bucket — prevents two users with
            // a colliding session GUID (vanishingly unlikely but defensively
            // guarded) from sharing a quota. Sliding window with 6 segments.
            // Note: ADR-036 calls for a Redis-backed sliding window for
            // horizontal-scaling. Per ADR-038 the defense runs locally on the
            // owner's laptop, so the in-memory .NET RateLimiter is sufficient
            // here. Redis upgrade is the same deferred work tracked under
            // ADR-012 for the global limiter.
            options.AddPolicy(MentorChatMessagesPolicy, ctx =>
            {
                // Partition key combines the path (which embeds the session GUID)
                // with the Authorization header so different (user, session) pairs
                // get independent quotas.
                var path = ctx.Request.Path.Value ?? string.Empty;
                var auth = ctx.Request.Headers.Authorization.ToString();
                var authPart = !string.IsNullOrEmpty(auth)
                    ? $"auth:{auth.GetHashCode()}"
                    : $"ip:{ctx.Connection.RemoteIpAddress?.ToString() ?? "anon"}";
                var partitionKey = $"{authPart}|{path}";

                // S10-T7: read the limit from IConfiguration on every request so
                // test-time config overrides (e.g. WebApplicationFactory's per-class
                // ConfigureAppConfiguration) take effect. Captured-at-startup pattern
                // misses overrides applied after AddPlatformRateLimiting runs.
                var liveConfig = ctx.RequestServices.GetService<IConfiguration>();
                var liveLimit = liveConfig?.GetValue<int?>("RateLimits:MentorChatPerHour") ?? mentorChatPerHour;

                // Fixed-window mirrors AuditsCreatePolicy — sliding-window has known
                // quirks with RetryAfter at long windows.
                return RateLimitPartition.GetFixedWindowLimiter(partitionKey, _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = liveLimit,
                    Window = TimeSpan.FromHours(1),
                    QueueLimit = 0,
                    QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                });
            });

            // 100 requests per minute per user (fall back to IP for anon).
            options.AddPolicy(GlobalPolicy, ctx =>
            {
                var key = ctx.User.Identity?.IsAuthenticated == true
                    ? ctx.User.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)?.Value
                        ?? ctx.User.Identity.Name
                        ?? "auth"
                    : ctx.Connection.RemoteIpAddress?.ToString() ?? "anon";

                return RateLimitPartition.GetSlidingWindowLimiter(key, _ => new SlidingWindowRateLimiterOptions
                {
                    PermitLimit = 100,
                    Window = TimeSpan.FromMinutes(1),
                    SegmentsPerWindow = 6,
                    QueueLimit = 0,
                });
            });

            options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(ctx =>
            {
                if (ctx.Request.Path.StartsWithSegments("/health") ||
                    ctx.Request.Path.StartsWithSegments("/ready") ||
                    ctx.Request.Path.StartsWithSegments("/swagger"))
                {
                    return RateLimitPartition.GetNoLimiter("exempt");
                }
                return RateLimitPartition.GetNoLimiter("default"); // named policies opt in per endpoint
            });
        });

        return services;
    }
}

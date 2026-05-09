using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using System.Net.Mime;
using System.Text.Json;

namespace CodeMentor.Api.Extensions;

public static class HealthChecksExtensions
{
    public static IServiceCollection AddPlatformHealthChecks(this IServiceCollection services, IConfiguration config)
    {
        var sql = config.GetConnectionString("DefaultConnection");
        var redis = config.GetConnectionString("Redis") ?? "localhost:6379";
        var aiBase = config.GetValue<string>("AiService:BaseUrl") ?? "http://localhost:8001";

        var builder = services.AddHealthChecks();

        if (!string.IsNullOrEmpty(sql))
            builder.AddSqlServer(sql, name: "sqlserver", tags: new[] { "ready" });

        builder.AddRedis(redis, name: "redis", tags: new[] { "ready" });

        builder.AddUrlGroup(new Uri($"{aiBase.TrimEnd('/')}/health"), name: "ai-service", tags: new[] { "ready" });

        return services;
    }

    public static IEndpointRouteBuilder MapPlatformHealthChecks(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapHealthChecks("/health", new HealthCheckOptions
        {
            Predicate = _ => false, // `/health` is liveness only — no dependency checks
            ResponseWriter = WriteJsonResponse,
        });

        endpoints.MapHealthChecks("/ready", new HealthCheckOptions
        {
            Predicate = r => r.Tags.Contains("ready"),
            ResponseWriter = WriteJsonResponse,
        });

        return endpoints;
    }

    private static Task WriteJsonResponse(HttpContext ctx, HealthReport report)
    {
        ctx.Response.ContentType = MediaTypeNames.Application.Json;
        var payload = new
        {
            status = report.Status.ToString(),
            totalDurationMs = report.TotalDuration.TotalMilliseconds,
            checks = report.Entries.Select(e => new
            {
                name = e.Key,
                status = e.Value.Status.ToString(),
                description = e.Value.Description,
                error = e.Value.Exception?.Message,
                durationMs = e.Value.Duration.TotalMilliseconds,
            }),
        };
        return ctx.Response.WriteAsync(JsonSerializer.Serialize(payload,
            new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }));
    }
}

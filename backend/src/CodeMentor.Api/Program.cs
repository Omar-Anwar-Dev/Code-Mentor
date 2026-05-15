using CodeMentor.Api.Extensions;
using CodeMentor.Infrastructure;
using CodeMentor.Infrastructure.Assessments;
using CodeMentor.Infrastructure.Emails;
using CodeMentor.Infrastructure.Jobs;
using CodeMentor.Infrastructure.Persistence;
using CodeMentor.Infrastructure.Persistence.Seeds;
using CodeMentor.Infrastructure.ProjectAudits;
using Hangfire;
using Serilog;

Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .CreateBootstrapLogger();

// S7-T5: QuestPDF Community license (free for our scale; required to render).
QuestPDF.Settings.License = QuestPDF.Infrastructure.LicenseType.Community;

// S11-T10 / F13 (ADR-038): CLI gate — `dotnet run --project src/CodeMentor.Api -- seed-demo`
// runs the demo seeder against the configured database and exits without
// starting the web host. Idempotent; safe to re-run before each rehearsal.
if (args.Contains("seed-demo", StringComparer.OrdinalIgnoreCase))
{
    var seedBuilder = WebApplication.CreateBuilder(args);
    // AuditLogger depends on IHttpContextAccessor; register it before
    // Infrastructure so the DI graph resolves cleanly even though the
    // seed-demo path doesn't actually run the web pipeline.
    seedBuilder.Services.AddHttpContextAccessor();
    seedBuilder.Services.AddInfrastructure(seedBuilder.Configuration);
    var seedApp = seedBuilder.Build();
    try
    {
        await DbInitializer.EnsureDatabaseAsync(seedApp.Services);
        await DbInitializer.SeedDevDataAsync(seedApp.Services);
        await DemoSeeder.SeedAsync(seedApp.Services);
        Console.WriteLine("[seed-demo] OK — demo accounts ready. See docs/demos/defense-script.md.");
        return 0;
    }
    catch (Exception ex)
    {
        Console.Error.WriteLine($"[seed-demo] FAILED: {ex.Message}");
        Console.Error.WriteLine(ex.StackTrace);
        return 1;
    }
}

try
{
    var builder = WebApplication.CreateBuilder(args);

    builder.Host.UseSerilog((ctx, sp, cfg) => cfg
        .ReadFrom.Configuration(ctx.Configuration)
        .ReadFrom.Services(sp)
        .Enrich.FromLogContext()
        .Enrich.WithProperty("Service", "CodeMentor.Api")
        .Enrich.WithProperty("Environment", ctx.HostingEnvironment.EnvironmentName));

    builder.Services.AddHttpContextAccessor();
    builder.Services.AddControllers()
        .AddJsonOptions(opts =>
        {
            opts.JsonSerializerOptions.Converters.Add(
                new System.Text.Json.Serialization.JsonStringEnumConverter());
        });

    // S8-T11: RFC 7807 ProblemDetails for every error path that doesn't already
    // produce a controller-level response. `IncludeExceptionDetails` is gated on
    // Development so prod payloads never expose stack traces or internal paths.
    builder.Services.AddProblemDetails(options =>
    {
        options.CustomizeProblemDetails = ctx =>
        {
            ctx.ProblemDetails.Extensions["traceId"] = ctx.HttpContext.TraceIdentifier;
            ctx.ProblemDetails.Extensions["service"] = "CodeMentor.Api";
        };
    });

    builder.Services.AddSwaggerWithJwt();
    builder.Services.AddInfrastructure(builder.Configuration);
    builder.Services.AddApiAuthentication();
    builder.Services.AddPlatformRateLimiting(builder.Configuration);
    builder.Services.AddPlatformHealthChecks(builder.Configuration);

    builder.Services.AddCors(options =>
    {
        options.AddDefaultPolicy(p => p
            .WithOrigins("http://localhost:5173", "http://localhost:4173")
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials());
    });

    var app = builder.Build();

    // S8-T11: global exception → RFC 7807 problem JSON. UseExceptionHandler
    // funnels unhandled exceptions through the ProblemDetails pipeline,
    // UseStatusCodePages does the same for empty 4xx/5xx responses.
    app.UseExceptionHandler();
    app.UseStatusCodePages();

    app.UseSerilogRequestLogging(opts =>
    {
        opts.EnrichDiagnosticContext = (diag, http) =>
        {
            diag.Set("RequestId", http.TraceIdentifier);
            var userId = http.User?.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)?.Value;
            if (!string.IsNullOrEmpty(userId))
                diag.Set("UserId", userId);
        };
    });

    if (app.Environment.IsDevelopment())
    {
        app.UseSwagger();
        app.UseSwaggerUI(c =>
        {
            c.SwaggerEndpoint("/swagger/v1/swagger.json", "Code Mentor API v1");
            c.RoutePrefix = "swagger";
        });

        await DbInitializer.EnsureDatabaseAsync(app.Services);
        await DbInitializer.SeedDevDataAsync(app.Services);

        // Dev: configure Azurite CORS so the browser can PUT to SAS URLs.
        // Azurite ships with empty CORS rules — without this the FE upload
        // hits a preflight 403 even though the backend returns a valid SAS.
        // Idempotent; runs every boot. Production storage accounts have CORS
        // set once via the Azure Portal/CLI (PD-T1).
        try
        {
            using var corsScope = app.Services.CreateScope();
            var blobStorage = corsScope.ServiceProvider.GetRequiredService<CodeMentor.Application.Storage.IBlobStorage>();
            await blobStorage.EnsureCorsAsync(new[] { "http://localhost:5173", "http://localhost:4173" });
            Log.Information("Azurite CORS rules applied for FE origins (5173, 4173).");
        }
        catch (Exception ex)
        {
            Log.Warning(ex, "Failed to apply Azurite CORS rules — submissions/audits may fail uploading. Check Azurite container is up.");
        }

        // Dev smoke: enqueue a no-op background job so the Hangfire dashboard has
        // something visible on first boot. Proves the worker round-trips to SQL.
        // Test harness sets Hangfire:SkipSmokeJob=true to avoid the SQL round-trip
        // when no Hangfire storage is reachable.
        var skipSmoke = app.Configuration.GetValue<bool>("Hangfire:SkipSmokeJob");
        if (!skipSmoke)
        {
            using var scope = app.Services.CreateScope();
            var jobs = scope.ServiceProvider.GetRequiredService<IBackgroundJobClient>();
            jobs.Enqueue<HangfireSmokeJob>(j => j.Ping());

            // S9-T13 / ADR-033: register the daily 90-day audit-blob cleanup
            // sweep at ~03:00 UTC (low-traffic window). Same SkipSmokeJob gate
            // so InMemory test harness doesn't try to register against a
            // non-existent Hangfire SQL backend.
            RecurringJob.AddOrUpdate<AuditBlobCleanupJob>(
                AuditBlobCleanupJob.RecurringJobId,
                job => job.RunAsync(CancellationToken.None),
                "0 3 * * *",                          // cron: minute=0, hour=3, every day
                new RecurringJobOptions { TimeZone = TimeZoneInfo.Utc });

            // S14-T3 / ADR-046: every 5 min, retry EmailDelivery rows stuck in Pending
            // (initial provider call failed transiently). Cap of 3 attempts per row is
            // enforced inside EmailDeliveryService.TryDispatchAsync — the job itself
            // just picks due rows in batches of 50.
            RecurringJob.AddOrUpdate<EmailRetryJob>(
                EmailRetryJob.RecurringJobId,
                job => job.ExecuteAsync(CancellationToken.None),
                EmailRetryJob.Cron,
                new RecurringJobOptions { TimeZone = TimeZoneInfo.Utc });

            // S16-T9 / F15: weekly generator-quality metrics summary (R20 early-warning).
            // Logs last-8-batches approve/reject ratios so operators spot regressions
            // even when the admin dashboard isn't being watched.
            RecurringJob.AddOrUpdate<GeneratorQualityMetricsJob>(
                GeneratorQualityMetricsJob.RecurringJobId,
                job => job.RunAsync(CancellationToken.None),
                GeneratorQualityMetricsJob.Cron,
                new RecurringJobOptions { TimeZone = TimeZoneInfo.Utc });

            // S17-T5 / F15 (ADR-049 / ADR-055): weekly empirical IRT recalibration.
            // Mondays 02:00 UTC = dead-time across all reasonable timezones, never
            // collides with M3 supervisor rehearsal windows. Threshold per ADR-055
            // is >=1000 responses; pre-defense scale won't trigger any item.
            RecurringJob.AddOrUpdate<RecalibrateIRTJob>(
                "recalibrate-irt",
                job => job.ExecuteAsync(CancellationToken.None),
                "0 2 * * 1",
                new RecurringJobOptions { TimeZone = TimeZoneInfo.Utc });
        }
    }

    app.UseHttpsRedirection();
    app.UseCors();
    // S10-T7: explicit UseRouting before rate-limiting so the rate-limiter
    // middleware sees the matched endpoint metadata when it inspects
    // [EnableRateLimiting(...)] attributes. ASP.NET Core can auto-insert
    // routing late in the pipeline, which would defeat policy attributes.
    app.UseRouting();
    // Authentication runs before rate-limiting so per-user limiters can key
    // off the JWT sub. Login rate-limit still falls back to IP (pre-auth ctx).
    app.UseAuthentication();
    app.UseRateLimiter();
    app.UseAuthorization();

    app.MapControllers();
    app.MapPlatformHealthChecks();

    // S8-T9 (B-005): Hangfire dashboard auth — distinguish unauthenticated (401)
    // from authenticated-but-not-admin (403) before delegating to Hangfire's
    // own filter, which only returns bool and falls back to 401.
    app.UseWhen(ctx => ctx.Request.Path.StartsWithSegments("/hangfire"), branch =>
    {
        branch.Use(async (ctx, next) =>
        {
            var user = ctx.User;
            if (user.Identity?.IsAuthenticated != true)
            {
                ctx.Response.StatusCode = StatusCodes.Status401Unauthorized;
                return;
            }
            if (!user.IsInRole(CodeMentor.Infrastructure.Identity.ApplicationRoles.Admin))
            {
                ctx.Response.StatusCode = StatusCodes.Status403Forbidden;
                return;
            }
            await next();
        });
    });

    app.UseHangfireDashboard("/hangfire", new DashboardOptions
    {
        Authorization = new[] { app.Services.GetRequiredService<HangfireAdminAuthorizationFilter>() },
        DashboardTitle = "Code Mentor — Background Jobs",
    });

    app.Run();
}
catch (Exception ex) when (ex is not HostAbortedException)
{
    Log.Fatal(ex, "Host terminated unexpectedly");
    throw;
}
finally
{
    Log.CloseAndFlush();
}

return 0;

public partial class Program { }

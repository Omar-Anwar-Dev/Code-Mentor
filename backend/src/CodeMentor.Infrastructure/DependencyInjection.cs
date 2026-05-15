using CodeMentor.Application.Assessments;
using CodeMentor.Application.Admin;
using CodeMentor.Application.Analytics;
using CodeMentor.Application.Audit;
using CodeMentor.Application.Auth;
using CodeMentor.Application.CodeReview;
using CodeMentor.Application.Dashboard;
using CodeMentor.Application.Emails;
using CodeMentor.Application.Gamification;
using CodeMentor.Application.LearningCV;
using CodeMentor.Application.LearningPaths;
using CodeMentor.Application.MentorChat;
using CodeMentor.Application.Notifications;
using CodeMentor.Application.Skills;
using CodeMentor.Application.Storage;
using CodeMentor.Application.Submissions;
using CodeMentor.Application.Tasks;
using CodeMentor.Application.UserAccountDeletion;
using CodeMentor.Application.UserExports;
using CodeMentor.Application.UserSettings;
using CodeMentor.Infrastructure.Admin;
using CodeMentor.Infrastructure.Analytics;
using CodeMentor.Infrastructure.Assessments;
using CodeMentor.Infrastructure.Audit;
using CodeMentor.Infrastructure.Auth;
using CodeMentor.Infrastructure.CodeReview;
using CodeMentor.Infrastructure.Dashboard;
using CodeMentor.Infrastructure.Emails;
using CodeMentor.Infrastructure.Gamification;
using CodeMentor.Infrastructure.Identity;
using CodeMentor.Infrastructure.Jobs;
using CodeMentor.Infrastructure.LearningCV;
using CodeMentor.Infrastructure.LearningPaths;
using CodeMentor.Infrastructure.MentorChat;
using CodeMentor.Infrastructure.Notifications;
using CodeMentor.Infrastructure.Persistence;
using CodeMentor.Infrastructure.Skills;
using CodeMentor.Infrastructure.Storage;
using CodeMentor.Infrastructure.Submissions;
using CodeMentor.Infrastructure.Tasks;
using CodeMentor.Infrastructure.UserAccountDeletion;
using CodeMentor.Infrastructure.UserExports;
using CodeMentor.Infrastructure.UserSettings;
using Hangfire;
using Hangfire.SqlServer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Refit;

namespace CodeMentor.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("ConnectionStrings:DefaultConnection is not set.");

        services.AddDbContext<ApplicationDbContext>(opts =>
            opts.UseSqlServer(connectionString, sql => sql.MigrationsAssembly(typeof(ApplicationDbContext).Assembly.FullName)));

        services
            .AddIdentityCore<ApplicationUser>(opts =>
            {
                opts.Password.RequiredLength = 8;
                opts.Password.RequireDigit = true;
                opts.Password.RequireLowercase = true;
                opts.Password.RequireUppercase = true;
                opts.Password.RequireNonAlphanumeric = false;
                opts.User.RequireUniqueEmail = true;
                opts.SignIn.RequireConfirmedEmail = false;
                opts.Lockout.MaxFailedAccessAttempts = 5;
                opts.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
            })
            .AddRoles<ApplicationRole>()
            .AddRoleManager<RoleManager<ApplicationRole>>()
            .AddEntityFrameworkStores<ApplicationDbContext>();

        services.Configure<JwtOptions>(configuration.GetSection(JwtOptions.SectionName));
        services.Configure<GitHubOAuthOptions>(configuration.GetSection(GitHubOAuthOptions.SectionName));
        services.AddSingleton<RsaKeyProvider>();
        services.AddSingleton<IJwtTokenService, JwtTokenService>();
        services.AddSingleton<IOAuthTokenEncryptor, OAuthTokenEncryptor>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IGitHubOAuthService, GitHubOAuthService>();
        services.AddHttpClient(GitHubOAuthService.GitHubClientName);

        // S15-T5 / F15 (ADR-049): two adaptive selectors registered as concrete types,
        // routed at call time by the factory based on AI service health.
        services.AddSingleton<LegacyAdaptiveQuestionSelector>();
        services.AddScoped<IrtAdaptiveQuestionSelector>();
        services.AddScoped<IAdaptiveQuestionSelectorFactory, AdaptiveQuestionSelectorFactory>();

        // S16-T4 / F15 (ADR-049): admin AI question generator + drafts review flow.
        services.AddScoped<IAdminQuestionDraftService, AdminQuestionDraftService>();
        services.AddScoped<IAiQuestionGenerator, QuestionGeneratorRefitClient>();
        services.AddScoped<IEmbedEntityScheduler, HangfireEmbedEntityScheduler>();
        services.AddScoped<EmbedEntityJob>();
        // S16-T9 / F15: weekly generator-quality metrics job (R20 early-warning).
        services.AddScoped<GeneratorQualityMetricsJob>();

        services.AddSingleton<IScoringService, ScoringService>();
        services.AddScoped<IAssessmentService, AssessmentService>();

        services.AddHangfire(cfg => cfg
            .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
            .UseSimpleAssemblyNameTypeSerializer()
            .UseRecommendedSerializerSettings()
            .UseSqlServerStorage(connectionString, new SqlServerStorageOptions
            {
                CommandBatchMaxTimeout = TimeSpan.FromMinutes(5),
                SlidingInvisibilityTimeout = TimeSpan.FromMinutes(5),
                QueuePollInterval = TimeSpan.FromSeconds(5),
                UseRecommendedIsolationLevel = true,
                DisableGlobalLocks = true,
                SchemaName = "hangfire",
            }));
        services.AddHangfireServer(opts =>
        {
            opts.ServerName = $"code-mentor-worker:{Environment.MachineName}";
            opts.WorkerCount = Math.Max(Environment.ProcessorCount, 4);
        });
        services.AddSingleton<HangfireAdminAuthorizationFilter>();
        services.AddScoped<HangfireSmokeJob>();

        services.AddScoped<ILearningPathService, LearningPathService>();
        services.AddScoped<ILearnerSkillProfileService, LearnerSkillProfileService>();
        services.AddScoped<ITaskFramingService, TaskFramingService>();
        services.AddScoped<GenerateTaskFramingJob>();
        services.AddScoped<IGenerateTaskFramingScheduler, HangfireGenerateTaskFramingScheduler>();
        services.AddScoped<GenerateLearningPathJob>();
        services.AddScoped<ILearningPathScheduler, HangfireLearningPathScheduler>();

        // S17-T2 / F15 (ADR-049): post-assessment AI summary scheduler + job.
        services.AddScoped<IAssessmentSummaryScheduler, HangfireAssessmentSummaryScheduler>();
        services.AddScoped<GenerateAssessmentSummaryJob>();

        // S17-T6 / F15 (ADR-049 / ADR-055): IRT recalibration audit log read-side.
        services.AddScoped<IIRTCalibrationLogRepository, IRTCalibrationLogRepository>();

        // S17-T5 / F15 (ADR-055): weekly recalibration job. Recurring schedule
        // registered in Program.cs (Mondays 02:00 UTC).
        services.AddScoped<RecalibrateIRTJob>();

        // S17-T7 / F15 (ADR-049 / ADR-055): admin calibration dashboard read-side.
        services.AddScoped<IAdminCalibrationService,
            CodeMentor.Infrastructure.Admin.AdminCalibrationService>();

        // S18-T4 / F16 (ADR-049 / ADR-058): admin AI task generator + drafts review flow.
        services.AddScoped<IAdminTaskDraftService,
            CodeMentor.Infrastructure.Admin.AdminTaskDraftService>();

        services.AddScoped<IDashboardService, DashboardService>();

        // S8-T1: 12-week analytics aggregate.
        services.AddScoped<IAnalyticsService, AnalyticsService>();

        // S8-T3: gamification — XP, badges, profile.
        services.AddScoped<IXpService, XpService>();
        services.AddScoped<IBadgeService, BadgeService>();
        services.AddScoped<IGamificationProfileService, GamificationProfileService>();

        services.AddScoped<TaskCatalogService>();
        services.AddScoped<ITaskCatalogService>(sp => new CachedTaskCatalogService(
            sp.GetRequiredService<TaskCatalogService>(),
            sp.GetRequiredService<Microsoft.Extensions.Caching.Distributed.IDistributedCache>(),
            sp.GetRequiredService<Microsoft.Extensions.Logging.ILogger<CachedTaskCatalogService>>()));

        var redis = configuration.GetConnectionString("Redis") ?? "localhost:6379";
        services.AddStackExchangeRedisCache(opts =>
        {
            opts.Configuration = redis;
            opts.InstanceName = "codementor:";
        });

        services.Configure<BlobStorageOptions>(opts =>
        {
            var fromSection = configuration.GetSection(BlobStorageOptions.SectionName).Get<BlobStorageOptions>();
            if (!string.IsNullOrWhiteSpace(fromSection?.ConnectionString))
            {
                opts.ConnectionString = fromSection.ConnectionString;
            }
            // else: keep the Azurite default from BlobStorageOptions.
        });
        services.AddSingleton<IBlobStorage, AzureBlobStorage>();

        services.AddScoped<ISubmissionService, SubmissionService>();
        services.AddScoped<SubmissionAnalysisJob>();
        services.AddScoped<ISubmissionAnalysisScheduler, HangfireSubmissionAnalysisScheduler>();
        services.AddScoped<IGitHubRepoClient, OctokitGitHubRepoClient>();
        services.AddScoped<IGitHubCodeFetcher, GitHubCodeFetcher>();
        services.AddSingleton<IZipSubmissionValidator, ZipSubmissionValidator>();

        // S9-T3 / F11 (Project Audit — ADR-031). Parallel module to Submissions.
        services.AddScoped<CodeMentor.Application.ProjectAudits.IProjectAuditService,
            CodeMentor.Infrastructure.ProjectAudits.ProjectAuditService>();
        services.AddScoped<CodeMentor.Infrastructure.ProjectAudits.ProjectAuditJob>();
        services.AddScoped<CodeMentor.Application.ProjectAudits.IProjectAuditScheduler,
            CodeMentor.Infrastructure.ProjectAudits.HangfireProjectAuditScheduler>();

        // S9-T4: full audit pipeline — code loader + AI audit client (ADR-034 endpoint).
        services.AddScoped<CodeMentor.Application.ProjectAudits.IProjectAuditCodeLoader,
            CodeMentor.Infrastructure.ProjectAudits.ProjectAuditCodeLoader>();
        services.AddScoped<CodeMentor.Application.CodeReview.IProjectAuditAiClient,
            CodeMentor.Infrastructure.CodeReview.ProjectAuditAiClient>();

        // S9-T13 / ADR-033: 90-day blob retention sweep.
        services.AddScoped<CodeMentor.Infrastructure.ProjectAudits.AuditBlobCleanupJob>();

        // S10-T4 / F12: mentor-chat indexing job + scheduler. Refit client for the
        // AI service's POST /api/embeddings/upsert is registered below in the AI
        // section so it picks up the shared AiServiceOptions BaseUrl.
        services.AddScoped<IndexForMentorChatJob>();
        services.AddScoped<IMentorChatIndexScheduler, HangfireMentorChatIndexScheduler>();
        services.AddScoped<IEmbeddingsClient, EmbeddingsClient>();

        // S10-T6: mentor-chat backend service + SSE proxy client. The SSE client
        // uses raw HttpClient (Refit doesn't support SSE) wired through HttpClientFactory.
        services.AddScoped<IMentorChatService, MentorChatService>();
        services.AddHttpClient<IMentorChatStreamClient, HttpMentorChatStreamClient>((sp, http) =>
        {
            var opts = sp.GetRequiredService<IOptions<AiServiceOptions>>().Value;
            http.BaseAddress = new Uri(opts.BaseUrl);
            // Mentor-chat turns can stream up to ~30 s — give the HttpClient
            // generous headroom so the underlying connection isn't aborted
            // mid-stream.
            http.Timeout = TimeSpan.FromSeconds(120);
        });

        // S7-T1 / ADR-028: AI scores feed CodeQualityScore running averages.
        services.AddScoped<ICodeQualityScoreUpdater, CodeQualityScoreUpdater>();

        // S7-T2: Learning CV aggregate.
        services.AddScoped<ILearningCVService, LearningCVService>();

        // S7-T5: PDF renderer (QuestPDF). License set once in Program.cs.
        services.AddSingleton<ILearningCVPdfRenderer, LearningCVPdfRenderer>();

        // S7-T9: admin services (Task / Question / User CRUD).
        services.AddScoped<IAdminTaskService, AdminTaskService>();
        services.AddScoped<IAdminQuestionService, AdminQuestionService>();
        services.AddScoped<IAdminUserService, AdminUserService>();

        // Post-S14 follow-up: admin dashboard summary (replaces hardcoded
        // demo data flagged by the amber banner on /admin and /admin/analytics).
        services.AddScoped<IAdminDashboardSummaryService, AdminDashboardSummaryService>();

        // S7-T11: audit logger captures old/new on every admin write.
        services.AddScoped<IAuditLogger, AuditLogger>();

        // S6-T5: feedback aggregator (pulls AI + static into the unified payload)
        services.AddScoped<IFeedbackAggregator, FeedbackAggregator>();

        // S8-T7: feedback rating (thumbs up/down per category).
        services.AddScoped<IFeedbackRatingService, FeedbackRatingService>();

        // S6-T11: notifications service
        services.AddScoped<INotificationService, NotificationService>();

        // S14-T2 / ADR-046: per-user settings (notification prefs + privacy toggles).
        services.AddScoped<IUserSettingsService, UserSettingsService>();

        // S14-T8 / ADR-046: data export — Hangfire job + scheduler + PDF renderer + facade.
        services.AddSingleton<UserDataExportPdfRenderer>();
        services.AddScoped<UserDataExportJob>();
        services.AddScoped<IUserDataExportScheduler, HangfireUserDataExportScheduler>();
        services.AddScoped<IUserDataExportService, UserDataExportService>();

        // S14-T9 / ADR-046: account deletion — service + Hangfire job + scheduler.
        services.AddScoped<IUserAccountDeletionService, UserAccountDeletionService>();
        services.AddScoped<IUserAccountDeletionScheduler, HangfireUserAccountDeletionScheduler>();
        services.AddScoped<HardDeleteUserJob>();

        // S14-T3 / ADR-046: email provider factory + delivery service + Hangfire retry job.
        // EmailDelivery:Provider selects SendGrid (real SMTP) vs LoggedOnly (dev/test default
        // + R18 demo-day fallback). Provider is scoped so an env-var flip takes effect at the
        // next request. SendGrid requires EmailDelivery:SendGridApiKey; LoggedOnly needs no config.
        services.AddScoped<IEmailProvider>(sp =>
        {
            var cfg = sp.GetRequiredService<IConfiguration>();
            var providerName = cfg["EmailDelivery:Provider"] ?? "LoggedOnly";
            return providerName.Equals("SendGrid", StringComparison.OrdinalIgnoreCase)
                ? ActivatorUtilities.CreateInstance<SendGridEmailProvider>(sp)
                : ActivatorUtilities.CreateInstance<LoggedOnlyEmailProvider>(sp);
        });
        services.AddScoped<EmailDeliveryService>();
        services.AddScoped<IEmailDeliveryService>(sp => sp.GetRequiredService<EmailDeliveryService>());
        services.AddScoped<EmailRetryJob>();
        // S14-T4 / ADR-046: strongly-typed brand-wrapped email-body builder for the 5 event templates.
        services.AddSingleton<IEmailTemplateRenderer, EmailTemplateRenderer>();

        // S5-T1: AI service Refit client
        services.Configure<AiServiceOptions>(configuration.GetSection(AiServiceOptions.SectionName));
        services.AddRefitClient<IAiServiceRefit>(sp =>
        {
            var refitSettings = new RefitSettings
            {
                ContentSerializer = new SystemTextJsonContentSerializer(
                    new System.Text.Json.JsonSerializerOptions
                    {
                        PropertyNameCaseInsensitive = true,
                        PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase,
                    }),
            };
            return refitSettings;
        })
        .ConfigureHttpClient((sp, http) =>
        {
            var opts = sp.GetRequiredService<IOptions<AiServiceOptions>>().Value;
            http.BaseAddress = new Uri(opts.BaseUrl);
            http.Timeout = TimeSpan.FromSeconds(opts.TimeoutSeconds);
        });
        services.AddScoped<IAiReviewClient, AiReviewClient>();
        // S11-T4 / F13 (ADR-037): mode provider sourced from
        // AI_REVIEW_MODE env var or AiService:ReviewMode config key.
        services.AddSingleton<IAiReviewModeProvider, AiReviewModeProvider>();
        services.AddSingleton<IStaticToolSelector, StaticToolSelector>();
        services.AddScoped<ISubmissionCodeLoader, SubmissionCodeLoader>();

        // S12 / F14 (ADR-040..044): learner snapshot + history retrieval.
        services.Configure<LearnerSnapshotOptions>(configuration.GetSection(LearnerSnapshotOptions.SectionName));
        services.AddScoped<ILearnerSnapshotService, LearnerSnapshotService>();
        services.AddRefitClient<IFeedbackHistorySearchRefit>(sp =>
        {
            var refitSettings = new RefitSettings
            {
                ContentSerializer = new SystemTextJsonContentSerializer(
                    new System.Text.Json.JsonSerializerOptions
                    {
                        PropertyNameCaseInsensitive = true,
                        PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase,
                    }),
            };
            return refitSettings;
        })
        .ConfigureHttpClient((sp, http) =>
        {
            var opts = sp.GetRequiredService<IOptions<AiServiceOptions>>().Value;
            http.BaseAddress = new Uri(opts.BaseUrl);
            // Tight timeout — F14 RAG retrieval is expected to be sub-second;
            // a stuck call should fall back to profile-only via ADR-043.
            http.Timeout = TimeSpan.FromSeconds(10);
        });
        services.AddScoped<IFeedbackHistoryRetriever, FeedbackHistoryRetriever>();

        // S9-T4: distinct Refit client for /api/project-audit (ADR-034). Reuses
        // the same AiServiceOptions BaseUrl + Timeout — different endpoint, same service.
        services.AddRefitClient<IProjectAuditServiceRefit>(sp =>
        {
            var refitSettings = new RefitSettings
            {
                ContentSerializer = new SystemTextJsonContentSerializer(
                    new System.Text.Json.JsonSerializerOptions
                    {
                        PropertyNameCaseInsensitive = true,
                        PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase,
                    }),
            };
            return refitSettings;
        })
        .ConfigureHttpClient((sp, http) =>
        {
            var opts = sp.GetRequiredService<IOptions<AiServiceOptions>>().Value;
            http.BaseAddress = new Uri(opts.BaseUrl);
            // Audit pipeline runs longer than per-task review (architecture §4.4 — 12-min job
            // hard cap); give the HTTP client headroom so the AI call can finish before the
            // job-level concurrency lock fires.
            http.Timeout = TimeSpan.FromSeconds(Math.Max(opts.TimeoutSeconds, 240));
        });

        // S15-T5 / F15 (ADR-049 / ADR-050): Refit client for /api/irt/* endpoints.
        // Pure-CPU on the AI service side (no OpenAI), so a tight timeout works.
        services.AddRefitClient<IIrtRefit>(sp =>
        {
            var refitSettings = new RefitSettings
            {
                ContentSerializer = new SystemTextJsonContentSerializer(
                    new System.Text.Json.JsonSerializerOptions
                    {
                        PropertyNameCaseInsensitive = true,
                        PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase,
                        DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull,
                    }),
            };
            return refitSettings;
        })
        .ConfigureHttpClient((sp, http) =>
        {
            var opts = sp.GetRequiredService<IOptions<AiServiceOptions>>().Value;
            http.BaseAddress = new Uri(opts.BaseUrl);
            // IRT endpoints are pure-CPU (no model calls) — a few ms locally, < 1s
            // even at the projected 250-item bank. Tight 10 s cap keeps a stuck
            // call from blocking an assessment-step round-trip.
            http.Timeout = TimeSpan.FromSeconds(10);
        });

        // S10-T4 / F12: Refit client for /api/embeddings/upsert. Reuses the
        // AiServiceOptions BaseUrl + a shorter timeout (embeddings is fast).
        services.AddRefitClient<IEmbeddingsRefit>(sp =>
        {
            var refitSettings = new RefitSettings
            {
                ContentSerializer = new SystemTextJsonContentSerializer(
                    new System.Text.Json.JsonSerializerOptions
                    {
                        PropertyNameCaseInsensitive = true,
                        PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase,
                    }),
            };
            return refitSettings;
        })
        .ConfigureHttpClient((sp, http) =>
        {
            var opts = sp.GetRequiredService<IOptions<AiServiceOptions>>().Value;
            http.BaseAddress = new Uri(opts.BaseUrl);
            http.Timeout = TimeSpan.FromSeconds(opts.TimeoutSeconds);
        });

        // S16-T4 / F15 (ADR-049 / ADR-054): Refit client for /api/generate-questions.
        // Longer timeout — count=20 with code snippets can take ~30-40s of model time.
        services.AddRefitClient<IQuestionGeneratorRefit>(sp =>
        {
            var refitSettings = new RefitSettings
            {
                ContentSerializer = new SystemTextJsonContentSerializer(
                    new System.Text.Json.JsonSerializerOptions
                    {
                        PropertyNameCaseInsensitive = true,
                        PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase,
                    }),
            };
            return refitSettings;
        })
        .ConfigureHttpClient((sp, http) =>
        {
            var opts = sp.GetRequiredService<IOptions<AiServiceOptions>>().Value;
            http.BaseAddress = new Uri(opts.BaseUrl);
            // Generator can be slow at count=20 with code snippets — match the
            // audit-side timeout for safety.
            http.Timeout = TimeSpan.FromSeconds(Math.Max(opts.TimeoutSeconds, 240));
        });

        // S16-T4 / F15+F16 (ADR-052): Refit client for /api/embed +
        // /api/embeddings/reload. Pure-CPU on the AI service side (one
        // OpenAI embed call ≤ 1 s typically), so a short timeout works.
        services.AddRefitClient<IGeneralEmbeddingsRefit>(sp =>
        {
            var refitSettings = new RefitSettings
            {
                ContentSerializer = new SystemTextJsonContentSerializer(
                    new System.Text.Json.JsonSerializerOptions
                    {
                        PropertyNameCaseInsensitive = true,
                        PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase,
                    }),
            };
            return refitSettings;
        })
        .ConfigureHttpClient((sp, http) =>
        {
            var opts = sp.GetRequiredService<IOptions<AiServiceOptions>>().Value;
            http.BaseAddress = new Uri(opts.BaseUrl);
            http.Timeout = TimeSpan.FromSeconds(30);
        });

        // S17-T1 / F15 (ADR-049): Refit client for /api/assessment-summary.
        // p95 ≤ 8 s SLO with worst-case ~20 s tail; HttpClient timeout 60 s
        // matches the AI-service-side per-call timeout.
        services.AddRefitClient<IAssessmentSummaryRefit>(sp =>
        {
            var refitSettings = new RefitSettings
            {
                ContentSerializer = new SystemTextJsonContentSerializer(
                    new System.Text.Json.JsonSerializerOptions
                    {
                        PropertyNameCaseInsensitive = true,
                        PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase,
                    }),
            };
            return refitSettings;
        })
        .ConfigureHttpClient((sp, http) =>
        {
            var opts = sp.GetRequiredService<IOptions<AiServiceOptions>>().Value;
            http.BaseAddress = new Uri(opts.BaseUrl);
            http.Timeout = TimeSpan.FromSeconds(Math.Max(opts.TimeoutSeconds, 60));
        });

        // S18-T3 / F16 (ADR-049): Refit client for /api/generate-tasks.
        // Tasks have richer text than questions; reuse the same long-timeout pattern.
        services.AddRefitClient<ITaskGeneratorRefit>(sp =>
        {
            var refitSettings = new RefitSettings
            {
                ContentSerializer = new SystemTextJsonContentSerializer(
                    new System.Text.Json.JsonSerializerOptions
                    {
                        PropertyNameCaseInsensitive = true,
                        PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase,
                    }),
            };
            return refitSettings;
        })
        .ConfigureHttpClient((sp, http) =>
        {
            var opts = sp.GetRequiredService<IOptions<AiServiceOptions>>().Value;
            http.BaseAddress = new Uri(opts.BaseUrl);
            http.Timeout = TimeSpan.FromSeconds(Math.Max(opts.TimeoutSeconds, 240));
        });

        // S19-T4 / F16 (ADR-052): Refit client for /api/generate-path.
        // p95 ≤ 15 s target — give the timeout ~3x headroom for retries.
        services.AddRefitClient<IPathGeneratorRefit>(sp =>
        {
            var refitSettings = new RefitSettings
            {
                ContentSerializer = new SystemTextJsonContentSerializer(
                    new System.Text.Json.JsonSerializerOptions
                    {
                        PropertyNameCaseInsensitive = true,
                        PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase,
                    }),
            };
            return refitSettings;
        })
        .ConfigureHttpClient((sp, http) =>
        {
            var opts = sp.GetRequiredService<IOptions<AiServiceOptions>>().Value;
            http.BaseAddress = new Uri(opts.BaseUrl);
            http.Timeout = TimeSpan.FromSeconds(Math.Max(opts.TimeoutSeconds, 60));
        });

        // S19-T5 / F16 (ADR-052): Refit client for /api/task-framing.
        // p95 ≤ 6 s target — short timeout (≤ 30 s ceiling).
        services.AddRefitClient<ITaskFramingRefit>(sp =>
        {
            var refitSettings = new RefitSettings
            {
                ContentSerializer = new SystemTextJsonContentSerializer(
                    new System.Text.Json.JsonSerializerOptions
                    {
                        PropertyNameCaseInsensitive = true,
                        PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase,
                    }),
            };
            return refitSettings;
        })
        .ConfigureHttpClient((sp, http) =>
        {
            var opts = sp.GetRequiredService<IOptions<AiServiceOptions>>().Value;
            http.BaseAddress = new Uri(opts.BaseUrl);
            http.Timeout = TimeSpan.FromSeconds(Math.Max(opts.TimeoutSeconds, 30));
        });

        return services;
    }
}

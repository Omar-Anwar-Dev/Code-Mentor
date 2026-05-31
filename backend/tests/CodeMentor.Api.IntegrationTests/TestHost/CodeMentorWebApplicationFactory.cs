using CodeMentor.Application.Admin;
using CodeMentor.Application.Assessments;
using CodeMentor.Application.CodeReview;
using CodeMentor.Application.LearningPaths;
using CodeMentor.Application.MentorChat;
using CodeMentor.Application.ProjectAudits;
using CodeMentor.Application.Storage;
using CodeMentor.Application.Submissions;
using CodeMentor.Application.UserAccountDeletion;
using CodeMentor.Application.UserExports;
using CodeMentor.Infrastructure.Persistence;
// using statements above pull in the fake-loader / fake-AI-client types from this assembly.
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace CodeMentor.Api.IntegrationTests.TestHost;

public class CodeMentorWebApplicationFactory : WebApplicationFactory<Program>
{
    private readonly string _dbName = $"TestDb_{Guid.NewGuid():N}";

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");

        builder.ConfigureAppConfiguration((_, cfg) =>
        {
            // Tests hammer POST /submissions far above prod limits; remove the
            // cap. Login rate-limiter (5/15min/IP) still exercised in auth tests.
            // Hangfire SqlServerStorage isn't reachable from the test harness —
            // skip the dev smoke-job enqueue so startup doesn't depend on SQL.
            cfg.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["RateLimits:SubmissionsPerHour"] = "1000000",
                ["RateLimits:AuditsPerDay"] = "1000000",
                ["RateLimits:MentorChatPerHour"] = "1000000",
                ["Hangfire:SkipSmokeJob"] = "true",
            });
        });

        builder.ConfigureTestServices(services =>
        {
            // Nuke every EF Core descriptor so a clean InMemory setup can be added.
            var descriptors = services
                .Where(d => d.ServiceType.FullName is string name &&
                            (name.StartsWith("Microsoft.EntityFrameworkCore")
                             || name.StartsWith("Microsoft.Extensions.DependencyInjection.EntityFrameworkServiceCollectionExtensions")
                             || name.Contains("ApplicationDbContext")))
                .ToList();

            foreach (var d in descriptors)
                services.Remove(d);

            services.AddDbContext<ApplicationDbContext>(opts =>
                opts.UseInMemoryDatabase(_dbName));

            // Swap Hangfire-backed scheduler for one that runs jobs synchronously.
            var schedulerDescriptor = services.FirstOrDefault(
                d => d.ServiceType == typeof(ILearningPathScheduler));
            if (schedulerDescriptor is not null) services.Remove(schedulerDescriptor);
            services.AddScoped<ILearningPathScheduler, InlineLearningPathScheduler>();

            // S20-T5 / F16 (ADR-053): adaptation scheduler — recorder only;
            // tests assert on the HTTP surface, not the post-enqueue state.
            var adaptDescriptor = services.FirstOrDefault(
                d => d.ServiceType == typeof(IPathAdaptationScheduler));
            if (adaptDescriptor is not null) services.Remove(adaptDescriptor);
            services.AddSingleton<IPathAdaptationScheduler, InlinePathAdaptationScheduler>();

            var submissionSchedulerDescriptor = services.FirstOrDefault(
                d => d.ServiceType == typeof(ISubmissionAnalysisScheduler));
            if (submissionSchedulerDescriptor is not null) services.Remove(submissionSchedulerDescriptor);
            services.AddScoped<ISubmissionAnalysisScheduler, InlineSubmissionAnalysisScheduler>();

            // S9-T3: Project Audit scheduler — same inline pattern as Submissions.
            // Singleton so tests can resolve the concrete type and assert against
            // .Scheduled / .DelayedRetries lists (mirrors FakeBlobStorage Singleton lifetime).
            var auditSchedulerDescriptor = services.FirstOrDefault(
                d => d.ServiceType == typeof(IProjectAuditScheduler));
            if (auditSchedulerDescriptor is not null) services.Remove(auditSchedulerDescriptor);
            services.AddSingleton<IProjectAuditScheduler, InlineProjectAuditScheduler>();

            // S9-T4: swap in fake AI client + code loader for the audit pipeline so
            // tests don't require a live AI service or Azurite/GitHub. Singleton so
            // tests can mutate `Response` / `ThrowUnavailable` between calls.
            var auditAiDescriptor = services.FirstOrDefault(d => d.ServiceType == typeof(IProjectAuditAiClient));
            if (auditAiDescriptor is not null) services.Remove(auditAiDescriptor);
            services.AddSingleton<IProjectAuditAiClient, FakeProjectAuditAiClient>();

            var auditLoaderDescriptor = services.FirstOrDefault(d => d.ServiceType == typeof(IProjectAuditCodeLoader));
            if (auditLoaderDescriptor is not null) services.Remove(auditLoaderDescriptor);
            services.AddScoped<IProjectAuditCodeLoader, FakeProjectAuditCodeLoader>();

            // Swap Azurite-backed blob storage for an in-memory fake so submission
            // integration tests don't require a live Azurite on port 10000.
            var blobDescriptor = services.FirstOrDefault(d => d.ServiceType == typeof(IBlobStorage));
            if (blobDescriptor is not null) services.Remove(blobDescriptor);
            services.AddSingleton<IBlobStorage, FakeBlobStorage>();

            // S5-T3: the analysis job now calls the AI service + code loader. Fake
            // both so the InlineSubmissionAnalysisScheduler doesn't need a live
            // AI service or a real blob/GitHub fetch to complete synchronously.
            var codeLoaderDescriptor = services.FirstOrDefault(d => d.ServiceType == typeof(ISubmissionCodeLoader));
            if (codeLoaderDescriptor is not null) services.Remove(codeLoaderDescriptor);
            services.AddScoped<ISubmissionCodeLoader, FakeSubmissionCodeLoader>();

            var aiClientDescriptor = services.FirstOrDefault(d => d.ServiceType == typeof(IAiReviewClient));
            if (aiClientDescriptor is not null) services.Remove(aiClientDescriptor);
            services.AddSingleton<IAiReviewClient, FakeAiReviewClient>();

            // S15-T5: keep integration tests on the verbatim PRD-F2 legacy
            // heuristic. The IRT path's tests live in CodeMentor.Application.Tests
            // (Assessments/IrtAdaptiveQuestionSelectorTests.cs) with a mocked IIrtRefit.
            var selectorFactoryDescriptor = services.FirstOrDefault(
                d => d.ServiceType == typeof(CodeMentor.Application.Assessments.IAdaptiveQuestionSelectorFactory));
            if (selectorFactoryDescriptor is not null) services.Remove(selectorFactoryDescriptor);
            services.AddScoped<CodeMentor.Application.Assessments.IAdaptiveQuestionSelectorFactory,
                LegacyOnlyAdaptiveQuestionSelectorFactory>();

            // S10-T4: swap in inline scheduler + fake embeddings client for the
            // mentor-chat indexing pipeline. Singleton so tests can mutate
            // `Response` / `ThrowUnavailable` between calls and assert against
            // SubmissionEnqueues / AuditEnqueues lists.
            var mentorSchedulerDescriptor = services.FirstOrDefault(
                d => d.ServiceType == typeof(IMentorChatIndexScheduler));
            if (mentorSchedulerDescriptor is not null) services.Remove(mentorSchedulerDescriptor);
            services.AddSingleton<IMentorChatIndexScheduler, InlineMentorChatIndexScheduler>();

            var embeddingsClientDescriptor = services.FirstOrDefault(d => d.ServiceType == typeof(IEmbeddingsClient));
            if (embeddingsClientDescriptor is not null) services.Remove(embeddingsClientDescriptor);
            services.AddSingleton<IEmbeddingsClient, FakeEmbeddingsClient>();

            // S10-T6: fake SSE stream client so the mentor-chat controller can run
            // without a live AI service. Singleton so tests can mutate ScriptedEvents.
            var streamClientDescriptor = services.FirstOrDefault(d => d.ServiceType == typeof(IMentorChatStreamClient));
            if (streamClientDescriptor is not null) services.Remove(streamClientDescriptor);
            services.AddSingleton<IMentorChatStreamClient, FakeMentorChatStreamClient>();

            // S14-T8: swap the Hangfire-backed UserDataExport scheduler with one that
            // runs the job synchronously in a fresh DI scope, so tests can assert on the
            // ZIP + notification + email side-effects immediately after POST.
            var exportSchedulerDescriptor = services.FirstOrDefault(
                d => d.ServiceType == typeof(IUserDataExportScheduler));
            if (exportSchedulerDescriptor is not null) services.Remove(exportSchedulerDescriptor);
            services.AddSingleton<IUserDataExportScheduler, InlineUserDataExportScheduler>();

            // S14-T9: swap the Hangfire account-deletion scheduler with an inline one that
            // captures scheduled jobs (without running them — the 30-day wait would block tests)
            // and exposes TriggerHardDeleteAsync(userId, requestId) so tests can fire the
            // cascade synchronously.
            var deletionSchedulerDescriptor = services.FirstOrDefault(
                d => d.ServiceType == typeof(IUserAccountDeletionScheduler));
            if (deletionSchedulerDescriptor is not null) services.Remove(deletionSchedulerDescriptor);
            services.AddSingleton<IUserAccountDeletionScheduler, InlineUserAccountDeletionScheduler>();

            // S16-T4 + S16-T5 / F15+F16: swap the Hangfire-backed embed scheduler
            // + Refit-backed AI question generator + Refit-backed embeddings
            // client with inline / fake impls so the admin drafts-review flow
            // + EmbedEntityJob run end-to-end without a live AI service or
            // live Hangfire.
            var embedSchedulerDescriptor = services.FirstOrDefault(
                d => d.ServiceType == typeof(IEmbedEntityScheduler));
            if (embedSchedulerDescriptor is not null) services.Remove(embedSchedulerDescriptor);
            services.AddSingleton<IEmbedEntityScheduler, InlineEmbedEntityScheduler>();

            var aiGenDescriptor = services.FirstOrDefault(
                d => d.ServiceType == typeof(IAiQuestionGenerator));
            if (aiGenDescriptor is not null) services.Remove(aiGenDescriptor);
            services.AddSingleton<IAiQuestionGenerator, FakeAiQuestionGenerator>();

            var generalEmbedRefitDescriptor = services.FirstOrDefault(
                d => d.ServiceType == typeof(CodeMentor.Infrastructure.CodeReview.IGeneralEmbeddingsRefit));
            if (generalEmbedRefitDescriptor is not null) services.Remove(generalEmbedRefitDescriptor);
            services.AddSingleton<CodeMentor.Infrastructure.CodeReview.IGeneralEmbeddingsRefit, FakeGeneralEmbeddingsRefit>();

            // S17-T2 / F15 (ADR-049): swap the Hangfire-backed assessment-summary
            // scheduler + Refit-backed AI summarizer with inline / fake impls so
            // CompleteAsync → GenerateAssessmentSummaryJob → AssessmentSummary row
            // runs synchronously in tests without a live AI service or live Hangfire.
            var summarySchedulerDescriptor = services.FirstOrDefault(
                d => d.ServiceType == typeof(IAssessmentSummaryScheduler));
            if (summarySchedulerDescriptor is not null) services.Remove(summarySchedulerDescriptor);
            services.AddSingleton<IAssessmentSummaryScheduler, InlineAssessmentSummaryScheduler>();

            var summaryRefitDescriptor = services.FirstOrDefault(
                d => d.ServiceType == typeof(CodeMentor.Infrastructure.CodeReview.IAssessmentSummaryRefit));
            if (summaryRefitDescriptor is not null) services.Remove(summaryRefitDescriptor);
            services.AddSingleton<CodeMentor.Infrastructure.CodeReview.IAssessmentSummaryRefit, FakeAssessmentSummaryRefit>();

            // S18-T4 / F16 (ADR-049): swap the Refit-backed task generator with a fake
            // so the admin tasks-draft flow runs end-to-end without live OpenAI.
            var taskGenRefitDescriptor = services.FirstOrDefault(
                d => d.ServiceType == typeof(CodeMentor.Infrastructure.CodeReview.ITaskGeneratorRefit));
            if (taskGenRefitDescriptor is not null) services.Remove(taskGenRefitDescriptor);
            services.AddSingleton<CodeMentor.Infrastructure.CodeReview.ITaskGeneratorRefit, FakeTaskGeneratorRefit>();

            // S19-T4 / F16 (ADR-052): swap the Refit-backed path generator with a
            // fake so the path-generation flow runs end-to-end without a live AI
            // service. Default behaviour throws 503 → LearningPathService falls
            // back to template logic (preserves pre-S19 deterministic-path
            // behaviour for existing tests).
            var pathGenRefitDescriptor = services.FirstOrDefault(
                d => d.ServiceType == typeof(CodeMentor.Infrastructure.CodeReview.IPathGeneratorRefit));
            if (pathGenRefitDescriptor is not null) services.Remove(pathGenRefitDescriptor);
            services.AddSingleton<CodeMentor.Infrastructure.CodeReview.IPathGeneratorRefit, FakePathGeneratorRefit>();

            // S19-T5 / S19-T6 / F16 (ADR-052): swap the Refit-backed task framer
            // + the Hangfire scheduler with inline test fixtures so cache-aware
            // tests can observe state mutations synchronously.
            var framingRefitDescriptor = services.FirstOrDefault(
                d => d.ServiceType == typeof(CodeMentor.Infrastructure.CodeReview.ITaskFramingRefit));
            if (framingRefitDescriptor is not null) services.Remove(framingRefitDescriptor);
            services.AddSingleton<CodeMentor.Infrastructure.CodeReview.ITaskFramingRefit, FakeTaskFramingRefit>();

            var framingSchedDescriptor = services.FirstOrDefault(
                d => d.ServiceType == typeof(CodeMentor.Application.LearningPaths.IGenerateTaskFramingScheduler));
            if (framingSchedDescriptor is not null) services.Remove(framingSchedDescriptor);
            services.AddSingleton<CodeMentor.Application.LearningPaths.IGenerateTaskFramingScheduler, InlineGenerateTaskFramingScheduler>();

            // Replace Redis-backed IDistributedCache with an in-memory one so tests
            // don't require a running Redis instance.
            var cacheDescriptors = services
                .Where(d => d.ServiceType == typeof(Microsoft.Extensions.Caching.Distributed.IDistributedCache))
                .ToList();
            foreach (var d in cacheDescriptors) services.Remove(d);
            services.AddDistributedMemoryCache();
        });
    }
}

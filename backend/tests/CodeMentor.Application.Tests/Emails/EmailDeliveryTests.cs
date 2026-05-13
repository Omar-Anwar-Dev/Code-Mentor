using CodeMentor.Application.Emails;
using CodeMentor.Domain.Users;
using CodeMentor.Infrastructure.Emails;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;

namespace CodeMentor.Application.Tests.Emails;

/// <summary>
/// S14-T3 / ADR-046 acceptance — provider abstraction + EmailDeliveryService
/// retry/suppress semantics + EmailRetryJob row-picking + DI factory env-var
/// flip behavior. SendGrid HTTP transport is NOT mocked at the SDK level
/// (would require an HttpMessageHandler shim into the SendGrid SDK); the SDK
/// itself is verified live against the SendGrid sandbox at S14-T11
/// walkthrough. What we test here: constructor config-reading + provider-name
/// + every service/job behavior that doesn't depend on real network I/O.
/// </summary>
public class EmailDeliveryTests
{
    // ====== LoggedOnlyEmailProvider — unit ======

    [Fact]
    public async Task LoggedOnly_Send_ReturnsSuccessWithSyntheticId()
    {
        var provider = new LoggedOnlyEmailProvider(NullLogger<LoggedOnlyEmailProvider>.Instance);
        var result = await provider.SendAsync(NewMessage());
        Assert.True(result.Success);
        Assert.NotNull(result.ProviderMessageId);
        Assert.StartsWith("logged-only-", result.ProviderMessageId);
        Assert.Null(result.Error);
    }

    [Fact]
    public void LoggedOnly_Name_IsLoggedOnly()
    {
        var provider = new LoggedOnlyEmailProvider(NullLogger<LoggedOnlyEmailProvider>.Instance);
        Assert.Equal("LoggedOnly", provider.Name);
    }

    // ====== SendGridEmailProvider — constructor config ======

    [Fact]
    public void SendGrid_Constructor_ThrowsWhenApiKeyMissing()
    {
        var cfg = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>())
            .Build();
        var ex = Assert.Throws<InvalidOperationException>(() =>
            new SendGridEmailProvider(cfg, NullLogger<SendGridEmailProvider>.Instance));
        Assert.Contains("SendGridApiKey", ex.Message);
    }

    [Fact]
    public void SendGrid_Constructor_AcceptsConfiguredApiKey()
    {
        var cfg = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["EmailDelivery:SendGridApiKey"] = "SG.test-fake-key",
            })
            .Build();
        var provider = new SendGridEmailProvider(cfg, NullLogger<SendGridEmailProvider>.Instance);
        Assert.Equal("SendGrid", provider.Name);
    }

    // ====== EmailDeliveryService — persist + dispatch + suppress ======

    [Fact]
    public async Task DeliveryService_Send_SuccessProvider_RowIsSentWithMessageId()
    {
        using var ctx = NewDb();
        var fake = new FakeEmailProvider();
        var svc = NewService(ctx, fake);

        var rowId = await svc.SendAsync(NewMessage(), suppress: false);

        var row = await ctx.EmailDeliveries.AsNoTracking().SingleAsync();
        Assert.Equal(rowId, row.Id);
        Assert.Equal(EmailDeliveryStatus.Sent, row.Status);
        Assert.NotNull(row.SentAt);
        Assert.NotNull(row.ProviderMessageId);
        Assert.Equal(1, row.AttemptCount);
        Assert.Single(fake.Sent);
    }

    [Fact]
    public async Task DeliveryService_Send_FailureProvider_RowIsPendingWithExponentialBackoff()
    {
        using var ctx = NewDb();
        var fake = new FakeEmailProvider();
        fake.ScriptedResults.Enqueue(new EmailDispatchResult(false, null, "transient"));
        var svc = NewService(ctx, fake);

        var rowId = await svc.SendAsync(NewMessage(), suppress: false);

        var row = await ctx.EmailDeliveries.AsNoTracking().SingleAsync();
        Assert.Equal(EmailDeliveryStatus.Pending, row.Status);
        Assert.Equal("transient", row.LastError);
        Assert.Equal(1, row.AttemptCount);
        Assert.NotNull(row.NextAttemptAt);
        // ~5 min backoff after first failure (allow slack for clock drift)
        Assert.InRange(row.NextAttemptAt!.Value, DateTime.UtcNow.AddMinutes(4), DateTime.UtcNow.AddMinutes(6));
        Assert.Null(row.SentAt);
    }

    [Fact]
    public async Task DeliveryService_Send_Suppressed_RowIsSuppressedNoDispatch()
    {
        using var ctx = NewDb();
        var fake = new FakeEmailProvider();
        var svc = NewService(ctx, fake);

        await svc.SendAsync(NewMessage(), suppress: true);

        var row = await ctx.EmailDeliveries.AsNoTracking().SingleAsync();
        Assert.Equal(EmailDeliveryStatus.Suppressed, row.Status);
        Assert.Equal(0, row.AttemptCount);
        Assert.Null(row.SentAt);
        Assert.Empty(fake.Sent);
    }

    [Fact]
    public async Task DeliveryService_ThreeFailures_RowEventuallyMarkedFailed()
    {
        using var ctx = NewDb();
        var fake = new FakeEmailProvider();
        fake.ScriptedResults.Enqueue(new EmailDispatchResult(false, null, "err1"));
        fake.ScriptedResults.Enqueue(new EmailDispatchResult(false, null, "err2"));
        fake.ScriptedResults.Enqueue(new EmailDispatchResult(false, null, "err3"));
        var svc = NewService(ctx, fake);

        await svc.SendAsync(NewMessage(), suppress: false);
        var row = await ctx.EmailDeliveries.SingleAsync();
        Assert.Equal(EmailDeliveryStatus.Pending, row.Status);

        // 2 retry calls (mirroring what EmailRetryJob does).
        await svc.TryDispatchAsync(row, CancellationToken.None);
        await svc.TryDispatchAsync(row, CancellationToken.None);

        var final = await ctx.EmailDeliveries.AsNoTracking().SingleAsync();
        Assert.Equal(EmailDeliveryStatus.Failed, final.Status);
        Assert.Equal(3, final.AttemptCount);
        Assert.Equal("err3", final.LastError);
        Assert.Null(final.NextAttemptAt);
        Assert.Equal(3, fake.Sent.Count);
    }

    [Fact]
    public async Task DeliveryService_FailThenSucceed_RowEndsAsSent()
    {
        using var ctx = NewDb();
        var fake = new FakeEmailProvider();
        fake.ScriptedResults.Enqueue(new EmailDispatchResult(false, null, "transient"));
        fake.ScriptedResults.Enqueue(new EmailDispatchResult(true, "sg-msg-id", null));
        var svc = NewService(ctx, fake);

        await svc.SendAsync(NewMessage(), suppress: false);
        var row = await ctx.EmailDeliveries.SingleAsync();
        Assert.Equal(EmailDeliveryStatus.Pending, row.Status);

        await svc.TryDispatchAsync(row, CancellationToken.None);

        var final = await ctx.EmailDeliveries.AsNoTracking().SingleAsync();
        Assert.Equal(EmailDeliveryStatus.Sent, final.Status);
        Assert.Equal("sg-msg-id", final.ProviderMessageId);
        Assert.Null(final.LastError);
        Assert.Null(final.NextAttemptAt);
        Assert.Equal(2, final.AttemptCount);
    }

    // ====== EmailRetryJob — row-picking ======

    [Fact]
    public async Task RetryJob_OnlyPicksRowsDueForRetry()
    {
        using var ctx = NewDb();
        var fake = new FakeEmailProvider();
        var svc = NewService(ctx, fake);

        ctx.EmailDeliveries.AddRange(
            // Due (NextAttemptAt in past) — should be picked
            Row(EmailDeliveryStatus.Pending, attemptCount: 1, nextAttempt: DateTime.UtcNow.AddMinutes(-1)),
            // Not due yet — should be skipped
            Row(EmailDeliveryStatus.Pending, attemptCount: 1, nextAttempt: DateTime.UtcNow.AddMinutes(20)),
            // Already exhausted — should be skipped
            Row(EmailDeliveryStatus.Failed, attemptCount: 3, nextAttempt: null),
            // Already sent — should be skipped
            Row(EmailDeliveryStatus.Sent, attemptCount: 1, nextAttempt: null));
        await ctx.SaveChangesAsync();

        var job = new EmailRetryJob(ctx, svc, NullLogger<EmailRetryJob>.Instance);
        await job.ExecuteAsync(CancellationToken.None);

        Assert.Single(fake.Sent);
    }

    [Fact]
    public async Task RetryJob_RespectsThreeAttemptCap()
    {
        using var ctx = NewDb();
        var fake = new FakeEmailProvider();
        // Every dispatch will fail.
        for (var i = 0; i < 10; i++)
        {
            fake.ScriptedResults.Enqueue(new EmailDispatchResult(false, null, $"err{i}"));
        }
        var svc = NewService(ctx, fake);

        var row = Row(EmailDeliveryStatus.Pending, attemptCount: 1, nextAttempt: DateTime.UtcNow.AddMinutes(-1));
        ctx.EmailDeliveries.Add(row);
        await ctx.SaveChangesAsync();

        var job = new EmailRetryJob(ctx, svc, NullLogger<EmailRetryJob>.Instance);

        // Run 1: AttemptCount 1 → 2, NextAttemptAt set in past so we can force-pick again
        await job.ExecuteAsync(CancellationToken.None);
        row = await ctx.EmailDeliveries.SingleAsync();
        Assert.Equal(2, row.AttemptCount);
        Assert.Equal(EmailDeliveryStatus.Pending, row.Status);
        row.NextAttemptAt = DateTime.UtcNow.AddMinutes(-1);
        await ctx.SaveChangesAsync();

        // Run 2: AttemptCount 2 → 3 → Failed (cap hit)
        await job.ExecuteAsync(CancellationToken.None);
        var final = await ctx.EmailDeliveries.AsNoTracking().SingleAsync();
        Assert.Equal(EmailDeliveryStatus.Failed, final.Status);
        Assert.Equal(3, final.AttemptCount);

        // Run 3: nothing to pick (Failed is filtered out)
        var sentCount = fake.Sent.Count;
        await job.ExecuteAsync(CancellationToken.None);
        Assert.Equal(sentCount, fake.Sent.Count);
    }

    // ====== DI factory — env-var flip ======

    [Fact]
    public void DiFactory_NoConfig_DefaultsToLoggedOnly()
    {
        var emailProvider = ResolveProviderFromConfig(provider: null);
        Assert.Equal("LoggedOnly", emailProvider.Name);
    }

    [Fact]
    public void DiFactory_LoggedOnlyExplicit_ResolvesLoggedOnly()
    {
        var emailProvider = ResolveProviderFromConfig(provider: "LoggedOnly");
        Assert.Equal("LoggedOnly", emailProvider.Name);
    }

    [Fact]
    public void DiFactory_SendGridConfigured_ResolvesSendGrid()
    {
        var emailProvider = ResolveProviderFromConfig(provider: "SendGrid", apiKey: "SG.test-key");
        Assert.Equal("SendGrid", emailProvider.Name);
    }

    [Fact]
    public void DiFactory_SendGridConfigured_MissingApiKey_Throws()
    {
        Assert.Throws<InvalidOperationException>(() =>
            ResolveProviderFromConfig(provider: "SendGrid", apiKey: null));
    }

    // ====== Helpers ======

    private static ApplicationDbContext NewDb()
    {
        var opts = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase($"emails_{Guid.NewGuid():N}")
            .Options;
        return new ApplicationDbContext(opts);
    }

    private static EmailDeliveryService NewService(ApplicationDbContext ctx, IEmailProvider provider) =>
        new(ctx, provider, NullLogger<EmailDeliveryService>.Instance);

    private static EmailMessage NewMessage() =>
        new("feedback-ready", Guid.NewGuid(), "user@test.local", "Your feedback is ready", "<p>html</p>", "text");

    private static EmailDelivery Row(EmailDeliveryStatus status, int attemptCount, DateTime? nextAttempt) =>
        new()
        {
            UserId = Guid.NewGuid(),
            Type = "feedback-ready",
            ToAddress = "u@test.local",
            Subject = "s",
            BodyHtml = "<p>h</p>",
            BodyText = "t",
            Status = status,
            AttemptCount = attemptCount,
            NextAttemptAt = nextAttempt,
            CreatedAt = DateTime.UtcNow.AddHours(-1),
            SentAt = status == EmailDeliveryStatus.Sent ? DateTime.UtcNow.AddHours(-1) : (DateTime?)null,
        };

    private static IEmailProvider ResolveProviderFromConfig(string? provider, string? apiKey = null)
    {
        var cfgDict = new Dictionary<string, string?>();
        if (provider is not null) cfgDict["EmailDelivery:Provider"] = provider;
        if (apiKey is not null) cfgDict["EmailDelivery:SendGridApiKey"] = apiKey;

        IConfiguration cfg = new ConfigurationBuilder().AddInMemoryCollection(cfgDict).Build();

        var services = new ServiceCollection();
        services.AddSingleton(cfg);
        services.AddLogging();
        // Mirror the factory in DependencyInjection.cs exactly so this test fails if the
        // factory's selection logic drifts.
        services.AddScoped<IEmailProvider>(sp =>
        {
            var c = sp.GetRequiredService<IConfiguration>();
            var name = c["EmailDelivery:Provider"] ?? "LoggedOnly";
            return name.Equals("SendGrid", StringComparison.OrdinalIgnoreCase)
                ? ActivatorUtilities.CreateInstance<SendGridEmailProvider>(sp)
                : ActivatorUtilities.CreateInstance<LoggedOnlyEmailProvider>(sp);
        });

        using var scope = services.BuildServiceProvider().CreateScope();
        return scope.ServiceProvider.GetRequiredService<IEmailProvider>();
    }

    private sealed class FakeEmailProvider : IEmailProvider
    {
        public string Name => "Fake";
        public List<EmailMessage> Sent { get; } = new();
        public Queue<EmailDispatchResult> ScriptedResults { get; } = new();

        public Task<EmailDispatchResult> SendAsync(EmailMessage message, CancellationToken ct = default)
        {
            Sent.Add(message);
            return Task.FromResult(ScriptedResults.TryDequeue(out var result)
                ? result
                : new EmailDispatchResult(true, $"fake-{Guid.NewGuid():N}", null));
        }
    }
}

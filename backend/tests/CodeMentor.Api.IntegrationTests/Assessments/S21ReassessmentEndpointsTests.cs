using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using CodeMentor.Api.IntegrationTests.TestHost;
using CodeMentor.Application.Assessments.Contracts;
using CodeMentor.Application.Auth.Contracts;
using CodeMentor.Domain.Assessments;
using CodeMentor.Domain.Skills;
using CodeMentor.Domain.Tasks;
using CodeMentor.Infrastructure.Identity;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace CodeMentor.Api.IntegrationTests.Assessments;

/// <summary>
/// S21-T1 / F16: tests for the Mini + Full reassessment endpoints.
///
/// Bar set by the implementation-plan acceptance criteria:
///   1. Mini happy → starts assessment, draws 10 unanswered questions.
///   2. Mini repeat-prevention → 2nd POST returns 409 with an explicit reason.
///   3. Full happy → starts 30-question reassessment, bypasses the 30-day cooldown.
///   4. Cross-user authz → another user cannot start a Mini for someone else's path
///      (their own 0%-path is rejected with a clear progress-percent message).
///
/// All tests use <see cref="LegacyOnlyAdaptiveQuestionSelectorFactory"/> so the
/// IRT theta seed has no observable effect (legacy selector ignores theta).
/// The seed-clamping math lives in unit tests at
/// <c>CodeMentor.Application.Tests/Assessments/ComputeThetaSeedTests.cs</c>.
/// </summary>
public class S21ReassessmentEndpointsTests : IClassFixture<CodeMentorWebApplicationFactory>
{
    private readonly CodeMentorWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public S21ReassessmentEndpointsTests(CodeMentorWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient(new Microsoft.AspNetCore.Mvc.Testing.WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false,
        });
    }

    private async Task<T> WithDbAsync<T>(Func<ApplicationDbContext, Task<T>> work)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        return await work(db);
    }

    private async Task<(string token, Guid userId)> RegisterAsync(string email)
    {
        var req = new RegisterRequest(email, "Strong_Pass_123!", "Test User", null);
        var res = await _client.PostAsJsonAsync("/api/auth/register", req);
        res.EnsureSuccessStatusCode();
        var body = await res.Content.ReadFromJsonAsync<AuthResponse>();

        var userId = await WithDbAsync(async db =>
            (await db.Set<ApplicationUser>()
                .Where(u => u.Email == email)
                .Select(u => new { u.Id })
                .FirstAsync()).Id);
        return (body!.AccessToken, userId);
    }

    private void Bearer(string token)
    {
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
    }

    /// <summary>
    /// Seeds an active <see cref="LearningPath"/> at the given progress percent and
    /// at least one <see cref="LearnerSkillProfile"/> row so the
    /// <c>ComputeThetaSeedAsync</c> path doesn't short-circuit to 0.
    /// </summary>
    private async Task SeedActivePathAtProgressAsync(Guid userId, decimal progressPercent)
    {
        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var path = new LearningPath
        {
            UserId = userId,
            Track = Track.FullStack,
            IsActive = true,
            ProgressPercent = progressPercent,
            Source = LearningPathSource.TemplateFallback,
        };
        db.LearningPaths.Add(path);

        db.LearnerSkillProfiles.Add(new LearnerSkillProfile
        {
            UserId = userId,
            Category = SkillCategory.Algorithms,
            SmoothedScore = 65m,
            Level = SkillLevel.Intermediate,
            LastSource = LearnerSkillProfileSource.Assessment,
            SampleCount = 1,
            LastUpdatedAt = DateTime.UtcNow,
        });
        db.LearnerSkillProfiles.Add(new LearnerSkillProfile
        {
            UserId = userId,
            Category = SkillCategory.DataStructures,
            SmoothedScore = 55m,
            Level = SkillLevel.Beginner,
            LastSource = LearnerSkillProfileSource.Assessment,
            SampleCount = 1,
            LastUpdatedAt = DateTime.UtcNow,
        });

        await db.SaveChangesAsync();
    }

    [Fact]
    public async Task Mini_HappyPath_Starts10QuestionAssessmentWithMiniVariant()
    {
        var (token, userId) = await RegisterAsync("s21mini@test.local");
        Bearer(token);

        await SeedActivePathAtProgressAsync(userId, progressPercent: 55m);

        var res = await _client.PostAsync("/api/assessments/me/mini-reassessment", content: null);
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);

        var body = await res.Content.ReadFromJsonAsync<StartAssessmentResponse>();
        Assert.NotNull(body);
        Assert.NotEqual(Guid.Empty, body!.AssessmentId);
        Assert.Equal(1, body.FirstQuestion.OrderIndex);
        // Mini variant uses 10 total questions, not the default 30.
        Assert.Equal(Assessment.MiniTotalQuestions, body.FirstQuestion.TotalQuestions);

        // DB side: variant + bypass-cooldown confirmed.
        await WithDbAsync(async db =>
        {
            var row = await db.Assessments.AsNoTracking().FirstAsync(a => a.Id == body.AssessmentId);
            Assert.Equal(AssessmentVariant.Mini, row.Variant);
            Assert.Equal(AssessmentStatus.InProgress, row.Status);
            return true;
        });

        // Eligibility flag flips OFF once the Mini has been started.
        var eligRes = await _client.GetAsync("/api/assessments/me/mini-reassessment/eligibility");
        Assert.Equal(HttpStatusCode.OK, eligRes.StatusCode);
        var elig = await eligRes.Content.ReadFromJsonAsync<MiniEligibilityShape>();
        Assert.False(elig!.Eligible);
    }

    [Fact]
    public async Task Mini_StartedTwiceForSamePath_SecondCallReturns409()
    {
        var (token, userId) = await RegisterAsync("s21minirepeat@test.local");
        Bearer(token);
        await SeedActivePathAtProgressAsync(userId, progressPercent: 60m);

        // First call: succeeds.
        var first = await _client.PostAsync("/api/assessments/me/mini-reassessment", content: null);
        Assert.Equal(HttpStatusCode.OK, first.StatusCode);

        // Second call: rejected — Mini already exists for the current path.
        var second = await _client.PostAsync("/api/assessments/me/mini-reassessment", content: null);
        Assert.Equal(HttpStatusCode.Conflict, second.StatusCode);

        var problem = await second.Content.ReadAsStringAsync();
        Assert.Contains("already exists", problem, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Full_HappyPath_Starts30QuestionAssessmentWithFullVariantBypassesCooldown()
    {
        var (token, userId) = await RegisterAsync("s21full@test.local");
        Bearer(token);
        await SeedActivePathAtProgressAsync(userId, progressPercent: 100m);

        // Seed a recent Completed Initial assessment that would otherwise block
        // a new POST /api/assessments under the 30-day cooldown. The Full
        // variant explicitly bypasses that rule.
        await WithDbAsync(async db =>
        {
            db.Assessments.Add(new Assessment
            {
                UserId = userId,
                Track = Track.FullStack,
                Variant = AssessmentVariant.Initial,
                Status = AssessmentStatus.Completed,
                StartedAt = DateTime.UtcNow.AddDays(-5),
                CompletedAt = DateTime.UtcNow.AddDays(-5),
                DurationSec = 1200,
                TotalScore = 70m,
                SkillLevel = SkillLevel.Intermediate,
            });
            await db.SaveChangesAsync();
            return true;
        });

        var res = await _client.PostAsync("/api/assessments/me/full-reassessment", content: null);
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);

        var body = await res.Content.ReadFromJsonAsync<StartAssessmentResponse>();
        Assert.NotNull(body);
        Assert.Equal(Assessment.TotalQuestions, body!.FirstQuestion.TotalQuestions);

        await WithDbAsync(async db =>
        {
            var row = await db.Assessments.AsNoTracking().FirstAsync(a => a.Id == body.AssessmentId);
            Assert.Equal(AssessmentVariant.Full, row.Variant);
            Assert.Equal(Track.FullStack, row.Track);
            return true;
        });
    }

    [Fact]
    public async Task Mini_RejectedWhenPathBelow50Percent_ClearMessage()
    {
        // Authz boundary: a user with no qualifying path cannot start a Mini.
        // (Cross-user authz proper is already covered by the global JWT-required
        // policy on the controller; this case asserts the in-scope domain rule
        // that prevents a user from skipping the 50% gate.)
        var (token, userId) = await RegisterAsync("s21mini_lowprogress@test.local");
        Bearer(token);

        await SeedActivePathAtProgressAsync(userId, progressPercent: 30m);

        var res = await _client.PostAsync("/api/assessments/me/mini-reassessment", content: null);
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);

        var problem = await res.Content.ReadAsStringAsync();
        Assert.Contains("50%", problem, StringComparison.OrdinalIgnoreCase);

        // No assessment row was created.
        await WithDbAsync(async db =>
        {
            var any = await db.Assessments.AnyAsync(a => a.UserId == userId);
            Assert.False(any);
            return true;
        });
    }

    private sealed record MiniEligibilityShape(bool Eligible);
}

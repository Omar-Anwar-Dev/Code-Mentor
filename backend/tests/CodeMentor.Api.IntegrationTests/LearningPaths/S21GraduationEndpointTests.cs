using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using CodeMentor.Api.IntegrationTests.TestHost;
using CodeMentor.Application.Auth.Contracts;
using CodeMentor.Application.LearningPaths.Contracts;
using CodeMentor.Domain.Assessments;
using CodeMentor.Domain.Skills;
using CodeMentor.Domain.Tasks;
using CodeMentor.Infrastructure.Identity;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace CodeMentor.Api.IntegrationTests.LearningPaths;

/// <summary>
/// S21-T3 / F16: integration tests for the graduation endpoint
/// (`GET /api/learning-paths/me/graduation`).
///
/// Coverage:
///   - 404 when no active path exists.
///   - 404 when active path is below 100%.
///   - 200 with the full payload at 100% — NextPhaseEligible=false until a
///     Full reassessment is Completed.
///   - 200 with NextPhaseEligible=true + AI journey summary populated after
///     a Full reassessment completes.
/// </summary>
public class S21GraduationEndpointTests : IClassFixture<CodeMentorWebApplicationFactory>
{
    private readonly CodeMentorWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public S21GraduationEndpointTests(CodeMentorWebApplicationFactory factory)
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

    private void Bearer(string token) =>
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

    private async Task SeedPathAsync(
        Guid userId,
        decimal progressPercent,
        bool seedInitialSnapshot,
        bool seedAfterProfile)
    {
        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var initialJson = seedInitialSnapshot
            ? System.Text.Json.JsonSerializer.Serialize(new[]
            {
                new { category = "Algorithms", smoothedScore = 45m },
                new { category = "DataStructures", smoothedScore = 50m },
                new { category = "OOP", smoothedScore = 60m },
            })
            : null;

        db.LearningPaths.Add(new LearningPath
        {
            UserId = userId,
            Track = Track.FullStack,
            IsActive = true,
            ProgressPercent = progressPercent,
            Source = LearningPathSource.TemplateFallback,
            GeneratedAt = DateTime.UtcNow.AddDays(-30),
            InitialSkillProfileJson = initialJson,
            Version = 1,
        });

        if (seedAfterProfile)
        {
            db.LearnerSkillProfiles.Add(new LearnerSkillProfile
            {
                UserId = userId,
                Category = SkillCategory.Algorithms,
                SmoothedScore = 75m,
                Level = SkillLevel.Intermediate,
                LastSource = LearnerSkillProfileSource.Assessment,
                SampleCount = 4,
                LastUpdatedAt = DateTime.UtcNow,
            });
            db.LearnerSkillProfiles.Add(new LearnerSkillProfile
            {
                UserId = userId,
                Category = SkillCategory.DataStructures,
                SmoothedScore = 80m,
                Level = SkillLevel.Advanced,
                LastSource = LearnerSkillProfileSource.SubmissionInferred,
                SampleCount = 5,
                LastUpdatedAt = DateTime.UtcNow,
            });
            db.LearnerSkillProfiles.Add(new LearnerSkillProfile
            {
                UserId = userId,
                Category = SkillCategory.OOP,
                SmoothedScore = 78m,
                Level = SkillLevel.Intermediate,
                LastSource = LearnerSkillProfileSource.SubmissionInferred,
                SampleCount = 3,
                LastUpdatedAt = DateTime.UtcNow,
            });
        }

        await db.SaveChangesAsync();
    }

    [Fact]
    public async Task Graduation_NoActivePath_Returns404()
    {
        var (token, _) = await RegisterAsync("s21grad_no_path@test.local");
        Bearer(token);

        var res = await _client.GetAsync("/api/learning-paths/me/graduation");
        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
    }

    [Fact]
    public async Task Graduation_PathBelow100_Returns404()
    {
        var (token, userId) = await RegisterAsync("s21grad_partial@test.local");
        Bearer(token);
        await SeedPathAsync(userId, 80m, seedInitialSnapshot: true, seedAfterProfile: true);

        var res = await _client.GetAsync("/api/learning-paths/me/graduation");
        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
    }

    [Fact]
    public async Task Graduation_At100_NoFull_ReturnsViewWithNextPhaseFalse()
    {
        var (token, userId) = await RegisterAsync("s21grad_ready@test.local");
        Bearer(token);
        await SeedPathAsync(userId, 100m, seedInitialSnapshot: true, seedAfterProfile: true);

        var res = await _client.GetAsync("/api/learning-paths/me/graduation");
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);

        var view = await res.Content.ReadFromJsonAsync<GraduationViewDto>();
        Assert.NotNull(view);
        Assert.Equal(100m, view!.ProgressPercent);
        Assert.Equal(3, view.Before.Count);
        Assert.Equal(3, view.After.Count);
        Assert.False(view.NextPhaseEligible);
        Assert.Null(view.FullReassessmentAssessmentId);

        // Spot-check the round-trip on one category.
        var algBefore = view.Before.First(b => b.Category == "Algorithms").SmoothedScore;
        var algAfter = view.After.First(b => b.Category == "Algorithms").SmoothedScore;
        Assert.Equal(45m, algBefore);
        Assert.Equal(75m, algAfter);
    }

    [Fact]
    public async Task Graduation_At100_WithCompletedFull_ReturnsNextPhaseEligibleTrue()
    {
        var (token, userId) = await RegisterAsync("s21grad_eligible@test.local");
        Bearer(token);
        await SeedPathAsync(userId, 100m, seedInitialSnapshot: true, seedAfterProfile: true);

        // Seed a Completed Full Assessment + AssessmentSummary AFTER the
        // path's GeneratedAt — graduation flips eligible-true.
        Guid fullId = Guid.Empty;
        await WithDbAsync(async db =>
        {
            var full = new Assessment
            {
                UserId = userId,
                Track = Track.FullStack,
                Variant = AssessmentVariant.Full,
                Status = AssessmentStatus.Completed,
                StartedAt = DateTime.UtcNow.AddHours(-2),
                CompletedAt = DateTime.UtcNow.AddHours(-1),
                DurationSec = 1500,
                TotalScore = 82m,
                SkillLevel = SkillLevel.Advanced,
            };
            db.Assessments.Add(full);
            db.AssessmentSummaries.Add(new AssessmentSummary
            {
                AssessmentId = full.Id,
                UserId = userId,
                StrengthsParagraph = "You showed strong improvement in algorithms.",
                WeaknessesParagraph = "Security topics still need more practice.",
                PathGuidanceParagraph = "Next phase: deepen security + advanced data structures.",
                PromptVersion = "assessment_summary_v1",
                TokensUsed = 800,
                RetryCount = 0,
                LatencyMs = 4200,
            });
            await db.SaveChangesAsync();
            fullId = full.Id;
            return true;
        });

        var res = await _client.GetAsync("/api/learning-paths/me/graduation");
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);

        var view = await res.Content.ReadFromJsonAsync<GraduationViewDto>();
        Assert.NotNull(view);
        Assert.True(view!.NextPhaseEligible);
        Assert.Equal(fullId, view.FullReassessmentAssessmentId);
        Assert.NotNull(view.JourneySummaryStrengths);
        Assert.Contains("algorithms", view.JourneySummaryStrengths, StringComparison.OrdinalIgnoreCase);
    }
}

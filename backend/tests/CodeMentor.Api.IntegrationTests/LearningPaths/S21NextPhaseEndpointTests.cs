using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using CodeMentor.Api.IntegrationTests.TestHost;
using CodeMentor.Application.Auth.Contracts;
using CodeMentor.Application.LearningPaths;
using CodeMentor.Domain.Assessments;
using CodeMentor.Domain.Skills;
using CodeMentor.Domain.Tasks;
using CodeMentor.Infrastructure.Identity;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace CodeMentor.Api.IntegrationTests.LearningPaths;

/// <summary>
/// S21-T4 / F16: integration tests for `POST /api/learning-paths/me/next-phase`.
///
/// Acceptance bar from the plan:
///   1. Happy path → new path created at Version+1 + previousId stamped.
///   2. 409 when Full reassessment hasn't completed yet.
///   3. Previous path is archived (IsActive = false).
///   4. Version is incremented.
///   5. New path has zero overlap with previously completed tasks.
/// </summary>
public class S21NextPhaseEndpointTests : IClassFixture<CodeMentorWebApplicationFactory>
{
    private readonly CodeMentorWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public S21NextPhaseEndpointTests(CodeMentorWebApplicationFactory factory)
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

    /// <summary>
    /// Seeds: an active LearningPath (FullStack, version 1, ProgressPercent),
    /// 3 completed PathTasks (so the "no overlap" rule has rows to exclude),
    /// SkillScores for the user, and optionally a Completed Full reassessment
    /// that gates Next-Phase eligibility. Returns the seeded path id +
    /// taskIds that were completed.
    /// </summary>
    private async Task<(Guid pathId, List<Guid> completedTaskIds, Guid? fullAssessmentId)>
        SeedScenarioAsync(Guid userId, decimal pathProgress, bool seedCompletedFull)
    {
        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        // Reuse 3 of the existing seeded TaskItems for the user's "completed"
        // history — the DbInitializer ships with ≥21 FullStack tasks.
        var existingFullStack = await db.Tasks
            .Where(t => t.Track == Track.FullStack && t.IsActive)
            .Take(3)
            .ToListAsync();

        var path = new LearningPath
        {
            UserId = userId,
            Track = Track.FullStack,
            IsActive = true,
            ProgressPercent = pathProgress,
            Source = LearningPathSource.TemplateFallback,
            GeneratedAt = DateTime.UtcNow.AddDays(-14),
            Version = 1,
        };
        db.LearningPaths.Add(path);

        for (var i = 0; i < existingFullStack.Count; i++)
        {
            db.PathTasks.Add(new PathTask
            {
                PathId = path.Id,
                TaskId = existingFullStack[i].Id,
                OrderIndex = i + 1,
                Status = PathTaskStatus.Completed,
                StartedAt = DateTime.UtcNow.AddDays(-10),
                CompletedAt = DateTime.UtcNow.AddDays(-1),
            });
        }

        // Seed minimal SkillScores so the template-fallback path generation
        // produces a valid level.
        foreach (var cat in new[]
                 {
                     SkillCategory.Algorithms,
                     SkillCategory.DataStructures,
                     SkillCategory.OOP,
                     SkillCategory.Databases,
                     SkillCategory.Security,
                 })
        {
            db.SkillScores.Add(new SkillScore
            {
                UserId = userId,
                Category = cat,
                Score = 75m,
                Level = SkillLevel.Intermediate,
            });
        }

        // Seed initial LearnerSkillProfile rows so the AI fallback isn't
        // tripped and the (Initial) assessment seed succeeds.
        foreach (var cat in new[] { SkillCategory.Algorithms, SkillCategory.DataStructures })
        {
            db.LearnerSkillProfiles.Add(new LearnerSkillProfile
            {
                UserId = userId,
                Category = cat,
                SmoothedScore = 70m,
                Level = SkillLevel.Intermediate,
                LastSource = LearnerSkillProfileSource.Assessment,
                SampleCount = 1,
                LastUpdatedAt = DateTime.UtcNow,
            });
        }

        Guid? fullId = null;
        if (seedCompletedFull)
        {
            var full = new Assessment
            {
                UserId = userId,
                Track = Track.FullStack,
                Variant = AssessmentVariant.Full,
                Status = AssessmentStatus.Completed,
                StartedAt = DateTime.UtcNow.AddHours(-3),
                CompletedAt = DateTime.UtcNow.AddHours(-2),
                DurationSec = 1800,
                TotalScore = 88m,
                SkillLevel = SkillLevel.Advanced,
            };
            db.Assessments.Add(full);
            fullId = full.Id;
        }

        await db.SaveChangesAsync();

        return (path.Id, existingFullStack.Select(t => t.Id).ToList(), fullId);
    }

    [Fact]
    public async Task NextPhase_NoActivePath_Returns404()
    {
        var (token, _) = await RegisterAsync("s21next_no_path@test.local");
        Bearer(token);

        var res = await _client.PostAsync("/api/learning-paths/me/next-phase", content: null);
        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
    }

    [Fact]
    public async Task NextPhase_PathBelow100_Returns409()
    {
        var (token, userId) = await RegisterAsync("s21next_partial@test.local");
        Bearer(token);
        await SeedScenarioAsync(userId, 60m, seedCompletedFull: false);

        var res = await _client.PostAsync("/api/learning-paths/me/next-phase", content: null);
        Assert.Equal(HttpStatusCode.Conflict, res.StatusCode);
    }

    [Fact]
    public async Task NextPhase_PathCompleteButNoFullReassessment_Returns409()
    {
        var (token, userId) = await RegisterAsync("s21next_no_full@test.local");
        Bearer(token);
        await SeedScenarioAsync(userId, 100m, seedCompletedFull: false);

        var res = await _client.PostAsync("/api/learning-paths/me/next-phase", content: null);
        Assert.Equal(HttpStatusCode.Conflict, res.StatusCode);

        var body = await res.Content.ReadAsStringAsync();
        Assert.Contains("Full reassessment", body, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task NextPhase_HappyPath_ArchivesPreviousAndBumpsVersion()
    {
        var (token, userId) = await RegisterAsync("s21next_happy@test.local");
        Bearer(token);
        var (previousPathId, _, _) = await SeedScenarioAsync(userId, 100m, seedCompletedFull: true);

        var res = await _client.PostAsync("/api/learning-paths/me/next-phase", content: null);
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);

        var result = await res.Content.ReadFromJsonAsync<NextPhaseResult>();
        Assert.NotNull(result);
        Assert.NotEqual(Guid.Empty, result!.NewPathId);
        Assert.NotEqual(previousPathId, result.NewPathId);
        Assert.Equal(2, result.Version);

        await WithDbAsync(async db =>
        {
            var oldPath = await db.LearningPaths.AsNoTracking()
                .FirstAsync(p => p.Id == previousPathId);
            Assert.False(oldPath.IsActive);

            var newPath = await db.LearningPaths.AsNoTracking()
                .FirstAsync(p => p.Id == result.NewPathId);
            Assert.True(newPath.IsActive);
            Assert.Equal(2, newPath.Version);
            Assert.Equal(previousPathId, newPath.PreviousLearningPathId);
            return true;
        });
    }

    [Fact]
    public async Task NextPhase_NewPath_ExcludesPreviouslyCompletedTasks()
    {
        var (token, userId) = await RegisterAsync("s21next_no_overlap@test.local");
        Bearer(token);
        var (_, completedTaskIds, _) = await SeedScenarioAsync(userId, 100m, seedCompletedFull: true);

        var res = await _client.PostAsync("/api/learning-paths/me/next-phase", content: null);
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);

        var result = await res.Content.ReadFromJsonAsync<NextPhaseResult>();
        Assert.NotNull(result);

        await WithDbAsync(async db =>
        {
            var newPathTaskIds = await db.PathTasks.AsNoTracking()
                .Where(pt => pt.PathId == result!.NewPathId)
                .Select(pt => pt.TaskId)
                .ToListAsync();

            // Zero overlap: every task on the new path must NOT have been
            // completed on the previous path. (The completed-task exclusion
            // is implemented by LearningPathService.GeneratePathAsync at
            // line ~64; this asserts the integration end-to-end.)
            foreach (var completed in completedTaskIds)
            {
                Assert.DoesNotContain(completed, newPathTaskIds);
            }
            // Smoke: the new path actually has tasks. (Template fallback
            // produces ≥3 even on a sparse-seed test DB.)
            Assert.NotEmpty(newPathTaskIds);
            return true;
        });
    }
}

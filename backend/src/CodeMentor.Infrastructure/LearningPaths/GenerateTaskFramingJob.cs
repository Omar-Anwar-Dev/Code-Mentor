using System.Text.Json;
using CodeMentor.Application.LearningPaths;
using CodeMentor.Domain.Skills;
using CodeMentor.Domain.Tasks;
using CodeMentor.Infrastructure.CodeReview;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Refit;

namespace CodeMentor.Infrastructure.LearningPaths;

/// <summary>
/// S19-T6 / F16: Hangfire-invokable job that generates a
/// <see cref="TaskFraming"/> row for one (user, task). Calls the AI
/// service's <c>/api/task-framing</c> endpoint, persists the result
/// (overwriting any existing row for that pair), and sets a 7-day TTL.
///
/// Idempotent: re-running for the same (user, task) overwrites in
/// place rather than producing duplicates.
/// </summary>
public sealed class GenerateTaskFramingJob
{
    /// <summary>7-day TTL per S19 locked answer #4.</summary>
    public static readonly TimeSpan FramingTtl = TimeSpan.FromDays(7);

    private readonly ApplicationDbContext _db;
    private readonly ITaskFramingRefit _refit;
    private readonly ILearnerSkillProfileService _profiles;
    private readonly ILogger<GenerateTaskFramingJob> _logger;

    public GenerateTaskFramingJob(
        ApplicationDbContext db,
        ITaskFramingRefit refit,
        ILearnerSkillProfileService profiles,
        ILogger<GenerateTaskFramingJob> logger)
    {
        _db = db;
        _refit = refit;
        _profiles = profiles;
        _logger = logger;
    }

    public async Task ExecuteAsync(Guid userId, Guid taskId, CancellationToken ct = default)
    {
        _logger.LogInformation(
            "GenerateTaskFramingJob start: user={UserId} task={TaskId}", userId, taskId);

        var task = await _db.Tasks.FirstOrDefaultAsync(t => t.Id == taskId, ct);
        if (task is null)
        {
            _logger.LogWarning(
                "GenerateTaskFramingJob: task {TaskId} not found — skipping", taskId);
            return;
        }

        // Skip if a fresh row already exists (idempotency on duplicate enqueue).
        var existing = await _db.TaskFramings
            .FirstOrDefaultAsync(f => f.UserId == userId && f.TaskId == taskId, ct);
        if (existing is not null && existing.ExpiresAt > DateTime.UtcNow.AddMinutes(1))
        {
            _logger.LogInformation(
                "GenerateTaskFramingJob: fresh framing exists for user {UserId} task {TaskId} — short-circuiting",
                userId, taskId);
            return;
        }

        var profile = await _profiles.GetByUserAsync(userId, ct);
        if (profile.Count == 0)
        {
            _logger.LogWarning(
                "GenerateTaskFramingJob: empty LearnerSkillProfile for user {UserId} — cannot frame; will retry later",
                userId);
            return;  // Don't write a row; FE shows "unavailable + retry"
        }

        var skillTags = ParseSkillTags(task.SkillTagsJson) ?? DefaultSkillTags(task.Category);

        var requestBody = new TFFramingRequest(
            TaskId: task.Id.ToString(),
            TaskTitle: task.Title,
            TaskDescription: TruncateDescription(task.Description),
            SkillTags: skillTags,
            LearnerProfile: profile.ToDictionary(p => p.Category.ToString(), p => p.SmoothedScore),
            Track: task.Track.ToString(),
            LearnerLevel: profile.Count > 0 ? ApproximateLevel(profile) : null);

        TFFramingResponse response;
        try
        {
            response = await _refit.FrameAsync(requestBody, taskId.ToString(), ct);
        }
        catch (ApiException ex)
        {
            _logger.LogWarning(
                ex,
                "GenerateTaskFramingJob: AI service returned {Status} for user {UserId} task {TaskId} — no row written",
                (int)ex.StatusCode, userId, taskId);
            return;
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(
                ex,
                "GenerateTaskFramingJob: transport failure for user {UserId} task {TaskId} — no row written",
                userId, taskId);
            return;
        }

        var now = DateTime.UtcNow;
        if (existing is null)
        {
            _db.TaskFramings.Add(new TaskFraming
            {
                UserId = userId,
                TaskId = taskId,
                WhyThisMatters = response.WhyThisMatters,
                FocusAreasJson = JsonSerializer.Serialize(response.FocusAreas),
                CommonPitfallsJson = JsonSerializer.Serialize(response.CommonPitfalls),
                PromptVersion = response.PromptVersion,
                TokensUsed = response.TokensUsed,
                RetryCount = response.RetryCount,
                GeneratedAt = now,
                ExpiresAt = now + FramingTtl,
                RegeneratedCount = 0,
            });
        }
        else
        {
            existing.WhyThisMatters = response.WhyThisMatters;
            existing.FocusAreasJson = JsonSerializer.Serialize(response.FocusAreas);
            existing.CommonPitfallsJson = JsonSerializer.Serialize(response.CommonPitfalls);
            existing.PromptVersion = response.PromptVersion;
            existing.TokensUsed = response.TokensUsed;
            existing.RetryCount = response.RetryCount;
            existing.GeneratedAt = now;
            existing.ExpiresAt = now + FramingTtl;
            existing.RegeneratedCount += 1;
        }

        await _db.SaveChangesAsync(ct);
        _logger.LogInformation(
            "GenerateTaskFramingJob: framing written for user {UserId} task {TaskId} (tokens={Tokens}, retries={Retries})",
            userId, taskId, response.TokensUsed, response.RetryCount);
    }

    // ── helpers ───────────────────────────────────────────────────────

    private static string TruncateDescription(string description)
    {
        if (string.IsNullOrWhiteSpace(description))
            return "(no description available)";
        if (description.Length <= 1000) return description;
        return description.Substring(0, 997).TrimEnd() + "...";
    }

    private static IReadOnlyList<TFSkillTag>? ParseSkillTags(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;
        try
        {
            var raw = JsonSerializer.Deserialize<List<Dictionary<string, JsonElement>>>(json);
            if (raw is null) return null;
            var result = new List<TFSkillTag>();
            foreach (var t in raw)
            {
                if (!t.TryGetValue("skill", out var skill)) continue;
                if (!t.TryGetValue("weight", out var weight)) continue;
                var skillStr = skill.ValueKind == JsonValueKind.String ? skill.GetString() : null;
                if (string.IsNullOrWhiteSpace(skillStr)) continue;
                if (!weight.TryGetDouble(out var w)) continue;
                result.Add(new TFSkillTag(skillStr, w));
            }
            return result.Count > 0 ? result : null;
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private static IReadOnlyList<TFSkillTag> DefaultSkillTags(CodeMentor.Domain.Assessments.SkillCategory category) =>
        category switch
        {
            CodeMentor.Domain.Assessments.SkillCategory.Security      => new[] { new TFSkillTag("security", 0.7), new TFSkillTag("correctness", 0.3) },
            CodeMentor.Domain.Assessments.SkillCategory.OOP           => new[] { new TFSkillTag("design", 0.6), new TFSkillTag("readability", 0.4) },
            CodeMentor.Domain.Assessments.SkillCategory.Algorithms    => new[] { new TFSkillTag("correctness", 0.7), new TFSkillTag("performance", 0.3) },
            CodeMentor.Domain.Assessments.SkillCategory.DataStructures => new[] { new TFSkillTag("correctness", 0.6), new TFSkillTag("performance", 0.4) },
            CodeMentor.Domain.Assessments.SkillCategory.Databases     => new[] { new TFSkillTag("correctness", 0.5), new TFSkillTag("performance", 0.3), new TFSkillTag("design", 0.2) },
            _                                                         => new[] { new TFSkillTag("correctness", 1.0) },
        };

    private static string ApproximateLevel(IReadOnlyList<LearnerSkillProfileSnapshot> profile)
    {
        if (profile.Count == 0) return "Beginner";
        var avg = profile.Average(p => p.SmoothedScore);
        return avg >= 80m ? "Advanced" : avg >= 60m ? "Intermediate" : "Beginner";
    }
}

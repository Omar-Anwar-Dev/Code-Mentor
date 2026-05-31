using CodeMentor.Application.LearningPaths;
using CodeMentor.Domain.Assessments;
using CodeMentor.Domain.Skills;
using CodeMentor.Domain.Tasks;
using CodeMentor.Infrastructure.LearningPaths;

namespace CodeMentor.Application.Tests.LearningPaths;

/// <summary>
/// S20-T4 / F16 (ADR-053): pure-logic tests for the trigger evaluator.
/// Covers the 12 acceptance scenarios from §S20-T4:
/// - each trigger type (Periodic / ScoreSwing / Completion100)
/// - cooldown bypass (Completion100 ignores cooldown)
/// - signal-level boundaries (exactly 10 → no_action, 10.01 → small, 20 → small,
///   20.01 → medium, 30 → medium, 30.01 → large)
/// - cooldown active (no fire)
/// - first-observation safe (missing before-keys)
/// </summary>
public class PathAdaptationTriggerEvaluatorTests
{
    private static LearningPath PathStub(
        DateTime? lastAdaptedAt = null,
        decimal progressPercent = 25m)
        => new()
        {
            Id = Guid.NewGuid(),
            UserId = Guid.NewGuid(),
            Track = Track.Backend,
            ProgressPercent = progressPercent,
            LastAdaptedAt = lastAdaptedAt,
        };

    private readonly PathAdaptationTriggerEvaluator _evaluator = new();
    private static readonly DateTime Now = new(2026, 5, 15, 12, 0, 0, DateTimeKind.Utc);

    // ── 1. Completion100 fires regardless of cooldown ───────────────────

    [Fact]
    public void Completion100_Fires_Even_When_Cooldown_Active()
    {
        var path = PathStub(lastAdaptedAt: Now.AddHours(-1), progressPercent: 100m);
        var before = new Dictionary<CodeQualityCategory, decimal>();
        var after = new Dictionary<CodeQualityCategory, decimal>();

        var d = _evaluator.Evaluate(path, before, after, completedSinceLastAdaptation: 0, Now);
        Assert.True(d.ShouldFire);
        Assert.Equal(PathAdaptationTrigger.Completion100, d.Trigger);
        Assert.Equal(PathAdaptationSignalLevel.Large, d.SignalLevel);
    }

    [Fact]
    public void Completion100_Fires_Even_When_Never_Adapted_Before()
    {
        var path = PathStub(lastAdaptedAt: null, progressPercent: 100m);
        var d = _evaluator.Evaluate(path,
            new Dictionary<CodeQualityCategory, decimal>(),
            new Dictionary<CodeQualityCategory, decimal>(),
            completedSinceLastAdaptation: 1, Now);
        Assert.True(d.ShouldFire);
        Assert.Equal(PathAdaptationTrigger.Completion100, d.Trigger);
    }

    // ── 2. Cooldown active blocks Periodic + ScoreSwing ─────────────────

    [Fact]
    public void Cooldown_Active_Blocks_Periodic()
    {
        var path = PathStub(lastAdaptedAt: Now.AddHours(-23));
        var d = _evaluator.Evaluate(path,
            new Dictionary<CodeQualityCategory, decimal>(),
            new Dictionary<CodeQualityCategory, decimal>(),
            completedSinceLastAdaptation: 5, // would otherwise fire Periodic
            Now);
        Assert.False(d.ShouldFire);
        Assert.Equal(PathAdaptationSignalLevel.NoAction, d.SignalLevel);
        Assert.Contains("cooldown", d.Reason.ToLower());
    }

    [Fact]
    public void Cooldown_Boundary_At_24h_Allows_Fire()
    {
        var path = PathStub(lastAdaptedAt: Now.AddHours(-24));
        var before = new Dictionary<CodeQualityCategory, decimal> { [CodeQualityCategory.Security] = 50m };
        var after = new Dictionary<CodeQualityCategory, decimal> { [CodeQualityCategory.Security] = 75m };
        var d = _evaluator.Evaluate(path, before, after, completedSinceLastAdaptation: 0, Now);
        Assert.True(d.ShouldFire);
        Assert.Equal(PathAdaptationTrigger.ScoreSwing, d.Trigger);
    }

    // ── 3. Periodic trigger (every 3 completed) ─────────────────────────

    [Fact]
    public void Periodic_Fires_When_Completed_3_Since_Last_Adaptation()
    {
        var path = PathStub();
        var d = _evaluator.Evaluate(path,
            new Dictionary<CodeQualityCategory, decimal>(),
            new Dictionary<CodeQualityCategory, decimal>(),
            completedSinceLastAdaptation: 3, Now);
        Assert.True(d.ShouldFire);
        Assert.Equal(PathAdaptationTrigger.Periodic, d.Trigger);
        Assert.Equal(PathAdaptationSignalLevel.Small, d.SignalLevel);
    }

    [Fact]
    public void Periodic_Below_3_Doesnt_Fire()
    {
        var path = PathStub();
        var d = _evaluator.Evaluate(path,
            new Dictionary<CodeQualityCategory, decimal>(),
            new Dictionary<CodeQualityCategory, decimal>(),
            completedSinceLastAdaptation: 2, Now);
        Assert.False(d.ShouldFire);
        Assert.Equal(PathAdaptationSignalLevel.NoAction, d.SignalLevel);
    }

    // ── 4. ScoreSwing signal-level bands (boundary tests) ───────────────

    [Theory]
    [InlineData(10.0, false, PathAdaptationSignalLevel.NoAction)]    // exactly 10 → no swing
    [InlineData(10.01, true, PathAdaptationSignalLevel.Small)]       // just over 10 → small
    [InlineData(20.0, true, PathAdaptationSignalLevel.Small)]        // exactly 20 → small (boundary)
    [InlineData(20.01, true, PathAdaptationSignalLevel.Medium)]      // just over 20 → medium
    [InlineData(30.0, true, PathAdaptationSignalLevel.Medium)]       // exactly 30 → medium (boundary)
    [InlineData(30.01, true, PathAdaptationSignalLevel.Large)]       // just over 30 → large
    [InlineData(50.0, true, PathAdaptationSignalLevel.Large)]        // far over 30 → large
    public void ScoreSwing_Signal_Bands(double swing, bool shouldFire, PathAdaptationSignalLevel expected)
    {
        var path = PathStub();
        var before = new Dictionary<CodeQualityCategory, decimal> { [CodeQualityCategory.Security] = 50m };
        var after = new Dictionary<CodeQualityCategory, decimal> { [CodeQualityCategory.Security] = 50m + (decimal)swing };

        var d = _evaluator.Evaluate(path, before, after, completedSinceLastAdaptation: 0, Now);
        Assert.Equal(shouldFire, d.ShouldFire);
        Assert.Equal(expected, d.SignalLevel);
        if (shouldFire)
        {
            Assert.Equal(PathAdaptationTrigger.ScoreSwing, d.Trigger);
        }
    }

    // ── 5. No-trigger case ───────────────────────────────────────────────

    [Fact]
    public void No_Trigger_Conditions_Met_Returns_NoAction()
    {
        var path = PathStub();
        var before = new Dictionary<CodeQualityCategory, decimal> { [CodeQualityCategory.Security] = 60m };
        var after = new Dictionary<CodeQualityCategory, decimal> { [CodeQualityCategory.Security] = 65m }; // 5pt < 10

        var d = _evaluator.Evaluate(path, before, after, completedSinceLastAdaptation: 1, Now);
        Assert.False(d.ShouldFire);
        Assert.Equal(PathAdaptationSignalLevel.NoAction, d.SignalLevel);
    }

    // ── 6. First-observation case (no before) is not a swing ────────────

    [Fact]
    public void First_Observation_With_No_Before_Doesnt_Fire_ScoreSwing()
    {
        var path = PathStub();
        var before = new Dictionary<CodeQualityCategory, decimal>(); // empty — no prior data
        var after = new Dictionary<CodeQualityCategory, decimal> { [CodeQualityCategory.Security] = 100m };

        var d = _evaluator.Evaluate(path, before, after, completedSinceLastAdaptation: 0, Now);
        Assert.False(d.ShouldFire);
        Assert.Equal(0m, d.MaxSwing);
    }

    // ── 7. ScoreSwing takes priority over no other trigger ──────────────

    [Fact]
    public void ScoreSwing_Fires_With_Below_3_Completed()
    {
        var path = PathStub();
        var before = new Dictionary<CodeQualityCategory, decimal> { [CodeQualityCategory.Performance] = 30m };
        var after = new Dictionary<CodeQualityCategory, decimal> { [CodeQualityCategory.Performance] = 80m }; // 50pt swing

        var d = _evaluator.Evaluate(path, before, after, completedSinceLastAdaptation: 1, Now);
        Assert.True(d.ShouldFire);
        Assert.Equal(PathAdaptationTrigger.ScoreSwing, d.Trigger);
        Assert.Equal(PathAdaptationSignalLevel.Large, d.SignalLevel);
        Assert.Equal(50m, d.MaxSwing);
    }
}

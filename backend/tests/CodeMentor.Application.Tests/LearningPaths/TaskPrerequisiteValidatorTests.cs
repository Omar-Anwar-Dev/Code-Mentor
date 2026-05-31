using CodeMentor.Application.LearningPaths;

namespace CodeMentor.Application.Tests.LearningPaths;

/// <summary>
/// S18-T8 acceptance: 8+ unit tests covering empty / single / chain / cycle /
/// unmet prereq / valid DAG / disconnected components / self-loop / duplicates /
/// external-prereq-permitted.
/// </summary>
public class TaskPrerequisiteValidatorTests
{
    private static readonly TaskPrerequisiteValidator V = new();

    private static IReadOnlyDictionary<string, IReadOnlyList<string>> Prereqs(
        params (string id, string[] prereqs)[] entries)
    {
        var dict = new Dictionary<string, IReadOnlyList<string>>();
        foreach (var (id, prereqs) in entries)
        {
            dict[id] = prereqs;
        }
        return dict;
    }

    [Fact]
    public void Empty_Order_Returns_Pass()
    {
        var result = V.Validate(Array.Empty<string>(), Prereqs());
        Assert.True(result.IsValid);
        Assert.Null(result.OffendingEdge);
        Assert.Null(result.Reason);
    }

    [Fact]
    public void Single_Task_With_No_Prerequisites_Passes()
    {
        var result = V.Validate(new[] { "a" }, Prereqs(("a", Array.Empty<string>())));
        Assert.True(result.IsValid);
    }

    [Fact]
    public void Linear_Chain_In_Correct_Order_Passes()
    {
        // a → b → c → d (b requires a, c requires b, d requires c).
        var result = V.Validate(
            new[] { "a", "b", "c", "d" },
            Prereqs(
                ("a", Array.Empty<string>()),
                ("b", new[] { "a" }),
                ("c", new[] { "b" }),
                ("d", new[] { "c" })));
        Assert.True(result.IsValid);
    }

    [Fact]
    public void Linear_Chain_Reversed_Reports_First_Unmet_Prerequisite()
    {
        // Order: d, c, b, a — but each requires the previous.
        var result = V.Validate(
            new[] { "d", "c", "b", "a" },
            Prereqs(
                ("a", Array.Empty<string>()),
                ("b", new[] { "a" }),
                ("c", new[] { "b" }),
                ("d", new[] { "c" })));
        // The Kahn's pass detects this as a cycle? No — there's no cycle, just a wrong order.
        // The second pass catches the first unmet prereq: d at position 0 needs c at position 1.
        Assert.False(result.IsValid);
        Assert.Contains("Unmet prerequisite", result.Reason);
        Assert.NotNull(result.OffendingEdge);
        Assert.Equal(("d", "c"), result.OffendingEdge!.Value);
    }

    [Fact]
    public void Two_Node_Cycle_Returns_Cycle_Error()
    {
        // a requires b; b requires a → both have in-degree 1 in subgraph → Kahn's drains nothing.
        var result = V.Validate(
            new[] { "a", "b" },
            Prereqs(
                ("a", new[] { "b" }),
                ("b", new[] { "a" })));
        Assert.False(result.IsValid);
        Assert.Contains("Prerequisite cycle", result.Reason);
        Assert.NotNull(result.OffendingEdge);
    }

    [Fact]
    public void Self_Loop_Returns_SelfLoop_Error()
    {
        var result = V.Validate(
            new[] { "a" },
            Prereqs(("a", new[] { "a" })));
        Assert.False(result.IsValid);
        Assert.Contains("Self-loop", result.Reason);
        Assert.Equal(("a", "a"), result.OffendingEdge);
    }

    [Fact]
    public void Duplicate_In_Order_Reported()
    {
        var result = V.Validate(
            new[] { "a", "b", "a" },
            Prereqs(("a", Array.Empty<string>()), ("b", Array.Empty<string>())));
        Assert.False(result.IsValid);
        Assert.Contains("Duplicate task", result.Reason);
    }

    [Fact]
    public void Valid_DAG_Diamond_Passes()
    {
        // Diamond:  a → b, a → c, b → d, c → d (d depends on both b and c).
        var result = V.Validate(
            new[] { "a", "b", "c", "d" },
            Prereqs(
                ("a", Array.Empty<string>()),
                ("b", new[] { "a" }),
                ("c", new[] { "a" }),
                ("d", new[] { "b", "c" })));
        Assert.True(result.IsValid);
    }

    [Fact]
    public void Disconnected_Components_Each_Sorted_Pass()
    {
        // Two unrelated chains: a→b and x→y.
        var result = V.Validate(
            new[] { "a", "x", "b", "y" },
            Prereqs(
                ("a", Array.Empty<string>()),
                ("b", new[] { "a" }),
                ("x", Array.Empty<string>()),
                ("y", new[] { "x" })));
        Assert.True(result.IsValid);
    }

    [Fact]
    public void External_Prerequisite_Not_In_Order_Treated_As_Satisfied()
    {
        // Task "b" requires "a" which is NOT in the proposed order. Treat as
        // externally-satisfied (the learner-context layer enforces actual completion).
        var result = V.Validate(
            new[] { "b", "c" },
            Prereqs(
                ("b", new[] { "a" }),  // a is not in the proposed order
                ("c", new[] { "b" })));
        Assert.True(result.IsValid);
    }

    [Fact]
    public void Tasks_Not_In_Prerequisites_Map_Treated_As_No_Prereqs()
    {
        // Task "b" simply doesn't appear as a key in the prereqs map → treated as no prereqs.
        var result = V.Validate(new[] { "a", "b" }, Prereqs(("a", Array.Empty<string>())));
        Assert.True(result.IsValid);
    }

    [Fact]
    public void Three_Node_Cycle_Detected()
    {
        // a → b → c → a.
        var result = V.Validate(
            new[] { "a", "b", "c" },
            Prereqs(
                ("a", new[] { "c" }),
                ("b", new[] { "a" }),
                ("c", new[] { "b" })));
        Assert.False(result.IsValid);
        Assert.Contains("Prerequisite cycle", result.Reason);
    }

    [Fact]
    public void Mixed_External_And_Internal_Prereqs_Validates_Internal_Only()
    {
        // c requires {a, b}. a is internal at pos 0, b is external. Internal prereq must
        // satisfy the position rule; external is permitted.
        var result = V.Validate(
            new[] { "a", "c" },
            Prereqs(
                ("a", Array.Empty<string>()),
                ("c", new[] { "a", "b" })));  // b not in proposed list — treated as external
        Assert.True(result.IsValid);
    }
}

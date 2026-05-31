namespace CodeMentor.Application.LearningPaths;

/// <summary>
/// S18-T8 / F16 (ADR-049): pure-C# topological validator for an ordered
/// list of task ids relative to a prerequisite graph.
///
/// Used by S19's AI Path Generator (after the LLM picks an ordering)
/// + by S20's adaptation engine to verify that a proposed reorder /
/// swap preserves prerequisite ordering.
///
/// No DB calls. The caller assembles the (id → prerequisite-ids) map
/// from the live <c>Tasks.Prerequisites</c> column before invoking.
/// Self-loops (a task listing itself as a prerequisite) are detected
/// at validation time, not at graph-build time.
/// </summary>
public sealed class TaskPrerequisiteValidator
{
    /// <summary>Validates that <paramref name="orderedTaskIds"/> respects
    /// the prerequisite graph in <paramref name="prerequisitesById"/>.
    ///
    /// Algorithm: walk the proposed order from first to last. For each
    /// task, check that ALL of its prerequisites either (a) appear
    /// earlier in the order, or (b) are not part of the proposed list
    /// at all (i.e., the prereq is satisfied externally — e.g., a task
    /// the learner already completed). The latter is a learner-context
    /// concern; the validator focuses on the *graph* part.
    ///
    /// Detects:
    /// - Self-loop: a task listing itself as a prerequisite.
    /// - Cycle: A → B → A (any length cycle within the proposed list).
    /// - Unmet prereq: a prerequisite appears LATER in the order than the
    ///   task that needs it.
    /// </summary>
    /// <param name="orderedTaskIds">Proposed execution order of task ids.</param>
    /// <param name="prerequisitesById">Map of task id → its prerequisite task ids.
    /// Tasks not in the map are treated as having no prerequisites.</param>
    public ValidationResult Validate(
        IReadOnlyList<string> orderedTaskIds,
        IReadOnlyDictionary<string, IReadOnlyList<string>> prerequisitesById)
    {
        if (orderedTaskIds.Count == 0)
        {
            return ValidationResult.Pass();
        }

        // Detect duplicates in the proposed order (rare but possible from buggy generators).
        var seenInOrder = new HashSet<string>();
        for (int i = 0; i < orderedTaskIds.Count; i++)
        {
            if (!seenInOrder.Add(orderedTaskIds[i]))
            {
                return ValidationResult.Fail(
                    OffendingEdge: (orderedTaskIds[i], orderedTaskIds[i]),
                    Reason: $"Duplicate task in proposed order: '{orderedTaskIds[i]}' appears more than once.");
            }
        }

        var orderedSet = new HashSet<string>(orderedTaskIds);

        // First pass: detect self-loops + cycles entirely within the proposed list.
        // A cycle within the proposed list manifests as a strongly-connected component
        // when restricted to the subgraph of orderedSet. Detect via Kahn's algorithm:
        // if Kahn's leaves any nodes unprocessed → there's a cycle.
        var subgraphPrereqs = new Dictionary<string, List<string>>();
        var subgraphInDegree = new Dictionary<string, int>();
        foreach (var id in orderedTaskIds)
        {
            subgraphInDegree[id] = 0;
            subgraphPrereqs[id] = new List<string>();
        }
        foreach (var id in orderedTaskIds)
        {
            if (!prerequisitesById.TryGetValue(id, out var prereqs)) continue;
            foreach (var prereq in prereqs)
            {
                if (prereq == id)
                {
                    return ValidationResult.Fail(
                        OffendingEdge: (id, id),
                        Reason: $"Self-loop: task '{id}' lists itself as a prerequisite.");
                }
                // Only count prereqs that are within the proposed list.
                if (orderedSet.Contains(prereq))
                {
                    subgraphPrereqs[id].Add(prereq);
                    subgraphInDegree[id]++;
                }
            }
        }

        // Kahn's algorithm: repeatedly remove nodes with in-degree 0.
        var processed = new HashSet<string>();
        var ready = new Queue<string>(subgraphInDegree.Where(kv => kv.Value == 0).Select(kv => kv.Key));
        while (ready.Count > 0)
        {
            var node = ready.Dequeue();
            processed.Add(node);
            // Decrement in-degree of every node that depended on this one.
            foreach (var (depId, depPrereqs) in subgraphPrereqs)
            {
                if (depPrereqs.Contains(node))
                {
                    subgraphInDegree[depId]--;
                    if (subgraphInDegree[depId] == 0 && !processed.Contains(depId))
                    {
                        ready.Enqueue(depId);
                    }
                }
            }
        }
        if (processed.Count < orderedTaskIds.Count)
        {
            // Some node was never processed → it's part of a cycle.
            // Pick any remaining edge as the offender for the report.
            var unresolved = orderedTaskIds.Where(id => !processed.Contains(id)).ToList();
            var first = unresolved[0];
            var firstEdge = subgraphPrereqs[first].FirstOrDefault(p => unresolved.Contains(p)) ?? unresolved[0];
            return ValidationResult.Fail(
                OffendingEdge: (first, firstEdge),
                Reason: $"Prerequisite cycle detected involving task '{first}' (and {unresolved.Count - 1} others).");
        }

        // Second pass: cycle-free. Now verify that for each task at index i,
        // its (in-list) prerequisites all appear at index < i.
        var positionById = new Dictionary<string, int>(orderedTaskIds.Count);
        for (int i = 0; i < orderedTaskIds.Count; i++)
        {
            positionById[orderedTaskIds[i]] = i;
        }
        for (int i = 0; i < orderedTaskIds.Count; i++)
        {
            var id = orderedTaskIds[i];
            if (!prerequisitesById.TryGetValue(id, out var prereqs)) continue;
            foreach (var prereq in prereqs)
            {
                if (!orderedSet.Contains(prereq))
                {
                    // Prereq is external — the validator doesn't enforce learner-context.
                    continue;
                }
                if (positionById[prereq] >= i)
                {
                    return ValidationResult.Fail(
                        OffendingEdge: (id, prereq),
                        Reason: $"Unmet prerequisite: task '{id}' at position {i} requires '{prereq}' which appears at position {positionById[prereq]}.");
                }
            }
        }

        return ValidationResult.Pass();
    }
}

/// <summary>S18-T8: result of a topological validation.
/// On failure, <see cref="OffendingEdge"/> identifies the (dependent, prerequisite)
/// pair that caused the failure (or (id, id) for self-loop / duplicates).</summary>
public sealed record ValidationResult(
    bool IsValid,
    (string Dependent, string Prerequisite)? OffendingEdge,
    string? Reason)
{
    public static ValidationResult Pass() => new(true, null, null);
    public static ValidationResult Fail((string, string) OffendingEdge, string Reason) =>
        new(false, OffendingEdge, Reason);
}

"""S19-T1 / F16: Pure-Python topological validator for an ordered list
of task IDs relative to a prerequisite graph.

Mirror of backend's :code:`TaskPrerequisiteValidator` (S18-T8). Same
algorithm (Kahn's), same failure modes (self-loop, cycle, unmet
prerequisite, duplicate). Used by :code:`PathGenerator` to verify that
the LLM's proposed ordering respects prerequisites before returning to
the backend — on failure the generator retries with self-correction.

No external deps; pure stdlib so the AI-service Docker layer stays slim.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Mapping, Optional, Sequence


@dataclass(frozen=True)
class TopologyValidationResult:
    """Outcome of a topological validation.

    On failure, ``offending_dependent`` is the task at the violating
    position; ``offending_prerequisite`` is the prerequisite (or the
    task itself for self-loops / duplicates). ``reason`` is a one-line
    human-readable explanation suitable for embedding in a retry hint.
    """

    is_valid: bool
    offending_dependent: Optional[str] = None
    offending_prerequisite: Optional[str] = None
    reason: Optional[str] = None

    @classmethod
    def pass_(cls) -> "TopologyValidationResult":
        return cls(is_valid=True)

    @classmethod
    def fail(
        cls, dependent: str, prerequisite: str, reason: str
    ) -> "TopologyValidationResult":
        return cls(
            is_valid=False,
            offending_dependent=dependent,
            offending_prerequisite=prerequisite,
            reason=reason,
        )


def validate_path_topology(
    ordered_task_ids: Sequence[str],
    prerequisites_by_id: Mapping[str, Sequence[str]],
) -> TopologyValidationResult:
    """Validate that ``ordered_task_ids`` respects the prerequisite graph.

    Algorithm matches :code:`backend/CodeMentor.Application/LearningPaths/
    TaskPrerequisiteValidator.cs` step-for-step:

    1. Reject duplicate task IDs in the proposed order.
    2. Build a subgraph restricted to the proposed list (external
       prereqs are treated as satisfied — they were completed earlier).
    3. Detect self-loops + cycles via Kahn's algorithm (any node not
       drained is part of a cycle).
    4. Verify each task's in-list prerequisites appear at an earlier
       position than the task itself.

    Empty list → pass (no path to validate).
    """
    if not ordered_task_ids:
        return TopologyValidationResult.pass_()

    # Step 1: duplicate detection.
    seen: set[str] = set()
    for tid in ordered_task_ids:
        if tid in seen:
            return TopologyValidationResult.fail(
                tid,
                tid,
                f"Duplicate task in proposed order: '{tid}' appears more than once.",
            )
        seen.add(tid)

    ordered_set: set[str] = set(ordered_task_ids)

    # Step 2 + 3: build subgraph, detect self-loops, run Kahn's.
    subgraph_prereqs: dict[str, list[str]] = {tid: [] for tid in ordered_task_ids}
    in_degree: dict[str, int] = {tid: 0 for tid in ordered_task_ids}

    for tid in ordered_task_ids:
        prereqs = prerequisites_by_id.get(tid, []) or []
        for prereq in prereqs:
            if prereq == tid:
                return TopologyValidationResult.fail(
                    tid,
                    tid,
                    f"Self-loop: task '{tid}' lists itself as a prerequisite.",
                )
            if prereq in ordered_set:
                subgraph_prereqs[tid].append(prereq)
                in_degree[tid] += 1

    processed: set[str] = set()
    ready: list[str] = [tid for tid, deg in in_degree.items() if deg == 0]
    while ready:
        node = ready.pop(0)
        processed.add(node)
        for dep_id, dep_prereqs in subgraph_prereqs.items():
            if node in dep_prereqs and dep_id not in processed:
                in_degree[dep_id] -= 1
                if in_degree[dep_id] == 0:
                    ready.append(dep_id)

    if len(processed) < len(ordered_task_ids):
        unresolved = [tid for tid in ordered_task_ids if tid not in processed]
        first = unresolved[0]
        unresolved_set = set(unresolved)
        edge_prereq = next(
            (p for p in subgraph_prereqs[first] if p in unresolved_set),
            unresolved[0],
        )
        return TopologyValidationResult.fail(
            first,
            edge_prereq,
            f"Prerequisite cycle detected involving task '{first}' "
            f"(and {len(unresolved) - 1} others).",
        )

    # Step 4: position check.
    position_by_id: dict[str, int] = {
        tid: i for i, tid in enumerate(ordered_task_ids)
    }
    for i, tid in enumerate(ordered_task_ids):
        prereqs = prerequisites_by_id.get(tid, []) or []
        for prereq in prereqs:
            if prereq not in ordered_set:
                continue
            if position_by_id[prereq] >= i:
                return TopologyValidationResult.fail(
                    tid,
                    prereq,
                    f"Unmet prerequisite: task '{tid}' at position {i} "
                    f"requires '{prereq}' which appears at position {position_by_id[prereq]}.",
                )

    return TopologyValidationResult.pass_()

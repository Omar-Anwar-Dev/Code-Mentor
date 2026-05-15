"""S19-T1 / F16: unit tests for the Python topological validator.

Mirror the C# ``TaskPrerequisiteValidatorTests`` from S18-T8 — same
algorithm, same failure modes. Pure stdlib, no asyncio, no Pydantic.
"""
from __future__ import annotations

from app.services.path_topology import (
    TopologyValidationResult,
    validate_path_topology,
)


def test_empty_order_passes() -> None:
    result = validate_path_topology([], {})
    assert result.is_valid


def test_single_task_no_prereqs_passes() -> None:
    result = validate_path_topology(["A"], {})
    assert result.is_valid


def test_simple_chain_in_order_passes() -> None:
    # A → B → C (B depends on A, C depends on B)
    result = validate_path_topology(
        ["A", "B", "C"],
        {"B": ["A"], "C": ["B"]},
    )
    assert result.is_valid


def test_chain_reversed_fails() -> None:
    # C → B → A but listed as A,B,C with C requiring B etc — actually let's do:
    # ordered [C, B, A] but C requires B + B requires A → both unmet.
    result = validate_path_topology(
        ["C", "B", "A"],
        {"B": ["A"], "C": ["B"]},
    )
    assert not result.is_valid
    assert result.offending_dependent == "C"
    assert result.offending_prerequisite == "B"


def test_self_loop_fails() -> None:
    result = validate_path_topology(["A"], {"A": ["A"]})
    assert not result.is_valid
    assert result.offending_dependent == "A"
    assert result.offending_prerequisite == "A"
    assert "Self-loop" in (result.reason or "")


def test_two_node_cycle_fails() -> None:
    # A → B → A (A depends on B, B depends on A)
    result = validate_path_topology(
        ["A", "B"],
        {"A": ["B"], "B": ["A"]},
    )
    assert not result.is_valid
    assert "cycle" in (result.reason or "").lower()


def test_three_node_cycle_fails() -> None:
    # A → B → C → A
    result = validate_path_topology(
        ["A", "B", "C"],
        {"A": ["C"], "B": ["A"], "C": ["B"]},
    )
    assert not result.is_valid
    assert "cycle" in (result.reason or "").lower()


def test_duplicate_in_order_fails() -> None:
    result = validate_path_topology(
        ["A", "B", "A"],
        {},
    )
    assert not result.is_valid
    assert result.offending_dependent == "A"
    assert "Duplicate" in (result.reason or "")


def test_external_prereq_not_in_list_passes() -> None:
    # B requires X — X is not in the proposed list at all. Validator treats
    # this as "satisfied externally" and passes.
    result = validate_path_topology(
        ["A", "B"],
        {"B": ["X"]},
    )
    assert result.is_valid


def test_unmet_prereq_appears_later() -> None:
    # B requires A, but A appears LATER in the order.
    result = validate_path_topology(
        ["B", "A"],
        {"B": ["A"]},
    )
    assert not result.is_valid
    assert result.offending_dependent == "B"
    assert result.offending_prerequisite == "A"
    assert "Unmet" in (result.reason or "")


def test_dag_diamond_in_correct_order_passes() -> None:
    #     A
    #    / \
    #   B   C
    #    \ /
    #     D
    result = validate_path_topology(
        ["A", "B", "C", "D"],
        {"B": ["A"], "C": ["A"], "D": ["B", "C"]},
    )
    assert result.is_valid


def test_disconnected_components_pass() -> None:
    # Two independent chains in the same order.
    result = validate_path_topology(
        ["A", "B", "X", "Y"],
        {"B": ["A"], "Y": ["X"]},
    )
    assert result.is_valid


def test_unrelated_tasks_pass() -> None:
    result = validate_path_topology(
        ["A", "B", "C", "D"],
        {},
    )
    assert result.is_valid


def test_long_chain_in_order_passes() -> None:
    ids = [f"T{i}" for i in range(20)]
    prereqs: dict[str, list[str]] = {f"T{i}": [f"T{i-1}"] for i in range(1, 20)}
    assert validate_path_topology(ids, prereqs).is_valid


def test_long_chain_swapped_two_fails() -> None:
    ids = [f"T{i}" for i in range(20)]
    # Swap T5 and T6 — T5 (which was at pos 5) now after T6 (which was at pos 6),
    # but T6 requires T5.
    ids[5], ids[6] = ids[6], ids[5]
    prereqs: dict[str, list[str]] = {f"T{i}": [f"T{i-1}"] for i in range(1, 20)}
    result = validate_path_topology(ids, prereqs)
    assert not result.is_valid


def test_result_factory_helpers() -> None:
    """Just exercise the dataclass factory methods to catch regressions."""
    pass_ = TopologyValidationResult.pass_()
    assert pass_.is_valid
    assert pass_.offending_dependent is None
    assert pass_.reason is None
    fail = TopologyValidationResult.fail("A", "B", "reason")
    assert not fail.is_valid
    assert fail.offending_dependent == "A"
    assert fail.offending_prerequisite == "B"
    assert fail.reason == "reason"

"""S20-T1 / F16: schema-level tests for the path-adaptation Pydantic models.

Validates the surface invariants enforced by the schemas themselves
(before the service-level cross-checks). Each scenario maps directly
to one of the rules in :mod:`app.domain.schemas.path_adaptation`.

These are pure Pydantic tests — no FastAPI, no OpenAI.
"""
from __future__ import annotations

from typing import Any, Dict, List

import pytest
from pydantic import ValidationError

from app.domain.schemas.path_adaptation import (
    AdaptPathRequest,
    AdaptPathResponse,
    CandidateReplacement,
    CurrentPathEntry,
    ProposedAction,
    RecentSubmissionInput,
)


# ---------------------------------------------------------------------------
# Builders
# ---------------------------------------------------------------------------


def _entry(order: int, *, status: str = "NotStarted", tags: List[Dict[str, float]] | None = None,
           task_id: str | None = None) -> Dict[str, Any]:
    return {
        "pathTaskId": f"PT-{order}",
        "taskId": task_id or f"T-{order}",
        "title": f"Task {order} title",
        "orderIndex": order,
        "status": status,
        "skillTags": tags or [
            {"skill": "correctness", "weight": 0.6},
            {"skill": "design", "weight": 0.4},
        ],
    }


def _candidate(task_id: str = "C-1", *, tags: List[Dict[str, float]] | None = None) -> Dict[str, Any]:
    return {
        "taskId": task_id,
        "title": f"Candidate {task_id}",
        "descriptionSummary": "A candidate replacement task summary.",
        "difficulty": 2,
        "skillTags": tags or [
            {"skill": "security", "weight": 0.7},
            {"skill": "correctness", "weight": 0.3},
        ],
        "prerequisites": [],
    }


def _request_payload(
    *,
    signal_level: str = "medium",
    path_len: int = 4,
    candidates: List[Dict[str, Any]] | None = None,
) -> Dict[str, Any]:
    return {
        "currentPath": [_entry(i + 1) for i in range(path_len)],
        "recentSubmissions": [
            {
                "taskId": "T-2",
                "overallScore": 65.0,
                "scoresPerCategory": {"correctness": 70.0, "security": 45.0},
                "summaryText": "Functional but weak on input validation.",
            }
        ],
        "signalLevel": signal_level,
        "skillProfile": {"correctness": 70.0, "security": 45.0, "design": 60.0},
        "candidateReplacements": candidates if candidates is not None else [_candidate("C-1")],
        "completedTaskIds": [],
        "track": "Backend",
    }


def _response_payload(
    *,
    signal_level: str = "medium",
    actions: List[Dict[str, Any]] | None = None,
) -> Dict[str, Any]:
    return {
        "actions": actions if actions is not None else [],
        "overallReasoning": "Baseline reasoning string for the response model.",
        "signalLevel": signal_level,
        "promptVersion": "adapt_path_v1",
        "tokensUsed": 100,
        "retryCount": 0,
    }


# ---------------------------------------------------------------------------
# Request-level invariants
# ---------------------------------------------------------------------------


def test_request_accepts_well_formed_payload():
    req = AdaptPathRequest(**_request_payload())
    assert req.signalLevel == "medium"
    assert len(req.currentPath) == 4


def test_request_rejects_non_dense_order_indices():
    payload = _request_payload()
    payload["currentPath"][2]["orderIndex"] = 7  # gap within field range
    with pytest.raises(ValidationError) as exc:
        AdaptPathRequest(**payload)
    assert "dense" in str(exc.value).lower()


def test_request_rejects_duplicate_taskids_in_path():
    payload = _request_payload()
    payload["currentPath"][2]["taskId"] = payload["currentPath"][0]["taskId"]
    with pytest.raises(ValidationError) as exc:
        AdaptPathRequest(**payload)
    assert "duplicate taskid in currentpath" in str(exc.value).lower()


def test_request_rejects_candidate_overlapping_current_path():
    payload = _request_payload()
    overlap_id = payload["currentPath"][0]["taskId"]
    payload["candidateReplacements"][0]["taskId"] = overlap_id
    with pytest.raises(ValidationError) as exc:
        AdaptPathRequest(**payload)
    assert "already in currentpath" in str(exc.value).lower()


def test_request_rejects_candidate_in_completed_list():
    payload = _request_payload()
    payload["completedTaskIds"] = ["done-1", "C-1"]
    with pytest.raises(ValidationError) as exc:
        AdaptPathRequest(**payload)
    assert "already-completed" in str(exc.value).lower()


def test_request_rejects_out_of_range_skill_profile_score():
    payload = _request_payload()
    payload["skillProfile"]["design"] = 150.0
    with pytest.raises(ValidationError):
        AdaptPathRequest(**payload)


# ---------------------------------------------------------------------------
# Response-level invariants (scope enforcement — heart of S20-T1)
# ---------------------------------------------------------------------------


def test_response_no_action_must_have_empty_actions():
    payload = _response_payload(
        signal_level="no_action",
        actions=[
            {
                "type": "reorder",
                "targetPosition": 1,
                "newTaskId": None,
                "newOrderIndex": 2,
                "reason": "Bring forward the security task to address weak score.",
                "confidence": 0.9,
            }
        ],
    )
    with pytest.raises(ValidationError) as exc:
        AdaptPathResponse(**payload)
    assert "no_action requires an empty actions" in str(exc.value)


def test_response_small_signal_rejects_swap_actions():
    payload = _response_payload(
        signal_level="small",
        actions=[
            {
                "type": "swap",
                "targetPosition": 1,
                "newTaskId": "C-1",
                "newOrderIndex": None,
                "reason": "Replace with a security-focused candidate task.",
                "confidence": 0.85,
            }
        ],
    )
    with pytest.raises(ValidationError) as exc:
        AdaptPathResponse(**payload)
    assert "signallevel=small allows only 'reorder'" in str(exc.value).lower()


def test_response_rejects_duplicate_target_positions():
    payload = _response_payload(
        signal_level="medium",
        actions=[
            {
                "type": "reorder",
                "targetPosition": 1,
                "newTaskId": None,
                "newOrderIndex": 3,
                "reason": "Move position-1 task to position-3 for difficulty curve.",
                "confidence": 0.85,
            },
            {
                "type": "reorder",
                "targetPosition": 1,
                "newTaskId": None,
                "newOrderIndex": 4,
                "reason": "Move position-1 task to position-4 as a fallback.",
                "confidence": 0.5,
            },
        ],
    )
    with pytest.raises(ValidationError) as exc:
        AdaptPathResponse(**payload)
    assert "multiple actions target the same position" in str(exc.value).lower()


def test_response_medium_signal_accepts_reorder_and_swap():
    payload = _response_payload(
        signal_level="medium",
        actions=[
            {
                "type": "reorder",
                "targetPosition": 2,
                "newTaskId": None,
                "newOrderIndex": 1,
                "reason": "Bring forward the security drill given security score 45/100.",
                "confidence": 0.9,
            },
            {
                "type": "swap",
                "targetPosition": 4,
                "newTaskId": "C-1",
                "newOrderIndex": None,
                "reason": "Swap a redundant task for a security-focused candidate.",
                "confidence": 0.82,
            },
        ],
    )
    resp = AdaptPathResponse(**payload)
    assert len(resp.actions) == 2
    assert resp.actions[0].type == "reorder"
    assert resp.actions[1].type == "swap"


def test_response_large_signal_accepts_multiple_swaps():
    payload = _response_payload(
        signal_level="large",
        actions=[
            {
                "type": "swap",
                "targetPosition": 1,
                "newTaskId": "C-1",
                "newOrderIndex": None,
                "reason": "Score swung 35pt on security; bring in a targeted security task.",
                "confidence": 0.9,
            },
            {
                "type": "swap",
                "targetPosition": 3,
                "newTaskId": "C-2",
                "newOrderIndex": None,
                "reason": "Replace with a second-tier reinforcement task at the same skill.",
                "confidence": 0.78,
            },
        ],
    )
    resp = AdaptPathResponse(**payload)
    assert len(resp.actions) == 2


# ---------------------------------------------------------------------------
# Action-shape invariants (handled by ProposedAction.model_validator)
# ---------------------------------------------------------------------------


def test_action_swap_requires_new_task_id():
    with pytest.raises(ValidationError) as exc:
        ProposedAction(
            type="swap",
            targetPosition=1,
            newTaskId=None,
            newOrderIndex=None,
            reason="Some swap reason that meets the min length.",
            confidence=0.8,
        )
    assert "swap action requires newtaskid" in str(exc.value).lower()


def test_action_reorder_must_not_set_new_task_id():
    with pytest.raises(ValidationError) as exc:
        ProposedAction(
            type="reorder",
            targetPosition=1,
            newTaskId="C-9",
            newOrderIndex=2,
            reason="Reorder action that mistakenly carries a newTaskId.",
            confidence=0.7,
        )
    assert "reorder action must not set newtaskid" in str(exc.value).lower()


def test_action_reorder_rejects_noop_when_new_index_equals_target():
    with pytest.raises(ValidationError) as exc:
        ProposedAction(
            type="reorder",
            targetPosition=2,
            newTaskId=None,
            newOrderIndex=2,
            reason="No-op reorder which should not be allowed.",
            confidence=0.7,
        )
    assert "newOrderIndex must differ from targetPosition".lower() in str(exc.value).lower()

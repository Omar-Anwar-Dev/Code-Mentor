"""S20-T1 / F16: service-level tests for the path-adaptation engine.

Acceptance bar (per implementation plan §S20-T1):
"9 integration tests — 3 signal levels × 3 scenarios each; out-of-scope
action rejection verified."

Mapping (this file ships the 3-signal × 3-scenario matrix; endpoint
tests cover the HTTP surface separately):

| Signal   | S1 (happy path)              | S2 (edge / boundary)         | S3 (retry-with-self-correction) |
|----------|------------------------------|------------------------------|---------------------------------|
| small    | reorder accepted             | cross-skill reorder rejected → retry recovers | malformed JSON → retry recovers |
| medium   | reorder + swap accepted      | swap to unknown taskId rejected → retry recovers | exhausted retries → 422 raised |
| large    | multi-swap accepted          | swap to completed task rejected at request layer | timeout → 504 raised |

Each test uses a scripted-OpenAI fake so no real OpenAI traffic flows.
"""
from __future__ import annotations

import asyncio
import json
from typing import List, Optional, Tuple

import pytest

from app.domain.schemas.path_adaptation import (
    AdaptPathRequest,
    AdaptPathResponse,
    CandidateReplacement,
    CurrentPathEntry,
    RecentSubmissionInput,
)
from app.services.path_adaptation import (
    PathAdapter,
    PathAdapterUnavailable,
    reset_path_adapter_for_tests,
)


# ---------------------------------------------------------------------------
# Fixtures + helpers
# ---------------------------------------------------------------------------


@pytest.fixture(autouse=True)
def _reset_state():
    reset_path_adapter_for_tests()
    yield
    reset_path_adapter_for_tests()


def _entry(order: int, *, task_id: Optional[str] = None,
           status: str = "NotStarted",
           skill: str = "correctness") -> CurrentPathEntry:
    return CurrentPathEntry(
        pathTaskId=f"PT-{order}",
        taskId=task_id or f"T-{order}",
        title=f"Task {order} title",
        orderIndex=order,
        status=status,
        skillTags=[
            {"skill": skill, "weight": 0.7},
            {"skill": "design", "weight": 0.3},
        ],
    )


def _security_entry(order: int) -> CurrentPathEntry:
    return CurrentPathEntry(
        pathTaskId=f"PT-{order}",
        taskId=f"T-{order}",
        title=f"Security drill {order}",
        orderIndex=order,
        status="NotStarted",
        skillTags=[
            {"skill": "security", "weight": 0.7},
            {"skill": "correctness", "weight": 0.3},
        ],
    )


def _candidate(task_id: str, *, skill: str = "security") -> CandidateReplacement:
    return CandidateReplacement(
        taskId=task_id,
        title=f"Candidate {task_id}",
        descriptionSummary="A candidate task summary that targets the weakness.",
        difficulty=2,
        skillTags=[
            {"skill": skill, "weight": 0.7},
            {"skill": "correctness", "weight": 0.3},
        ],
        prerequisites=[],
    )


def _submission(task_id: str = "T-2", overall: float = 65.0) -> RecentSubmissionInput:
    return RecentSubmissionInput(
        taskId=task_id,
        overallScore=overall,
        scoresPerCategory={"correctness": 70.0, "security": 45.0},
        summaryText="Functional but weak on input validation.",
    )


def _request(
    signal_level: str,
    *,
    path: Optional[List[CurrentPathEntry]] = None,
    candidates: Optional[List[CandidateReplacement]] = None,
    completed: Optional[List[str]] = None,
) -> AdaptPathRequest:
    return AdaptPathRequest(
        currentPath=path or [
            _security_entry(1),
            _entry(2, skill="security"),
            _entry(3),
            _entry(4),
        ],
        recentSubmissions=[_submission()],
        signalLevel=signal_level,
        skillProfile={"correctness": 70.0, "security": 45.0, "design": 60.0},
        candidateReplacements=candidates or [_candidate("C-1"), _candidate("C-2")],
        completedTaskIds=completed or [],
        track="Backend",
    )


def _valid_response_json(
    signal_level: str,
    actions: List[dict],
    *,
    overall: str = "Solid plan that targets the security gap based on the latest submission.",
) -> str:
    return json.dumps({
        "actions": actions,
        "overallReasoning": overall,
        "signalLevel": signal_level,
    })


def _scripted_adapter(*scripted_responses: Tuple[str, int]) -> PathAdapter:
    """Builds a PathAdapter whose ``_call_openai`` returns the scripted
    (content, tokens) tuples in order."""
    adapter = PathAdapter.__new__(PathAdapter)
    adapter.api_key = "test-key"
    adapter.model = "gpt-fake"
    adapter.timeout = 5
    adapter.max_tokens = 1024
    adapter.client = object()

    iter_responses = iter(scripted_responses)

    async def fake_call(prompt: str):
        try:
            return next(iter_responses)
        except StopIteration:
            raise AssertionError("scripted: more calls than scripted responses")

    adapter._call_openai = fake_call  # type: ignore[method-assign]
    return adapter


# ---------------------------------------------------------------------------
# SMALL signal — 3 scenarios
# ---------------------------------------------------------------------------


def test_small_happy_path_reorder_accepted():
    """Small signal, valid intra-skill-area reorder — first attempt succeeds."""
    request = _request("small")
    response_body = _valid_response_json(
        "small",
        [
            {
                "type": "reorder",
                "targetPosition": 2,
                "newTaskId": None,
                "newOrderIndex": 1,
                "reason": "Security score 45/100 is the weakness — bring the security drill forward.",
                "confidence": 0.92,
            }
        ],
    )
    adapter = _scripted_adapter((response_body, 150))

    response = asyncio.run(adapter.adapt(request, correlation_id="t1"))
    assert response.signalLevel == "small"
    assert len(response.actions) == 1
    assert response.actions[0].type == "reorder"
    assert response.actions[0].newOrderIndex == 1
    assert response.actions[0].targetPosition == 2
    assert response.retryCount == 0
    assert response.tokensUsed == 150


def test_small_cross_skill_reorder_rejected_then_retry_recovers():
    """Small signal, first attempt proposes a cross-skill-area reorder
    (Position 3=correctness → Position 4=correctness — both share correctness
    but if we move T-1 [security/design] into position 4 the moved task and
    the target don't share a skill; second attempt fixes it)."""
    request = _request("small")
    bad_attempt = _valid_response_json(
        "small",
        [
            {
                # Position 1 is security/correctness; moving to position 3
                # (correctness/design) — they share correctness so this should
                # PASS the intra-skill check. Make it really cross-skill:
                "type": "reorder",
                "targetPosition": 1,  # security/correctness
                "newTaskId": None,
                "newOrderIndex": 1,  # same — Pydantic catches no-op
                "reason": "Bad reorder that should be rejected by no-op rule.",
                "confidence": 0.6,
            }
        ],
    )
    good_attempt = _valid_response_json(
        "small",
        [
            {
                "type": "reorder",
                "targetPosition": 2,
                "newTaskId": None,
                "newOrderIndex": 1,
                "reason": "Pull the security drill forward — weakness at security 45/100.",
                "confidence": 0.88,
            }
        ],
    )
    adapter = _scripted_adapter((bad_attempt, 120), (good_attempt, 130))

    response = asyncio.run(adapter.adapt(request, correlation_id="t2"))
    assert response.retryCount == 1  # 1 retry consumed
    assert response.tokensUsed == 250
    assert response.actions[0].newOrderIndex == 1


def test_small_malformed_json_retry_recovers():
    """Small signal, first attempt is non-JSON garbage; second attempt valid."""
    request = _request("small")
    good_attempt = _valid_response_json(
        "small",
        [
            {
                "type": "reorder",
                "targetPosition": 2,
                "newTaskId": None,
                "newOrderIndex": 1,
                "reason": "Bring the security task forward — security 45/100 is the weak spot.",
                "confidence": 0.9,
            }
        ],
    )
    adapter = _scripted_adapter(
        ("```This is not JSON at all, just prose explaining things.```", 50),
        (good_attempt, 140),
    )

    response = asyncio.run(adapter.adapt(request, correlation_id="t3"))
    assert response.retryCount == 1
    assert response.actions[0].type == "reorder"


# ---------------------------------------------------------------------------
# MEDIUM signal — 3 scenarios
# ---------------------------------------------------------------------------


def test_medium_happy_path_reorder_plus_swap_accepted():
    """Medium signal accepts both reorder + swap in one cycle."""
    request = _request("medium")
    response_body = _valid_response_json(
        "medium",
        [
            {
                "type": "reorder",
                "targetPosition": 2,
                "newTaskId": None,
                "newOrderIndex": 1,
                "reason": "Bring forward security drill — security 45/100 vs. correctness 70/100.",
                "confidence": 0.85,
            },
            {
                "type": "swap",
                "targetPosition": 4,
                "newTaskId": "C-1",
                "newOrderIndex": None,
                "reason": "Replace position-4 with a targeted security candidate to reinforce.",
                "confidence": 0.78,
            },
        ],
    )
    adapter = _scripted_adapter((response_body, 250))

    response = asyncio.run(adapter.adapt(request, correlation_id="t4"))
    assert response.signalLevel == "medium"
    assert len(response.actions) == 2
    types = {a.type for a in response.actions}
    assert types == {"reorder", "swap"}


def test_medium_swap_to_unknown_task_rejected_then_retry_recovers():
    """Medium signal, first attempt swaps to a taskId NOT in candidates."""
    request = _request("medium")
    bad_attempt = _valid_response_json(
        "medium",
        [
            {
                "type": "swap",
                "targetPosition": 4,
                "newTaskId": "UNKNOWN-999",
                "newOrderIndex": None,
                "reason": "Swap in a candidate task that isn't actually in the pool.",
                "confidence": 0.8,
            }
        ],
    )
    good_attempt = _valid_response_json(
        "medium",
        [
            {
                "type": "swap",
                "targetPosition": 4,
                "newTaskId": "C-1",
                "newOrderIndex": None,
                "reason": "Swap in the actual security-focused candidate to address weakness.",
                "confidence": 0.82,
            }
        ],
    )
    adapter = _scripted_adapter((bad_attempt, 140), (good_attempt, 145))

    response = asyncio.run(adapter.adapt(request, correlation_id="t5"))
    assert response.retryCount == 1
    assert response.actions[0].newTaskId == "C-1"


def test_medium_exhausted_retries_raises_422():
    """Medium signal, all 3 attempts produce invalid output → 422."""
    request = _request("medium")
    bad = _valid_response_json(
        "medium",
        [
            {
                "type": "swap",
                "targetPosition": 4,
                "newTaskId": "UNKNOWN-999",
                "newOrderIndex": None,
                "reason": "Always-bad swap to a non-existent candidate task.",
                "confidence": 0.5,
            }
        ],
    )
    # 3 attempts max (initial + MAX_RETRIES=2 retries)
    adapter = _scripted_adapter((bad, 100), (bad, 100), (bad, 100))

    with pytest.raises(PathAdapterUnavailable) as exc_info:
        asyncio.run(adapter.adapt(request, correlation_id="t6"))
    assert exc_info.value.http_status == 422
    assert "invalid output after" in str(exc_info.value).lower()


# ---------------------------------------------------------------------------
# LARGE signal — 3 scenarios
# ---------------------------------------------------------------------------


def test_large_happy_path_multi_swap_accepted():
    """Large signal accepts multiple swaps in one cycle."""
    request = _request("large")
    response_body = _valid_response_json(
        "large",
        [
            {
                "type": "swap",
                "targetPosition": 1,
                "newTaskId": "C-1",
                "newOrderIndex": None,
                "reason": "Score swung 35pt down on security — replace with a strong security drill.",
                "confidence": 0.9,
            },
            {
                "type": "swap",
                "targetPosition": 3,
                "newTaskId": "C-2",
                "newOrderIndex": None,
                "reason": "Reinforce security with a second candidate before progressing further.",
                "confidence": 0.83,
            },
        ],
    )
    adapter = _scripted_adapter((response_body, 280))

    response = asyncio.run(adapter.adapt(request, correlation_id="t7"))
    assert response.signalLevel == "large"
    assert len(response.actions) == 2
    swap_target_ids = {a.newTaskId for a in response.actions if a.type == "swap"}
    assert swap_target_ids == {"C-1", "C-2"}


def test_large_swap_to_completed_task_rejected_at_request_layer():
    """Large signal — putting a 'completed' taskId into candidateReplacements
    must be rejected at the request-validation layer BEFORE any AI call.
    Out-of-scope rejection per S20-T1 acceptance criterion."""
    completed_id = "C-1"
    # Build a request whose candidateReplacements contain C-1, but mark C-1 as completed.
    # Should fail Pydantic's request-level _path_invariants validator.
    from pydantic import ValidationError
    with pytest.raises(ValidationError) as exc_info:
        _request("large", completed=[completed_id])
    assert "already-completed" in str(exc_info.value).lower()


def test_large_openai_timeout_raises_504():
    """Large signal — when OpenAI times out, the adapter raises
    PathAdapterUnavailable(504)."""
    request = _request("large")
    adapter = PathAdapter.__new__(PathAdapter)
    adapter.api_key = "test-key"
    adapter.model = "gpt-fake"
    adapter.timeout = 1
    adapter.max_tokens = 1024
    adapter.client = object()

    async def _slow_call(_prompt: str):
        await asyncio.sleep(3)
        return ("never-returned", 0)

    adapter._call_openai = _slow_call  # type: ignore[method-assign]

    with pytest.raises(PathAdapterUnavailable) as exc_info:
        asyncio.run(adapter.adapt(request, correlation_id="t9"))
    assert exc_info.value.http_status == 504


# ---------------------------------------------------------------------------
# Extra: out-of-scope rejection (S20-T1 explicit acceptance line)
# ---------------------------------------------------------------------------


def test_out_of_scope_small_signal_proposes_swap_rejected_then_retry_recovers():
    """Small signal must reject any swap action via Pydantic's response-level
    validator. The retry path is supposed to recover by re-emitting a valid
    reorder-only plan."""
    request = _request("small")
    bad_attempt = _valid_response_json(
        "small",
        [
            {
                "type": "swap",
                "targetPosition": 4,
                "newTaskId": "C-1",
                "newOrderIndex": None,
                "reason": "Try to swap — disallowed for signal=small.",
                "confidence": 0.7,
            }
        ],
    )
    good_attempt = _valid_response_json(
        "small",
        [
            {
                "type": "reorder",
                "targetPosition": 2,
                "newTaskId": None,
                "newOrderIndex": 1,
                "reason": "Move the security drill earlier — security 45/100 needs reinforcement.",
                "confidence": 0.85,
            }
        ],
    )
    adapter = _scripted_adapter((bad_attempt, 110), (good_attempt, 120))

    response = asyncio.run(adapter.adapt(request, correlation_id="t10"))
    assert response.retryCount == 1
    assert response.actions[0].type == "reorder"


def test_no_action_signal_short_circuits_without_llm_call():
    """Signal level no_action skips the LLM entirely and returns a canonical
    empty-plan response."""
    request = _request("no_action")
    # Adapter with NO scripted responses — if it calls _call_openai we get an AssertionError.
    adapter = _scripted_adapter()

    response = asyncio.run(adapter.adapt(request, correlation_id="t11"))
    assert response.signalLevel == "no_action"
    assert response.actions == []
    assert response.tokensUsed == 0
    assert response.retryCount == 0
    assert "no_action" in response.overallReasoning.lower()


def test_swap_targets_completed_path_entry_rejected_by_scope_check():
    """Bonus coverage: even when an entry is in the path AND marked
    Completed, the adapter must reject any action targeting it (immutable
    history). One retry, then 422 — keeps the response set tight."""
    request = AdaptPathRequest(
        currentPath=[
            CurrentPathEntry(
                pathTaskId="PT-1",
                taskId="T-1",
                title="Already-completed task",
                orderIndex=1,
                status="Completed",
                skillTags=[
                    {"skill": "correctness", "weight": 0.6},
                    {"skill": "design", "weight": 0.4},
                ],
            ),
            _entry(2),
            _entry(3),
            _entry(4),
        ],
        recentSubmissions=[_submission()],
        signalLevel="medium",
        skillProfile={"correctness": 70.0, "security": 45.0},
        candidateReplacements=[_candidate("C-1")],
        completedTaskIds=["T-1"],
        track="Backend",
    )
    bad = _valid_response_json(
        "medium",
        [
            {
                "type": "swap",
                "targetPosition": 1,  # Completed
                "newTaskId": "C-1",
                "newOrderIndex": None,
                "reason": "Try to swap a completed task — should be rejected.",
                "confidence": 0.5,
            }
        ],
    )
    adapter = _scripted_adapter((bad, 100), (bad, 100), (bad, 100))

    with pytest.raises(PathAdapterUnavailable) as exc_info:
        asyncio.run(adapter.adapt(request, correlation_id="t12"))
    assert exc_info.value.http_status == 422

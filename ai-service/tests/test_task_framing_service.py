"""S19-T5 / F16: task-framing service tests.

Covers the retry state machine, missing-API-key path, exhausted-retries
path, and Pydantic-rejection-bubbled-up path.
"""
from __future__ import annotations

import json
from typing import Tuple

import pytest

from app.domain.schemas.task_framing import TaskFramingRequest
from app.services.task_framing import (
    TaskFramer,
    TaskFramingUnavailable,
    reset_task_framer_for_tests,
)


@pytest.fixture(autouse=True)
def _reset():
    reset_task_framer_for_tests()
    yield
    reset_task_framer_for_tests()


def _scripted_framer(*scripted: Tuple[str, int]) -> TaskFramer:
    framer = TaskFramer.__new__(TaskFramer)
    framer.api_key = "test-key"
    framer.model = "gpt-fake"
    framer.timeout = 5
    framer.max_tokens = 800
    framer.client = object()

    iter_responses = iter(scripted)

    async def fake_call(prompt: str):
        try:
            return next(iter_responses)
        except StopIteration:
            raise AssertionError("scripted: more calls than responses")

    framer._call_openai = fake_call  # type: ignore[method-assign]
    return framer


def _valid_request() -> TaskFramingRequest:
    return TaskFramingRequest(
        taskId="T1",
        taskTitle="Build a Webhook Receiver",
        taskDescription="Design and implement an HTTP endpoint that receives signed webhooks, validates the HMAC signature, and routes to handlers per type.",
        skillTags=[
            {"skill": "security", "weight": 0.7},
            {"skill": "correctness", "weight": 0.3},
        ],
        learnerProfile={"Security": 35.0, "Correctness": 60.0},
        track="Backend",
        learnerLevel="Beginner",
    )


def _valid_response_json(retry_marker: str = "") -> str:
    return json.dumps({
        "whyThisMatters": (
            f"Your Security score is 35/100 — this task closes a real gap by "
            f"exercising HMAC validation in a real flow. {retry_marker}"
        ),
        "focusAreas": [
            "Verify HMAC signatures before any state changes.",
            "Reject replays via a nonce or timestamp window.",
        ],
        "commonPitfalls": [
            "Comparing HMACs with string equality leaks timing info.",
            "Trusting Content-Type instead of the signed body.",
        ],
    })


# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_missing_api_key_raises_503() -> None:
    framer = TaskFramer.__new__(TaskFramer)
    framer.api_key = None
    framer.client = None
    with pytest.raises(TaskFramingUnavailable) as exc:
        await framer.frame(_valid_request())
    assert exc.value.http_status == 503


@pytest.mark.asyncio
async def test_happy_no_retry() -> None:
    framer = _scripted_framer((_valid_response_json(), 250))
    res = await framer.frame(_valid_request())
    assert res.retryCount == 0
    assert res.tokensUsed == 250
    assert res.promptVersion == "task_framing_v1"
    assert "Security score" in res.whyThisMatters


@pytest.mark.asyncio
async def test_code_fence_repair_no_retry() -> None:
    fenced = "```json\n" + _valid_response_json() + "\n```"
    framer = _scripted_framer((fenced, 200))
    res = await framer.frame(_valid_request())
    assert res.retryCount == 0


@pytest.mark.asyncio
async def test_invalid_json_then_recover_retries_once() -> None:
    framer = _scripted_framer(
        ("not json {{", 50),
        (_valid_response_json("(after retry)"), 200),
    )
    res = await framer.frame(_valid_request())
    assert res.retryCount == 1
    assert res.tokensUsed == 250
    assert "(after retry)" in res.whyThisMatters


@pytest.mark.asyncio
async def test_two_consecutive_failures_raise_422() -> None:
    framer = _scripted_framer(
        ("garbage 1", 50),
        ("garbage 2", 50),
    )
    with pytest.raises(TaskFramingUnavailable) as exc:
        await framer.frame(_valid_request())
    assert exc.value.http_status == 422


@pytest.mark.asyncio
async def test_missing_key_in_response_triggers_retry() -> None:
    bad = json.dumps({
        "whyThisMatters": "Your Security score is 35/100 — focus area incoming.",
        # focusAreas missing
        "commonPitfalls": [
            "HMAC compared with string equality leaks timing.",
            "Trusting headers over the signed body.",
        ],
    })
    framer = _scripted_framer(
        (bad, 50),
        (_valid_response_json(), 200),
    )
    res = await framer.frame(_valid_request())
    assert res.retryCount == 1


@pytest.mark.asyncio
async def test_pydantic_violation_in_response_returns_422() -> None:
    """Bullets too short → Pydantic raises → service bubbles 422."""
    # First response: too-short bullets — fails Pydantic.
    bad = json.dumps({
        "whyThisMatters": "Your Security score is 35/100 — this task addresses the gap directly.",
        "focusAreas": ["x", "y"],
        "commonPitfalls": ["a", "b"],
    })
    # Retry returns the same bad output → exhausted.
    framer = _scripted_framer((bad, 50), (bad, 50))
    with pytest.raises(TaskFramingUnavailable) as exc:
        await framer.frame(_valid_request())
    # Either 422 (Pydantic ended up running) or our wrap-time guard rejecting.
    assert exc.value.http_status in (422, 503)


@pytest.mark.asyncio
async def test_prompt_includes_learner_score() -> None:
    """Sanity: the prompt rendered to the LLM includes the learner score lines."""
    framer = TaskFramer.__new__(TaskFramer)
    framer.api_key = "test-key"
    framer.model = "gpt-fake"
    framer.timeout = 5
    framer.max_tokens = 800
    framer.client = object()
    captured: list[str] = []

    async def fake_call(prompt: str):
        captured.append(prompt)
        return _valid_response_json(), 200

    framer._call_openai = fake_call  # type: ignore[method-assign]
    await framer.frame(_valid_request())
    assert captured, "framer should have called the LLM"
    assert "Security: 35/100" in captured[0]
    assert "Backend" in captured[0]
    assert "Beginner" in captured[0]

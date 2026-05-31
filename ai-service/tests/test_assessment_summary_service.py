"""S17-T1: AssessmentSummarizer service tests — mocked OpenAI client.

Covers the retry-with-self-correction state machine + the 3-synthetic-
profile acceptance bar (Beginner / Intermediate / Advanced) without
burning real OpenAI tokens. The fake ``_call_openai`` returns scripted
responses so each retry path is exercised exactly once.

Acceptance bar (per `implementation-plan.md` S17-T1):
- integration test on 3 synthetic assessments (B/I/A) — all 3 must
  produce a valid 3-paragraph summary (covered here at the service
  layer with mocked OpenAI; live tested in walkthrough doc S17-T9).
- p95 latency <8s tested locally (covered separately via the live-OpenAI
  walkthrough; this file uses mocks so unit tests run in milliseconds).
"""
from __future__ import annotations

import json
from typing import Dict

import pytest

from app.domain.schemas.assessment_summary import AssessmentSummaryRequest
from app.services.assessment_summarizer import (
    AssessmentSummarizer,
    SummarizerUnavailable,
)


def _valid_summary_payload(seed: str = "default") -> Dict[str, str]:
    return {
        "strengthsParagraph": (
            f"Your {seed} candidate shows the strongest grasp on Object-Oriented Programming, "
            "where they answered correctly across multiple difficulty tiers. This signals a comfort "
            "with abstraction, encapsulation, and inheritance that translates directly into building "
            "service-layer code that other engineers can extend without surprise."
        ),
        "weaknessesParagraph": (
            "The lowest scoring area was Databases, suggesting that schema design and indexing "
            "concepts have not yet had hands-on practice. In a Backend role this gap shows up as "
            "queries that work in development against five rows but slow to a crawl when production "
            "data arrives, which is one of the most common production incidents for junior backend hires."
        ),
        "pathGuidanceParagraph": (
            "Start by working through a focused project that exercises both query design and indexing: "
            "model a small e-commerce orders table, populate it with a few hundred thousand rows of "
            "synthetic data, and write three queries that need composite indexes to perform reasonably. "
            "Then move on to a smaller round of OOP refactoring on an existing codebase, applying single "
            "responsibility and dependency injection. Finish each week by writing one summary paragraph "
            "of what you learned. You have a solid foundation already, and consistent practice will "
            "compound quickly."
        ),
    }


def _make_request(**overrides) -> AssessmentSummaryRequest:
    base = {
        "track": "Backend",
        "skillLevel": "Intermediate",
        "totalScore": 72.0,
        "durationSec": 1620,
        "categoryScores": [
            {"category": "DataStructures", "score": 78, "totalAnswered": 8, "correctCount": 6},
            {"category": "Algorithms", "score": 65, "totalAnswered": 7, "correctCount": 5},
            {"category": "OOP", "score": 85, "totalAnswered": 6, "correctCount": 5},
            {"category": "Databases", "score": 58, "totalAnswered": 5, "correctCount": 3},
            {"category": "Security", "score": 70, "totalAnswered": 4, "correctCount": 3},
        ],
    }
    base.update(overrides)
    return AssessmentSummaryRequest(**base)


def _make_summarizer() -> AssessmentSummarizer:
    """Build a summarizer with a dummy key so is_available=True without
    a real OpenAI client. All calls go through the monkey-patched
    ``_call_openai`` we set on the instance.
    """
    summ = AssessmentSummarizer.__new__(AssessmentSummarizer)
    summ.api_key = "test-key"
    summ.model = "gpt-fake"
    summ.timeout = 5
    summ.max_tokens = 800
    summ.client = object()
    return summ


# ---------------------------------------------------------------------------
# Happy paths
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_clean_json_parses_without_retry() -> None:
    summ = _make_summarizer()
    calls: list[str] = []

    async def fake_call(prompt: str):
        calls.append(prompt)
        return json.dumps(_valid_summary_payload("intermediate")), 1500

    summ._call_openai = fake_call  # type: ignore[method-assign]
    resp = await summ.summarize(_make_request())
    assert resp.promptVersion == "assessment_summary_v1"
    assert resp.retryCount == 0
    assert resp.tokensUsed == 1500
    assert "Object-Oriented Programming" in resp.strengthsParagraph
    assert "Databases" in resp.weaknessesParagraph
    assert "indexing" in resp.pathGuidanceParagraph
    assert len(calls) == 1


@pytest.mark.asyncio
async def test_markdown_fenced_json_repaired_in_place() -> None:
    summ = _make_summarizer()
    calls: list[str] = []

    async def fake_call(prompt: str):
        calls.append(prompt)
        body = json.dumps(_valid_summary_payload("fenced"))
        return f"```json\n{body}\n```", 1300

    summ._call_openai = fake_call  # type: ignore[method-assign]
    resp = await summ.summarize(_make_request())
    assert resp.retryCount == 0
    assert resp.tokensUsed == 1300
    assert len(calls) == 1


@pytest.mark.asyncio
async def test_prose_before_json_rescued_by_brace_extract() -> None:
    summ = _make_summarizer()
    calls: list[str] = []

    async def fake_call(prompt: str):
        calls.append(prompt)
        body = json.dumps(_valid_summary_payload("brace"))
        return f"Sure, here is the summary:\n\n{body}\n\nHope this helps!", 1100

    summ._call_openai = fake_call  # type: ignore[method-assign]
    resp = await summ.summarize(_make_request())
    assert resp.retryCount == 0, "balanced-brace extract is in-place — no retry"
    assert "Object-Oriented Programming" in resp.strengthsParagraph


# ---------------------------------------------------------------------------
# 3 synthetic-assessment bar (B/I/A) — S17-T1 acceptance crown jewel
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_beginner_profile_produces_valid_summary() -> None:
    """Synthetic Beginner: low overall + low across categories."""
    summ = _make_summarizer()

    async def fake_call(prompt: str):
        # Verify the prompt actually carries the candidate context
        assert "Beginner" in prompt
        assert "Python" in prompt
        return json.dumps(_valid_summary_payload("beginner")), 1200

    summ._call_openai = fake_call  # type: ignore[method-assign]

    req = _make_request(
        track="Python", skillLevel="Beginner", totalScore=42.0, durationSec=2100,
        categoryScores=[
            {"category": "DataStructures", "score": 35, "totalAnswered": 7, "correctCount": 2},
            {"category": "Algorithms", "score": 28, "totalAnswered": 6, "correctCount": 2},
            {"category": "OOP", "score": 50, "totalAnswered": 5, "correctCount": 3},
            {"category": "Databases", "score": 40, "totalAnswered": 6, "correctCount": 2},
            {"category": "Security", "score": 55, "totalAnswered": 6, "correctCount": 3},
        ],
    )
    resp = await summ.summarize(req)
    assert resp.retryCount == 0


@pytest.mark.asyncio
async def test_intermediate_profile_produces_valid_summary() -> None:
    """Synthetic Intermediate (the canonical test profile)."""
    summ = _make_summarizer()

    async def fake_call(prompt: str):
        assert "Intermediate" in prompt
        assert "Backend" in prompt
        return json.dumps(_valid_summary_payload("intermediate")), 1500

    summ._call_openai = fake_call  # type: ignore[method-assign]
    resp = await summ.summarize(_make_request())  # default = Backend / Intermediate / 72
    assert resp.retryCount == 0


@pytest.mark.asyncio
async def test_advanced_profile_produces_valid_summary() -> None:
    """Synthetic Advanced: high overall + strong across categories."""
    summ = _make_summarizer()

    async def fake_call(prompt: str):
        assert "Advanced" in prompt
        assert "FullStack" in prompt
        # The breakdown should list all 5 categories with high scores
        assert "Data Structures" in prompt
        assert "Security" in prompt
        return json.dumps(_valid_summary_payload("advanced")), 1700

    summ._call_openai = fake_call  # type: ignore[method-assign]

    req = _make_request(
        track="FullStack", skillLevel="Advanced", totalScore=88.0, durationSec=1320,
        categoryScores=[
            {"category": "DataStructures", "score": 95, "totalAnswered": 7, "correctCount": 7},
            {"category": "Algorithms", "score": 88, "totalAnswered": 6, "correctCount": 5},
            {"category": "OOP", "score": 92, "totalAnswered": 6, "correctCount": 6},
            {"category": "Databases", "score": 80, "totalAnswered": 5, "correctCount": 4},
            {"category": "Security", "score": 85, "totalAnswered": 6, "correctCount": 5},
        ],
    )
    resp = await summ.summarize(req)
    assert resp.retryCount == 0


# ---------------------------------------------------------------------------
# Retry paths
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_malformed_json_triggers_one_retry_and_recovers() -> None:
    """Acceptance bar: invalid first response triggers self-correction retry."""
    summ = _make_summarizer()
    calls: list[str] = []

    async def fake_call(prompt: str):
        calls.append(prompt)
        if len(calls) == 1:
            return "this is not JSON, just prose with no braces anywhere.", 200
        return json.dumps(_valid_summary_payload("retry")), 1300

    summ._call_openai = fake_call  # type: ignore[method-assign]
    resp = await summ.summarize(_make_request())
    assert len(calls) == 2, "exactly one retry"
    assert "RETRY (your previous response failed validation)" in calls[1]
    assert resp.retryCount == 1
    assert resp.tokensUsed == 200 + 1300


@pytest.mark.asyncio
async def test_missing_key_triggers_retry() -> None:
    """If the model omits one of the three required keys, the retry kicks in."""
    summ = _make_summarizer()
    calls: list[str] = []

    async def fake_call(prompt: str):
        calls.append(prompt)
        if len(calls) == 1:
            payload = _valid_summary_payload("missing")
            del payload["pathGuidanceParagraph"]
            return json.dumps(payload), 800
        return json.dumps(_valid_summary_payload("retry")), 1400

    summ._call_openai = fake_call  # type: ignore[method-assign]
    resp = await summ.summarize(_make_request())
    assert resp.retryCount == 1
    assert "missing required key: pathGuidanceParagraph" in calls[1]


@pytest.mark.asyncio
async def test_short_paragraph_triggers_retry() -> None:
    """A paragraph below the 50-char floor is treated as truncation."""
    summ = _make_summarizer()
    calls: list[str] = []

    async def fake_call(prompt: str):
        calls.append(prompt)
        if len(calls) == 1:
            payload = _valid_summary_payload("short")
            payload["weaknessesParagraph"] = "too short"
            return json.dumps(payload), 600
        return json.dumps(_valid_summary_payload("retry")), 1400

    summ._call_openai = fake_call  # type: ignore[method-assign]
    resp = await summ.summarize(_make_request())
    assert resp.retryCount == 1
    assert "weaknessesParagraph is" in calls[1]
    assert "minimum 50 required" in calls[1]


@pytest.mark.asyncio
async def test_two_consecutive_failures_surface_422() -> None:
    summ = _make_summarizer()
    calls: list[str] = []

    async def fake_call(prompt: str):
        calls.append(prompt)
        return "still not JSON, even after retry.", 250

    summ._call_openai = fake_call  # type: ignore[method-assign]
    with pytest.raises(SummarizerUnavailable) as exc:
        await summ.summarize(_make_request())
    assert exc.value.http_status == 422
    assert "invalid output after retry" in str(exc.value)
    assert len(calls) == 2


# ---------------------------------------------------------------------------
# Unavailability paths
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_missing_api_key_raises_503() -> None:
    summ = AssessmentSummarizer.__new__(AssessmentSummarizer)
    summ.api_key = None
    summ.model = "gpt-fake"
    summ.timeout = 5
    summ.max_tokens = 800
    summ.client = None

    with pytest.raises(SummarizerUnavailable) as exc:
        await summ.summarize(_make_request())
    assert exc.value.http_status == 503
    assert "API key" in str(exc.value)


# ---------------------------------------------------------------------------
# Prompt content sanity — make sure the breakdown reaches the LLM
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_prompt_includes_category_breakdown() -> None:
    """The interpolated prompt body must contain the human-readable category labels and scores."""
    summ = _make_summarizer()
    captured: list[str] = []

    async def fake_call(prompt: str):
        captured.append(prompt)
        return json.dumps(_valid_summary_payload("breakdown")), 1000

    summ._call_openai = fake_call  # type: ignore[method-assign]
    await summ.summarize(_make_request())
    prompt_body = captured[0]
    assert "Data Structures: 78/100" in prompt_body
    assert "Algorithms: 65/100" in prompt_body
    assert "Object-Oriented Programming: 85/100" in prompt_body
    assert "Databases: 58/100" in prompt_body
    assert "Security: 70/100" in prompt_body
    assert "Backend" in prompt_body
    assert "Intermediate" in prompt_body


@pytest.mark.asyncio
async def test_prompt_marks_unassessed_category() -> None:
    """A category with totalAnswered=0 should render as '(not assessed)'."""
    summ = _make_summarizer()
    captured: list[str] = []

    async def fake_call(prompt: str):
        captured.append(prompt)
        return json.dumps(_valid_summary_payload("partial")), 1000

    summ._call_openai = fake_call  # type: ignore[method-assign]
    req = _make_request(categoryScores=[
        {"category": "DataStructures", "score": 78, "totalAnswered": 8, "correctCount": 6},
        {"category": "Security", "score": 70, "totalAnswered": 4, "correctCount": 3},
    ])
    await summ.summarize(req)
    prompt_body = captured[0]
    # Two categories are present
    assert "Data Structures: 78/100" in prompt_body
    assert "Security: 70/100" in prompt_body
    # The other three render as not assessed
    assert "Algorithms: (not assessed)" in prompt_body
    assert "Object-Oriented Programming: (not assessed)" in prompt_body
    assert "Databases: (not assessed)" in prompt_body

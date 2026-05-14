"""S16-T1: QuestionGenerator service tests — mocked OpenAI client.

Covers the retry-with-self-correction state machine without burning real
OpenAI tokens. The fake ``_call_openai`` returns scripted responses so
each retry path is exercised exactly once.

Acceptance bar (per `implementation-plan.md` S16-T1):
- happy path: valid JSON parses on first try, retry=0
- markdown-fenced JSON: repaired in-place, retry=0
- malformed JSON: triggers 1 retry, recovers, retry=1
- two consecutive failures: surfaces 422 cleanly
- count mismatch in valid JSON: triggers retry
"""
from __future__ import annotations

import json

import pytest

from app.domain.schemas.generator import GenerateQuestionsRequest
from app.services.question_generator import (
    GeneratorUnavailable,
    QuestionGenerator,
)


def _valid_draft(category: str = "DataStructures", difficulty: int = 1, idx: int = 0) -> dict:
    return {
        "questionText": f"Test question {idx} for {category} at difficulty {difficulty}?",
        "codeSnippet": None,
        "codeLanguage": None,
        "options": [
            f"Option A for {idx}",
            f"Option B for {idx}",
            f"Option C for {idx}",
            f"Option D for {idx}",
        ],
        "correctAnswer": "A",
        "explanation": "Option A is correct because of the underlying property; B is a common misconception.",
        "irtA": 1.0,
        "irtB": 0.0,
        "rationale": "AI-generated discrimination defaults",
        "category": category,
        "difficulty": difficulty,
    }


def _valid_payload(count: int, category: str = "DataStructures", difficulty: int = 1) -> dict:
    return {"drafts": [_valid_draft(category, difficulty, i) for i in range(count)]}


def _make_generator() -> QuestionGenerator:
    """Build a generator with a dummy key so is_available=True without
    a real OpenAI client. All calls go through the monkey-patched
    ``_call_openai`` we set on the instance.
    """
    gen = QuestionGenerator.__new__(QuestionGenerator)
    gen.api_key = "test-key"
    gen.model = "gpt-fake"
    gen.timeout = 5
    gen.max_tokens = 16384
    gen.client = object()  # sentinel — never actually invoked
    return gen


# ---------------------------------------------------------------------------
# Happy paths
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_clean_json_parses_without_retry() -> None:
    gen = _make_generator()
    calls: list[str] = []

    async def fake_call(prompt: str):
        calls.append(prompt)
        return json.dumps(_valid_payload(count=3)), 2000

    gen._call_openai = fake_call  # type: ignore[method-assign]
    resp = await gen.generate(GenerateQuestionsRequest(
        category="DataStructures", difficulty=1, count=3,
    ))
    assert resp.promptVersion == "generate_questions_v1"
    assert resp.retryCount == 0
    assert resp.tokensUsed == 2000
    assert len(resp.drafts) == 3
    assert resp.batchId  # non-empty
    assert len(calls) == 1


@pytest.mark.asyncio
async def test_markdown_fenced_json_repaired_in_place() -> None:
    gen = _make_generator()
    calls: list[str] = []

    async def fake_call(prompt: str):
        calls.append(prompt)
        body = json.dumps(_valid_payload(count=2))
        return f"```json\n{body}\n```", 1500

    gen._call_openai = fake_call  # type: ignore[method-assign]
    resp = await gen.generate(GenerateQuestionsRequest(
        category="DataStructures", difficulty=1, count=2,
    ))
    assert resp.retryCount == 0
    assert resp.tokensUsed == 1500
    assert len(calls) == 1, "fence-strip is in-place — no retry"


@pytest.mark.asyncio
async def test_prose_before_json_rescued_by_brace_extract() -> None:
    gen = _make_generator()
    calls: list[str] = []

    async def fake_call(prompt: str):
        calls.append(prompt)
        body = json.dumps(_valid_payload(count=1))
        return f"Sure! Here are the questions:\n\n{body}\n\nLet me know if you'd like different ones.", 1200

    gen._call_openai = fake_call  # type: ignore[method-assign]
    resp = await gen.generate(GenerateQuestionsRequest(
        category="DataStructures", difficulty=1, count=1,
    ))
    assert resp.retryCount == 0, "balanced-brace extract is in-place — no retry"
    assert len(resp.drafts) == 1


# ---------------------------------------------------------------------------
# Retry paths — the crown-jewel test from S16-T1 acceptance criteria
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_malformed_json_triggers_one_retry_and_recovers() -> None:
    """Acceptance bar (S16-T1): 'retry path triggered by synthetic invalid
    response → recovers'. First call returns unparseable garbage; second
    call returns a valid payload. Generator must succeed with retry=1.
    """
    gen = _make_generator()
    calls: list[str] = []

    async def fake_call(prompt: str):
        calls.append(prompt)
        if len(calls) == 1:
            return "this is not JSON, just prose with no braces anywhere.", 300
        return json.dumps(_valid_payload(count=2)), 2200

    gen._call_openai = fake_call  # type: ignore[method-assign]
    resp = await gen.generate(GenerateQuestionsRequest(
        category="DataStructures", difficulty=1, count=2,
    ))
    assert len(calls) == 2, "exactly one retry"
    assert "RETRY (your previous response failed validation)" in calls[1]
    assert resp.retryCount == 1
    assert resp.tokensUsed == 300 + 2200, "token usage from both calls summed"
    assert len(resp.drafts) == 2


@pytest.mark.asyncio
async def test_count_mismatch_triggers_retry() -> None:
    """If the model returns the wrong number of drafts (a soft schema fail),
    the retry path kicks in — the schema validates count strictly.
    """
    gen = _make_generator()
    calls: list[str] = []

    async def fake_call(prompt: str):
        calls.append(prompt)
        if len(calls) == 1:
            # Returns 1 draft when 3 were requested.
            return json.dumps(_valid_payload(count=1)), 500
        return json.dumps(_valid_payload(count=3)), 1800

    gen._call_openai = fake_call  # type: ignore[method-assign]
    resp = await gen.generate(GenerateQuestionsRequest(
        category="DataStructures", difficulty=1, count=3,
    ))
    assert resp.retryCount == 1
    assert "expected 3 drafts, got 1" in calls[1]
    assert len(resp.drafts) == 3


@pytest.mark.asyncio
async def test_two_consecutive_failures_surface_422() -> None:
    """When the retry also fails the generator raises a clean
    GeneratorUnavailable with http_status=422 (mapped to 422 by the route).
    """
    gen = _make_generator()
    calls: list[str] = []

    async def fake_call(prompt: str):
        calls.append(prompt)
        return "still not JSON, even after retry.", 250

    gen._call_openai = fake_call  # type: ignore[method-assign]
    with pytest.raises(GeneratorUnavailable) as exc:
        await gen.generate(GenerateQuestionsRequest(
            category="DataStructures", difficulty=1, count=2,
        ))
    assert exc.value.http_status == 422
    assert "invalid output after retry" in str(exc.value)
    assert len(calls) == 2, "exactly two attempts before giving up"


# ---------------------------------------------------------------------------
# Specific draft-level validation triggers retry
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_category_mismatch_in_draft_triggers_retry() -> None:
    """Belt-and-suspenders: if the model echoes the wrong category on a
    draft (a soft drift that wouldn't fail Pydantic alone since both
    values are valid categories), the service must reject the response.
    """
    gen = _make_generator()
    calls: list[str] = []

    async def fake_call(prompt: str):
        calls.append(prompt)
        if len(calls) == 1:
            # Sneak in an OOP draft when DataStructures was requested.
            bad = _valid_payload(count=1, category="OOP", difficulty=1)
            return json.dumps(bad), 400
        return json.dumps(_valid_payload(count=1)), 800

    gen._call_openai = fake_call  # type: ignore[method-assign]
    resp = await gen.generate(GenerateQuestionsRequest(
        category="DataStructures", difficulty=1, count=1,
    ))
    assert resp.retryCount == 1
    assert "category=OOP does not match request.category=DataStructures" in calls[1]


# ---------------------------------------------------------------------------
# Unavailability paths
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_missing_api_key_raises_503() -> None:
    """Without an OpenAI client the generator returns 503 — no calls made."""
    gen = QuestionGenerator.__new__(QuestionGenerator)
    gen.api_key = None
    gen.model = "gpt-fake"
    gen.timeout = 5
    gen.max_tokens = 16384
    gen.client = None

    with pytest.raises(GeneratorUnavailable) as exc:
        await gen.generate(GenerateQuestionsRequest(
            category="DataStructures", difficulty=1, count=1,
        ))
    assert exc.value.http_status == 503
    assert "API key" in str(exc.value)

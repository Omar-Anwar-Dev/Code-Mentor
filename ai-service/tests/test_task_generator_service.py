"""S18-T3: TaskGenerator service tests — mocked OpenAI client."""
from __future__ import annotations

import json

import pytest

from app.domain.schemas.task_generator import GenerateTasksRequest
from app.services.task_generator import (
    TaskGenerator,
    TaskGeneratorUnavailable,
)


def _valid_draft(idx: int = 0, track: str = "Backend", difficulty: int = 2) -> dict:
    return {
        "title": f"Build URL shortener {idx} with analytics",
        "description": (
            "Build a CRUD REST API + 6-char short URL generator + redirect endpoint. "
            "Support custom aliases. Track click counts per short URL with timestamp + referrer. "
            "Expose a basic stats endpoint that returns the top 5 most-clicked links."
        ),
        "acceptanceCriteria": "- All endpoints return 2xx for valid input\n- Tests cover the happy path",
        "deliverables": "GitHub URL with README + tests",
        "difficulty": difficulty,
        "category": "Algorithms",
        "track": track,
        "expectedLanguage": "Python",
        "estimatedHours": 6 if difficulty == 2 else 4,
        "prerequisites": [],
        "skillTags": [{"skill": "correctness", "weight": 0.6}, {"skill": "design", "weight": 0.4}],
        "learningGain": {"correctness": 0.4, "design": 0.2},
        "rationale": f"Real-world full-cycle CRUD task that exercises both correctness and design at diff={difficulty}.",
    }


def _valid_payload(count: int, track: str = "Backend", difficulty: int = 2) -> dict:
    return {"drafts": [_valid_draft(i, track, difficulty) for i in range(count)]}


def _make_generator() -> TaskGenerator:
    gen = TaskGenerator.__new__(TaskGenerator)
    gen.api_key = "test-key"
    gen.model = "gpt-fake"
    gen.timeout = 5
    gen.max_tokens = 16384
    gen.client = object()
    return gen


def _make_request(**overrides) -> GenerateTasksRequest:
    base = {
        "track": "Backend",
        "difficulty": 2,
        "count": 1,
        "focusSkills": ["correctness", "design"],
        "existingTitles": [],
    }
    base.update(overrides)
    return GenerateTasksRequest(**base)


# ---------------------------------------------------------------------------
# Happy paths
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_clean_json_parses_without_retry() -> None:
    gen = _make_generator()
    calls: list[str] = []

    async def fake_call(prompt: str):
        calls.append(prompt)
        return json.dumps(_valid_payload(count=2)), 1500

    gen._call_openai = fake_call  # type: ignore[method-assign]
    resp = await gen.generate(_make_request(count=2))
    assert resp.promptVersion == "generate_tasks_v1"
    assert resp.retryCount == 0
    assert len(resp.drafts) == 2


@pytest.mark.asyncio
async def test_markdown_fenced_json_repaired_in_place() -> None:
    gen = _make_generator()

    async def fake_call(prompt: str):
        body = json.dumps(_valid_payload(count=1))
        return f"```json\n{body}\n```", 1200

    gen._call_openai = fake_call  # type: ignore[method-assign]
    resp = await gen.generate(_make_request(count=1))
    assert resp.retryCount == 0


# ---------------------------------------------------------------------------
# Retry paths
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_malformed_json_triggers_one_retry_and_recovers() -> None:
    gen = _make_generator()
    calls: list[str] = []

    async def fake_call(prompt: str):
        calls.append(prompt)
        if len(calls) == 1:
            return "this is prose, not JSON.", 200
        return json.dumps(_valid_payload(count=1)), 1200

    gen._call_openai = fake_call  # type: ignore[method-assign]
    resp = await gen.generate(_make_request(count=1))
    assert len(calls) == 2
    assert "RETRY (your previous response failed validation)" in calls[1]
    assert resp.retryCount == 1


@pytest.mark.asyncio
async def test_track_mismatch_triggers_retry() -> None:
    gen = _make_generator()
    calls: list[str] = []

    async def fake_call(prompt: str):
        calls.append(prompt)
        if len(calls) == 1:
            # Sneak in a Python track when Backend was requested.
            return json.dumps(_valid_payload(count=1, track="Python")), 1100
        return json.dumps(_valid_payload(count=1, track="Backend")), 1200

    gen._call_openai = fake_call  # type: ignore[method-assign]
    resp = await gen.generate(_make_request(track="Backend", count=1))
    assert resp.retryCount == 1
    assert "track=Python does not match request.track=Backend" in calls[1]


@pytest.mark.asyncio
async def test_count_mismatch_triggers_retry() -> None:
    gen = _make_generator()
    calls: list[str] = []

    async def fake_call(prompt: str):
        calls.append(prompt)
        if len(calls) == 1:
            return json.dumps(_valid_payload(count=1)), 800
        return json.dumps(_valid_payload(count=3)), 2200

    gen._call_openai = fake_call  # type: ignore[method-assign]
    resp = await gen.generate(_make_request(count=3))
    assert resp.retryCount == 1
    assert "expected 3 drafts, got 1" in calls[1]


@pytest.mark.asyncio
async def test_two_consecutive_failures_surface_422() -> None:
    gen = _make_generator()

    async def fake_call(prompt: str):
        return "still not JSON", 250

    gen._call_openai = fake_call  # type: ignore[method-assign]
    with pytest.raises(TaskGeneratorUnavailable) as exc:
        await gen.generate(_make_request(count=1))
    assert exc.value.http_status == 422


# ---------------------------------------------------------------------------
# Unavailability
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_missing_api_key_raises_503() -> None:
    gen = TaskGenerator.__new__(TaskGenerator)
    gen.api_key = None
    gen.model = "gpt-fake"
    gen.timeout = 5
    gen.max_tokens = 16384
    gen.client = None

    with pytest.raises(TaskGeneratorUnavailable) as exc:
        await gen.generate(_make_request(count=1))
    assert exc.value.http_status == 503


# ---------------------------------------------------------------------------
# Prompt content sanity
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_prompt_includes_existing_titles_dedup_hints() -> None:
    gen = _make_generator()
    captured: list[str] = []

    async def fake_call(prompt: str):
        captured.append(prompt)
        return json.dumps(_valid_payload(count=1)), 1200

    gen._call_openai = fake_call  # type: ignore[method-assign]
    await gen.generate(_make_request(
        existingTitles=["Build a CRUD REST API for blog posts", "Implement a hashtable from scratch"],
    ))
    prompt_body = captured[0]
    assert "Build a CRUD REST API for blog posts" in prompt_body
    assert "Implement a hashtable from scratch" in prompt_body
    assert "(none —" not in prompt_body

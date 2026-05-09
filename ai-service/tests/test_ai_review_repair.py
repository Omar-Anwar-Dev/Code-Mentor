"""S6-T2: response repair + retry-once + fail-clean for AIReviewer.

Uses a fake `_call_openai` that returns scripted responses so we can exercise
parse failures, fence-stripping, and the single-retry path without burning
OpenAI tokens. Each test verifies an exact, observable behaviour.
"""
import asyncio
import json

import pytest

from app.services import ai_reviewer as ar
from app.services.ai_reviewer import AIReviewer
from app.services.prompts import PROMPT_VERSION


_VALID_PAYLOAD = {
    "overallScore": 78,
    "scores": {
        "correctness": 80,
        "readability": 75,
        "security": 70,
        "performance": 80,
        "design": 85,
    },
    "strengths": ["Good naming"],
    "weaknesses": ["Missing tests"],
    "recommendations": [{"priority": "medium", "category": "design", "message": "Add unit tests."}],
    "summary": "Solid effort with room for improvement.",
}


def _ok_response(content: str | dict, tokens: int = 1234) -> dict:
    if isinstance(content, dict):
        content = json.dumps(content)
    return {"content": content, "model": "gpt-fake", "tokens": tokens}


def _make_reviewer() -> AIReviewer:
    """Construct a reviewer with a dummy API key so `is_available` is True
    without doing any real OpenAI client calls — all calls go through the
    fake `_call_openai` we monkey-patch on the instance.
    """
    reviewer = AIReviewer.__new__(AIReviewer)
    reviewer.api_key = "test-key"
    reviewer.model = "gpt-fake"
    reviewer.timeout = 5
    reviewer.max_tokens = 1024
    # We never actually invoke the OpenAI SDK in these tests.
    reviewer.client = object()
    return reviewer


@pytest.mark.asyncio
async def test_clean_json_parses_without_retry():
    reviewer = _make_reviewer()
    calls = []

    async def fake_call(prompt: str) -> dict:
        calls.append(prompt)
        return _ok_response(_VALID_PAYLOAD, tokens=2000)

    reviewer._call_openai = fake_call
    result = await reviewer.review_code(code_files=[{"path": "a.py", "content": "x=1\n", "language": "python"}])

    assert result.available is True
    assert result.tokens_used == 2000
    assert result.scores["correctness"] == 80
    assert result.prompt_version == PROMPT_VERSION
    assert len(calls) == 1, "valid response should not trigger a retry"


@pytest.mark.asyncio
async def test_markdown_fenced_json_repaired_in_place():
    reviewer = _make_reviewer()
    calls = []

    async def fake_call(prompt: str) -> dict:
        calls.append(prompt)
        return _ok_response(f"```json\n{json.dumps(_VALID_PAYLOAD)}\n```", tokens=1500)

    reviewer._call_openai = fake_call
    result = await reviewer.review_code(code_files=[{"path": "a.py", "content": "x=1\n", "language": "python"}])

    assert result.available is True
    assert result.tokens_used == 1500
    assert len(calls) == 1, "fence-strip is in-place — no retry needed"


@pytest.mark.asyncio
async def test_malformed_json_triggers_one_retry_and_succeeds():
    reviewer = _make_reviewer()
    calls = []

    async def fake_call(prompt: str) -> dict:
        calls.append(prompt)
        if len(calls) == 1:
            # Garbage that no repair pass can rescue.
            return _ok_response("not json at all — definitely not parseable", tokens=200)
        # Retry succeeds with valid JSON.
        return _ok_response(_VALID_PAYLOAD, tokens=2000)

    reviewer._call_openai = fake_call
    result = await reviewer.review_code(code_files=[{"path": "a.py", "content": "x=1\n", "language": "python"}])

    assert result.available is True
    assert len(calls) == 2, "exactly one retry"
    # Retry-reminder was appended to second prompt.
    assert "RETRY" in calls[1]
    # Token usage from both calls is summed so cost is honest.
    assert result.tokens_used == 200 + 2000


@pytest.mark.asyncio
async def test_two_consecutive_failures_return_unavailable_cleanly():
    reviewer = _make_reviewer()
    calls = []

    async def fake_call(prompt: str) -> dict:
        calls.append(prompt)
        return _ok_response("totally invalid — no JSON here either", tokens=100)

    reviewer._call_openai = fake_call
    result = await reviewer.review_code(code_files=[{"path": "a.py", "content": "x=1\n", "language": "python"}])

    assert result.available is False
    assert result.error == "Failed to parse AI response after one retry"
    assert len(calls) == 2, "exactly two attempts (initial + one retry) before giving up"
    # Even on failure, we still surface the prompt version + zero tokens for the unavailable shape.
    assert result.prompt_version == PROMPT_VERSION


@pytest.mark.asyncio
async def test_prose_wrapping_a_json_block_is_extracted():
    reviewer = _make_reviewer()
    calls = []

    async def fake_call(prompt: str) -> dict:
        calls.append(prompt)
        # Model occasionally prepends prose; the largest balanced {...} should still parse.
        return _ok_response(
            f"Sure! Here is your review:\n\n{json.dumps(_VALID_PAYLOAD)}\n\nLet me know if you need clarification.",
            tokens=1800,
        )

    reviewer._call_openai = fake_call
    result = await reviewer.review_code(code_files=[{"path": "a.py", "content": "x=1\n", "language": "python"}])

    assert result.available is True
    assert len(calls) == 1, "extraction happens in-place, no retry"
    assert result.scores["security"] == 70


# ----- Pure-helper tests (no AIReviewer needed) -----------------------------

def test_strip_code_fences_handles_both_json_and_unmarked():
    fenced_json = "```json\n{\"a\": 1}\n```"
    fenced_plain = "```\n{\"a\": 1}\n```"
    assert ar._strip_code_fences(fenced_json) == '{"a": 1}'
    assert ar._strip_code_fences(fenced_plain) == '{"a": 1}'
    assert ar._strip_code_fences('{"a": 1}') == '{"a": 1}'  # untouched when no fences


def test_extract_json_block_finds_largest_balanced_object():
    haystack = 'noise {} noise {"big": {"nested": true, "x": 1}} trailing prose'
    extracted = ar._extract_json_block(haystack)
    assert extracted == '{"big": {"nested": true, "x": 1}}'


def test_extract_json_block_handles_braces_inside_strings():
    haystack = 'prefix {"text": "this } is { not a brace", "n": 1} suffix'
    extracted = ar._extract_json_block(haystack)
    assert extracted is not None
    parsed = json.loads(extracted)
    assert parsed == {"text": "this } is { not a brace", "n": 1}

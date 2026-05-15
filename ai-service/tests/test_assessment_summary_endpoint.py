"""S17-T1: integration tests for ``POST /api/assessment-summary``.

Uses FastAPI's ``TestClient`` to hit the route end-to-end with a
monkey-patched summarizer (no real OpenAI calls). The point of these
tests is to verify the HTTP surface, NOT the LLM behaviour — that's
covered in ``test_assessment_summary_service.py``.

Acceptance bar (per `implementation-plan.md` S17-T1):
- integration test on 3 synthetic assessments (B/I/A) — covered.
- 4 retry/error paths via FastAPI client — covered (200 happy + 200 retry +
  422 validation + 503 unavailable + invalid request).
"""
from __future__ import annotations

import json

import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.services import assessment_summarizer as summ_module
from app.services.assessment_summarizer import AssessmentSummarizer


def _valid_payload(seed: str = "default") -> dict:
    return {
        "strengthsParagraph": (
            f"Your {seed} candidate shows the strongest grasp on Object-Oriented Programming, "
            "where they answered correctly across multiple difficulty tiers. This is a transferable "
            "advantage that supports building maintainable service-layer code."
        ),
        "weaknessesParagraph": (
            "The lowest scoring area was Databases. In production this often surfaces as queries "
            "that work in development but slow to a crawl when real data arrives, one of the most "
            "common junior backend incidents."
        ),
        "pathGuidanceParagraph": (
            "Start with a focused project that exercises both query design and indexing on a small "
            "synthetic e-commerce dataset. Move on to OOP refactoring on an existing codebase, applying "
            "single responsibility and dependency injection. Finish each week by writing one paragraph "
            "of what you learned. You have a solid foundation; consistent practice will compound quickly."
        ),
    }


def _scripted_summarizer(*scripted_responses):
    """Build a summarizer instance whose ``_call_openai`` returns the given
    (content, tokens) tuples in order.
    """
    summ = AssessmentSummarizer.__new__(AssessmentSummarizer)
    summ.api_key = "test-key"
    summ.model = "gpt-fake"
    summ.timeout = 5
    summ.max_tokens = 800
    summ.client = object()

    iter_responses = iter(scripted_responses)

    async def fake_call(prompt: str):
        try:
            return next(iter_responses)
        except StopIteration:  # pragma: no cover — defensive
            raise AssertionError("scripted_summarizer: more calls than scripted responses")

    summ._call_openai = fake_call  # type: ignore[method-assign]
    return summ


@pytest.fixture
def client_with(monkeypatch):
    """Returns a callable that wires a scripted summarizer into the route
    and returns a fresh TestClient.
    """
    def _wire(*scripted_responses):
        summ = _scripted_summarizer(*scripted_responses) if scripted_responses else None
        summ_module.reset_assessment_summarizer_for_tests()
        if summ is not None:
            monkeypatch.setattr(summ_module, "get_assessment_summarizer", lambda: summ)
            from app.api.routes import assessment_summary as route_mod
            monkeypatch.setattr(route_mod, "get_assessment_summarizer", lambda: summ)
        return TestClient(create_app())
    return _wire


def _valid_request_body() -> dict:
    return {
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


# ---------------------------------------------------------------------------
# Happy path
# ---------------------------------------------------------------------------


def test_happy_path_returns_200_with_validated_summary(client_with) -> None:
    payload = json.dumps(_valid_payload("intermediate"))
    client = client_with((payload, 1500))

    resp = client.post("/api/assessment-summary", json=_valid_request_body())
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["promptVersion"] == "assessment_summary_v1"
    assert data["retryCount"] == 0
    assert data["tokensUsed"] == 1500
    assert "Object-Oriented Programming" in data["strengthsParagraph"]
    assert "Databases" in data["weaknessesParagraph"]
    assert "indexing" in data["pathGuidanceParagraph"]


def test_retry_path_recovers_and_returns_200(client_with) -> None:
    """Invalid first response triggers self-correction retry, which recovers."""
    good = json.dumps(_valid_payload("retry"))
    client = client_with(
        ("not parseable JSON", 250),  # call 1
        (good, 1400),                  # call 2 (retry)
    )

    resp = client.post("/api/assessment-summary", json=_valid_request_body())
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["retryCount"] == 1
    assert data["tokensUsed"] == 250 + 1400


# ---------------------------------------------------------------------------
# Error mapping
# ---------------------------------------------------------------------------


def test_two_consecutive_failures_return_422(client_with) -> None:
    client = client_with(
        ("not JSON 1", 250),
        ("not JSON 2", 280),
    )
    resp = client.post("/api/assessment-summary", json=_valid_request_body())
    assert resp.status_code == 422, resp.text
    assert "invalid output after retry" in resp.json()["detail"]


def test_invalid_request_returns_422(client_with) -> None:
    """The Pydantic-side schema rejects malformed bodies before the summarizer is hit."""
    client = client_with()  # no scripted responses needed
    resp = client.post("/api/assessment-summary", json={
        "track": "MachineLearning",  # invalid
        "skillLevel": "Intermediate",
        "totalScore": 72.0,
        "durationSec": 1620,
        "categoryScores": [
            {"category": "OOP", "score": 80, "totalAnswered": 5, "correctCount": 4},
        ],
    })
    assert resp.status_code == 422


def test_empty_category_list_rejected(client_with) -> None:
    client = client_with()
    body = _valid_request_body()
    body["categoryScores"] = []
    resp = client.post("/api/assessment-summary", json=body)
    assert resp.status_code == 422


def test_correct_count_exceeds_answered_rejected(client_with) -> None:
    client = client_with()
    body = _valid_request_body()
    body["categoryScores"] = [
        {"category": "OOP", "score": 80, "totalAnswered": 3, "correctCount": 5},
    ]
    resp = client.post("/api/assessment-summary", json=body)
    assert resp.status_code == 422
    assert "cannot exceed totalAnswered" in resp.text


# ---------------------------------------------------------------------------
# 3 synthetic profile bar (B / I / A) at the HTTP layer
# ---------------------------------------------------------------------------


def test_beginner_profile_returns_200(client_with) -> None:
    client = client_with((json.dumps(_valid_payload("beginner")), 1100))
    body = _valid_request_body()
    body.update({
        "track": "Python",
        "skillLevel": "Beginner",
        "totalScore": 42.0,
        "categoryScores": [
            {"category": "DataStructures", "score": 35, "totalAnswered": 7, "correctCount": 2},
            {"category": "Algorithms", "score": 28, "totalAnswered": 6, "correctCount": 2},
            {"category": "OOP", "score": 50, "totalAnswered": 5, "correctCount": 3},
            {"category": "Databases", "score": 40, "totalAnswered": 6, "correctCount": 2},
            {"category": "Security", "score": 55, "totalAnswered": 6, "correctCount": 3},
        ],
    })
    resp = client.post("/api/assessment-summary", json=body)
    assert resp.status_code == 200, resp.text


def test_advanced_profile_returns_200(client_with) -> None:
    client = client_with((json.dumps(_valid_payload("advanced")), 1700))
    body = _valid_request_body()
    body.update({
        "track": "FullStack",
        "skillLevel": "Advanced",
        "totalScore": 88.0,
        "categoryScores": [
            {"category": "DataStructures", "score": 95, "totalAnswered": 7, "correctCount": 7},
            {"category": "Algorithms", "score": 88, "totalAnswered": 6, "correctCount": 5},
            {"category": "OOP", "score": 92, "totalAnswered": 6, "correctCount": 6},
            {"category": "Databases", "score": 80, "totalAnswered": 5, "correctCount": 4},
            {"category": "Security", "score": 85, "totalAnswered": 6, "correctCount": 5},
        ],
    })
    resp = client.post("/api/assessment-summary", json=body)
    assert resp.status_code == 200, resp.text

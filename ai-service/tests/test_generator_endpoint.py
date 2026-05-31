"""S16-T1: integration tests for ``POST /api/generate-questions``.

Uses FastAPI's ``TestClient`` to hit the route end-to-end with a
monkey-patched generator (no real OpenAI calls). The point of these
tests is to verify the HTTP surface, NOT the LLM behaviour — that's
covered in ``test_generator_service.py``.

Acceptance bar (per `implementation-plan.md` S16-T1):
- 4 unit tests + 1 integration test via FastAPI client.
- Retry path triggered by synthetic invalid response → recovers.
"""
from __future__ import annotations

import json

import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.services import question_generator as qg_module
from app.services.question_generator import QuestionGenerator


def _valid_draft(idx: int = 0) -> dict:
    return {
        "questionText": f"Test question {idx} about hash tables?",
        "codeSnippet": None,
        "codeLanguage": None,
        "options": [f"Opt A {idx}", f"Opt B {idx}", f"Opt C {idx}", f"Opt D {idx}"],
        "correctAnswer": "A",
        "explanation": "Constant-time average for hash table lookups; option B confuses it with linked lists.",
        "irtA": 1.1,
        "irtB": -0.5,
        "rationale": "Standard difficulty=1 hashing question",
        "category": "DataStructures",
        "difficulty": 1,
    }


def _scripted_generator(*scripted_responses):
    """Build a generator instance whose ``_call_openai`` returns the given
    (content, tokens) tuples in order.
    """
    gen = QuestionGenerator.__new__(QuestionGenerator)
    gen.api_key = "test-key"
    gen.model = "gpt-fake"
    gen.timeout = 5
    gen.max_tokens = 16384
    gen.client = object()

    iter_responses = iter(scripted_responses)

    async def fake_call(prompt: str):
        try:
            return next(iter_responses)
        except StopIteration:  # pragma: no cover — defensive
            raise AssertionError("scripted_generator: more calls than scripted responses")

    gen._call_openai = fake_call  # type: ignore[method-assign]
    return gen


@pytest.fixture
def client_with(monkeypatch):
    """Returns a callable that wires a scripted generator into the route
    and returns a fresh TestClient.
    """
    def _wire(*scripted_responses):
        gen = _scripted_generator(*scripted_responses)
        # Reset the singleton then patch the accessor to return our fake.
        qg_module.reset_question_generator_for_tests()
        monkeypatch.setattr(qg_module, "get_question_generator", lambda: gen)
        # The route imports get_question_generator at call time inside the
        # handler, so this patch reaches it via the module attribute.
        from app.api.routes import generator as gen_route
        monkeypatch.setattr(gen_route, "get_question_generator", lambda: gen)
        return TestClient(create_app())
    return _wire


# ---------------------------------------------------------------------------
# Happy path
# ---------------------------------------------------------------------------


def test_happy_path_returns_200_with_validated_drafts(client_with) -> None:
    payload = json.dumps({"drafts": [_valid_draft(0), _valid_draft(1)]})
    client = client_with((payload, 2000))

    resp = client.post(
        "/api/generate-questions",
        json={
            "category": "DataStructures",
            "difficulty": 1,
            "count": 2,
        },
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["promptVersion"] == "generate_questions_v1"
    assert data["retryCount"] == 0
    assert data["tokensUsed"] == 2000
    assert len(data["drafts"]) == 2
    assert data["drafts"][0]["category"] == "DataStructures"


def test_retry_path_recovers_and_returns_200(client_with) -> None:
    """The integration-level proof of the S16-T1 acceptance bar: an invalid
    first response triggers the self-correction retry, which recovers.
    """
    good_payload = json.dumps({"drafts": [_valid_draft(0)]})
    client = client_with(
        ("not parseable JSON at all", 300),  # call 1
        (good_payload, 1800),                  # call 2 (retry)
    )

    resp = client.post(
        "/api/generate-questions",
        json={"category": "DataStructures", "difficulty": 1, "count": 1},
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["retryCount"] == 1
    assert data["tokensUsed"] == 300 + 1800
    assert len(data["drafts"]) == 1


# ---------------------------------------------------------------------------
# Error mapping
# ---------------------------------------------------------------------------


def test_two_consecutive_failures_return_422(client_with) -> None:
    client = client_with(
        ("not JSON 1", 250),
        ("not JSON 2", 280),
    )
    resp = client.post(
        "/api/generate-questions",
        json={"category": "DataStructures", "difficulty": 1, "count": 1},
    )
    assert resp.status_code == 422, resp.text
    assert "invalid output after retry" in resp.json()["detail"]


def test_invalid_request_returns_422(client_with) -> None:
    """The Pydantic-side schema rejects the request before reaching the
    generator. count=21 is over the 20 cap.
    """
    client = client_with()  # no scripted responses needed — request fails early.
    resp = client.post(
        "/api/generate-questions",
        json={"category": "DataStructures", "difficulty": 1, "count": 21},
    )
    assert resp.status_code == 422


def test_includeCode_without_language_rejected(client_with) -> None:
    client = client_with()
    resp = client.post(
        "/api/generate-questions",
        json={
            "category": "Algorithms",
            "difficulty": 2,
            "count": 3,
            "includeCode": True,
            # no language
        },
    )
    assert resp.status_code == 422
    # The Pydantic model_validator message comes through in the 422 body.
    assert "language is required" in resp.text

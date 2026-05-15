"""S18-T3: integration tests for POST /api/generate-tasks."""
from __future__ import annotations

import json

import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.services import task_generator as tg_module
from app.services.task_generator import TaskGenerator


def _valid_draft(idx: int = 0) -> dict:
    return {
        "title": f"Build URL shortener {idx} with analytics",
        "description": (
            "Build a CRUD REST API + 6-char short URL generator + redirect endpoint. "
            "Support custom aliases. Track click counts per short URL with timestamp + referrer. "
            "Expose a basic stats endpoint that returns the top 5 most-clicked links over the past week."
        ),
        "acceptanceCriteria": "- All endpoints return 2xx\n- Tests cover the happy path",
        "deliverables": "GitHub URL with README + tests",
        "difficulty": 2,
        "category": "Algorithms",
        "track": "Backend",
        "expectedLanguage": "Python",
        "estimatedHours": 6,
        "prerequisites": [],
        "skillTags": [{"skill": "correctness", "weight": 0.6}, {"skill": "design", "weight": 0.4}],
        "learningGain": {"correctness": 0.4, "design": 0.2},
        "rationale": "Real-world CRUD task exercising both correctness and design at diff=2.",
    }


def _scripted_generator(*scripted_responses):
    gen = TaskGenerator.__new__(TaskGenerator)
    gen.api_key = "test-key"
    gen.model = "gpt-fake"
    gen.timeout = 5
    gen.max_tokens = 16384
    gen.client = object()

    iter_responses = iter(scripted_responses)

    async def fake_call(prompt: str):
        try:
            return next(iter_responses)
        except StopIteration:
            raise AssertionError("scripted_generator: more calls than scripted responses")

    gen._call_openai = fake_call  # type: ignore[method-assign]
    return gen


@pytest.fixture
def client_with(monkeypatch):
    def _wire(*scripted_responses):
        gen = _scripted_generator(*scripted_responses) if scripted_responses else None
        tg_module.reset_task_generator_for_tests()
        if gen is not None:
            monkeypatch.setattr(tg_module, "get_task_generator", lambda: gen)
            from app.api.routes import task_generator as route_mod
            monkeypatch.setattr(route_mod, "get_task_generator", lambda: gen)
        return TestClient(create_app())
    return _wire


def _valid_request_body(count: int = 1) -> dict:
    return {
        "track": "Backend",
        "difficulty": 2,
        "count": count,
        "focusSkills": ["correctness", "design"],
        "existingTitles": [],
    }


def test_happy_path_returns_200(client_with) -> None:
    payload = json.dumps({"drafts": [_valid_draft(0), _valid_draft(1)]})
    client = client_with((payload, 2000))
    resp = client.post("/api/generate-tasks", json=_valid_request_body(count=2))
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["promptVersion"] == "generate_tasks_v1"
    assert data["retryCount"] == 0
    assert data["tokensUsed"] == 2000
    assert len(data["drafts"]) == 2


def test_retry_path_recovers_and_returns_200(client_with) -> None:
    good = json.dumps({"drafts": [_valid_draft(0)]})
    client = client_with(("not parseable JSON", 250), (good, 1400))
    resp = client.post("/api/generate-tasks", json=_valid_request_body(count=1))
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["retryCount"] == 1
    assert data["tokensUsed"] == 250 + 1400


def test_two_consecutive_failures_return_422(client_with) -> None:
    client = client_with(("not JSON 1", 250), ("not JSON 2", 280))
    resp = client.post("/api/generate-tasks", json=_valid_request_body(count=1))
    assert resp.status_code == 422
    assert "invalid output after retry" in resp.json()["detail"]


def test_invalid_request_returns_422(client_with) -> None:
    client = client_with()
    body = _valid_request_body()
    body["track"] = "Mobile"  # invalid
    resp = client.post("/api/generate-tasks", json=body)
    assert resp.status_code == 422


def test_count_above_cap_returns_422(client_with) -> None:
    client = client_with()
    body = _valid_request_body()
    body["count"] = 11
    resp = client.post("/api/generate-tasks", json=body)
    assert resp.status_code == 422

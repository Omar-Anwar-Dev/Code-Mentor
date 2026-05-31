"""S20-T1 / F16: HTTP-layer tests for /api/adapt-path.

Verifies the route translates :class:`PathAdapterUnavailable` into
HTTP status codes the backend's :code:`PathAdaptationJob` can
discriminate on, and that the happy-path response shape matches the
Pydantic contract.

Behavioural depth lives in :mod:`test_path_adaptation_service`; this
file focuses on the FastAPI surface only.
"""
from __future__ import annotations

import json
from typing import Tuple

import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.services import path_adaptation as svc_module
from app.services.path_adaptation import (
    PathAdapter,
    PathAdapterUnavailable,
    reset_path_adapter_for_tests,
)


@pytest.fixture(autouse=True)
def _reset():
    reset_path_adapter_for_tests()
    yield
    reset_path_adapter_for_tests()


def _scripted_adapter(*scripted_responses: Tuple[str, int]) -> PathAdapter:
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
            raise AssertionError("scripted: more calls than responses")

    adapter._call_openai = fake_call  # type: ignore[method-assign]
    return adapter


@pytest.fixture
def client_with(monkeypatch):
    def _wire(adapter):
        monkeypatch.setattr(svc_module, "get_path_adapter", lambda: adapter)
        from app.api.routes import path_adaptation as route_mod
        monkeypatch.setattr(route_mod, "get_path_adapter", lambda: adapter)
        return TestClient(create_app())
    return _wire


def _request_payload(signal_level: str = "medium") -> dict:
    return {
        "currentPath": [
            {
                "pathTaskId": f"PT-{i}",
                "taskId": f"T-{i}",
                "title": f"Task {i}",
                "orderIndex": i,
                "status": "NotStarted",
                "skillTags": [
                    {"skill": "security", "weight": 0.6},
                    {"skill": "correctness", "weight": 0.4},
                ],
            }
            for i in (1, 2, 3, 4)
        ],
        "recentSubmissions": [
            {
                "taskId": "T-2",
                "overallScore": 65.0,
                "scoresPerCategory": {"correctness": 70.0, "security": 45.0},
                "summaryText": "Functional but weak on input validation.",
            }
        ],
        "signalLevel": signal_level,
        "skillProfile": {"correctness": 70.0, "security": 45.0},
        "candidateReplacements": [
            {
                "taskId": "C-1",
                "title": "Candidate C-1",
                "descriptionSummary": "A candidate task summary.",
                "difficulty": 2,
                "skillTags": [
                    {"skill": "security", "weight": 0.7},
                    {"skill": "correctness", "weight": 0.3},
                ],
                "prerequisites": [],
            }
        ],
        "completedTaskIds": [],
        "track": "Backend",
    }


def _valid_body(signal: str, actions: list) -> str:
    return json.dumps({
        "actions": actions,
        "overallReasoning": "Path adaptation grounded in the security score gap.",
        "signalLevel": signal,
    })


def test_adapt_path_200_happy_path(client_with):
    adapter = _scripted_adapter((
        _valid_body("medium", [
            {
                "type": "swap",
                "targetPosition": 4,
                "newTaskId": "C-1",
                "newOrderIndex": None,
                "reason": "Swap in a security-focused candidate to address security 45/100 weakness.",
                "confidence": 0.82,
            }
        ]),
        180,
    ))
    client = client_with(adapter)
    res = client.post("/api/adapt-path", json=_request_payload("medium"))
    assert res.status_code == 200
    body = res.json()
    assert body["signalLevel"] == "medium"
    assert len(body["actions"]) == 1
    assert body["actions"][0]["newTaskId"] == "C-1"
    assert body["promptVersion"] == "adapt_path_v1"


def test_adapt_path_200_no_action_short_circuits(client_with):
    # No scripted responses — the adapter must not call OpenAI for no_action.
    adapter = _scripted_adapter()
    client = client_with(adapter)
    res = client.post("/api/adapt-path", json=_request_payload("no_action"))
    assert res.status_code == 200
    body = res.json()
    assert body["signalLevel"] == "no_action"
    assert body["actions"] == []
    assert body["tokensUsed"] == 0


def test_adapt_path_422_after_exhausted_retries(client_with):
    bad = _valid_body("medium", [
        {
            "type": "swap",
            "targetPosition": 4,
            "newTaskId": "UNKNOWN-999",  # not in candidates
            "newOrderIndex": None,
            "reason": "Try to swap to an unknown task — should never succeed.",
            "confidence": 0.7,
        }
    ])
    adapter = _scripted_adapter((bad, 100), (bad, 100), (bad, 100))
    client = client_with(adapter)
    res = client.post("/api/adapt-path", json=_request_payload("medium"))
    assert res.status_code == 422


def test_adapt_path_503_when_ai_unavailable(client_with):
    # An adapter with no client attribute simulates "no API key configured".
    adapter = PathAdapter.__new__(PathAdapter)
    adapter.api_key = ""
    adapter.model = "gpt-fake"
    adapter.timeout = 5
    adapter.max_tokens = 1024
    adapter.client = None  # the is_available check returns False
    client = client_with(adapter)
    res = client.post("/api/adapt-path", json=_request_payload("medium"))
    assert res.status_code == 503


def test_adapt_path_400_on_invalid_request_payload(client_with):
    adapter = _scripted_adapter()
    client = client_with(adapter)
    bad_payload = _request_payload("medium")
    bad_payload["signalLevel"] = "huge"  # not a valid SignalLevel literal
    res = client.post("/api/adapt-path", json=bad_payload)
    # FastAPI maps Pydantic validation errors to 422 by default — that's fine
    # as long as it's an obvious client-error and not a 5xx from the adapter.
    assert res.status_code in (400, 422)

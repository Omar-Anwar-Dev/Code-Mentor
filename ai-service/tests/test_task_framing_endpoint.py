"""S19-T5 / F16: integration tests for ``POST /api/task-framing``."""
from __future__ import annotations

import json

import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.services import task_framing as svc_module
from app.services.task_framing import (
    TaskFramer,
    reset_task_framer_for_tests,
)


def _scripted_framer(*scripted):
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


@pytest.fixture
def client_with(monkeypatch):
    def _wire(*scripted):
        reset_task_framer_for_tests()
        framer = _scripted_framer(*scripted) if scripted else None
        if framer is not None:
            monkeypatch.setattr(svc_module, "get_task_framer", lambda: framer)
            from app.api.routes import task_framing as route_mod
            monkeypatch.setattr(route_mod, "get_task_framer", lambda: framer)
        return TestClient(create_app())
    return _wire


def _valid_payload() -> dict:
    return {
        "taskId": "T1",
        "taskTitle": "Build a Webhook Receiver",
        "taskDescription": (
            "Design and implement an HTTP endpoint that receives signed "
            "webhooks, validates the HMAC signature, and routes to handlers per type."
        ),
        "skillTags": [
            {"skill": "security", "weight": 0.7},
            {"skill": "correctness", "weight": 0.3},
        ],
        "learnerProfile": {"Security": 35.0, "DataStructures": 60.0},
        "track": "Backend",
        "learnerLevel": "Beginner",
    }


def _valid_response_json() -> str:
    return json.dumps({
        "whyThisMatters": (
            "Your Security score is 35/100 — this task closes a real gap by "
            "exercising HMAC validation in a real flow."
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


def test_endpoint_200_happy(client_with) -> None:
    client = client_with((_valid_response_json(), 250))
    resp = client.post("/api/task-framing", json=_valid_payload())
    assert resp.status_code == 200
    body = resp.json()
    assert body["promptVersion"] == "task_framing_v1"
    assert body["retryCount"] == 0
    assert len(body["focusAreas"]) == 2
    assert len(body["commonPitfalls"]) == 2


def test_endpoint_200_after_retry(client_with) -> None:
    client = client_with(("garbage", 50), (_valid_response_json(), 200))
    resp = client.post("/api/task-framing", json=_valid_payload())
    assert resp.status_code == 200
    assert resp.json()["retryCount"] == 1


def test_endpoint_422_on_exhausted_retries(client_with) -> None:
    client = client_with(("garbage 1", 50), ("garbage 2", 50))
    resp = client.post("/api/task-framing", json=_valid_payload())
    assert resp.status_code == 422


def test_endpoint_503_when_no_api_key(monkeypatch) -> None:
    reset_task_framer_for_tests()
    framer = TaskFramer.__new__(TaskFramer)
    framer.api_key = None
    framer.client = None
    monkeypatch.setattr(svc_module, "get_task_framer", lambda: framer)
    from app.api.routes import task_framing as route_mod
    monkeypatch.setattr(route_mod, "get_task_framer", lambda: framer)
    client = TestClient(create_app())
    resp = client.post("/api/task-framing", json=_valid_payload())
    assert resp.status_code == 503


def test_endpoint_422_on_invalid_request_schema() -> None:
    client = TestClient(create_app())
    bad = _valid_payload()
    bad["learnerProfile"] = {}  # empty — rejected by schema
    resp = client.post("/api/task-framing", json=bad)
    assert resp.status_code == 422


def test_endpoint_422_on_invalid_track() -> None:
    client = TestClient(create_app())
    bad = _valid_payload()
    bad["track"] = "Mobile"
    resp = client.post("/api/task-framing", json=bad)
    assert resp.status_code == 422

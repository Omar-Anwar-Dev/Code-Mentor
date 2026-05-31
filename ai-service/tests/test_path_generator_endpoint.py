"""S19-T1 / F16: integration tests for the path-generator HTTP routes.

Uses FastAPI's :class:`TestClient` with a monkey-patched
:class:`PathGenerator` (no real OpenAI). The point is to verify the
HTTP surface, not the LLM behaviour — that's covered in
``test_path_generator_service.py``.

Covers:
- POST /api/generate-path 200 happy
- POST /api/generate-path 503 (AI unavailable)
- POST /api/generate-path 422 (validation exhausted)
- POST /api/task-embeddings/upsert 200 (cache seeded)
- POST /api/task-embeddings/upsert 400 (short vector)
- GET  /api/task-embeddings/diagnostics 200 (size + per-track)
- POST /api/embeddings/reload scope=tasks (clears cache, cachePresent=true)
"""
from __future__ import annotations

import json
from typing import List, Tuple

import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.services import path_generator as svc_module
from app.services.path_generator import (
    PathGenerator,
    PathGeneratorUnavailable,
    reset_path_generator_for_tests,
)
from app.services.task_embeddings_cache import reset_task_embeddings_cache_for_tests


@pytest.fixture(autouse=True)
def _reset():
    reset_path_generator_for_tests()
    reset_task_embeddings_cache_for_tests()
    yield
    reset_path_generator_for_tests()
    reset_task_embeddings_cache_for_tests()


def _scripted_generator(*scripted_responses: Tuple[str, int]) -> PathGenerator:
    gen = PathGenerator.__new__(PathGenerator)
    gen.api_key = "test-key"
    gen.model = "gpt-fake"
    gen.embedding_model = "embed-fake"
    gen.timeout = 5
    gen.max_tokens = 1024
    gen.client = object()
    gen._cache = None

    iter_responses = iter(scripted_responses)

    async def fake_call(prompt: str):
        try:
            return next(iter_responses)
        except StopIteration:
            raise AssertionError("scripted: more calls than responses")

    async def fake_embed(_text: str):
        return [1.0, 0.0, 0.0]

    gen._call_openai = fake_call  # type: ignore[method-assign]
    gen._embed_query = fake_embed  # type: ignore[method-assign]
    return gen


@pytest.fixture
def client_with(monkeypatch):
    def _wire(*scripted_responses):
        gen = _scripted_generator(*scripted_responses) if scripted_responses else None
        if gen is not None:
            monkeypatch.setattr(svc_module, "get_path_generator", lambda: gen)
            from app.api.routes import path_generator as route_mod
            monkeypatch.setattr(route_mod, "get_path_generator", lambda: gen)
        return TestClient(create_app())
    return _wire


def _candidate_dict(task_id: str = "T1", *, prereqs: list[str] | None = None) -> dict:
    return {
        "taskId": task_id,
        "title": f"Title for {task_id}",
        "descriptionSummary": "A backend task summary.",
        "skillTags": [
            {"skill": "correctness", "weight": 0.6},
            {"skill": "design", "weight": 0.4},
        ],
        "learningGain": {"correctness": 0.5, "design": 0.4},
        "difficulty": 2,
        "prerequisites": prereqs or [],
        "track": "FullStack",
    }


def _valid_request_payload() -> dict:
    return {
        "skillProfile": {"DataStructures": 40.0, "Algorithms": 55.0},
        "track": "FullStack",
        "completedTaskIds": [],
        "targetLength": 3,
        "recallTopK": 20,
        "candidateTasks": [
            _candidate_dict("T1"),
            _candidate_dict("T2"),
            _candidate_dict("T3"),
        ],
    }


def _valid_response_json() -> str:
    return json.dumps({
        "pathTasks": [
            {
                "taskId": f"T{i}",
                "orderIndex": i,
                "reasoning": (
                    f"Targets the learner's gap at score 40/100; this T{i} "
                    "exercises correctness then design."
                ),
            }
            for i in range(1, 4)
        ],
        "overallReasoning": "Three-task path; lowest skill first, then design.",
    })


# ---------------------------------------------------------------------------
# POST /api/generate-path
# ---------------------------------------------------------------------------


def test_generate_path_200_happy(client_with) -> None:
    client = client_with((_valid_response_json(), 412))
    resp = client.post("/api/generate-path", json=_valid_request_payload())
    assert resp.status_code == 200
    body = resp.json()
    assert len(body["pathTasks"]) == 3
    assert body["retryCount"] == 0
    assert body["promptVersion"] == "generate_path_v1"


def test_generate_path_200_after_one_retry(client_with) -> None:
    client = client_with(
        ("not json at all", 50),
        (_valid_response_json(), 350),
    )
    resp = client.post("/api/generate-path", json=_valid_request_payload())
    assert resp.status_code == 200
    body = resp.json()
    assert body["retryCount"] == 1


def test_generate_path_422_on_exhausted_retries(client_with) -> None:
    bad = "not json at all"
    client = client_with((bad, 50), (bad, 50), (bad, 50))
    resp = client.post("/api/generate-path", json=_valid_request_payload())
    assert resp.status_code == 422


def test_generate_path_503_when_no_api_key(monkeypatch) -> None:
    gen = PathGenerator.__new__(PathGenerator)
    gen.api_key = None
    gen.client = None
    gen._cache = None
    monkeypatch.setattr(svc_module, "get_path_generator", lambda: gen)
    from app.api.routes import path_generator as route_mod
    monkeypatch.setattr(route_mod, "get_path_generator", lambda: gen)
    client = TestClient(create_app())
    resp = client.post("/api/generate-path", json=_valid_request_payload())
    assert resp.status_code == 503


def test_generate_path_422_on_invalid_request_schema(client_with) -> None:
    client = client_with((_valid_response_json(), 100))
    bad = _valid_request_payload()
    bad["skillProfile"] = {}  # empty — schema rejects
    resp = client.post("/api/generate-path", json=bad)
    assert resp.status_code == 422  # FastAPI's request-body validation


# ---------------------------------------------------------------------------
# POST /api/task-embeddings/upsert  +  GET diagnostics
# ---------------------------------------------------------------------------


def test_task_embeddings_upsert_200_and_diagnostics() -> None:
    client = TestClient(create_app())

    payload = {
        "taskId": "T1",
        "vector": [0.1] * 16,
        "title": "Build a queue",
        "descriptionSummary": "A backend task summary.",
        "skillTags": [
            {"skill": "correctness", "weight": 0.6},
            {"skill": "design", "weight": 0.4},
        ],
        "learningGain": {"correctness": 0.5, "design": 0.4},
        "difficulty": 2,
        "prerequisites": [],
        "track": "Backend",
    }
    resp = client.post("/api/task-embeddings/upsert", json=payload)
    assert resp.status_code == 200
    body = resp.json()
    assert body["ok"] is True
    assert body["taskId"] == "T1"
    assert body["cacheSize"] == 1

    diag = client.get("/api/task-embeddings/diagnostics")
    assert diag.status_code == 200
    diag_body = diag.json()
    assert diag_body["cacheSize"] == 1
    assert diag_body["perTrack"] == {"Backend": 1}


def test_task_embeddings_upsert_overwrites_in_place() -> None:
    client = TestClient(create_app())
    payload = {
        "taskId": "T1",
        "vector": [0.1] * 16,
        "title": "Build a queue",
        "descriptionSummary": "A backend task summary.",
        "skillTags": [{"skill": "correctness", "weight": 1.0}],
        "learningGain": {"correctness": 0.5},
        "difficulty": 2,
        "prerequisites": [],
        "track": "Backend",
    }
    client.post("/api/task-embeddings/upsert", json=payload)
    client.post("/api/task-embeddings/upsert", json=payload)
    diag = client.get("/api/task-embeddings/diagnostics")
    assert diag.json()["cacheSize"] == 1


def test_task_embeddings_upsert_short_vector_rejected() -> None:
    client = TestClient(create_app())
    payload = {
        "taskId": "T1",
        "vector": [0.1],  # too short — schema enforces min_length=8
        "title": "Build a queue",
        "descriptionSummary": "A backend task summary.",
        "skillTags": [{"skill": "correctness", "weight": 1.0}],
        "learningGain": {"correctness": 0.5},
        "difficulty": 2,
        "prerequisites": [],
        "track": "Backend",
    }
    resp = client.post("/api/task-embeddings/upsert", json=payload)
    assert resp.status_code == 422


def test_embeddings_reload_scope_tasks_clears_cache() -> None:
    client = TestClient(create_app())
    # Seed
    payload = {
        "taskId": "T1",
        "vector": [0.1] * 16,
        "title": "Build a queue",
        "descriptionSummary": "A backend task summary.",
        "skillTags": [{"skill": "correctness", "weight": 1.0}],
        "learningGain": {"correctness": 0.5},
        "difficulty": 2,
        "prerequisites": [],
        "track": "Backend",
    }
    client.post("/api/task-embeddings/upsert", json=payload)
    pre = client.get("/api/task-embeddings/diagnostics").json()
    assert pre["cacheSize"] == 1

    # Reload — now wired to actually clear
    reload_resp = client.post("/api/embeddings/reload", json={"scope": "tasks"})
    assert reload_resp.status_code == 200
    body = reload_resp.json()
    assert body["cachePresent"] is True
    assert body["refreshed"] == "tasks"

    post = client.get("/api/task-embeddings/diagnostics").json()
    assert post["cacheSize"] == 0


def test_embeddings_reload_scope_questions_logs_only() -> None:
    client = TestClient(create_app())
    resp = client.post("/api/embeddings/reload", json={"scope": "questions"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["cachePresent"] is False
    assert body["refreshed"] == "questions"

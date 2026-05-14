"""S16-T3: integration tests for the general-purpose ``POST /api/embed`` +
``POST /api/embeddings/reload`` endpoints.

Uses FastAPI ``TestClient`` with a monkey-patched ``AsyncOpenAI`` so no
real OpenAI calls are made. The point of these tests is to verify the
HTTP surface + schema, not the embedding model behaviour.
"""
from __future__ import annotations

from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from app.api.routes import embeddings as embeddings_route
from app.main import create_app


class _FakeEmbeddingsResource:
    """Mimics ``client.embeddings`` with a `.create` coroutine."""

    def __init__(self, vector_dims: int = 1536, fail_with: Exception | None = None):
        self._vector_dims = vector_dims
        self._fail_with = fail_with

    async def create(self, *, model: str, input):  # noqa: A002
        if self._fail_with is not None:
            raise self._fail_with
        # Return an object that quacks like the OpenAI SDK response.
        data = [SimpleNamespace(embedding=[0.001] * self._vector_dims)]
        usage = SimpleNamespace(total_tokens=42)
        return SimpleNamespace(data=data, usage=usage, model=model)


class _FakeOpenAI:
    def __init__(self, *, api_key: str = "fake", fail_with: Exception | None = None):
        self.embeddings = _FakeEmbeddingsResource(fail_with=fail_with)


@pytest.fixture
def client_with(monkeypatch):
    """Returns a callable that wires a fake AsyncOpenAI + valid key into the route."""
    def _wire(*, fail_with: Exception | None = None, api_key: str = "test-key"):
        monkeypatch.setattr(
            embeddings_route, "AsyncOpenAI",
            lambda **kwargs: _FakeOpenAI(fail_with=fail_with),
        )
        # Stub the settings so `openai_api_key` is set without leaking real env.
        original_get_settings = embeddings_route.get_settings

        class _S:
            openai_api_key = api_key
            embedding_model = "text-embedding-3-small"
            qdrant_collection = "mentor_chunks"

        monkeypatch.setattr(embeddings_route, "get_settings", lambda: _S())
        return TestClient(create_app())
    return _wire


# ---------------------------------------------------------------------------
# /api/embed
# ---------------------------------------------------------------------------


class TestEmbedEndpoint:
    def test_happy_path_returns_1536_dim_vector(self, client_with) -> None:
        client = client_with()
        resp = client.post(
            "/api/embed",
            json={"text": "What is the time complexity of binary search?", "sourceId": "q-123"},
        )
        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert body["dims"] == 1536
        assert len(body["vector"]) == 1536
        assert body["model"] == "text-embedding-3-small"
        assert body["tokensUsed"] == 42

    def test_missing_api_key_returns_503(self, client_with) -> None:
        client = client_with(api_key=None)  # type: ignore[arg-type]
        resp = client.post("/api/embed", json={"text": "hello world"})
        assert resp.status_code == 503
        assert "API key" in resp.json()["detail"]

    def test_empty_text_rejected_by_schema(self, client_with) -> None:
        client = client_with()
        resp = client.post("/api/embed", json={"text": ""})
        assert resp.status_code == 422  # Pydantic min_length=1

    def test_oversize_text_rejected_by_schema(self, client_with) -> None:
        client = client_with()
        # max_length=20_000 per schema
        resp = client.post("/api/embed", json={"text": "x" * 20_001})
        assert resp.status_code == 422

    def test_openai_failure_returns_503(self, client_with) -> None:
        client = client_with(fail_with=RuntimeError("OpenAI is down"))
        resp = client.post("/api/embed", json={"text": "hello"})
        assert resp.status_code == 503
        assert "Embedding call failed" in resp.json()["detail"]


# ---------------------------------------------------------------------------
# /api/embeddings/reload
# ---------------------------------------------------------------------------


class TestEmbeddingsReloadEndpoint:
    def test_questions_scope_returns_200(self, client_with) -> None:
        client = client_with()
        resp = client.post("/api/embeddings/reload", json={"scope": "questions"})
        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert body["ok"] is True
        assert body["refreshed"] == "questions"
        assert body["cachePresent"] is False  # stub until S19/S20

    def test_tasks_scope_returns_200(self, client_with) -> None:
        client = client_with()
        resp = client.post("/api/embeddings/reload", json={"scope": "tasks"})
        assert resp.status_code == 200
        assert resp.json()["refreshed"] == "tasks"

    def test_unknown_scope_rejected(self, client_with) -> None:
        client = client_with()
        resp = client.post("/api/embeddings/reload", json={"scope": "users"})
        assert resp.status_code == 422  # Literal["questions", "tasks"]

    def test_missing_scope_rejected(self, client_with) -> None:
        client = client_with()
        resp = client.post("/api/embeddings/reload", json={})
        assert resp.status_code == 422

"""S10-T5 / F12 acceptance tests for the mentor-chat SSE endpoint.

Covered behaviour (4 acceptance bullets + supporting checks):
 - Happy RAG path: chunks retrieved → SSE tokens stream → final ``done`` event
   carries ``contextMode=Rag`` + non-empty ``chunkIds``.
 - Raw fallback path: 0 chunks retrieved → ``contextMode=RawFallback``,
   feedback payload makes its way into the system message.
 - Malformed history rejected by the Pydantic schema → HTTP 422 from FastAPI
   (no SSE response opened).
 - OpenAI streaming error → trailing ``error`` event with ``code=openai_unavailable``.

Plus:
 - Token-cap enforcement on the prepared prompt.
 - 503 when ``OPENAI_API_KEY`` is missing.
 - SSE event format (``data: ...\\n\\n``).
"""
from __future__ import annotations

import json
from typing import AsyncIterator, List, Optional

import pytest
from fastapi.testclient import TestClient
from openai import APIError

from app.config import get_settings
from app.services import mentor_chat as mentor_chat_module
from app.services import qdrant_repo as qdrant_module
from app.services.mentor_chat import MentorChatService


# ---------------------------------------------------------------------------
# fakes
# ---------------------------------------------------------------------------


class _FakeScoredPoint:
    def __init__(self, point_id: str, payload: dict, score: float = 0.9) -> None:
        self.id = point_id
        self.payload = payload
        self.score = score


class _FakeQdrantRepo:
    """Returns scripted scored points from ``search``. Empty by default."""

    def __init__(self) -> None:
        self.scripted: List[_FakeScoredPoint] = []
        self.calls: List[tuple] = []

    def ensure_collection(self) -> None:
        pass

    def upsert(self, points):
        return len(points)

    def search(self, *, query_vector, scope, scope_id, top_k):
        self.calls.append((scope, scope_id, top_k))
        return list(self.scripted)

    def count_for_scope(self, scope, scope_id):
        return len(self.scripted)


class _FakeOpenAI:
    """Stand-in async OpenAI client mirroring the Responses-API surface that
    ``mentor_chat._stream_completion`` uses (per ADR-045). Embeddings produce a
    1536-dim zero vector; ``responses.create`` returns an async iterator of
    typed events whose ``response.output_text.delta`` items carry one scripted
    chunk each. Optionally raises mid-stream so we can exercise the error path.
    """

    def __init__(
        self,
        *,
        completion_chunks: Optional[List[str]] = None,
        chat_should_fail: bool = False,
    ) -> None:
        self.completion_chunks = completion_chunks or ["Hello", " from", " the", " mentor."]
        self.chat_should_fail = chat_should_fail
        self.captured_messages: List[dict] = []

        outer = self

        class _Embeddings:
            async def create(_self, *, model, input):
                return type("Resp", (), {
                    "data": [type("Item", (), {"embedding": [0.0] * 1536})() for _ in input],
                })()

        class _Responses:
            async def create(
                _self,
                *,
                model,
                instructions,
                input,
                max_output_tokens=None,
                reasoning=None,
                stream=True,
            ):
                # Production code flattens system + turns into
                # `instructions` + transcript-style `input` ("Role: content"
                # joined by "\n\n"). Reconstruct the legacy chat-message list
                # here so assertions on ``captured_messages`` keep working.
                reconstructed: List[dict] = [{"role": "system", "content": instructions}]
                for line in (input or "").split("\n\n"):
                    line = line.strip()
                    if not line or ": " not in line:
                        continue
                    role_part, content = line.split(": ", 1)
                    reconstructed.append({"role": role_part.lower(), "content": content})
                outer.captured_messages = reconstructed
                return _ResponsesStreamProducer(outer)

        self.embeddings = _Embeddings()
        self.responses = _Responses()


class _ResponsesStreamProducer:
    """Async iterator yielding typed events shaped like the OpenAI Responses
    API stream. Production code filters for ``event.type ==
    "response.output_text.delta"`` and reads ``event.delta``."""

    def __init__(self, owner: _FakeOpenAI) -> None:
        self._owner = owner
        self._index = 0

    def __aiter__(self):
        return self

    async def __anext__(self):
        if self._owner.chat_should_fail and self._index >= 1:
            # Emit one token, then fail.
            raise APIError(message="boom", request=None, body=None)  # type: ignore[arg-type]
        if self._index >= len(self._owner.completion_chunks):
            raise StopAsyncIteration
        event = type("Event", (), {})()
        event.type = "response.output_text.delta"
        event.delta = self._owner.completion_chunks[self._index]
        self._index += 1
        return event


# ---------------------------------------------------------------------------
# autouse: keep settings fresh + service singleton clean
# ---------------------------------------------------------------------------


@pytest.fixture(autouse=True)
def _clear_caches_around_each_test():
    yield
    get_settings.cache_clear()
    mentor_chat_module._service_singleton = None
    qdrant_module._repo_singleton = None


def _patch_service_into_routes(monkeypatch, service: MentorChatService):
    """Mirror the rebinding-aware patch helper from the embeddings tests."""
    from app.api.routes import mentor_chat as routes_module
    mentor_chat_module._service_singleton = service
    monkeypatch.setattr(mentor_chat_module, "get_mentor_chat_service", lambda: service)
    monkeypatch.setattr(routes_module, "get_mentor_chat_service", lambda: service)


def _parse_sse_events(body: str) -> List[dict]:
    """Walk an SSE body, returning each ``data: {...}`` JSON payload."""
    events: List[dict] = []
    for line in body.splitlines():
        line = line.strip()
        if not line.startswith("data:"):
            continue
        payload = line.removeprefix("data:").strip()
        if not payload:
            continue
        events.append(json.loads(payload))
    return events


# ---------------------------------------------------------------------------
# happy paths
# ---------------------------------------------------------------------------


def test_happy_rag_path_streams_tokens_and_emits_done_with_chunkIds(monkeypatch):
    monkeypatch.setenv("AI_ANALYSIS_OPENAI_API_KEY", "fake-key-for-tests")
    get_settings.cache_clear()

    repo = _FakeQdrantRepo()
    repo.scripted = [
        _FakeScoredPoint("11111111-1111-1111-1111-111111111111", payload={
            "scope": "submission", "scopeId": "sub-1",
            "filePath": "app/auth.py", "startLine": 40, "endLine": 80, "kind": "code",
            "content": "def authenticate(user): ...",
        }),
        _FakeScoredPoint("22222222-2222-2222-2222-222222222222", payload={
            "scope": "submission", "scopeId": "sub-1",
            "filePath": "feedback/summary", "startLine": 1, "endLine": 1, "kind": "feedback",
            "content": "JWT secret should not be hardcoded.",
        }),
    ]
    fake_ai = _FakeOpenAI(completion_chunks=["Line ", "42 ", "is ", "a ", "security ", "risk."])
    service = MentorChatService(openai_client=fake_ai, repo=repo)
    _patch_service_into_routes(monkeypatch, service)

    from app.main import create_app
    client = TestClient(create_app())

    body = {
        "sessionId": "session-001",
        "scope": "submission",
        "scopeId": "sub-1",
        "message": "Why is line 42 a security risk?",
        "history": [],
    }
    resp = client.post("/api/mentor-chat", json=body)
    assert resp.status_code == 200, resp.text
    assert resp.headers["content-type"].startswith("text/event-stream")

    events = _parse_sse_events(resp.text)
    tokens = [e for e in events if e.get("type") == "token"]
    done = [e for e in events if e.get("done") is True]
    errors = [e for e in events if "error" in e]

    assert tokens, "expected at least one streamed token"
    assert "".join(t["content"] for t in tokens) == "Line 42 is a security risk."
    assert len(done) == 1
    assert errors == []

    final = done[0]
    assert final["contextMode"] == "Rag"
    assert len(final["chunkIds"]) == 2
    assert final["promptVersion"] == "mentor_chat.v1"
    assert final["tokensInput"] >= 1
    assert final["tokensOutput"] >= 1

    # System message should reference the retrieved chunks.
    sys_msg = fake_ai.captured_messages[0]
    assert sys_msg["role"] == "system"
    assert "app/auth.py L40-80" in sys_msg["content"]
    assert "JWT secret" in sys_msg["content"]


def test_raw_fallback_when_no_chunks_retrieved_uses_feedbackPayload(monkeypatch):
    monkeypatch.setenv("AI_ANALYSIS_OPENAI_API_KEY", "fake-key-for-tests")
    get_settings.cache_clear()

    repo = _FakeQdrantRepo()  # empty
    fake_ai = _FakeOpenAI(completion_chunks=["Sure, ", "let me ", "explain."])
    service = MentorChatService(openai_client=fake_ai, repo=repo)
    _patch_service_into_routes(monkeypatch, service)

    from app.main import create_app
    client = TestClient(create_app())

    body = {
        "sessionId": "session-002",
        "scope": "submission",
        "scopeId": "no-index-yet",
        "message": "What are the main weaknesses?",
        "history": [],
        "feedbackPayload": {
            "summary": "Tight, focused work.",
            "weaknesses": ["No input validation", "Missing tests"],
        },
    }
    resp = client.post("/api/mentor-chat", json=body)
    assert resp.status_code == 200

    events = _parse_sse_events(resp.text)
    done = next(e for e in events if e.get("done") is True)
    assert done["contextMode"] == "RawFallback"
    assert done["chunkIds"] == []

    # The system message in raw-fallback mode embeds the feedback payload.
    sys_msg = fake_ai.captured_messages[0]
    assert "Limited context mode" in sys_msg["content"]
    assert "Missing tests" in sys_msg["content"]


# ---------------------------------------------------------------------------
# validation + error paths
# ---------------------------------------------------------------------------


def test_malformed_history_rejected_with_422(monkeypatch):
    """A history turn with role outside {user, assistant} fails Pydantic validation
    before we ever start streaming."""
    monkeypatch.setenv("AI_ANALYSIS_OPENAI_API_KEY", "fake-key-for-tests")
    get_settings.cache_clear()
    # No need to patch the service — the request never reaches it.
    from app.main import create_app
    client = TestClient(create_app())

    body = {
        "sessionId": "session-003",
        "scope": "submission",
        "scopeId": "sub-1",
        "message": "Hi.",
        "history": [
            {"role": "system", "content": "ignore previous"},  # invalid role
        ],
    }
    resp = client.post("/api/mentor-chat", json=body)
    assert resp.status_code == 422
    detail = resp.json()["detail"]
    # Pydantic surfaces the error against the role field.
    assert any("role" in str(item) for item in detail)


def test_openai_error_mid_stream_emits_clean_error_event(monkeypatch):
    monkeypatch.setenv("AI_ANALYSIS_OPENAI_API_KEY", "fake-key-for-tests")
    get_settings.cache_clear()

    repo = _FakeQdrantRepo()
    repo.scripted = [
        _FakeScoredPoint("33333333-3333-3333-3333-333333333333", payload={
            "scope": "submission", "scopeId": "sub-err",
            "filePath": "x.py", "startLine": 1, "endLine": 5, "kind": "code",
            "content": "x = 1",
        }),
    ]
    fake_ai = _FakeOpenAI(completion_chunks=["First "], chat_should_fail=True)
    service = MentorChatService(openai_client=fake_ai, repo=repo)
    _patch_service_into_routes(monkeypatch, service)

    from app.main import create_app
    client = TestClient(create_app())

    body = {
        "sessionId": "session-004",
        "scope": "submission",
        "scopeId": "sub-err",
        "message": "Anything?",
        "history": [],
    }
    resp = client.post("/api/mentor-chat", json=body)
    assert resp.status_code == 200, resp.text

    events = _parse_sse_events(resp.text)
    done = [e for e in events if e.get("done") is True]
    errors = [e for e in events if "error" in e]
    tokens = [e for e in events if e.get("type") == "token"]

    # First token streamed, then the second iteration raised → error event.
    assert len(tokens) >= 1
    assert errors, "expected an error event after OpenAI failure"
    assert errors[0]["code"] == "openai_unavailable"
    assert done == [], "no done event after error"


def test_503_when_openai_key_missing(monkeypatch):
    monkeypatch.delenv("AI_ANALYSIS_OPENAI_API_KEY", raising=False)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    get_settings.cache_clear()
    from app.main import create_app
    client = TestClient(create_app())

    body = {
        "sessionId": "s",
        "scope": "submission",
        "scopeId": "x",
        "message": "Hi",
        "history": [],
    }
    resp = client.post("/api/mentor-chat", json=body)
    assert resp.status_code == 503
    assert "mentor chat unavailable" in resp.json()["detail"].lower()


def test_input_too_large_emits_clean_error_event(monkeypatch):
    """Oversized history+message triggers the input cap before any LLM call."""
    monkeypatch.setenv("AI_ANALYSIS_OPENAI_API_KEY", "fake-key-for-tests")
    monkeypatch.setenv("AI_ANALYSIS_MENTOR_CHAT_MAX_INPUT_CHARS", "200")  # trip the cap immediately
    get_settings.cache_clear()

    repo = _FakeQdrantRepo()
    fake_ai = _FakeOpenAI()
    service = MentorChatService(openai_client=fake_ai, repo=repo)
    _patch_service_into_routes(monkeypatch, service)

    from app.main import create_app
    client = TestClient(create_app())

    body = {
        "sessionId": "session-big",
        "scope": "submission",
        "scopeId": "sub-1",
        "message": "x" * 1000,  # blows past 200-char cap
        "history": [],
    }
    resp = client.post("/api/mentor-chat", json=body)
    assert resp.status_code == 200

    events = _parse_sse_events(resp.text)
    errors = [e for e in events if "error" in e]
    assert errors and errors[0]["code"] == "input_too_large"
    assert fake_ai.captured_messages == [], "OpenAI must NOT be called when the cap fires"


def test_history_capped_to_last_N_turns(monkeypatch):
    """The last N turns from the request are forwarded to the LLM; older turns dropped."""
    monkeypatch.setenv("AI_ANALYSIS_OPENAI_API_KEY", "fake-key-for-tests")
    monkeypatch.setenv("AI_ANALYSIS_MENTOR_CHAT_HISTORY_LIMIT", "2")
    get_settings.cache_clear()

    repo = _FakeQdrantRepo()
    repo.scripted = [
        _FakeScoredPoint("44444444-4444-4444-4444-444444444444", payload={
            "scope": "submission", "scopeId": "sub-h",
            "filePath": "h.py", "startLine": 1, "endLine": 1, "kind": "code",
            "content": "y = 2",
        }),
    ]
    fake_ai = _FakeOpenAI(completion_chunks=["ok"])
    service = MentorChatService(openai_client=fake_ai, repo=repo)
    _patch_service_into_routes(monkeypatch, service)

    from app.main import create_app
    client = TestClient(create_app())

    body = {
        "sessionId": "session-005",
        "scope": "submission",
        "scopeId": "sub-h",
        "message": "Latest question?",
        "history": [
            {"role": "user", "content": "OLDEST"},
            {"role": "assistant", "content": "OLDEST_REPLY"},
            {"role": "user", "content": "MIDDLE"},
            {"role": "assistant", "content": "MIDDLE_REPLY"},
            {"role": "user", "content": "RECENT"},
        ],
    }
    resp = client.post("/api/mentor-chat", json=body)
    assert resp.status_code == 200

    # System + last 2 history + user message = 4 messages
    assert len(fake_ai.captured_messages) == 4
    assert fake_ai.captured_messages[0]["role"] == "system"
    assert fake_ai.captured_messages[1]["content"] == "MIDDLE_REPLY"
    assert fake_ai.captured_messages[2]["content"] == "RECENT"
    assert fake_ai.captured_messages[3]["content"] == "Latest question?"
    assert "OLDEST" not in str(fake_ai.captured_messages)

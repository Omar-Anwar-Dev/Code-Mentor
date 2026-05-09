"""S10-T3 / F12 acceptance tests for the embeddings pipeline.

Covered behaviour:
 - chunker: file boundary, max_chars cap, whitespace-only no-op, line ranges
 - chunker: 3 sample languages (Python / JavaScript / C#)
 - chunker: feedback text + inline annotations (kind variants)
 - deterministic point ID stable across runs; varies with coordinates
 - indexer: batches embeddings; idempotent re-run produces the same IDs
 - indexer: empty input returns zero
 - Qdrant collection auto-create on first upsert
 - HTTP 503 when OPENAI_API_KEY missing
 - HTTP 200 happy path with mocked deps
"""
from __future__ import annotations

import os
from typing import Any, Dict, List, Optional

import pytest
from fastapi.testclient import TestClient

from app.config import get_settings
from app.domain.schemas.embeddings import EmbeddingsUpsertRequest
from app.services import embeddings_indexer as indexer_module
from app.services import qdrant_repo as qdrant_module
from app.services.embeddings_chunker import (
    chunk_annotations,
    chunk_code_file,
    chunk_feedback_text,
    chunk_files,
)
from app.services.embeddings_indexer import EmbeddingsIndexer
from app.services.qdrant_repo import IndexedPoint, deterministic_point_id


# ---------------------------------------------------------------------------
# fixtures + fakes
# ---------------------------------------------------------------------------


class _FakeAsyncOpenAI:
    """Stand-in for ``openai.AsyncOpenAI`` — only the ``embeddings.create``
    surface we use is implemented. Returns canned 1536-dim vectors so we can
    cover the indexer without burning tokens.
    """

    def __init__(self, dim: int = 1536):
        self.calls: List[List[str]] = []
        self._dim = dim

        class _EmbeddingsAPI:
            async def create(_self, *, model: str, input: List[str]):  # noqa: A002 - matches OpenAI signature
                self.calls.append(list(input))
                # data items expose .embedding
                return type("Resp", (), {
                    "data": [type("Item", (), {"embedding": [0.0] * self._dim})() for _ in input],
                })()

        self.embeddings = _EmbeddingsAPI()


class _FakeQdrantRepo:
    """In-memory replacement for ``QdrantRepository``. Records upsert calls and
    tracks collection-existence so we can assert auto-create semantics.
    """

    def __init__(self) -> None:
        self.collection_created: bool = False
        self.points_by_id: Dict[str, IndexedPoint] = {}
        self.upsert_calls: int = 0

    def ensure_collection(self) -> None:
        self.collection_created = True

    def upsert(self, points):
        self.upsert_calls += 1
        if not points:
            return 0
        self.ensure_collection()
        for p in points:
            self.points_by_id[p.point_id] = p
        return len(points)

    def search(self, *_, **__):  # not exercised in S10-T3 tests
        return []

    def count_for_scope(self, scope: str, scope_id: str) -> int:
        return sum(
            1 for p in self.points_by_id.values()
            if p.payload.get("scope") == scope and p.payload.get("scopeId") == scope_id
        )


@pytest.fixture(autouse=True)
def _clear_settings_cache_around_each_test():
    """The embeddings tests mutate AI_ANALYSIS_* env vars via monkeypatch and
    then call ``get_settings.cache_clear()``. Without a matching teardown, the
    next test in the session inherits the stale Settings instance — which
    poisons the live audit-regression tests with our fake-key-for-tests value.
    """
    yield
    get_settings.cache_clear()
    indexer_module._indexer_singleton = None


@pytest.fixture
def fake_repo() -> _FakeQdrantRepo:
    return _FakeQdrantRepo()


@pytest.fixture
def fake_openai() -> _FakeAsyncOpenAI:
    return _FakeAsyncOpenAI()


@pytest.fixture
def make_indexer(fake_openai, fake_repo, monkeypatch):
    """Returns a factory that builds an EmbeddingsIndexer wired to the fakes."""
    # Make the constructor see a real api key so the OpenAI client construction path
    # doesn't bail out before we override it.
    monkeypatch.setenv("AI_ANALYSIS_OPENAI_API_KEY", "fake-key-for-tests")
    get_settings.cache_clear()
    indexer = EmbeddingsIndexer(openai_client=fake_openai, repo=fake_repo)
    return lambda: indexer


# ---------------------------------------------------------------------------
# chunker
# ---------------------------------------------------------------------------


def test_chunk_code_file_small_input_single_chunk():
    chunks = chunk_code_file("hello.py", "print('hi')\n", max_chars=2000)
    assert len(chunks) == 1
    c = chunks[0]
    assert c.kind == "code"
    assert c.start_line == 1
    assert c.end_line == 1
    assert "print('hi')" in c.content


def test_chunk_code_file_large_input_splits_under_cap():
    # 500 lines of ~30 chars each ≈ 15 KB → must split into multiple chunks
    src = "\n".join([f"x_{i} = compute_value({i})" for i in range(500)])
    chunks = chunk_code_file("big.py", src, max_chars=2000)
    assert len(chunks) > 1
    for c in chunks:
        assert len(c.content) <= 2000 + 100  # allow tiny overshoot from final-line emit
        assert c.start_line >= 1
        assert c.end_line >= c.start_line
    # Lines partition cleanly: first chunk starts at 1, last chunk ends at 500
    assert chunks[0].start_line == 1
    assert chunks[-1].end_line == 500
    # No gap or overlap between consecutive chunks
    for prev, curr in zip(chunks, chunks[1:]):
        assert curr.start_line == prev.end_line + 1


def test_chunk_code_file_whitespace_only_returns_empty():
    assert chunk_code_file("blank.py", "   \n\n  \t\n", max_chars=2000) == []
    assert chunk_code_file("none.py", "", max_chars=2000) == []


def test_chunk_files_three_languages_smoke():
    files = [
        ("app.py", "def add(a, b):\n    return a + b\n"),
        ("ui.js", "export const sum = (a, b) => a + b;\n"),
        ("Math.cs", "public static int Add(int a, int b) => a + b;\n"),
    ]
    chunks = chunk_files(files, max_chars=2000)
    assert {c.file_path for c in chunks} == {"app.py", "ui.js", "Math.cs"}
    assert all(c.kind == "code" for c in chunks)
    assert all(c.start_line == 1 for c in chunks)


def test_chunk_annotations_tolerates_old_and_new_shapes():
    annotations = [
        # Sprint 6 shape (file/line/message)
        {"file": "app.py", "line": 42, "message": "SQL injection — use parameterized queries"},
        # Sprint 9 shape (filePath/lineNumber/description)
        {"filePath": "ui.js", "lineNumber": 7, "description": "Hardcoded API key"},
        # severity-only (still included via title)
        {"file": "x.py", "line": 1, "title": "Critical", "message": "DROP TABLE pattern detected"},
        # Empty body — skipped silently
        {"file": "y.py", "line": 1},
    ]
    chunks = chunk_annotations(annotations, max_chars=2000)
    assert len(chunks) == 3
    assert all(c.kind == "annotation" for c in chunks)
    assert "L42" in chunks[0].file_path
    assert "L7" in chunks[1].file_path
    assert "L1" in chunks[2].file_path


def test_chunk_feedback_text_handles_strengths_and_skips_empty():
    chunks = chunk_feedback_text("strengths", "Clean naming.\nGood test coverage.", max_chars=2000)
    assert len(chunks) == 1
    assert chunks[0].kind == "feedback"
    assert chunks[0].file_path == "feedback/strengths"
    assert chunk_feedback_text("summary", None, max_chars=2000) == []
    assert chunk_feedback_text("summary", "   ", max_chars=2000) == []


# ---------------------------------------------------------------------------
# deterministic point ID
# ---------------------------------------------------------------------------


def test_deterministic_point_id_stable_across_calls():
    a = deterministic_point_id("submission", "sub-001", "app.py", 1, 42)
    b = deterministic_point_id("submission", "sub-001", "app.py", 1, 42)
    assert a == b
    # UUID format
    assert len(a) == 36 and a.count("-") == 4


def test_deterministic_point_id_changes_with_coordinates():
    base = deterministic_point_id("submission", "s", "app.py", 1, 50)
    # changing any coordinate should produce a different ID
    different = [
        deterministic_point_id("audit", "s", "app.py", 1, 50),
        deterministic_point_id("submission", "other", "app.py", 1, 50),
        deterministic_point_id("submission", "s", "ui.js", 1, 50),
        deterministic_point_id("submission", "s", "app.py", 2, 50),
        deterministic_point_id("submission", "s", "app.py", 1, 51),
    ]
    assert all(d != base for d in different)
    assert len(set([base] + different)) == 6


# ---------------------------------------------------------------------------
# indexer
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_indexer_returns_zero_when_input_empty(make_indexer, fake_repo, fake_openai):
    indexer = make_indexer()
    result = await indexer.upsert_for_scope(scope="submission", scope_id="empty-1")
    assert result.indexed == 0
    assert result.chunk_count == 0
    assert fake_openai.calls == []
    assert fake_repo.upsert_calls == 0
    assert fake_repo.collection_created is False  # nothing to index, nothing created


@pytest.mark.asyncio
async def test_indexer_batches_chunks_and_upserts_with_payload(make_indexer, fake_repo, fake_openai):
    indexer = make_indexer()
    files = [
        ("app.py", "def add(a, b):\n    return a + b\n"),
        ("ui.js", "export const sum = (a, b) => a + b;\n"),
        ("Math.cs", "public static int Add(int a, int b) => a + b;\n"),
    ]
    result = await indexer.upsert_for_scope(
        scope="submission",
        scope_id="sub-001",
        code_files=files,
        feedback_summary="Tight, focused work.",
        strengths=["Clean naming"],
        weaknesses=["Missing tests"],
        recommendations=["Add unit tests for add()"],
        annotations=[{"file": "app.py", "line": 2, "message": "Consider type hints"}],
    )
    assert result.indexed > 0
    assert result.chunk_count == result.indexed
    assert fake_repo.collection_created is True

    payloads = [p.payload for p in fake_repo.points_by_id.values()]
    assert all(p["scope"] == "submission" for p in payloads)
    assert all(p["scopeId"] == "sub-001" for p in payloads)
    kinds = {p["kind"] for p in payloads}
    assert "code" in kinds
    assert "feedback" in kinds
    assert "annotation" in kinds


@pytest.mark.asyncio
async def test_indexer_idempotent_re_run_overwrites_same_point_ids(make_indexer, fake_repo):
    indexer = make_indexer()
    files = [("app.py", "x = 1\ny = 2\n")]
    first = await indexer.upsert_for_scope(scope="submission", scope_id="sub-002", code_files=files)
    ids_first = set(fake_repo.points_by_id.keys())
    point_count_first = len(fake_repo.points_by_id)

    second = await indexer.upsert_for_scope(scope="submission", scope_id="sub-002", code_files=files)
    ids_second = set(fake_repo.points_by_id.keys())

    assert first.chunk_count == second.chunk_count
    assert ids_first == ids_second
    # Re-indexing the same input does NOT create new rows
    assert len(fake_repo.points_by_id) == point_count_first


@pytest.mark.asyncio
async def test_indexer_uses_batch_size_when_more_than_50_chunks(monkeypatch, fake_repo, fake_openai):
    """Verify batching kicks in once chunks exceed the configured batch size."""
    monkeypatch.setenv("AI_ANALYSIS_EMBEDDING_BATCH_SIZE", "5")  # tiny batches
    monkeypatch.setenv("AI_ANALYSIS_OPENAI_API_KEY", "fake-key-for-tests")
    monkeypatch.setenv("AI_ANALYSIS_CHUNK_MAX_CHARS", "100")  # force many small chunks
    get_settings.cache_clear()
    indexer = EmbeddingsIndexer(openai_client=fake_openai, repo=fake_repo)

    big_src = "\n".join(f"line_{i} = {i}" for i in range(40))
    files = [("big.py", big_src)]
    result = await indexer.upsert_for_scope(scope="submission", scope_id="sub-003", code_files=files)

    # With chunk_max_chars=100, ~40 lines → multiple chunks; with batch_size=5 → multiple OpenAI calls.
    assert result.chunk_count > 5
    assert len(fake_openai.calls) > 1
    assert max(len(call) for call in fake_openai.calls) <= 5


# ---------------------------------------------------------------------------
# endpoint
# ---------------------------------------------------------------------------


def _patch_indexer_into_routes(monkeypatch, indexer):
    """The route does ``from app.services.embeddings_indexer import get_embeddings_indexer``,
    which rebinds the symbol into the routes module at import time. Patching the
    source module's attribute alone wouldn't take effect inside the route — we
    have to patch the routes-module binding too. Belt-and-suspenders: we also
    overwrite the cached singleton so the un-patched code path returns the fake
    if anything slips through.
    """
    from app.api.routes import embeddings as routes_module
    indexer_module._indexer_singleton = indexer
    monkeypatch.setattr(indexer_module, "get_embeddings_indexer", lambda: indexer)
    monkeypatch.setattr(routes_module, "get_embeddings_indexer", lambda: indexer)


@pytest.fixture
def app_with_fake_indexer(monkeypatch, fake_openai, fake_repo):
    """FastAPI TestClient with the embeddings indexer singleton replaced by a fake."""
    monkeypatch.setenv("AI_ANALYSIS_OPENAI_API_KEY", "fake-key-for-tests")
    get_settings.cache_clear()
    indexer = EmbeddingsIndexer(openai_client=fake_openai, repo=fake_repo)
    _patch_indexer_into_routes(monkeypatch, indexer)
    from app.main import create_app
    app = create_app()
    yield TestClient(app), fake_repo, fake_openai
    indexer_module._indexer_singleton = None


def test_endpoint_503_when_openai_key_missing(monkeypatch, fake_openai, fake_repo):
    monkeypatch.delenv("AI_ANALYSIS_OPENAI_API_KEY", raising=False)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    get_settings.cache_clear()
    indexer = EmbeddingsIndexer(openai_client=fake_openai, repo=fake_repo)
    _patch_indexer_into_routes(monkeypatch, indexer)
    from app.main import create_app
    client = TestClient(create_app())
    body = EmbeddingsUpsertRequest(scope="submission", scopeId="sub-noop").model_dump()
    resp = client.post("/api/embeddings/upsert", json=body)
    assert resp.status_code == 503
    assert "OpenAI" in resp.json()["detail"]
    indexer_module._indexer_singleton = None


def test_endpoint_happy_path_returns_metrics(app_with_fake_indexer):
    client, fake_repo, fake_openai = app_with_fake_indexer
    body = {
        "scope": "submission",
        "scopeId": "sub-happy",
        "codeFiles": [
            {"filePath": "app.py", "content": "def add(a, b):\n    return a + b\n"},
        ],
        "feedbackSummary": "Looks fine.",
        "strengths": ["Clean code"],
        "annotations": [{"file": "app.py", "line": 2, "message": "consider type hints"}],
    }
    resp = client.post("/api/embeddings/upsert", json=body)
    assert resp.status_code == 200, resp.text
    payload = resp.json()
    assert payload["indexed"] >= 3  # 1 code + 1 feedback + 1 strengths + 1 annotation
    assert payload["chunkCount"] == payload["indexed"]
    assert payload["collection"] == "mentor_chunks"
    assert payload["durationMs"] >= 0
    assert fake_repo.collection_created is True

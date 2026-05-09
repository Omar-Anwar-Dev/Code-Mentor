"""S10-T3 / F12: orchestrator for the ``POST /api/embeddings/upsert`` flow.

Pipeline: chunk → batched OpenAI embed call → Qdrant upsert with deterministic
point IDs (ADR-036). The hot path is sync from the orchestrator's perspective;
the route wraps the call in ``asyncio.to_thread`` so the FastAPI event loop
stays responsive.
"""
from __future__ import annotations

import logging
import time
from dataclasses import dataclass
from typing import List, Optional

from openai import AsyncOpenAI
from openai import APIStatusError, AuthenticationError, PermissionDeniedError

from app.config import get_settings
from app.services.embeddings_chunker import (
    Chunk,
    chunk_annotations,
    chunk_feedback_text,
    chunk_files,
)
from app.services.qdrant_repo import (
    IndexedPoint,
    QdrantRepository,
    deterministic_point_id,
    get_qdrant_repo,
)


logger = logging.getLogger(__name__)


@dataclass
class IndexResult:
    """Outcome reported back to the backend caller."""
    indexed: int
    skipped: int  # currently always 0; reserved for future "already-indexed" semantics
    duration_ms: int
    chunk_count: int


class EmbeddingsIndexer:
    """Stateless orchestrator. Holds an OpenAI client + a Qdrant repo, both
    cheap to construct, both safe to share across requests.
    """

    def __init__(
        self,
        *,
        openai_client: Optional[AsyncOpenAI] = None,
        repo: Optional[QdrantRepository] = None,
    ) -> None:
        settings = get_settings()
        self._client = openai_client or AsyncOpenAI(api_key=settings.openai_api_key)
        self._repo = repo or get_qdrant_repo()
        self._model = settings.embedding_model
        self._batch_size = max(1, settings.embedding_batch_size)
        self._chunk_max_chars = settings.chunk_max_chars

    # ------------------------------------------------------------------
    # public entry point
    # ------------------------------------------------------------------
    async def upsert_for_scope(
        self,
        *,
        scope: str,
        scope_id: str,
        code_files: list[tuple[str, str]] | None = None,
        feedback_summary: Optional[str] = None,
        strengths: list[str] | None = None,
        weaknesses: list[str] | None = None,
        recommendations: list[str] | None = None,
        annotations: list[dict] | None = None,
    ) -> IndexResult:
        """Build chunks for a submission/audit and upsert their embeddings.

        Empty input (e.g. all whitespace) is allowed — the caller still gets a
        result (with ``indexed=0``) instead of an exception.
        """
        if scope not in ("submission", "audit"):
            raise ValueError(f"unsupported scope: {scope!r}")
        if not scope_id:
            raise ValueError("scope_id required")

        started = time.time()
        chunks: List[Chunk] = []
        chunks.extend(chunk_files(code_files or [], max_chars=self._chunk_max_chars))
        chunks.extend(chunk_feedback_text(
            "summary", feedback_summary, max_chars=self._chunk_max_chars,
        ))
        for label, lines in (("strengths", strengths or []), ("weaknesses", weaknesses or []), ("recommendations", recommendations or [])):
            if lines:
                chunks.extend(chunk_feedback_text(
                    label,
                    "\n".join(str(x) for x in lines if x),
                    max_chars=self._chunk_max_chars,
                ))
        chunks.extend(chunk_annotations(annotations or [], max_chars=self._chunk_max_chars))

        if not chunks:
            return IndexResult(
                indexed=0,
                skipped=0,
                duration_ms=int((time.time() - started) * 1000),
                chunk_count=0,
            )

        # Embed in batches; OpenAI's input arg accepts a list of strings.
        points: List[IndexedPoint] = []
        for batch in self._batched(chunks, self._batch_size):
            try:
                embeddings = await self._embed_batch([c.content for c in batch])
            except (PermissionDeniedError, AuthenticationError) as exc:
                # ADR-036 graceful degradation: when the OpenAI project lacks
                # embedding-model access, drop indexing instead of failing the
                # whole request. The downstream chat turn's query embedding will
                # also fail → orchestrator returns 0 retrieved chunks → falls
                # into RawFallback mode (uses the structured feedback payload
                # directly). This keeps the readiness gate flippable + the FE
                # chat panel functional even on minimal-permission keys.
                logger.warning(
                    "Embedding model not accessible to this OpenAI project (%s). "
                    "Returning indexed=0; chat will use RawFallback mode end-to-end.",
                    exc.__class__.__name__,
                )
                return IndexResult(
                    indexed=0,
                    skipped=len(chunks),
                    duration_ms=int((time.time() - started) * 1000),
                    chunk_count=len(chunks),
                )
            if len(embeddings) != len(batch):
                raise RuntimeError(
                    f"embedding count mismatch: got {len(embeddings)} for {len(batch)} chunks"
                )
            for chunk, vector in zip(batch, embeddings):
                payload = {
                    "scope": scope,
                    "scopeId": scope_id,
                    "filePath": chunk.file_path,
                    "startLine": chunk.start_line,
                    "endLine": chunk.end_line,
                    "kind": chunk.kind,
                    "source": scope,  # convenience alias requested in architecture §6.12
                }
                points.append(IndexedPoint(
                    point_id=deterministic_point_id(
                        scope, scope_id, chunk.file_path, chunk.start_line, chunk.end_line,
                    ),
                    vector=list(vector),
                    payload=payload,
                ))

        indexed = self._repo.upsert(points)
        elapsed_ms = int((time.time() - started) * 1000)
        logger.info(
            "Indexed %d chunks for scope=%s scopeId=%s in %d ms (%d batches)",
            indexed, scope, scope_id, elapsed_ms,
            (len(chunks) + self._batch_size - 1) // self._batch_size,
        )
        return IndexResult(
            indexed=indexed,
            skipped=0,
            duration_ms=elapsed_ms,
            chunk_count=len(chunks),
        )

    # ------------------------------------------------------------------
    # internals
    # ------------------------------------------------------------------
    async def _embed_batch(self, inputs: List[str]) -> List[List[float]]:
        if not inputs:
            return []
        resp = await self._client.embeddings.create(model=self._model, input=inputs)
        # OpenAI returns the embeddings in the same order as the input list.
        return [item.embedding for item in resp.data]

    @staticmethod
    def _batched(items: List[Chunk], size: int) -> List[List[Chunk]]:
        return [items[i:i + size] for i in range(0, len(items), size)]


_indexer_singleton: Optional[EmbeddingsIndexer] = None


def get_embeddings_indexer() -> EmbeddingsIndexer:
    global _indexer_singleton
    if _indexer_singleton is None:
        _indexer_singleton = EmbeddingsIndexer()
    return _indexer_singleton


def reset_embeddings_indexer() -> None:
    """Test helper — drops the cached singleton."""
    global _indexer_singleton
    _indexer_singleton = None

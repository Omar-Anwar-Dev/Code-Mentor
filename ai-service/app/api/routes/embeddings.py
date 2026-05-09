"""S10-T3 / F12: ``POST /api/embeddings/upsert`` route.

The backend Hangfire job ``IndexSubmissionForMentorChatJob`` calls this once
per submission/audit completion to populate the ``mentor_chunks`` Qdrant
collection. Idempotent by deterministic point ID — re-running on the same
input is a no-op refresh.
"""
from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Request, status

from app.config import get_settings
from app.domain.schemas.embeddings import EmbeddingsUpsertRequest, EmbeddingsUpsertResponse
from app.services.embeddings_indexer import EmbeddingsIndexer, get_embeddings_indexer


logger = logging.getLogger(__name__)


embeddings_router = APIRouter(prefix="/api", tags=["Embeddings"])


_CORRELATION_HEADER = "x-correlation-id"


def _read_correlation_id(http_request: Request) -> str:
    return http_request.headers.get(_CORRELATION_HEADER) or "-"


@embeddings_router.post(
    "/embeddings/upsert",
    response_model=EmbeddingsUpsertResponse,
    status_code=status.HTTP_200_OK,
    summary="Chunk + embed + upsert mentor-chat retrieval points",
)
async def upsert_embeddings(
    request: EmbeddingsUpsertRequest,
    http_request: Request,
) -> EmbeddingsUpsertResponse:
    """Index a submission or audit for RAG retrieval.

    The hot path is: chunker → OpenAI embeddings (batched) → Qdrant upsert.
    Re-runs are idempotent — deterministic point IDs mean a second call on
    the same input overwrites in place rather than producing duplicates.
    """
    settings = get_settings()
    correlation_id = _read_correlation_id(http_request)

    if not settings.openai_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="OpenAI API key is not configured; embeddings unavailable.",
        )

    indexer = get_embeddings_indexer()

    try:
        result = await indexer.upsert_for_scope(
            scope=request.scope,
            scope_id=request.scopeId,
            code_files=[(f.filePath, f.content) for f in request.codeFiles],
            feedback_summary=request.feedbackSummary,
            strengths=request.strengths,
            weaknesses=request.weaknesses,
            recommendations=request.recommendations,
            annotations=[a.model_dump() for a in request.annotations],
        )
    except ValueError as exc:
        logger.warning(
            "[corr=%s] embeddings upsert rejected: %s", correlation_id, exc,
        )
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception(
            "[corr=%s] embeddings upsert failed for scope=%s scopeId=%s",
            correlation_id, request.scope, request.scopeId,
        )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"embeddings upsert failed: {exc}",
        ) from exc

    logger.info(
        "[corr=%s] embedded scope=%s scopeId=%s indexed=%d chunks=%d duration=%dms",
        correlation_id, request.scope, request.scopeId,
        result.indexed, result.chunk_count, result.duration_ms,
    )
    return EmbeddingsUpsertResponse(
        indexed=result.indexed,
        skipped=result.skipped,
        chunkCount=result.chunk_count,
        durationMs=result.duration_ms,
        collection=settings.qdrant_collection,
    )

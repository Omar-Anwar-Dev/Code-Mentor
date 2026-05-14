"""S10-T3 / F12: ``POST /api/embeddings/upsert`` route.

The backend Hangfire job ``IndexSubmissionForMentorChatJob`` calls this once
per submission/audit completion to populate the ``mentor_chunks`` Qdrant
collection. Idempotent by deterministic point ID — re-running on the same
input is a no-op refresh.
"""
from __future__ import annotations

import logging
from typing import Optional

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Request, status
from openai import APIStatusError, AsyncOpenAI, AuthenticationError, PermissionDeniedError

from app.config import get_settings
from app.domain.schemas.embeddings import (
    EmbedRequest,
    EmbedResponse,
    EmbeddingsReloadRequest,
    EmbeddingsReloadResponse,
    EmbeddingsUpsertRequest,
    EmbeddingsUpsertResponse,
    FeedbackHistoryChunk,
    FeedbackHistorySearchRequest,
    FeedbackHistorySearchResponse,
)
from app.services.embeddings_indexer import EmbeddingsIndexer, get_embeddings_indexer
from app.services.qdrant_repo import get_qdrant_repo


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
            user_id=request.userId,
            task_id=request.taskId,
            task_name=request.taskName,
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


# ── S12 / F14 (ADR-040): history-aware code review search endpoint ──────
@embeddings_router.post(
    "/embeddings/search-feedback-history",
    response_model=FeedbackHistorySearchResponse,
    status_code=status.HTTP_200_OK,
    summary="Cross-submission top-k feedback retrieval scoped to one learner",
)
async def search_feedback_history(
    request: FeedbackHistorySearchRequest,
    http_request: Request,
) -> FeedbackHistorySearchResponse:
    """S12 / F14: surface a learner's top-k most relevant prior-feedback
    chunks to ground the AI's history-aware code review.

    Flow: embed the anchor text → Qdrant search filtered by ``userId`` (per
    ADR-040 scope) and excluding raw ``code`` chunks by default → return
    ordered chunk list.

    Graceful degradation (ADR-043):
    - Empty anchor → 400 with descriptive detail.
    - OpenAI embedding-model unavailable → 200 with empty chunks list (so
      backend's profile-only fallback path activates cleanly).
    - Qdrant unreachable / collection absent → 200 with empty chunks.
    """
    settings = get_settings()
    correlation_id = _read_correlation_id(http_request)

    if not request.anchorText.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="anchorText must be non-empty.",
        )

    if not settings.openai_api_key:
        # Without an embedding model we can't derive a query vector; degrade
        # gracefully by returning empty so the backend ships profile-only.
        logger.warning(
            "[corr=%s] feedback-history search degraded: OpenAI key not configured",
            correlation_id,
        )
        return FeedbackHistorySearchResponse(chunks=[])

    client = AsyncOpenAI(api_key=settings.openai_api_key)
    try:
        embed_resp = await client.embeddings.create(
            model=settings.embedding_model,
            input=[request.anchorText],
        )
        query_vector = list(embed_resp.data[0].embedding)
    except (AuthenticationError, PermissionDeniedError) as exc:
        logger.warning(
            "[corr=%s] feedback-history search degraded: embedding model not accessible (%s)",
            correlation_id, exc.__class__.__name__,
        )
        return FeedbackHistorySearchResponse(chunks=[])
    except APIStatusError as exc:
        logger.warning(
            "[corr=%s] feedback-history search degraded: OpenAI APIStatusError %s",
            correlation_id, exc.status_code,
        )
        return FeedbackHistorySearchResponse(chunks=[])
    except Exception:
        logger.exception(
            "[corr=%s] feedback-history search: anchor embedding failed",
            correlation_id,
        )
        return FeedbackHistorySearchResponse(chunks=[])

    repo = get_qdrant_repo()
    try:
        hits = repo.search_by_user(
            query_vector=query_vector,
            user_id=request.userId,
            top_k=request.topK,
            exclude_kinds=request.excludeKinds,
        )
    except Exception:
        logger.exception(
            "[corr=%s] feedback-history search: Qdrant query failed for user=%s",
            correlation_id, request.userId,
        )
        return FeedbackHistorySearchResponse(chunks=[])

    chunks_out = []
    for hit in hits:
        payload = hit.payload or {}
        chunk_text = _stringify_chunk(payload)
        if not chunk_text:
            continue
        source_date = _format_indexed_at(payload.get("indexedAt"))
        chunks_out.append(FeedbackHistoryChunk(
            sourceSubmissionId=str(payload.get("scopeId", "")),
            taskName=payload.get("taskName"),
            taskId=payload.get("taskId"),
            chunkText=chunk_text,
            kind=str(payload.get("kind", "feedback")),
            similarityScore=float(hit.score) if hit.score is not None else 0.0,
            sourceDate=source_date,
        ))

    logger.info(
        "[corr=%s] feedback-history search user=%s returned %d chunks (anchor=%d chars)",
        correlation_id, request.userId, len(chunks_out), len(request.anchorText),
    )
    return FeedbackHistorySearchResponse(chunks=chunks_out)


def _stringify_chunk(payload: dict) -> Optional[str]:
    """Turn a chunk payload into the prose surface used by the F14 prompt.

    The chunker stored the original text in the embedded content; Qdrant
    returns the payload only (not the content), so we surface what we have:
    a synthetic line built from the payload fields. For chunks whose payload
    carries ``content`` (older annotations) we use that verbatim.
    """
    if not payload:
        return None
    if (content := payload.get("content")) and isinstance(content, str) and content.strip():
        return content.strip()
    # Fallback synthesis from coordinates: "<kind> at <file>:<start>-<end>"
    kind = payload.get("kind", "feedback")
    file_path = payload.get("filePath") or "—"
    start = payload.get("startLine")
    end = payload.get("endLine")
    location = file_path
    if isinstance(start, int) and isinstance(end, int) and start > 0:
        location = f"{file_path}:{start}-{end}" if end and end != start else f"{file_path}:{start}"
    return f"[{kind}] {location}"


def _format_indexed_at(ms: Optional[int]) -> Optional[str]:
    if not isinstance(ms, int) or ms <= 0:
        return None
    try:
        return datetime.fromtimestamp(ms / 1000.0, tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    except (OSError, ValueError):
        return None


# ── S16-T3 / F15+F16: general-purpose embed + cache-reload signal ───────


@embeddings_router.post(
    "/embed",
    response_model=EmbedResponse,
    status_code=status.HTTP_200_OK,
    summary="Embed arbitrary text and return the 1536-dim vector (no Qdrant write)",
)
async def embed_text(
    request: EmbedRequest,
    http_request: Request,
) -> EmbedResponse:
    """General-purpose wrapper around ``text-embedding-3-small``.

    Used by the S16 ``EmbedEntityJob<Question>`` on Question approve and
    (post-S18) the ``EmbedEntityJob<Task>`` on Task approve. No persistence
    happens here — the backend stores the returned vector on the entity
    row (``Questions.EmbeddingJson`` / ``Tasks.EmbeddingJson``).

    Status codes:

    - 200: vector returned.
    - 400: empty text (caught by the schema).
    - 503: OpenAI key not configured / authentication failed.
    """
    settings = get_settings()
    correlation_id = _read_correlation_id(http_request)

    if not settings.openai_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="OpenAI API key is not configured; embeddings unavailable.",
        )

    client = AsyncOpenAI(api_key=settings.openai_api_key)
    try:
        resp = await client.embeddings.create(
            model=settings.embedding_model,
            input=[request.text],
        )
    except (AuthenticationError, PermissionDeniedError) as exc:
        logger.warning(
            "[corr=%s] embed: auth/permission error from OpenAI (%s)",
            correlation_id, exc.__class__.__name__,
        )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="OpenAI embedding model not accessible; check API key permissions.",
        ) from exc
    except APIStatusError as exc:
        logger.warning(
            "[corr=%s] embed: OpenAI APIStatusError %s — %s",
            correlation_id, exc.status_code, exc,
        )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"OpenAI returned {exc.status_code}.",
        ) from exc
    except Exception as exc:
        logger.exception("[corr=%s] embed: unexpected failure", correlation_id)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Embedding call failed: {exc}",
        ) from exc

    vector = list(resp.data[0].embedding)
    tokens = int(resp.usage.total_tokens) if resp.usage else 0
    logger.info(
        "[corr=%s] embed sourceId=%s len=%d dims=%d tokens=%d",
        correlation_id, request.sourceId or "-", len(request.text), len(vector), tokens,
    )
    return EmbedResponse(
        vector=vector,
        dims=len(vector),
        model=settings.embedding_model,
        tokensUsed=tokens,
    )


@embeddings_router.post(
    "/embeddings/reload",
    response_model=EmbeddingsReloadResponse,
    status_code=status.HTTP_200_OK,
    summary="Signal that an entity cache should refresh (questions/tasks)",
)
async def embeddings_reload(
    request: EmbeddingsReloadRequest,
    http_request: Request,
) -> EmbeddingsReloadResponse:
    """Cache-refresh signal for the F16 in-memory vector cache.

    In Sprint 16 the cache doesn't exist yet (lands with the F16 Path
    Generator in S19/S20); this route logs the signal so the BE can wire
    ``EmbedEntityJob`` end-to-end now and the cache lights up later
    without contract churn. Always returns 200 with ``cachePresent=false``
    while the cache is a stub.
    """
    correlation_id = _read_correlation_id(http_request)
    logger.info(
        "[corr=%s] embeddings.reload scope=%s (cache stub — F16 caching lands S19/S20)",
        correlation_id, request.scope,
    )
    return EmbeddingsReloadResponse(
        ok=True,
        refreshed=request.scope,
        cachePresent=False,
    )

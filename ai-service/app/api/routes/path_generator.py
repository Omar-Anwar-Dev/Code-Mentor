"""S19-T1 / F16: AI Path Generator HTTP surface.

Three routes:

    POST /api/generate-path                    — hybrid recall + LLM rerank
    POST /api/task-embeddings/upsert           — backend seeds the in-memory cache
    GET  /api/task-embeddings/diagnostics      — cache size + sanity probe

The cache-upsert path is called by the backend's ``EmbedEntityJob<Task>``
after each Task approve (one call per task), and by the one-shot
``tools/backfill_task_embeddings.py`` script after a fresh AI-service
restart (one call per task in the bank).

A wipe-only signal still lives at ``POST /api/embeddings/reload`` (in
:mod:`app.api.routes.embeddings`) — sending ``scope=tasks`` there
clears the cache so the next batch of upserts can rebuild it cleanly.
"""
from __future__ import annotations

import logging
from typing import Tuple

from fastapi import APIRouter, HTTPException, Request, status

from app.domain.schemas.path_generator import (
    GeneratePathRequest,
    GeneratePathResponse,
    TaskEmbeddingCacheUpsertRequest,
    TaskEmbeddingCacheUpsertResponse,
)
from app.services.path_generator import (
    PathGeneratorUnavailable,
    get_path_generator,
)
from app.services.task_embeddings_cache import (
    TaskCacheEntry,
    get_task_embeddings_cache,
)

logger = logging.getLogger(__name__)

path_generator_router = APIRouter(prefix="/api", tags=["Path Generator (F16)"])

_CORRELATION_HEADER = "x-correlation-id"


def _read_correlation_id(http_request: Request) -> str:
    return http_request.headers.get(_CORRELATION_HEADER) or "-"


# ---------------------------------------------------------------------------
# Path generation
# ---------------------------------------------------------------------------


@path_generator_router.post(
    "/generate-path",
    response_model=GeneratePathResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate a personalized learning path via hybrid recall + LLM rerank",
)
async def generate_path(
    request: GeneratePathRequest,
    http_request: Request,
) -> GeneratePathResponse:
    """Produce a topologically-sound ordered learning path.

    Status codes:
    - 200: validated path returned with per-task reasoning + overall narrative.
    - 400: request schema invalid; or LLM context budget exceeded.
    - 422: model produced invalid output after all retries — backend falls back.
    - 503: AI service unavailable (no key, OpenAI down, empty cache + no candidates).
    - 504: OpenAI request timed out.
    """
    correlation_id = _read_correlation_id(http_request)
    generator = get_path_generator()
    try:
        return await generator.generate(request, correlation_id=correlation_id)
    except PathGeneratorUnavailable as exc:
        logger.warning(
            "[corr=%s] path-gen returned %d: %s",
            correlation_id, exc.http_status, str(exc),
        )
        raise HTTPException(status_code=exc.http_status, detail=str(exc)) from exc


# ---------------------------------------------------------------------------
# Cache management (backend seeds the cache)
# ---------------------------------------------------------------------------


@path_generator_router.post(
    "/task-embeddings/upsert",
    response_model=TaskEmbeddingCacheUpsertResponse,
    status_code=status.HTTP_200_OK,
    summary="Upsert a task's embedding + metadata into the AI service cache",
)
async def upsert_task_embedding(
    request: TaskEmbeddingCacheUpsertRequest,
    http_request: Request,
) -> TaskEmbeddingCacheUpsertResponse:
    """Backend writes this once per Task approve.

    Idempotent — re-sending overwrites the entry in place. The cache
    survives across requests but not across AI-service restarts; the
    backfill tool restores it on cold start.
    """
    correlation_id = _read_correlation_id(http_request)
    cache = get_task_embeddings_cache()

    try:
        entry = _build_cache_entry(request)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    await cache.upsert(entry)
    new_size = await cache.size()

    logger.info(
        "[corr=%s] task-embeddings.upsert taskId=%s cacheSize=%d track=%s",
        correlation_id, entry.task_id, new_size, entry.track,
    )
    return TaskEmbeddingCacheUpsertResponse(
        ok=True, taskId=entry.task_id, cacheSize=new_size,
    )


@path_generator_router.get(
    "/task-embeddings/diagnostics",
    status_code=status.HTTP_200_OK,
    summary="Inspect the in-memory task embeddings cache",
)
async def task_embeddings_diagnostics() -> dict:
    """Operational read-only probe — total size + per-track breakdown.

    Useful for the sprint-19 walkthrough doc and for confirming the
    backfill tool actually populated the cache after an AI-service
    rebuild.
    """
    cache = get_task_embeddings_cache()
    entries = await cache.all_entries()
    per_track: dict[str, int] = {}
    for entry in entries:
        per_track[entry.track] = per_track.get(entry.track, 0) + 1
    return {
        "cacheSize": len(entries),
        "perTrack": per_track,
    }


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _build_cache_entry(req: TaskEmbeddingCacheUpsertRequest) -> TaskCacheEntry:
    """Translate the wire shape into the immutable cache entry."""
    skill_tags: Tuple[Tuple[str, float], ...] = tuple(
        (tag.skill, tag.weight) for tag in req.skillTags
    )
    learning_gain: Tuple[Tuple[str, float], ...] = tuple(
        (str(k), float(v)) for k, v in req.learningGain.items()
    )
    if len(req.vector) < 8:
        raise ValueError(f"vector too short: {len(req.vector)} elements")
    return TaskCacheEntry(
        task_id=req.taskId,
        vector=tuple(float(x) for x in req.vector),
        title=req.title,
        description_summary=req.descriptionSummary,
        skill_tags=skill_tags,
        learning_gain=learning_gain,
        difficulty=req.difficulty,
        prerequisites=tuple(req.prerequisites),
        track=req.track,
        expected_language=req.expectedLanguage,
        category=req.category,
        estimated_hours=req.estimatedHours,
    )

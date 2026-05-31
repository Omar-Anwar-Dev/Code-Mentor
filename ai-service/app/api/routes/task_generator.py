"""S18-T3 / F16: AI Task Generator HTTP surface for the admin tool.

    POST /api/generate-tasks

Returns N validated task drafts ready for the admin drafts-review UI
(S18-T5). Backend persists them via ``AdminTaskDraftService`` (S18-T4).
"""
from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, Request, status

from app.domain.schemas.task_generator import (
    GenerateTasksRequest,
    GenerateTasksResponse,
)
from app.services.task_generator import (
    TaskGeneratorUnavailable,
    get_task_generator,
)

logger = logging.getLogger(__name__)

task_generator_router = APIRouter(prefix="/api", tags=["Task Generator (F16 Admin)"])

_CORRELATION_HEADER = "x-correlation-id"


def _read_correlation_id(http_request: Request) -> str:
    return http_request.headers.get(_CORRELATION_HEADER) or "-"


@task_generator_router.post(
    "/generate-tasks",
    response_model=GenerateTasksResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate N task drafts via OpenAI for admin review",
)
async def generate_tasks(
    request: GenerateTasksRequest,
    http_request: Request,
) -> GenerateTasksResponse:
    """Produce a batch of task drafts.

    Status codes:
    - 200: validated drafts returned.
    - 400: request schema invalid; or LLM context budget exceeded.
    - 422: model produced unparseable / non-compliant output after retry.
    - 503: AI service unavailable (no key, OpenAI down, rate limit).
    - 504: OpenAI request timed out.
    """
    correlation_id = _read_correlation_id(http_request)
    generator = get_task_generator()
    try:
        return await generator.generate(request, correlation_id=correlation_id)
    except TaskGeneratorUnavailable as exc:
        logger.warning(
            "[corr=%s] task-gen returned %d: %s",
            correlation_id, exc.http_status, str(exc),
        )
        raise HTTPException(status_code=exc.http_status, detail=str(exc)) from exc

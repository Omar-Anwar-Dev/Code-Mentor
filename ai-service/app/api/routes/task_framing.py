"""S19-T5 / F16: HTTP surface for the per-task framing endpoint.

    POST /api/task-framing

Backend calls this on cache miss in ``GenerateTaskFramingJob`` (S19-T6).
Response shape matches the 3-sub-card layout consumed by the FE Task
page (S19-T7).
"""
from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, Request, status

from app.domain.schemas.task_framing import (
    TaskFramingRequest,
    TaskFramingResponse,
)
from app.services.task_framing import (
    TaskFramingUnavailable,
    get_task_framer,
)

logger = logging.getLogger(__name__)

task_framing_router = APIRouter(prefix="/api", tags=["Task Framing (F16)"])

_CORRELATION_HEADER = "x-correlation-id"


def _read_correlation_id(http_request: Request) -> str:
    return http_request.headers.get(_CORRELATION_HEADER) or "-"


@task_framing_router.post(
    "/task-framing",
    response_model=TaskFramingResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate per-task framing copy (3 sub-cards) for one learner",
)
async def task_framing(
    request: TaskFramingRequest,
    http_request: Request,
) -> TaskFramingResponse:
    """Status codes:

    - 200: validated framing returned.
    - 400: LLM context budget exceeded; request was rejected by OpenAI.
    - 422: model output invalid after retry; backend renders the fallback
      'Personalized framing unavailable — retry' card.
    - 503: AI service unavailable (no key, rate limit, transport).
    - 504: OpenAI request timed out.
    """
    correlation_id = _read_correlation_id(http_request)
    framer = get_task_framer()
    try:
        return await framer.frame(request, correlation_id=correlation_id)
    except TaskFramingUnavailable as exc:
        logger.warning(
            "[corr=%s] task-framing returned %d: %s",
            correlation_id, exc.http_status, str(exc),
        )
        raise HTTPException(status_code=exc.http_status, detail=str(exc)) from exc

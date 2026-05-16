"""S20-T1 / F16: AI Path Adaptation HTTP surface.

    POST /api/adapt-path  — signal-driven action plan generator

Sibling to :mod:`app.api.routes.path_generator`. The backend's
:code:`PathAdaptationJob` calls this endpoint after evaluating the
trigger conditions (every-3-completed / score-swing>10pt /
Completion100 / OnDemand) and computing the signal level.
"""
from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, Request, status

from app.domain.schemas.path_adaptation import AdaptPathRequest, AdaptPathResponse
from app.services.path_adaptation import (
    PathAdapterUnavailable,
    get_path_adapter,
)

logger = logging.getLogger(__name__)

path_adaptation_router = APIRouter(prefix="/api", tags=["Path Adaptation (F16)"])

_CORRELATION_HEADER = "x-correlation-id"


def _read_correlation_id(http_request: Request) -> str:
    return http_request.headers.get(_CORRELATION_HEADER) or "-"


@path_adaptation_router.post(
    "/adapt-path",
    response_model=AdaptPathResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate a signal-driven adaptation plan for an existing learning path",
)
async def adapt_path(
    request: AdaptPathRequest,
    http_request: Request,
) -> AdaptPathResponse:
    """Produce an action plan (reorder / swap) for the learner's current path.

    Status codes:
    - 200: validated action plan returned (possibly empty for no_action signal).
    - 400: request schema invalid; or LLM context budget exceeded.
    - 422: model produced invalid output after all retries — backend should
           write a PathAdaptationEvents row with LearnerDecision=Expired and
           AIReasoningText="AI service unavailable; adaptation deferred."
    - 503: AI service unavailable (no OpenAI key, rate limit, transient error).
    - 504: OpenAI request timed out.
    """
    correlation_id = _read_correlation_id(http_request)
    adapter = get_path_adapter()
    try:
        return await adapter.adapt(request, correlation_id=correlation_id)
    except PathAdapterUnavailable as exc:
        logger.warning(
            "[corr=%s] adapt-path returned %d: %s",
            correlation_id, exc.http_status, str(exc),
        )
        raise HTTPException(status_code=exc.http_status, detail=str(exc)) from exc

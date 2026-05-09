"""S10-T5 / F12: ``POST /api/mentor-chat`` SSE-streaming route (ADR-036).

Returns a ``text/event-stream`` response built from the orchestrator's
async generator. The backend's mentor-chat proxy (S10-T6) forwards bytes
straight through to the FE; FE's <c>useEventSource</c> parses each
``data: {...}`` line.
"""
from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, Request, status
from fastapi.responses import StreamingResponse

from app.config import get_settings
from app.domain.schemas.mentor_chat import MentorChatRequest
from app.services.mentor_chat import get_mentor_chat_service


logger = logging.getLogger(__name__)


mentor_chat_router = APIRouter(prefix="/api", tags=["MentorChat"])


_CORRELATION_HEADER = "x-correlation-id"


def _read_correlation_id(http_request: Request) -> str:
    return http_request.headers.get(_CORRELATION_HEADER) or "-"


@mentor_chat_router.post(
    "/mentor-chat",
    summary="RAG mentor-chat turn (Server-Sent Events)",
    response_class=StreamingResponse,
)
async def mentor_chat(
    request: MentorChatRequest,
    http_request: Request,
) -> StreamingResponse:
    """Stream a RAG-grounded assistant response for a single chat turn.

    Returns ``text/event-stream`` regardless of the path taken — RAG, raw
    fallback, or mid-stream error — so the FE can attach a single parser to
    the response body.
    """
    settings = get_settings()
    correlation_id = _read_correlation_id(http_request)

    if not settings.openai_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="OpenAI API key is not configured; mentor chat unavailable.",
        )

    service = get_mentor_chat_service()
    logger.info(
        "[corr=%s] mentor-chat session=%s scope=%s scopeId=%s history=%d",
        correlation_id, request.sessionId, request.scope, request.scopeId,
        len(request.history),
    )

    return StreamingResponse(
        service.stream(request, correlation_id),
        media_type="text/event-stream",
        headers={
            # Don't buffer SSE in nginx / Azure Front Door / etc.
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )

"""S16-T1 / F15: AI Question Generator HTTP surface for the admin tool.

    POST /api/generate-questions

Returns N validated drafts ready for the admin drafts-review UI. The
backend persists each draft into ``QuestionDrafts`` and exposes them via
``/api/admin/questions/drafts/{batchId}`` (S16-T4).
"""
from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, Request, status

from app.domain.schemas.generator import (
    GenerateQuestionsRequest,
    GenerateQuestionsResponse,
)
from app.services.question_generator import (
    GeneratorUnavailable,
    get_question_generator,
)

logger = logging.getLogger(__name__)

generator_router = APIRouter(prefix="/api", tags=["Question Generator (F15 Admin)"])

_CORRELATION_HEADER = "x-correlation-id"


def _read_correlation_id(http_request: Request) -> str:
    return http_request.headers.get(_CORRELATION_HEADER) or "-"


@generator_router.post(
    "/generate-questions",
    response_model=GenerateQuestionsResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate N multiple-choice question drafts via OpenAI for admin review",
)
async def generate_questions(
    request: GenerateQuestionsRequest,
    http_request: Request,
) -> GenerateQuestionsResponse:
    """Produce a batch of question drafts.

    The endpoint validates the LLM response against the strict
    ``GenerateQuestionsResponse`` schema; on validation failure it retries
    ONCE with a self-correction prefix, then surfaces a 422 if the second
    response is still invalid.

    Status codes:

    - 200: validated drafts returned.
    - 400: request schema invalid (caught by Pydantic before reaching here);
           or LLM context budget exceeded.
    - 422: model produced unparseable / non-compliant output after retry.
    - 503: AI service unavailable (no key, OpenAI down, rate limit).
    - 504: OpenAI request timed out.
    """
    correlation_id = _read_correlation_id(http_request)
    generator = get_question_generator()
    try:
        return await generator.generate(request, correlation_id=correlation_id)
    except GeneratorUnavailable as exc:
        logger.warning(
            "[corr=%s] generator returned %d: %s",
            correlation_id, exc.http_status, str(exc),
        )
        raise HTTPException(status_code=exc.http_status, detail=str(exc)) from exc

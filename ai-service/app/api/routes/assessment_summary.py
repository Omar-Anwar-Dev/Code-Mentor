"""S17-T1 / F15: AI Assessment-Summary HTTP surface for the backend.

    POST /api/assessment-summary

The backend ``GenerateAssessmentSummaryJob`` (S17-T2) calls this endpoint
on Assessment Completed and persists the response in ``AssessmentSummaries``.
"""
from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, Request, status

from app.domain.schemas.assessment_summary import (
    AssessmentSummaryRequest,
    AssessmentSummaryResponse,
)
from app.services.assessment_summarizer import (
    SummarizerUnavailable,
    get_assessment_summarizer,
)

logger = logging.getLogger(__name__)

assessment_summary_router = APIRouter(
    prefix="/api", tags=["Assessment Summary (F15 Post-Assessment)"]
)

_CORRELATION_HEADER = "x-correlation-id"


def _read_correlation_id(http_request: Request) -> str:
    return http_request.headers.get(_CORRELATION_HEADER) or "-"


@assessment_summary_router.post(
    "/assessment-summary",
    response_model=AssessmentSummaryResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate a 3-paragraph AI summary for a Completed Assessment",
)
async def generate_assessment_summary(
    request: AssessmentSummaryRequest,
    http_request: Request,
) -> AssessmentSummaryResponse:
    """Produce strengths / weaknesses / path-guidance paragraphs.

    The endpoint validates the LLM response against the strict
    ``AssessmentSummaryResponse`` schema; on validation failure it retries
    ONCE with a self-correction prefix, then surfaces a 422 if the second
    response is still invalid.

    Status codes:

    - 200: validated 3-paragraph summary returned.
    - 400: request schema invalid (caught by Pydantic before reaching here);
           or LLM context budget exceeded.
    - 422: model produced unparseable / non-compliant output after retry.
    - 503: AI service unavailable (no key, OpenAI down, rate limit).
    - 504: OpenAI request timed out.
    """
    correlation_id = _read_correlation_id(http_request)
    summarizer = get_assessment_summarizer()
    try:
        return await summarizer.summarize(request, correlation_id=correlation_id)
    except SummarizerUnavailable as exc:
        logger.warning(
            "[corr=%s] summary returned %d: %s",
            correlation_id, exc.http_status, str(exc),
        )
        raise HTTPException(status_code=exc.http_status, detail=str(exc)) from exc

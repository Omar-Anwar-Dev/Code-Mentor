"""S15-T2 / F15: IRT-engine HTTP surface for the backend.

Two endpoints:

    POST /api/irt/select-next   — adaptive item selection (Fisher max)
    POST /api/irt/recalibrate    — joint MLE refresh of (a, b) for one item

Both wrap the pure-Python engine in `app/irt/engine.py`. No OpenAI calls,
no I/O — they are CPU-bound numeric work served via FastAPI.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, Request, status

from app.domain.schemas.irt import (
    RecalibrateRequest,
    RecalibrateResponse,
    SelectNextRequest,
    SelectNextResponse,
)
from app.irt.engine import (
    estimate_theta_mle,
    item_info,
    recalibrate_item,
    select_next_question,
)

logger = logging.getLogger(__name__)

irt_router = APIRouter(prefix="/api/irt", tags=["IRT (Adaptive Assessment)"])

_CORRELATION_HEADER = "x-correlation-id"


def _read_correlation_id(http_request: Request) -> str:
    return http_request.headers.get(_CORRELATION_HEADER) or "-"


@irt_router.post(
    "/select-next",
    response_model=SelectNextResponse,
    status_code=status.HTTP_200_OK,
    summary="Pick the unanswered bank item that maximises Fisher info at theta",
)
async def select_next(
    request: SelectNextRequest,
    http_request: Request,
) -> SelectNextResponse:
    """Adaptive item selection.

    Either supply `theta` directly, OR supply `responses` (the engine MLE-estimates
    theta from them). Empty `responses` + null `theta` defaults to theta=0 (the
    first-question prior, per `assessment-learning-path.md` §5.4).

    Then returns the unanswered bank item whose Fisher information at theta
    is largest. The same `id` is echoed back so the backend can correlate
    without a second lookup.

    400: empty bank (caught by the schema validator).
    """
    correlation_id = _read_correlation_id(http_request)

    # Resolve theta: explicit value wins; else estimate from responses; else 0.
    if request.theta is not None:
        theta_used = float(request.theta)
        theta_source = "supplied"
    elif request.responses:
        response_tuples = [(r.a, r.b, r.correct) for r in request.responses]
        theta_used = estimate_theta_mle(response_tuples)
        theta_source = f"mle(n={len(response_tuples)})"
    else:
        theta_used = 0.0
        theta_source = "prior(0.0)"

    bank_dicts = [item.model_dump() for item in request.bank]
    try:
        chosen = select_next_question(theta=theta_used, unanswered_bank=bank_dicts)
    except ValueError as exc:
        # Should be unreachable thanks to the schema's _bank_not_empty
        # validator, but kept as a defense-in-depth so an internal caller
        # that bypasses validation still gets a clean 400.
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc

    info = item_info(theta=theta_used, a=chosen["a"], b=chosen["b"])
    logger.info(
        "[corr=%s] irt.select-next theta=%.3f (%s) bank_size=%d chose id=%s a=%.2f b=%.2f info=%.4f",
        correlation_id, theta_used, theta_source, len(bank_dicts),
        chosen["id"], chosen["a"], chosen["b"], info,
    )
    return SelectNextResponse(
        id=str(chosen["id"]),
        a=float(chosen["a"]),
        b=float(chosen["b"]),
        category=chosen.get("category"),
        itemInfo=float(info),
        thetaUsed=theta_used,
    )


@irt_router.post(
    "/recalibrate",
    response_model=RecalibrateResponse,
    status_code=status.HTTP_200_OK,
    summary="Joint MLE recalibration of one item's (a, b) from response matrix",
)
async def recalibrate(
    request: RecalibrateRequest,
    http_request: Request,
) -> RecalibrateResponse:
    """Per-item joint MLE.

    Backend supplies a list of past `(theta_of_respondent, is_correct)` for
    ONE item; the engine returns refreshed `(a, b)` clipped to the engine
    bounds. Empty input returns defaults `(a=1.0, b=0.0)` per the engine
    contract — caller can decide whether that's meaningful.

    Per ADR-055 the production threshold for invoking this endpoint is
    >=1000 responses; the backend `RecalibrateIRTJob` enforces that gate
    BEFORE calling here. The endpoint itself accepts any N (including zero)
    so unit tests can exercise the full range.
    """
    correlation_id = _read_correlation_id(http_request)
    pairs = [(r.theta, r.correct) for r in request.responses]
    a_new, b_new, log_lik = recalibrate_item(pairs)
    logger.info(
        "[corr=%s] irt.recalibrate n=%d => a=%.3f b=%.3f log_lik=%.3f",
        correlation_id, len(pairs), a_new, b_new, log_lik,
    )
    return RecalibrateResponse(
        a=float(a_new),
        b=float(b_new),
        logLikelihood=float(log_lik),
        nResponses=len(pairs),
    )

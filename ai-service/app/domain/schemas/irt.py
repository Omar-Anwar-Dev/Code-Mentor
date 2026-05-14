"""S15-T2 / F15: Pydantic schemas for the IRT endpoints.

Two endpoints:

    POST /api/irt/select-next   — adaptive item selection
    POST /api/irt/recalibrate    — joint MLE refresh of (a, b) for one item
"""

from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field, model_validator

from app.irt.engine import A_BOUNDS, B_BOUNDS, THETA_BOUNDS


# ---------------------------------------------------------------------------
# /api/irt/select-next
# ---------------------------------------------------------------------------


class IrtBankItem(BaseModel):
    """One unanswered question in the bank, as seen by the AI service."""

    id: str = Field(..., min_length=1)
    a: float = Field(..., ge=A_BOUNDS[0], le=A_BOUNDS[1])
    b: float = Field(..., ge=B_BOUNDS[0], le=B_BOUNDS[1])
    # Optional metadata pass-through — not used by the engine, returned to the
    # caller so the backend can correlate without a second lookup.
    category: Optional[str] = None


class IrtPriorResponse(BaseModel):
    """One past (a, b, correct) tuple — used by the engine to MLE-estimate
    theta when the caller doesn't already have it cached.
    """

    a: float = Field(..., ge=A_BOUNDS[0], le=A_BOUNDS[1])
    b: float = Field(..., ge=B_BOUNDS[0], le=B_BOUNDS[1])
    correct: bool


class SelectNextRequest(BaseModel):
    """Backend asks the engine for the next most-informative unanswered item.

    Theta is optional. If the caller supplies it explicitly, the engine uses
    it as-is. Otherwise (the production path from the .NET backend) the engine
    MLE-estimates theta from the supplied response history. Empty `responses`
    + missing `theta` defaults to theta=0 (the first-question prior, per
    `assessment-learning-path.md` §5.4).
    """

    theta: Optional[float] = Field(
        default=None,
        ge=THETA_BOUNDS[0],
        le=THETA_BOUNDS[1],
        description="Pre-computed theta; if null, derived from `responses`.",
    )
    responses: List[IrtPriorResponse] = Field(
        default_factory=list,
        description="Past (a, b, correct) tuples for this learner — used to estimate theta when not supplied.",
    )
    bank: List[IrtBankItem]

    @model_validator(mode="after")
    def _bank_not_empty(self) -> "SelectNextRequest":
        if not self.bank:
            raise ValueError("bank must contain at least one item")
        return self


class SelectNextResponse(BaseModel):
    """The chosen item, plus the raw Fisher info for diagnostics."""

    id: str
    a: float
    b: float
    category: Optional[str] = None
    itemInfo: float = Field(..., description="Fisher information at the theta used for selection")
    thetaUsed: float = Field(..., description="Theta value used for the selection (supplied OR MLE-estimated)")


# ---------------------------------------------------------------------------
# /api/irt/recalibrate
# ---------------------------------------------------------------------------


class IrtItemResponse(BaseModel):
    """One past response to the item being recalibrated."""

    theta: float = Field(..., ge=THETA_BOUNDS[0], le=THETA_BOUNDS[1])
    correct: bool


class RecalibrateRequest(BaseModel):
    """Backend hands the engine a full response matrix for one item."""

    responses: List[IrtItemResponse] = Field(
        default_factory=list,
        description=(
            "List of past (theta, correct) tuples for ONE item. Empty list "
            "is allowed — returns engine defaults (a=1.0, b=0.0)."
        ),
    )


class RecalibrateResponse(BaseModel):
    """Joint MLE result + diagnostics."""

    a: float
    b: float
    logLikelihood: float
    nResponses: int = Field(..., description="Number of responses considered")

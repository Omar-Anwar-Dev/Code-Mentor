"""2PL IRT-lite engine — the math layer of the F15 adaptive assessment.

Implements the two-parameter logistic model for adaptive item selection
+ MLE-based ability estimation + joint MLE recalibration of item parameters.

Math: see `docs/assessment-learning-path.md` section 5. The model:

    P(correct | theta, a, b) = 1 / (1 + exp(-a * (theta - b)))

Where:
    theta : latent learner ability         (clipped to THETA_BOUNDS)
    b     : item difficulty                (clipped to B_BOUNDS)
    a     : item discrimination (slope)    (clipped to A_BOUNDS)

Design notes:
    * This is the "lite" 2PL — no Bayesian posterior, no item / test
      reliability calculation. A point estimate is enough for adaptive
      selection at our MVP scale (~50 dogfood respondents).
    * Pure-Python wrapper around `scipy.optimize`; no autograd, no PyTensor,
      no sampling. ADR-051 covers the rationale.
    * The bounds are enforced both as scipy optimizer constraints AND as a
      post-clip — scipy's `bounded` method occasionally returns values
      microscopically outside the requested range due to floating-point.
"""

from __future__ import annotations

import math
from typing import Iterable, Sequence, TypedDict

import numpy as np
from scipy.optimize import minimize, minimize_scalar

# --- Parameter bounds (per ADR-050 + assessment-learning-path.md §5.4). ---
THETA_BOUNDS: tuple[float, float] = (-4.0, 4.0)
A_BOUNDS: tuple[float, float] = (0.3, 3.0)
B_BOUNDS: tuple[float, float] = (-3.0, 3.0)

# Numerical floor for log probabilities — keeps MLE objective finite
# when the model assigns a near-zero likelihood to an observed response.
_LL_EPS = 1e-9


class BankItem(TypedDict):
    """Shape consumed by `select_next_question`. Matches the JSON the AI
    service receives from the backend (`a`, `b`, `id`, optionally `category`).
    """

    id: str
    a: float
    b: float


# ---------------------------------------------------------------------------
# Core model functions
# ---------------------------------------------------------------------------


def p_correct(theta: float, a: float, b: float) -> float:
    """Probability of a correct response under the 2PL model.

    P(correct) = 1 / (1 + exp(-a * (theta - b)))

    Returns a value in (0, 1). For numerically extreme inputs the result is
    clipped slightly inside the open interval so callers can take its log.
    """
    # `np.exp` handles overflow gracefully (returns inf for very negative
    # exponents → 1/(1+inf) = 0; for very positive → 1/(1+0) ~ 1). We then
    # nudge the result inside the open interval (0, 1) to avoid log(0).
    p = 1.0 / (1.0 + float(np.exp(-a * (theta - b))))
    if p <= 0.0:
        return _LL_EPS
    if p >= 1.0:
        return 1.0 - _LL_EPS
    return p


def item_info(theta: float, a: float, b: float) -> float:
    """Fisher information at theta for an item with parameters (a, b).

    For the 2PL model:

        I_i(theta) = a^2 * P_i(theta) * (1 - P_i(theta))

    Information is maximised at theta == b (where P = 0.5). Adaptive
    selection picks the unanswered item that maximises this quantity.
    """
    p = p_correct(theta, a, b)
    return (a * a) * p * (1.0 - p)


# ---------------------------------------------------------------------------
# Per-learner: ability estimation
# ---------------------------------------------------------------------------


def estimate_theta_mle(
    responses: Sequence[tuple[float, float, bool]],
) -> float:
    """Maximum-likelihood estimate of theta from a learner's response history.

    Args:
        responses: list of `(a_i, b_i, is_correct)` tuples — one per
            answered item. Order doesn't matter (joint LL is sum-symmetric).

    Returns:
        theta_hat in [THETA_BOUNDS[0], THETA_BOUNDS[1]]. With no responses,
        defaults to 0.0 (the "first question" prior, per §5.4 edge cases).
    """
    if not responses:
        return 0.0

    def neg_ll(theta_arg) -> float:
        # `minimize_scalar` passes a 0-d numpy array; coerce to float.
        theta = float(theta_arg)
        ll = 0.0
        for a, b, correct in responses:
            p = p_correct(theta, a, b)
            ll += math.log(p) if correct else math.log(1.0 - p)
        return -ll

    result = minimize_scalar(
        neg_ll,
        bounds=THETA_BOUNDS,
        method="bounded",
        options={"xatol": 1e-4},
    )
    theta_hat = float(result.x)
    return float(np.clip(theta_hat, *THETA_BOUNDS))


# ---------------------------------------------------------------------------
# Per-bank: adaptive item selection
# ---------------------------------------------------------------------------


def select_next_question(
    theta: float,
    unanswered_bank: Iterable[BankItem],
) -> BankItem:
    """Pick the unanswered item that maximises Fisher info at the current theta.

    Args:
        theta: current learner-ability estimate.
        unanswered_bank: iterable of BankItem dicts with at least `a` and `b`.

    Returns:
        The chosen BankItem (same dict instance as in the input — caller
        owns identity).

    Raises:
        ValueError: if `unanswered_bank` is empty.
    """
    items = list(unanswered_bank)
    if not items:
        raise ValueError("unanswered_bank is empty")
    return max(items, key=lambda q: item_info(theta, q["a"], q["b"]))


# ---------------------------------------------------------------------------
# Per-item: empirical recalibration (joint MLE)
# ---------------------------------------------------------------------------


def recalibrate_item(
    item_responses: Sequence[tuple[float, bool]],
) -> tuple[float, float, float]:
    """Joint MLE for an item's (a, b) given many learners' (theta, correct) data.

    Args:
        item_responses: list of `(theta_of_respondent, is_correct)` pairs
            for ONE item. The respondent thetas come from each respondent's
            own MLE estimate at the time they answered.

    Returns:
        `(a_new, b_new, log_likelihood_at_optimum)`. The (a, b) values are
        clipped to A_BOUNDS / B_BOUNDS for downstream safety even though
        the optimizer is also bound-constrained.
    """
    if not item_responses:
        # No data → return defaults (matches the backfill choice for
        # unanswered items: a=1.0, b=0.0).
        return 1.0, 0.0, 0.0

    def neg_ll(params) -> float:
        a, b = float(params[0]), float(params[1])
        ll = 0.0
        for theta, correct in item_responses:
            p = p_correct(theta, a, b)
            ll += math.log(p) if correct else math.log(1.0 - p)
        return -ll

    result = minimize(
        neg_ll,
        x0=np.array([1.0, 0.0]),
        bounds=[A_BOUNDS, B_BOUNDS],
        method="L-BFGS-B",
    )
    a_new = float(np.clip(result.x[0], *A_BOUNDS))
    b_new = float(np.clip(result.x[1], *B_BOUNDS))
    log_lik = -float(result.fun)
    return a_new, b_new, log_lik

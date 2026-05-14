"""S15-T10: performance benchmark for the IRT engine selection path.

Acceptance bar (per implementation-plan): `select_next_question` p95 < 50ms
over a 250-item bank. Forward-looking — the actual bank is 60 items in S15,
growing to 150–250 by S17 / S21 per ADR-054.

Two benchmarks here:
  * `select_next_question` alone — pure max-Fisher-info iteration over the bank.
  * The full `estimate_theta_mle + select_next_question` cycle that the
    `/api/irt/select-next` endpoint runs in production. This is the one the
    backend's per-question request actually hits.

Both run 100 iterations; p95 is asserted, p50 + p99 are logged for visibility.
Tests are deterministic (fixed seed) so CI variance comes only from machine
load, not from the random bank shape.
"""

from __future__ import annotations

import math
import statistics
import time
from typing import Sequence

import numpy as np
import pytest

from app.irt.engine import (
    estimate_theta_mle,
    item_info,
    select_next_question,
)


def _build_bank(n: int, seed: int = 2026) -> list[dict]:
    rng = np.random.default_rng(seed=seed)
    a_vals = rng.uniform(0.8, 2.5, size=n)
    b_vals = rng.uniform(-2.5, 2.5, size=n)
    return [
        {"id": f"q{i}", "a": float(a_vals[i]), "b": float(b_vals[i])}
        for i in range(n)
    ]


def _build_history(
    n_responses: int, theta_true: float, seed: int = 31
) -> list[tuple[float, float, bool]]:
    rng = np.random.default_rng(seed=seed)
    a_vals = rng.uniform(0.8, 2.5, size=n_responses)
    b_vals = rng.uniform(-2.5, 2.5, size=n_responses)
    out = []
    for a, b in zip(a_vals, b_vals):
        p = 1.0 / (1.0 + math.exp(-a * (theta_true - float(b))))
        correct = bool(rng.uniform() < p)
        out.append((float(a), float(b), correct))
    return out


def _percentile(data: Sequence[float], p: float) -> float:
    return float(np.percentile(data, p))


# ---------------------------------------------------------------------------
# Bench 1 — select_next_question over a 250-item bank
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("bank_size", [60, 250, 500])
def test_select_next_p95_under_50ms(bank_size: int) -> None:
    """Pure max-Fisher-info scan over the bank. The acceptance bar is
    250 items × p95 < 50 ms; we also measure 60 (current) and 500 (post-MVP)
    for visibility and to catch quadratic-time regressions early.
    """
    bank = _build_bank(bank_size)
    theta = 0.5  # representative mid-test theta

    n_iter = 100
    timings_ms: list[float] = []
    for _ in range(n_iter):
        t0 = time.perf_counter()
        select_next_question(theta=theta, unanswered_bank=bank)
        timings_ms.append((time.perf_counter() - t0) * 1000.0)

    p50 = _percentile(timings_ms, 50)
    p95 = _percentile(timings_ms, 95)
    p99 = _percentile(timings_ms, 99)
    print(
        f"\n[bench select_next bank={bank_size}] "
        f"p50={p50:.3f}ms p95={p95:.3f}ms p99={p99:.3f}ms "
        f"min={min(timings_ms):.3f}ms max={max(timings_ms):.3f}ms"
    )

    # Acceptance bar: 250-item bank p95 < 50 ms.
    if bank_size == 250:
        assert p95 < 50.0, f"select_next 250-item p95={p95:.3f}ms exceeds 50ms bar"
    # Soft sanity for the other sizes — just catch obvious regressions.
    if bank_size == 60:
        assert p95 < 20.0, f"select_next 60-item p95={p95:.3f}ms suspiciously slow"
    if bank_size == 500:
        # Roughly 2× the 250-item bar — linear scaling holds.
        assert p95 < 100.0, f"select_next 500-item p95={p95:.3f}ms suggests super-linear scaling"


# ---------------------------------------------------------------------------
# Bench 2 — full estimate_theta_mle + select_next_question cycle
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("history_size,bank_size", [(15, 250), (29, 250)])
def test_full_select_cycle_p95_under_50ms(history_size: int, bank_size: int) -> None:
    """The full cycle the production /api/irt/select-next endpoint runs:
    MLE-estimate theta from the response history, then pick max-info item
    from the unanswered bank. p95 < 50 ms over the projected 250-item bank.

    Two history sizes:
      * 15 — mid-assessment (typical hot path)
      * 29 — penultimate question (max-history case)
    """
    bank = _build_bank(bank_size)
    history = _build_history(n_responses=history_size, theta_true=0.7)

    n_iter = 100
    timings_ms: list[float] = []
    for _ in range(n_iter):
        t0 = time.perf_counter()
        theta_hat = estimate_theta_mle(history)
        select_next_question(theta=theta_hat, unanswered_bank=bank)
        timings_ms.append((time.perf_counter() - t0) * 1000.0)

    p50 = _percentile(timings_ms, 50)
    p95 = _percentile(timings_ms, 95)
    p99 = _percentile(timings_ms, 99)
    print(
        f"\n[bench full-cycle history={history_size} bank={bank_size}] "
        f"p50={p50:.3f}ms p95={p95:.3f}ms p99={p99:.3f}ms "
        f"min={min(timings_ms):.3f}ms max={max(timings_ms):.3f}ms"
    )

    assert p95 < 50.0, (
        f"Full-cycle p95={p95:.3f}ms exceeds 50ms bar "
        f"(history={history_size}, bank={bank_size})"
    )


# ---------------------------------------------------------------------------
# Bench 3 — item_info itself (sanity check; runs ~bank_size × per select call)
# ---------------------------------------------------------------------------


def test_item_info_microbench_under_2us() -> None:
    """item_info is called bank_size times per select_next. With a 250-item
    bank and a 50ms p95 budget, each item_info call must be << 200 µs.
    We assert << 2 µs to leave room for the surrounding Python loop overhead.
    """
    n_iter = 20_000
    t0 = time.perf_counter()
    for _ in range(n_iter):
        item_info(theta=0.0, a=1.5, b=0.3)
    elapsed_s = time.perf_counter() - t0
    avg_us = (elapsed_s / n_iter) * 1_000_000.0
    print(f"\n[bench item_info] avg={avg_us:.3f}µs over {n_iter} iters")
    assert avg_us < 2.0, f"item_info avg={avg_us:.3f}µs > 2µs budget"

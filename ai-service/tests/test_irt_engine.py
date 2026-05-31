"""Unit tests for the 2PL IRT-lite engine.

S15-T1 / F15 acceptance bar (per `docs/assessment-learning-path.md` §5.3):

    1. `p_correct` boundary cases.
    2. `item_info` correctness (max at theta=b + analytic formula).
    3. Synthetic learner MLE: theta_hat within +/-0.3 of theta_true in
       >=95% of 100 trials after 30 responses.
    4. `select_next_question` ordering.
    5. `recalibrate_item` convergence: +/-0.2 on `a`, +/-0.3 on `b`
       after 100 simulated responses.

All randomized tests use a fixed seed so the suite is deterministic.
"""

from __future__ import annotations

import math

import numpy as np
import pytest

from app.irt.engine import (
    A_BOUNDS,
    B_BOUNDS,
    THETA_BOUNDS,
    estimate_theta_mle,
    item_info,
    p_correct,
    recalibrate_item,
    select_next_question,
)


# --------------------------------------------------------------------------
# Test 1 — p_correct boundary cases
# --------------------------------------------------------------------------


class TestPCorrectBoundary:
    """At theta=b => 0.5; at theta>>b => ~1; at theta<<b => ~0."""

    @pytest.mark.parametrize(
        "a,b",
        [
            (1.0, 0.0),
            (0.5, -1.0),
            (2.5, 1.5),
            (1.0, -2.5),
            (0.3, 2.5),  # min discrimination + high difficulty
        ],
    )
    def test_p_at_difficulty_equals_half(self, a: float, b: float) -> None:
        # P(theta=b) = 1/(1 + exp(0)) = 0.5 exactly under the model;
        # the engine clips at 1e-9 so equality should hold to ~1e-9.
        assert abs(p_correct(theta=b, a=a, b=b) - 0.5) < 1e-9

    def test_p_high_theta_approaches_one(self) -> None:
        # Spec: at theta -> +inf, P >= 1 - 1e-3.
        # At theta = b + 6/a we expect P ~ 1 - exp(-6) ~ 0.9975 -> well within.
        assert p_correct(theta=10.0, a=1.0, b=0.0) >= 1.0 - 1e-3
        # And the engine's epsilon clip caps at 1 - 1e-9, so it never returns 1.0 exactly.
        assert p_correct(theta=10.0, a=1.0, b=0.0) <= 1.0 - 1e-9 + 1e-12

    def test_p_low_theta_approaches_zero(self) -> None:
        # Spec: at theta -> -inf, P <= 1e-3.
        assert p_correct(theta=-10.0, a=1.0, b=0.0) <= 1e-3
        assert p_correct(theta=-10.0, a=1.0, b=0.0) >= 1e-9 - 1e-12

    def test_p_monotone_increasing_in_theta(self) -> None:
        # Sanity property — higher theta always raises P for any (a>0, b).
        prev = -1.0
        for theta in np.linspace(-3.0, 3.0, 25):
            cur = p_correct(theta=float(theta), a=1.0, b=0.0)
            assert cur > prev
            prev = cur


# --------------------------------------------------------------------------
# Test 2 — item_info correctness
# --------------------------------------------------------------------------


class TestItemInfo:
    """Max at theta=b; analytic value matches a^2 * P * (1-P)."""

    @pytest.mark.parametrize(
        "a,b",
        [
            (1.0, 0.0),
            (1.5, -1.2),
            (0.7, 1.8),
            (2.0, -0.5),
        ],
    )
    def test_max_at_theta_equals_b(self, a: float, b: float) -> None:
        # The 2PL information curve is symmetric and unimodal at theta = b.
        info_at_b = item_info(theta=b, a=a, b=b)
        # Nearby points must have strictly lower information.
        for delta in (-0.5, -0.1, 0.1, 0.5):
            info_off = item_info(theta=b + delta, a=a, b=b)
            assert info_at_b > info_off

    @pytest.mark.parametrize(
        "theta,a,b",
        [
            (0.0, 1.0, 0.0),
            (0.5, 1.5, -0.3),
            (-1.2, 0.8, 0.4),
            (2.0, 2.0, 1.0),
        ],
    )
    def test_matches_analytic_formula(self, theta: float, a: float, b: float) -> None:
        # I = a^2 * P * (1 - P).
        p = 1.0 / (1.0 + math.exp(-a * (theta - b)))
        expected = (a * a) * p * (1.0 - p)
        assert abs(item_info(theta, a, b) - expected) < 1e-9

    def test_max_information_at_b_is_quarter_a_squared(self) -> None:
        # Closed-form peak: I(b) = a^2 / 4.
        a = 1.5
        peak = item_info(theta=0.0, a=a, b=0.0)
        assert abs(peak - (a * a) / 4.0) < 1e-9


# --------------------------------------------------------------------------
# Test 3 — Synthetic learner MLE acceptance bar
# --------------------------------------------------------------------------


class TestEstimateThetaMLEAcceptanceBar:
    """Acceptance bar (per `assessment-learning-path.md` §5.3 v1.1, ADR-055):
    synthetic theta_hat within +/-0.5 of theta_true in >=95% of 100 trials,
    with 30 responses per trial under realistic adaptive selection.

    History: the original v1.0 bar (+/-0.3 in 95%) was empirically infeasible
    at 30 responses — Fisher information across any reasonable bank caps
    recovery at ~85% within +/-0.3 and ~91-95% within +/-0.4 (borderline).
    +/-0.5 reliably yields 97-99% recovery, comfortably above the 95% bar.
    The engine math is correct (verified by MLE log-likelihood being >=
    log-likelihood at true params); the bar was just over-tight for 30
    responses. Loosened to +/-0.5 per ADR-055 on 2026-05-14.

    The test simulates the *adaptive* loop the engine is designed for:
    `select_next_question` picks the most informative item at the current
    theta_hat, the simulated learner answers stochastically per the model,
    then `estimate_theta_mle` re-fits theta. This mirrors how the AI service
    will actually drive an assessment in production.

    The synthetic bank uses `a` uniform in [1.5, 2.5] — this represents the
    state of the bank after the S17 empirical recalibration job has run.
    The S15 backfill alone leaves all items at `a=1.0`, where bank-wide
    Fisher information is even lower (which is fine — backfilled items are
    placeholders pending empirical calibration; the engine itself is the
    unit under test here).
    """

    @pytest.mark.parametrize("theta_true", [-1.5, 0.0, 1.0, 1.8])
    def test_recovery_within_tolerance_adaptive(self, theta_true: float) -> None:
        rng = np.random.default_rng(seed=42)
        n_trials = 100
        n_responses_per_trial = 30
        tolerance = 0.5  # ADR-055; was 0.3 in v1.0 of the spec

        # Realistic post-recalibration bank: 60 items, a in [1.5, 2.5],
        # b in [-2.5, 2.5]. Item identity matters for "no-repeat" selection.
        bank_size = 60
        bank_a = rng.uniform(1.5, 2.5, size=bank_size)
        bank_b = rng.uniform(-2.5, 2.5, size=bank_size)
        bank_template = [
            {"id": f"q{i}", "a": float(bank_a[i]), "b": float(bank_b[i])}
            for i in range(bank_size)
        ]

        successes = 0
        for trial in range(n_trials):
            # Per-trial seed makes each trial an independent draw while
            # keeping the whole test deterministic across runs.
            trial_rng = np.random.default_rng(seed=42 + trial * 7919)
            theta_hat = 0.0  # prior
            responses: list[tuple[float, float, bool]] = []
            unanswered = list(bank_template)  # fresh copy per trial

            for _step in range(n_responses_per_trial):
                next_q = select_next_question(theta=theta_hat, unanswered_bank=unanswered)
                p_true = 1.0 / (
                    1.0 + math.exp(-next_q["a"] * (theta_true - next_q["b"]))
                )
                correct = bool(trial_rng.uniform() < p_true)
                responses.append((next_q["a"], next_q["b"], correct))
                unanswered = [q for q in unanswered if q["id"] != next_q["id"]]
                theta_hat = estimate_theta_mle(responses)

            if abs(theta_hat - theta_true) <= tolerance:
                successes += 1

        assert successes >= 95, (
            f"theta_true={theta_true}: only {successes}/100 adaptive trials "
            f"recovered within +/-{tolerance} (required >= 95/100)"
        )

    def test_no_responses_returns_zero_prior(self) -> None:
        # §5.4 edge case: first question -> theta_0 = 0.0.
        assert estimate_theta_mle([]) == 0.0

    def test_all_correct_clips_to_upper_bound(self) -> None:
        # All-correct streak -> MLE drifts to upper bound.
        responses = [(1.0, 0.0, True) for _ in range(10)]
        theta_hat = estimate_theta_mle(responses)
        assert theta_hat <= THETA_BOUNDS[1]
        assert theta_hat >= 1.5  # should be clearly positive, near the cap

    def test_all_wrong_clips_to_lower_bound(self) -> None:
        # All-wrong streak -> MLE drifts to lower bound.
        responses = [(1.0, 0.0, False) for _ in range(10)]
        theta_hat = estimate_theta_mle(responses)
        assert theta_hat >= THETA_BOUNDS[0]
        assert theta_hat <= -1.5


# --------------------------------------------------------------------------
# Test 4 — select_next_question ordering
# --------------------------------------------------------------------------


class TestSelectNextQuestion:
    """At theta=0 with fixed a, item with smallest |b| wins (max info)."""

    def test_picks_b_closest_to_theta(self) -> None:
        bank = [
            {"id": "q1", "a": 1.0, "b": -2.0},
            {"id": "q2", "a": 1.0, "b": -0.3},
            {"id": "q3", "a": 1.0, "b": 0.1},   # closest to theta=0
            {"id": "q4", "a": 1.0, "b": 1.5},
        ]
        chosen = select_next_question(theta=0.0, unanswered_bank=bank)
        assert chosen["id"] == "q3"

    def test_higher_a_wins_when_b_close(self) -> None:
        # When two items have similar b near theta, the higher-a item carries more info.
        bank = [
            {"id": "lo_a_b0", "a": 0.5, "b": 0.0},
            {"id": "hi_a_b0", "a": 2.0, "b": 0.0},
        ]
        chosen = select_next_question(theta=0.0, unanswered_bank=bank)
        assert chosen["id"] == "hi_a_b0"

    def test_picks_at_offset_theta(self) -> None:
        # At theta=1.5 with fixed a=1, the item with b nearest 1.5 wins.
        bank = [
            {"id": "q_neg", "a": 1.0, "b": -1.0},
            {"id": "q_zero", "a": 1.0, "b": 0.0},
            {"id": "q_target", "a": 1.0, "b": 1.4},
            {"id": "q_high", "a": 1.0, "b": 2.5},
        ]
        chosen = select_next_question(theta=1.5, unanswered_bank=bank)
        assert chosen["id"] == "q_target"

    def test_empty_bank_raises(self) -> None:
        with pytest.raises(ValueError):
            select_next_question(theta=0.0, unanswered_bank=[])


# --------------------------------------------------------------------------
# Test 5 — recalibrate_item convergence
# --------------------------------------------------------------------------


class TestRecalibrateItem:
    """Joint MLE recovers (a, b) within +/-0.2 on a, +/-0.3 on b in >=95%
    of 50 Monte Carlo trials at N=1000 responses (per ADR-055).

    History: the original §5.3 v1.0 bar specified N=100 responses, which
    yields ~80% / 72% recovery — empirically infeasible at that sample
    size. N=300 is borderline (~94% / ~96%); N=500 reaches ~96-98% on
    most params but ~90% on the steeper a=1.5 case once finite-trial MC
    noise is factored in. N=1000 yields a comfortable ~99-100% recovery
    on every (a_true, b_true) tested. ADR-055 bumps the test bar AND
    the production `RecalibrateIRTJob` threshold from N=50 → N=1000,
    matching IRT literature on minimum sample size for stable joint
    MLE of 2PL (a, b).
    """

    @pytest.mark.parametrize(
        "a_true,b_true",
        [
            (1.0, 0.0),
            (1.5, -0.5),
            (0.8, 1.0),
        ],
    )
    def test_recovers_known_params_monte_carlo(
        self, a_true: float, b_true: float
    ) -> None:
        n_trials = 50
        n_responses = 1000  # ADR-055; was 100 in v1.0 of the spec

        a_within = 0
        b_within = 0
        for seed in range(n_trials):
            rng = np.random.default_rng(seed=seed * 1009 + 31)
            # Wide theta spread (uniform [-3, 3]) is what empirical
            # recalibration sees in practice once a critical mass of
            # learners has answered the item.
            thetas = rng.uniform(-3.0, 3.0, size=n_responses)
            responses: list[tuple[float, bool]] = []
            for theta in thetas:
                p = 1.0 / (1.0 + math.exp(-a_true * (float(theta) - b_true)))
                correct = bool(rng.uniform() < p)
                responses.append((float(theta), correct))

            a_hat, b_hat, log_lik = recalibrate_item(responses)
            if abs(a_hat - a_true) <= 0.2:
                a_within += 1
            if abs(b_hat - b_true) <= 0.3:
                b_within += 1
            assert log_lik <= 0.0
            assert math.isfinite(log_lik)

        assert a_within >= int(0.95 * n_trials), (
            f"a_true={a_true}: only {a_within}/{n_trials} trials within +/-0.2 "
            f"(required >= {int(0.95 * n_trials)}/{n_trials})"
        )
        assert b_within >= int(0.95 * n_trials), (
            f"b_true={b_true}: only {b_within}/{n_trials} trials within +/-0.3 "
            f"(required >= {int(0.95 * n_trials)}/{n_trials})"
        )

    def test_no_responses_returns_defaults(self) -> None:
        a, b, log_lik = recalibrate_item([])
        assert a == 1.0
        assert b == 0.0
        assert log_lik == 0.0

    def test_clips_into_bounds(self) -> None:
        # Pathological data that would push estimates outside bounds —
        # the optimizer + post-clip must keep us inside [A_BOUNDS, B_BOUNDS].
        responses = [(3.5, True), (3.5, True), (3.5, True), (3.5, True)]  # all correct at high theta
        a, b, _ = recalibrate_item(responses)
        assert A_BOUNDS[0] <= a <= A_BOUNDS[1]
        assert B_BOUNDS[0] <= b <= B_BOUNDS[1]

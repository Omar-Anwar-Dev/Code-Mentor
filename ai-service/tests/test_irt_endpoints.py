"""S15-T2: Integration tests for the IRT FastAPI endpoints.

Acceptance bar (per `implementation-plan.md` S15-T2):
- pytest integration tests via FastAPI TestClient
- correctness on synthetic bank
- 4xx responses on malformed input

These run end-to-end through FastAPI without any external dependencies
(the IRT engine is pure Python; no OpenAI / Qdrant calls).
"""

from __future__ import annotations

import math

import numpy as np
from fastapi.testclient import TestClient

from app.irt.engine import item_info
from app.main import create_app


def _client() -> TestClient:
    return TestClient(create_app())


# ---------------------------------------------------------------------------
# /api/irt/select-next
# ---------------------------------------------------------------------------


class TestSelectNextHappyPath:
    def test_returns_chosen_item_with_metadata(self) -> None:
        client = _client()
        body = {
            "theta": 0.0,
            "bank": [
                {"id": "q1", "a": 1.0, "b": -2.0, "category": "Algorithms"},
                {"id": "q2", "a": 1.0, "b": 0.1, "category": "Security"},
                {"id": "q3", "a": 1.0, "b": 1.5, "category": "Design"},
            ],
        }
        resp = client.post("/api/irt/select-next", json=body)
        assert resp.status_code == 200
        data = resp.json()
        # q2 has b closest to theta=0 -> max info under fixed a.
        assert data["id"] == "q2"
        assert data["a"] == 1.0
        assert abs(data["b"] - 0.1) < 1e-9
        assert data["category"] == "Security"
        assert data["thetaUsed"] == 0.0
        assert data["itemInfo"] > 0.0
        # Sanity: itemInfo should match the engine's calculation directly.
        assert abs(data["itemInfo"] - item_info(0.0, 1.0, 0.1)) < 1e-9

    def test_picks_max_info_at_offset_theta(self) -> None:
        client = _client()
        body = {
            "theta": 1.5,
            "bank": [
                {"id": "low", "a": 1.0, "b": -1.0},
                {"id": "mid", "a": 1.0, "b": 0.0},
                {"id": "target", "a": 1.0, "b": 1.4},
                {"id": "high", "a": 1.0, "b": 2.5},
            ],
        }
        resp = client.post("/api/irt/select-next", json=body)
        assert resp.status_code == 200
        assert resp.json()["id"] == "target"

    def test_higher_a_wins_when_b_close(self) -> None:
        client = _client()
        body = {
            "theta": 0.0,
            "bank": [
                {"id": "lo_a", "a": 0.5, "b": 0.0},
                {"id": "hi_a", "a": 2.5, "b": 0.0},
            ],
        }
        resp = client.post("/api/irt/select-next", json=body)
        assert resp.status_code == 200
        assert resp.json()["id"] == "hi_a"


class TestSelectNextThetaResolution:
    """Three theta sources: explicit `theta`, MLE-from-`responses`, prior 0.0."""

    def test_no_theta_no_responses_uses_prior_zero(self) -> None:
        client = _client()
        body = {
            "bank": [
                {"id": "neg", "a": 1.0, "b": -1.5},
                {"id": "near", "a": 1.0, "b": 0.05},  # closest to theta=0
                {"id": "pos", "a": 1.0, "b": 1.5},
            ],
        }
        resp = client.post("/api/irt/select-next", json=body)
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == "near"
        assert data["thetaUsed"] == 0.0

    def test_responses_drive_mle_estimate(self) -> None:
        # Caller is a strong learner: 5 hard items answered correctly, no easy items wrong.
        # MLE θ should land well above 0; max-info item should have high b.
        client = _client()
        body = {
            "responses": [
                {"a": 1.5, "b": 1.0, "correct": True},
                {"a": 1.5, "b": 1.5, "correct": True},
                {"a": 1.5, "b": 2.0, "correct": True},
                {"a": 1.5, "b": 2.0, "correct": True},
                {"a": 1.5, "b": 1.5, "correct": True},
            ],
            "bank": [
                {"id": "easy", "a": 1.0, "b": -1.5},
                {"id": "mid", "a": 1.0, "b": 0.0},
                {"id": "hard", "a": 1.0, "b": 1.8},
                {"id": "harder", "a": 1.0, "b": 2.3},
            ],
        }
        resp = client.post("/api/irt/select-next", json=body)
        assert resp.status_code == 200
        data = resp.json()
        assert data["thetaUsed"] > 1.0  # MLE pushed above 1
        # Max info at high theta -> the "hard" or "harder" item wins (closest to MLE θ).
        assert data["id"] in ("hard", "harder")

    def test_explicit_theta_overrides_responses(self) -> None:
        # Even though responses suggest high θ, explicit θ=0 must take priority.
        client = _client()
        body = {
            "theta": 0.0,
            "responses": [
                {"a": 1.5, "b": 2.0, "correct": True},
                {"a": 1.5, "b": 2.0, "correct": True},
            ],
            "bank": [
                {"id": "near_zero", "a": 1.0, "b": 0.05},
                {"id": "high", "a": 1.0, "b": 1.8},
            ],
        }
        resp = client.post("/api/irt/select-next", json=body)
        assert resp.status_code == 200
        data = resp.json()
        assert data["thetaUsed"] == 0.0
        assert data["id"] == "near_zero"


class TestSelectNextValidation:
    """4xx responses on malformed input."""

    def test_empty_bank_rejected(self) -> None:
        client = _client()
        resp = client.post("/api/irt/select-next", json={"theta": 0.0, "bank": []})
        assert resp.status_code == 422
        assert "bank must contain at least one item" in resp.text

    def test_missing_bank_rejected(self) -> None:
        client = _client()
        resp = client.post("/api/irt/select-next", json={"theta": 0.0})
        assert resp.status_code == 422

    def test_a_above_upper_bound_rejected(self) -> None:
        client = _client()
        body = {
            "theta": 0.0,
            "bank": [{"id": "q", "a": 5.0, "b": 0.0}],  # a > A_BOUNDS[1] = 3.0
        }
        resp = client.post("/api/irt/select-next", json=body)
        assert resp.status_code == 422

    def test_b_below_lower_bound_rejected(self) -> None:
        client = _client()
        body = {
            "theta": 0.0,
            "bank": [{"id": "q", "a": 1.0, "b": -10.0}],  # b < B_BOUNDS[0] = -3.0
        }
        resp = client.post("/api/irt/select-next", json=body)
        assert resp.status_code == 422

    def test_theta_above_upper_bound_rejected(self) -> None:
        client = _client()
        body = {
            "theta": 10.0,  # outside THETA_BOUNDS
            "bank": [{"id": "q", "a": 1.0, "b": 0.0}],
        }
        resp = client.post("/api/irt/select-next", json=body)
        assert resp.status_code == 422

    def test_empty_id_rejected(self) -> None:
        client = _client()
        body = {
            "theta": 0.0,
            "bank": [{"id": "", "a": 1.0, "b": 0.0}],
        }
        resp = client.post("/api/irt/select-next", json=body)
        assert resp.status_code == 422


# ---------------------------------------------------------------------------
# /api/irt/recalibrate
# ---------------------------------------------------------------------------


class TestRecalibrateHappyPath:
    def test_empty_responses_returns_defaults(self) -> None:
        client = _client()
        resp = client.post("/api/irt/recalibrate", json={"responses": []})
        assert resp.status_code == 200
        data = resp.json()
        assert data["a"] == 1.0
        assert data["b"] == 0.0
        assert data["nResponses"] == 0
        assert data["logLikelihood"] == 0.0

    def test_recovers_synthetic_params(self) -> None:
        # Generate 1000 synthetic responses to a known (a=1.5, b=-0.5) item.
        rng = np.random.default_rng(seed=2026)
        a_true, b_true = 1.5, -0.5
        thetas = rng.uniform(-3.0, 3.0, size=1000)
        responses_payload = []
        for theta in thetas:
            p = 1.0 / (1.0 + math.exp(-a_true * (float(theta) - b_true)))
            correct = bool(rng.uniform() < p)
            responses_payload.append({"theta": float(theta), "correct": correct})

        client = _client()
        resp = client.post(
            "/api/irt/recalibrate", json={"responses": responses_payload}
        )
        assert resp.status_code == 200
        data = resp.json()
        # 1000 responses → tight recovery.
        assert abs(data["a"] - a_true) <= 0.2
        assert abs(data["b"] - b_true) <= 0.3
        assert data["nResponses"] == 1000
        assert math.isfinite(data["logLikelihood"])
        assert data["logLikelihood"] <= 0.0


class TestRecalibrateValidation:
    def test_response_with_theta_out_of_bounds_rejected(self) -> None:
        client = _client()
        body = {"responses": [{"theta": 10.0, "correct": True}]}
        resp = client.post("/api/irt/recalibrate", json=body)
        assert resp.status_code == 422

    def test_missing_correct_field_rejected(self) -> None:
        client = _client()
        body = {"responses": [{"theta": 0.0}]}
        resp = client.post("/api/irt/recalibrate", json=body)
        assert resp.status_code == 422


# ---------------------------------------------------------------------------
# /api/irt/estimate-theta  (S17-T5)
# ---------------------------------------------------------------------------


class TestEstimateTheta:
    def test_empty_responses_returns_prior_zero(self) -> None:
        client = _client()
        resp = client.post("/api/irt/estimate-theta", json={"responses": []})
        assert resp.status_code == 200
        data = resp.json()
        assert data["theta"] == 0.0
        assert data["nResponses"] == 0

    def test_strong_responses_drive_positive_theta(self) -> None:
        # A learner who answers easy items correct + medium items correct + hard items wrong
        # has theta ~around medium difficulty. The MLE should land at a finite value within bounds.
        client = _client()
        responses = [
            {"a": 1.0, "b": -1.0, "correct": True},
            {"a": 1.0, "b": -1.0, "correct": True},
            {"a": 1.0, "b": 0.0, "correct": True},
            {"a": 1.0, "b": 0.0, "correct": True},
            {"a": 1.0, "b": 1.0, "correct": False},
            {"a": 1.0, "b": 1.0, "correct": False},
        ]
        resp = client.post("/api/irt/estimate-theta", json={"responses": responses})
        assert resp.status_code == 200
        data = resp.json()
        assert -3.0 <= data["theta"] <= 3.0
        # Ability inferred near medium (b=0): allow a wide window.
        assert -1.0 < data["theta"] < 1.0
        assert data["nResponses"] == 6

    def test_invalid_a_in_response_rejected(self) -> None:
        # IrtPriorResponse uses A_BOUNDS — out-of-range value rejected by Pydantic.
        client = _client()
        body = {"responses": [{"a": 10.0, "b": 0.0, "correct": True}]}
        resp = client.post("/api/irt/estimate-theta", json=body)
        assert resp.status_code == 422

"""S12-T7 / F14 (ADR-040): tests for the AI service intake of the three new
optional multipart Form parts on ``/api/analyze-zip`` (and the
``/api/analyze-zip-multi`` parallel surface). Verifies:

* (a) all three fields absent → existing behaviour unchanged (regression-safe)
* (b) all three populated with valid JSON → parsed correctly, forwarded to the
  reviewer; the response carries the AI's review block (mocked here so the
  test doesn't depend on a live OpenAI key)
* (c) one field with malformed JSON → 400 with field-specific error
* (d) one field with schema-invalid JSON → 400 with validation detail
"""
from __future__ import annotations

import io
import json
import zipfile

import pytest
from fastapi.testclient import TestClient

from app.api.routes import analysis as analysis_module
from app.main import app
from app.services.ai_reviewer import AIReviewResult


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def _tiny_zip_bytes() -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("hello.py", b"x = 1\nprint(x)\n")
    return buf.getvalue()


def _files() -> dict:
    return {"file": ("tiny.zip", _tiny_zip_bytes(), "application/zip")}


class _StubAiReviewer:
    """Test double — bypasses the OpenAI call entirely so tests focus on the
    Form-field intake / parsing / forwarding contract. ``last_kwargs`` records
    everything the route passed to ``review_code`` so the test can assert on
    learner_profile / learner_history / project_context propagation.
    """

    def __init__(self) -> None:
        self.last_kwargs: dict | None = None
        self.is_available = True

    async def review_code(self, **kwargs):
        self.last_kwargs = kwargs
        return AIReviewResult(
            overall_score=72,
            scores={"correctness": 70, "readability": 75, "security": 60, "performance": 80, "design": 75},
            strengths=["Clean naming"],
            weaknesses=["Missing tests"],
            recommendations=[],
            summary="stub",
            model_used="stub",
            tokens_used=100,
            available=True,
            error=None,
            prompt_version="v1.0.0-test",
            detailed_issues=[],
            strengths_detailed=[],
            weaknesses_detailed=[{"isRecurring": True}],
            learning_resources=[],
            executive_summary="stub",
            progress_analysis="stub progress",
        )


@pytest.fixture
def stub_reviewer(monkeypatch) -> _StubAiReviewer:
    stub = _StubAiReviewer()
    monkeypatch.setattr(analysis_module, "get_ai_reviewer", lambda: stub)
    # The static-analysis orchestrator still runs against the real tools; we
    # don't care about its output here, just that the AI hop is reachable.
    return stub


def test_f14_all_three_fields_absent_keeps_pre_f14_behaviour(client, stub_reviewer):
    """(a) Back-compat: pre-F14 callers (no snapshot) still hit the same path."""
    resp = client.post("/api/analyze-zip", files=_files())

    # 200 is the happy path; downstream we just confirm AI received NO
    # snapshot (learner_profile + learner_history left as None).
    assert resp.status_code == 200, resp.text
    assert stub_reviewer.last_kwargs is not None
    assert stub_reviewer.last_kwargs.get("learner_profile") is None
    assert stub_reviewer.last_kwargs.get("learner_history") is None
    # project_context is composed by the route from snapshot OR fallback —
    # in the absent path the fallback dict is non-null (S6 default project context).
    proj = stub_reviewer.last_kwargs.get("project_context")
    assert proj is not None
    assert proj["name"]  # non-empty fallback name


def test_f14_all_three_fields_populated_forward_to_reviewer(client, stub_reviewer):
    """(b) Happy path: backend supplies profile + history + project context;
    the route parses each, maps to the reviewer's kwargs."""
    learner_profile = {
        "skillLevel": "Intermediate",
        "previousSubmissions": 5,
        "averageScore": 68.5,
        "weakAreas": ["Security"],
        "strongAreas": ["Performance"],
        "improvementTrend": "improving",
    }
    learner_history = {
        "executionAttempts": [],
        "recentSubmissions": [
            {"taskName": "Past Task", "score": 65, "date": "2026-04-15T12:00:00Z", "mainIssues": ["input validation missing"]},
        ],
        "commonMistakes": ["input validation missing"],
        "recurringWeaknesses": ["Security"],
        "progressNotes": "Recurring pattern: Security averaging 45/100 across 5 samples.",
    }
    project_context = {
        "name": "F14 test project",
        "description": "Verifies snapshot intake",
        "learningTrack": "Backend",
        "difficulty": "Intermediate",
        "expectedOutcomes": ["Build a secure REST API"],
        "focusAreas": ["security"],
    }

    resp = client.post(
        "/api/analyze-zip",
        files=_files(),
        data={
            "learner_profile_json": json.dumps(learner_profile),
            "learner_history_json": json.dumps(learner_history),
            "project_context_json": json.dumps(project_context),
        },
    )

    assert resp.status_code == 200, resp.text
    assert stub_reviewer.last_kwargs is not None

    profile_kw = stub_reviewer.last_kwargs["learner_profile"]
    assert profile_kw is not None
    assert profile_kw["skillLevel"] == "Intermediate"
    assert profile_kw["previousSubmissions"] == 5
    assert profile_kw["improvementTrend"] == "improving"
    assert "Security" in profile_kw["weakAreas"]

    history_kw = stub_reviewer.last_kwargs["learner_history"]
    assert history_kw is not None
    assert history_kw["commonMistakes"] == ["input validation missing"]
    assert "Security" in history_kw["recurringWeaknesses"]
    assert "Recurring pattern" in history_kw["progressNotes"]

    project_kw = stub_reviewer.last_kwargs["project_context"]
    assert project_kw is not None
    assert project_kw["name"] == "F14 test project"
    assert project_kw["learningTrack"] == "Backend"
    assert "security" in project_kw["focusAreas"]


def test_f14_malformed_profile_json_returns_400(client, stub_reviewer):
    """(c) Malformed JSON in learner_profile_json → 400 with descriptive detail."""
    resp = client.post(
        "/api/analyze-zip",
        files=_files(),
        data={"learner_profile_json": "{not real json"},
    )

    assert resp.status_code == 400
    detail = resp.json()["detail"]
    assert "learner_profile_json" in detail
    assert stub_reviewer.last_kwargs is None  # short-circuited before reviewer ran


def test_f14_schema_invalid_profile_returns_400(client, stub_reviewer):
    """(d) JSON parses but violates the Pydantic schema → 400 with validation detail."""
    bad_profile = {"skillLevel": "Intermediate", "previousSubmissions": -7}  # ge=0 violated

    resp = client.post(
        "/api/analyze-zip",
        files=_files(),
        data={"learner_profile_json": json.dumps(bad_profile)},
    )

    assert resp.status_code == 400
    detail = resp.json()["detail"]
    assert "learner_profile_json" in detail
    assert stub_reviewer.last_kwargs is None


def test_f14_empty_string_field_treated_as_absent(client, stub_reviewer):
    """Empty / whitespace JSON field is equivalent to absent."""
    resp = client.post(
        "/api/analyze-zip",
        files=_files(),
        data={"learner_profile_json": "   ", "learner_history_json": ""},
    )

    assert resp.status_code == 200, resp.text
    assert stub_reviewer.last_kwargs["learner_profile"] is None
    assert stub_reviewer.last_kwargs["learner_history"] is None

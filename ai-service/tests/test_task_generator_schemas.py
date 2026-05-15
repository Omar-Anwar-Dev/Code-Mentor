"""S18-T3: Pydantic schema tests for the task-generator endpoint."""
from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.domain.schemas.task_generator import (
    GenerateTasksRequest,
    GeneratedTaskDraft,
    GenerateTasksResponse,
    SkillTagInput,
)


def _valid_draft(**overrides) -> dict:
    base = {
        "title": "Build a URL shortener with analytics",
        "description": (
            "Build a CRUD REST API + 6-char short URL generator + redirect endpoint. "
            "Support custom aliases. Track click counts per short URL with timestamp + referrer. "
            "Expose a basic stats endpoint that returns the top 5 most-clicked links."
        ),
        "acceptanceCriteria": "- All endpoints return 2xx for valid input\n- Tests cover the happy path",
        "deliverables": "GitHub URL with README + tests",
        "difficulty": 2,
        "category": "Algorithms",
        "track": "Backend",
        "expectedLanguage": "Python",
        "estimatedHours": 6,
        "prerequisites": [],
        "skillTags": [{"skill": "correctness", "weight": 0.6}, {"skill": "design", "weight": 0.4}],
        "learningGain": {"correctness": 0.4, "design": 0.2},
        "rationale": "Realistic full-cycle CRUD task that exercises both correctness and design at diff=2.",
    }
    base.update(overrides)
    return base


# ---------------------------------------------------------------------------
# GenerateTasksRequest
# ---------------------------------------------------------------------------


def test_request_happy_path() -> None:
    req = GenerateTasksRequest(
        track="Backend", difficulty=2, count=3,
        focusSkills=["correctness", "design"], existingTitles=[],
    )
    assert req.count == 3


def test_request_rejects_invalid_track() -> None:
    with pytest.raises(ValidationError):
        GenerateTasksRequest(track="Mobile", difficulty=2, count=1, focusSkills=["correctness"])


def test_request_rejects_difficulty_out_of_range() -> None:
    with pytest.raises(ValidationError):
        GenerateTasksRequest(track="Backend", difficulty=6, count=1, focusSkills=["correctness"])


def test_request_rejects_empty_focus_skills() -> None:
    with pytest.raises(ValidationError):
        GenerateTasksRequest(track="Backend", difficulty=2, count=1, focusSkills=[])


def test_request_rejects_count_above_cap() -> None:
    with pytest.raises(ValidationError):
        GenerateTasksRequest(track="Backend", difficulty=2, count=11, focusSkills=["correctness"])


# ---------------------------------------------------------------------------
# GeneratedTaskDraft
# ---------------------------------------------------------------------------


def test_draft_happy_path_two_tags() -> None:
    d = GeneratedTaskDraft(**_valid_draft())
    assert d.title.startswith("Build")
    assert len(d.skillTags) == 2
    assert d.estimatedHours == 6


def test_draft_rejects_short_title() -> None:
    with pytest.raises(ValidationError):
        GeneratedTaskDraft(**_valid_draft(title="x"))


def test_draft_rejects_short_description() -> None:
    with pytest.raises(ValidationError):
        GeneratedTaskDraft(**_valid_draft(description="too short"))


def test_draft_rejects_skill_tag_weights_not_sum_to_one() -> None:
    with pytest.raises(ValidationError) as exc:
        GeneratedTaskDraft(**_valid_draft(
            skillTags=[{"skill": "correctness", "weight": 0.3}, {"skill": "design", "weight": 0.3}],
            learningGain={"correctness": 0.2, "design": 0.2},
        ))
    assert "weights must sum to 1.0" in str(exc.value)


def test_draft_accepts_skill_tag_weights_in_tolerance() -> None:
    # 0.97 is within ±0.05 of 1.0 — should pass.
    d = GeneratedTaskDraft(**_valid_draft(
        skillTags=[{"skill": "correctness", "weight": 0.6}, {"skill": "design", "weight": 0.37}],
        learningGain={"correctness": 0.4, "design": 0.2},
    ))
    assert len(d.skillTags) == 2


def test_draft_rejects_duplicate_skill_in_tags() -> None:
    with pytest.raises(ValidationError) as exc:
        GeneratedTaskDraft(**_valid_draft(
            skillTags=[{"skill": "correctness", "weight": 0.5}, {"skill": "correctness", "weight": 0.5}],
            learningGain={"correctness": 0.4},
        ))
    assert "duplicate skill" in str(exc.value)


def test_draft_rejects_learning_gain_keys_dont_match_tags() -> None:
    with pytest.raises(ValidationError) as exc:
        GeneratedTaskDraft(**_valid_draft(
            skillTags=[{"skill": "correctness", "weight": 0.6}, {"skill": "design", "weight": 0.4}],
            learningGain={"correctness": 0.4, "security": 0.2},  # wrong second key
        ))
    assert "don't match skillTags skills" in str(exc.value)


def test_draft_rejects_estimated_hours_outside_difficulty_band() -> None:
    # diff 1 band is 1-6h; 30 should fail.
    with pytest.raises(ValidationError) as exc:
        GeneratedTaskDraft(**_valid_draft(difficulty=1, estimatedHours=30))
    assert "outside band" in str(exc.value)


def test_draft_rejects_invalid_category() -> None:
    with pytest.raises(ValidationError):
        GeneratedTaskDraft(**_valid_draft(category="Frontend"))


def test_draft_rejects_invalid_expected_language() -> None:
    with pytest.raises(ValidationError):
        GeneratedTaskDraft(**_valid_draft(expectedLanguage="Rust"))


def test_draft_rejects_learning_gain_value_out_of_range() -> None:
    with pytest.raises(ValidationError):
        GeneratedTaskDraft(**_valid_draft(
            learningGain={"correctness": 1.5, "design": 0.2},
        ))


# ---------------------------------------------------------------------------
# GenerateTasksResponse
# ---------------------------------------------------------------------------


def test_response_happy_path() -> None:
    resp = GenerateTasksResponse(
        drafts=[GeneratedTaskDraft(**_valid_draft())],
        promptVersion="generate_tasks_v1",
        tokensUsed=1500,
        retryCount=0,
        batchId="abc123",
    )
    assert resp.tokensUsed == 1500
    assert resp.retryCount == 0


def test_response_rejects_empty_drafts() -> None:
    with pytest.raises(ValidationError):
        GenerateTasksResponse(
            drafts=[],
            promptVersion="generate_tasks_v1",
            tokensUsed=0,
            retryCount=0,
            batchId="abc123",
        )

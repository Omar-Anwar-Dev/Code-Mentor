"""S17-T1: Pydantic schema tests for the assessment-summary endpoint.

Covers request and response validation in isolation — no OpenAI calls,
no network. The wire shape is the contract between the AI service and
the backend Hangfire job, so any drift here surfaces immediately.
"""
from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.domain.schemas.assessment_summary import (
    AssessmentSummaryRequest,
    AssessmentSummaryResponse,
    CategoryScoreInput,
)


# ---------------------------------------------------------------------------
# CategoryScoreInput
# ---------------------------------------------------------------------------


def test_category_score_input_happy_path() -> None:
    row = CategoryScoreInput(
        category="DataStructures", score=78.0, totalAnswered=8, correctCount=6,
    )
    assert row.category == "DataStructures"
    assert row.score == 78.0
    assert row.totalAnswered == 8
    assert row.correctCount == 6


def test_category_score_input_rejects_correct_gt_answered() -> None:
    with pytest.raises(ValidationError) as exc:
        CategoryScoreInput(
            category="OOP", score=50.0, totalAnswered=3, correctCount=5,
        )
    assert "cannot exceed totalAnswered" in str(exc.value)


def test_category_score_input_rejects_score_above_100() -> None:
    with pytest.raises(ValidationError):
        CategoryScoreInput(
            category="OOP", score=101.0, totalAnswered=5, correctCount=5,
        )


def test_category_score_input_rejects_invalid_category() -> None:
    with pytest.raises(ValidationError):
        CategoryScoreInput(
            category="Unknown", score=50.0, totalAnswered=2, correctCount=1,
        )


def test_category_score_input_allows_zero_answered() -> None:
    """A category may have zero responses if the adaptive selector skipped it."""
    row = CategoryScoreInput(
        category="Security", score=0.0, totalAnswered=0, correctCount=0,
    )
    assert row.totalAnswered == 0


# ---------------------------------------------------------------------------
# AssessmentSummaryRequest
# ---------------------------------------------------------------------------


def _make_request(**overrides) -> AssessmentSummaryRequest:
    base = {
        "track": "Backend",
        "skillLevel": "Intermediate",
        "totalScore": 72.0,
        "durationSec": 1620,
        "categoryScores": [
            {"category": "DataStructures", "score": 78, "totalAnswered": 8, "correctCount": 6},
            {"category": "Algorithms", "score": 65, "totalAnswered": 7, "correctCount": 5},
            {"category": "OOP", "score": 85, "totalAnswered": 6, "correctCount": 5},
            {"category": "Databases", "score": 58, "totalAnswered": 5, "correctCount": 3},
            {"category": "Security", "score": 70, "totalAnswered": 4, "correctCount": 3},
        ],
    }
    base.update(overrides)
    return AssessmentSummaryRequest(**base)


def test_request_happy_path_all_5_categories() -> None:
    req = _make_request()
    assert req.track == "Backend"
    assert req.skillLevel == "Intermediate"
    assert len(req.categoryScores) == 5


def test_request_accepts_subset_of_categories() -> None:
    """The adaptive engine sometimes leaves a category un-asked; 1-4 categories OK."""
    req = _make_request(categoryScores=[
        {"category": "DataStructures", "score": 78, "totalAnswered": 8, "correctCount": 6},
        {"category": "Security", "score": 70, "totalAnswered": 4, "correctCount": 3},
    ])
    assert len(req.categoryScores) == 2


def test_request_rejects_empty_category_list() -> None:
    with pytest.raises(ValidationError):
        _make_request(categoryScores=[])


def test_request_rejects_more_than_5_categories() -> None:
    """Cap at 5 — there are only 5 SkillCategory enum values."""
    with pytest.raises(ValidationError):
        _make_request(categoryScores=[
            {"category": "DataStructures", "score": 78, "totalAnswered": 8, "correctCount": 6},
            {"category": "Algorithms", "score": 65, "totalAnswered": 7, "correctCount": 5},
            {"category": "OOP", "score": 85, "totalAnswered": 6, "correctCount": 5},
            {"category": "Databases", "score": 58, "totalAnswered": 5, "correctCount": 3},
            {"category": "Security", "score": 70, "totalAnswered": 4, "correctCount": 3},
            # Sixth bogus row — should be rejected by max_length=5
            {"category": "DataStructures", "score": 50, "totalAnswered": 1, "correctCount": 1},
        ])


def test_request_rejects_duplicate_categories() -> None:
    with pytest.raises(ValidationError) as exc:
        _make_request(categoryScores=[
            {"category": "OOP", "score": 80, "totalAnswered": 5, "correctCount": 4},
            {"category": "OOP", "score": 60, "totalAnswered": 3, "correctCount": 2},
        ])
    assert "duplicate category" in str(exc.value)


def test_request_rejects_invalid_track() -> None:
    with pytest.raises(ValidationError):
        _make_request(track="MachineLearning")


def test_request_rejects_invalid_skill_level() -> None:
    with pytest.raises(ValidationError):
        _make_request(skillLevel="Expert")


def test_request_rejects_total_score_out_of_range() -> None:
    with pytest.raises(ValidationError):
        _make_request(totalScore=105.0)
    with pytest.raises(ValidationError):
        _make_request(totalScore=-1.0)


def test_request_rejects_negative_duration() -> None:
    with pytest.raises(ValidationError):
        _make_request(durationSec=-5)


# ---------------------------------------------------------------------------
# AssessmentSummaryResponse
# ---------------------------------------------------------------------------


def _valid_paragraph(seed: str = "x") -> str:
    """Return a realistic-length paragraph (>50 chars after strip)."""
    return (
        f"This {seed} paragraph captures a multi-sentence response covering the "
        "candidate's pattern of strengths and weaknesses with concrete recommendations."
    )


def test_response_happy_path() -> None:
    resp = AssessmentSummaryResponse(
        strengthsParagraph=_valid_paragraph("strengths"),
        weaknessesParagraph=_valid_paragraph("weaknesses"),
        pathGuidanceParagraph=_valid_paragraph("path"),
        promptVersion="assessment_summary_v1",
        tokensUsed=1234,
        retryCount=0,
    )
    assert resp.promptVersion == "assessment_summary_v1"
    assert resp.tokensUsed == 1234
    assert resp.retryCount == 0


def test_response_strips_paragraph_whitespace() -> None:
    """Leading/trailing whitespace is trimmed by the field validator."""
    resp = AssessmentSummaryResponse(
        strengthsParagraph="   " + _valid_paragraph("a") + "  \n",
        weaknessesParagraph=_valid_paragraph("b"),
        pathGuidanceParagraph=_valid_paragraph("c"),
        promptVersion="assessment_summary_v1",
        tokensUsed=100,
        retryCount=0,
    )
    assert not resp.strengthsParagraph.startswith(" ")
    assert not resp.strengthsParagraph.endswith("\n")


def test_response_rejects_short_paragraph() -> None:
    """Min 50 chars enforced — too-short paragraphs are LLM truncation symptoms."""
    with pytest.raises(ValidationError):
        AssessmentSummaryResponse(
            strengthsParagraph="too short",
            weaknessesParagraph=_valid_paragraph("b"),
            pathGuidanceParagraph=_valid_paragraph("c"),
            promptVersion="assessment_summary_v1",
            tokensUsed=100,
            retryCount=0,
        )


def test_response_rejects_negative_tokens() -> None:
    with pytest.raises(ValidationError):
        AssessmentSummaryResponse(
            strengthsParagraph=_valid_paragraph("a"),
            weaknessesParagraph=_valid_paragraph("b"),
            pathGuidanceParagraph=_valid_paragraph("c"),
            promptVersion="assessment_summary_v1",
            tokensUsed=-1,
            retryCount=0,
        )


def test_response_rejects_negative_retry_count() -> None:
    with pytest.raises(ValidationError):
        AssessmentSummaryResponse(
            strengthsParagraph=_valid_paragraph("a"),
            weaknessesParagraph=_valid_paragraph("b"),
            pathGuidanceParagraph=_valid_paragraph("c"),
            promptVersion="assessment_summary_v1",
            tokensUsed=100,
            retryCount=-1,
        )


def test_response_rejects_empty_prompt_version() -> None:
    with pytest.raises(ValidationError):
        AssessmentSummaryResponse(
            strengthsParagraph=_valid_paragraph("a"),
            weaknessesParagraph=_valid_paragraph("b"),
            pathGuidanceParagraph=_valid_paragraph("c"),
            promptVersion="",
            tokensUsed=100,
            retryCount=0,
        )

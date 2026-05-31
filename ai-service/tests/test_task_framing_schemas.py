"""S19-T5 / F16: schema-validation tests for the per-task framing endpoint."""
from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.domain.schemas.task_framing import (
    TaskFramingRequest,
    TaskFramingResponse,
)


def _valid_request_dict(**overrides) -> dict:
    base = {
        "taskId": "T1",
        "taskTitle": "Build a Webhook Receiver",
        "taskDescription": "Design and implement an HTTP endpoint that receives signed webhooks, validates the HMAC signature, and routes to handlers per type.",
        "skillTags": [
            {"skill": "security", "weight": 0.7},
            {"skill": "correctness", "weight": 0.3},
        ],
        "learnerProfile": {"DataStructures": 50.0, "Security": 35.0},
        "track": "Backend",
        "learnerLevel": "Beginner",
    }
    base.update(overrides)
    return base


def _valid_response_dict(**overrides) -> dict:
    base = {
        "whyThisMatters": (
            "Your Security score is 35/100 — this task closes a real gap by "
            "exercising HMAC validation in a production-shape flow."
        ),
        "focusAreas": [
            "Verify HMAC signatures before any state changes.",
            "Reject replays via a nonce or timestamp window.",
        ],
        "commonPitfalls": [
            "Comparing HMACs with string equality leaks timing info.",
            "Trusting Content-Type instead of the signed body.",
        ],
        "promptVersion": "task_framing_v1",
        "tokensUsed": 250,
        "retryCount": 0,
    }
    base.update(overrides)
    return base


# ---------------------------------------------------------------------------
# Request side
# ---------------------------------------------------------------------------


def test_request_happy_path() -> None:
    TaskFramingRequest(**_valid_request_dict())


def test_request_skill_tag_weight_out_of_range_rejected() -> None:
    bad = _valid_request_dict()
    bad["skillTags"] = [{"skill": "security", "weight": 1.5}]
    with pytest.raises(ValidationError):
        TaskFramingRequest(**bad)


def test_request_learner_profile_empty_rejected() -> None:
    with pytest.raises(ValidationError, match="at least one category"):
        TaskFramingRequest(**_valid_request_dict(learnerProfile={}))


def test_request_learner_profile_out_of_range_rejected() -> None:
    with pytest.raises(ValidationError):
        TaskFramingRequest(**_valid_request_dict(learnerProfile={"X": 150.0}))


def test_request_invalid_track_rejected() -> None:
    with pytest.raises(ValidationError):
        TaskFramingRequest(**_valid_request_dict(track="Mobile"))


def test_request_short_description_rejected() -> None:
    with pytest.raises(ValidationError):
        TaskFramingRequest(**_valid_request_dict(taskDescription="too short"))


# ---------------------------------------------------------------------------
# Response side
# ---------------------------------------------------------------------------


def test_response_happy_path() -> None:
    TaskFramingResponse(**_valid_response_dict())


def test_response_why_too_short_rejected() -> None:
    with pytest.raises(ValidationError):
        TaskFramingResponse(**_valid_response_dict(whyThisMatters="too short"))


def test_response_focus_areas_too_few_rejected() -> None:
    with pytest.raises(ValidationError):
        TaskFramingResponse(**_valid_response_dict(focusAreas=["only one bullet here"]))


def test_response_focus_areas_too_many_rejected() -> None:
    with pytest.raises(ValidationError):
        TaskFramingResponse(**_valid_response_dict(focusAreas=[
            "bullet one is long enough",
            "bullet two is long enough",
            "bullet three is long enough",
            "bullet four is long enough",
            "bullet five is long enough",
            "bullet six is long enough",
        ]))


def test_response_bullet_too_short_rejected() -> None:
    with pytest.raises(ValidationError, match="must be 10-240"):
        TaskFramingResponse(**_valid_response_dict(focusAreas=[
            "short!",
            "long enough bullet here",
        ]))


def test_response_bullet_too_long_rejected() -> None:
    with pytest.raises(ValidationError, match="must be 10-240"):
        TaskFramingResponse(**_valid_response_dict(focusAreas=[
            "x" * 300,
            "long enough bullet here",
        ]))


def test_response_bullets_stripped_on_validation() -> None:
    r = TaskFramingResponse(**_valid_response_dict(focusAreas=[
        "   Verify HMAC signatures here.   ",
        "   Reject replays via nonces.   ",
    ]))
    assert r.focusAreas == [
        "Verify HMAC signatures here.",
        "Reject replays via nonces.",
    ]


def test_response_negative_tokens_rejected() -> None:
    with pytest.raises(ValidationError):
        TaskFramingResponse(**_valid_response_dict(tokensUsed=-1))


def test_response_retry_count_negative_rejected() -> None:
    with pytest.raises(ValidationError):
        TaskFramingResponse(**_valid_response_dict(retryCount=-1))

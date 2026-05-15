"""S19-T5 / F16: Pydantic schemas for the per-task AI framing endpoint.

    POST /api/task-framing

Generates three short pieces of orientation copy the learner sees on
the task page above the description:

- ``whyThisMatters`` — one paragraph (50-400 chars) framing the task
  in terms of the learner's actual skill scores.
- ``focusAreas``    — 2-5 short bullets (≤ 200 chars each) calling out
  what to pay attention to.
- ``commonPitfalls`` — 2-5 short bullets (≤ 200 chars each) on what
  typically goes wrong.

US-42. Backend persists the result in ``TaskFramings`` with a 7-day TTL.
"""
from __future__ import annotations

from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, Field, field_validator

PathTrack = Literal["FullStack", "Backend", "Python"]
SkillAxis = Literal["correctness", "readability", "security", "performance", "design"]
SkillCategoryName = Literal["DataStructures", "Algorithms", "OOP", "Databases", "Security"]


class TFSkillTag(BaseModel):
    skill: SkillAxis
    weight: float = Field(..., ge=0.0, le=1.0)


class TaskFramingRequest(BaseModel):
    """Backend builds this on cache miss for ``GET /api/tasks/{id}/framing``."""

    taskId: str = Field(..., min_length=1, max_length=80)
    taskTitle: str = Field(..., min_length=1, max_length=200)
    taskDescription: str = Field(..., min_length=20, max_length=4000)
    skillTags: List[TFSkillTag] = Field(..., min_length=1, max_length=5)
    learnerProfile: Dict[str, float] = Field(
        ..., description="Per-category smoothed score 0-100 from LearnerSkillProfile."
    )
    track: PathTrack
    learnerLevel: Optional[Literal["Beginner", "Intermediate", "Advanced"]] = None

    @field_validator("learnerProfile")
    @classmethod
    def _validate_learner_profile(cls, value: Dict[str, float]) -> Dict[str, float]:
        if not value:
            raise ValueError("learnerProfile must contain at least one category")
        for category, score in value.items():
            try:
                score_f = float(score)
            except (TypeError, ValueError) as exc:
                raise ValueError(f"learnerProfile[{category}] must be numeric: {exc}") from exc
            if not (0.0 <= score_f <= 100.0):
                raise ValueError(
                    f"learnerProfile[{category}]={score_f} must be in [0.0, 100.0]"
                )
        return value


class TaskFramingResponse(BaseModel):
    """3-sub-card framing payload + generation diagnostics."""

    whyThisMatters: str = Field(..., min_length=50, max_length=600)
    focusAreas: List[str] = Field(..., min_length=2, max_length=5)
    commonPitfalls: List[str] = Field(..., min_length=2, max_length=5)
    promptVersion: str = Field(..., min_length=1, max_length=64)
    tokensUsed: int = Field(..., ge=0)
    retryCount: int = Field(..., ge=0)

    @field_validator("focusAreas", "commonPitfalls")
    @classmethod
    def _trim_and_bound(cls, value: List[str]) -> List[str]:
        cleaned: List[str] = []
        for item in value:
            stripped = item.strip()
            if not (10 <= len(stripped) <= 240):
                raise ValueError(
                    f"bullet must be 10-240 chars after strip; got len={len(stripped)}"
                )
            cleaned.append(stripped)
        return cleaned

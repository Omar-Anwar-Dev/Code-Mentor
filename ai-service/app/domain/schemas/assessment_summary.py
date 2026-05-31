"""S17-T1 / F15: Pydantic schemas for the AI Assessment-Summary endpoint.

One endpoint:

    POST /api/assessment-summary

The backend forwards a structured snapshot of a Completed Assessment
(per-category scores + skill level + track + duration). The AI service
returns a 3-paragraph summary (strengths / weaknesses / path guidance)
that the FE renders above the existing radar chart on the assessment
result page.

Hard rules enforced here:
- Track is one of FullStack / Backend / Python (see ``Track`` enum).
- SkillLevel is one of Beginner / Intermediate / Advanced.
- TotalScore in [0.0, 100.0]; per-category scores in [0.0, 100.0].
- Each paragraph is 50-2000 chars after stripping (matches the prompt's
  80-180-word target with comfortable headroom on either side; tighter
  bounds would reject legitimate well-formed responses on the 95th
  percentile of variance).
- ``categoryScores`` has 1-5 entries (the engine sometimes leaves a
  category un-asked when the adaptive selector concentrates elsewhere;
  we accept any non-empty subset).
"""
from __future__ import annotations

from typing import List, Literal

from pydantic import BaseModel, Field, field_validator, model_validator


# Mirrors the backend Track enum (Domain.Assessments.Enums.Track).
AssessmentTrack = Literal["FullStack", "Backend", "Python"]

# Mirrors the backend SkillLevel enum.
AssessmentSkillLevel = Literal["Beginner", "Intermediate", "Advanced"]

# 5 categories per Question entity's SkillCategory enum.
SkillCategory = Literal["DataStructures", "Algorithms", "OOP", "Databases", "Security"]


# ---------------------------------------------------------------------------
# Request side
# ---------------------------------------------------------------------------


class CategoryScoreInput(BaseModel):
    """One per-category score row in the structured snapshot."""

    category: SkillCategory
    score: float = Field(..., ge=0.0, le=100.0)
    totalAnswered: int = Field(..., ge=0)
    correctCount: int = Field(..., ge=0)

    @model_validator(mode="after")
    def _correct_le_answered(self) -> "CategoryScoreInput":
        if self.correctCount > self.totalAnswered:
            raise ValueError(
                f"correctCount={self.correctCount} cannot exceed totalAnswered={self.totalAnswered}"
            )
        return self


class AssessmentSummaryRequest(BaseModel):
    """The full snapshot the backend forwards on Assessment Completed.

    The backend Hangfire job ``GenerateAssessmentSummaryJob`` builds this
    from the ``AssessmentResultDto`` (Application contract) — same shape
    that powers the FE radar chart, so no extra DB hit is needed.
    """

    track: AssessmentTrack
    skillLevel: AssessmentSkillLevel
    totalScore: float = Field(..., ge=0.0, le=100.0)
    durationSec: int = Field(..., ge=0)
    categoryScores: List[CategoryScoreInput] = Field(
        ..., min_length=1, max_length=5,
        description="Per-category score rows; 1-5 entries.",
    )

    @field_validator("categoryScores")
    @classmethod
    def _categories_unique(cls, value: List[CategoryScoreInput]) -> List[CategoryScoreInput]:
        seen = set()
        for row in value:
            if row.category in seen:
                raise ValueError(f"duplicate category in categoryScores: {row.category}")
            seen.add(row.category)
        return value


# ---------------------------------------------------------------------------
# Response side
# ---------------------------------------------------------------------------


class AssessmentSummaryResponse(BaseModel):
    """The AI-generated 3-paragraph summary plus generation diagnostics."""

    strengthsParagraph: str = Field(..., min_length=50, max_length=2000)
    weaknessesParagraph: str = Field(..., min_length=50, max_length=2000)
    pathGuidanceParagraph: str = Field(..., min_length=50, max_length=2000)
    promptVersion: str = Field(..., min_length=1, max_length=64)
    tokensUsed: int = Field(..., ge=0)
    retryCount: int = Field(..., ge=0, description="0 = first-try parse; 1 = needed one self-correction retry.")

    @field_validator("strengthsParagraph", "weaknessesParagraph", "pathGuidanceParagraph")
    @classmethod
    def _strip_paragraph(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("paragraph must not be empty after strip")
        return cleaned

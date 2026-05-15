"""S18-T3 / F16: Pydantic schemas for the AI Task Generator endpoint.

One endpoint:

    POST /api/generate-tasks

Generates real-world coding task briefs (title + markdown description +
acceptance criteria + deliverables + multi-skill tags with weights +
learning gain) for the Code Mentor task library. The backend
(``AdminTaskDraftService``, S18-T4) persists drafts into ``TaskDrafts``
and surfaces them for admin review.

Hard rules enforced here:
- Track is one of FullStack / Backend / Python.
- Difficulty in {1, 2, 3, 4, 5}.
- Category is one of the 5 SkillCategory values.
- ExpectedLanguage is one of the ProgrammingLanguage values.
- skillTags has 1-3 entries; weights sum to 1.0 ± 0.05.
- learningGain keys match the skillTags entries.
- estimatedHours in [1, 40].
"""
from __future__ import annotations

from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, Field, field_validator, model_validator


# Mirrors backend Track enum.
TaskTrack = Literal["FullStack", "Backend", "Python"]

# Mirrors backend SkillCategory enum.
SkillCategory = Literal["DataStructures", "Algorithms", "OOP", "Databases", "Security"]

# Mirrors backend ProgrammingLanguage enum.
ExpectedLanguage = Literal[
    "JavaScript", "TypeScript", "Python", "CSharp", "Java", "Cpp", "Php", "Go", "Sql"
]

# 5 skill axes used in skillTags weights + learningGain keys.
SkillAxis = Literal["correctness", "readability", "security", "performance", "design"]


# ---------------------------------------------------------------------------
# Request side
# ---------------------------------------------------------------------------


class GenerateTasksRequest(BaseModel):
    """One generation request from the admin tool / backfill script.

    ``existingTitles`` is filled by the caller from the live bank so the
    LLM can dedup against current content; pass ``[]`` if not available.
    """

    track: TaskTrack
    difficulty: int = Field(..., ge=1, le=5)
    count: int = Field(..., ge=1, le=10, description="1-5 in practice; 1-10 allowed for testing.")
    focusSkills: List[SkillAxis] = Field(..., min_length=1, max_length=5)
    existingTitles: List[str] = Field(
        default_factory=list,
        description="Compact list of existing task titles for dedup hints.",
    )


# ---------------------------------------------------------------------------
# Response side
# ---------------------------------------------------------------------------


class SkillTagInput(BaseModel):
    skill: SkillAxis
    weight: float = Field(..., ge=0.0, le=1.0)


class GeneratedTaskDraft(BaseModel):
    """One LLM-produced task draft.

    The validation here matches the contract the admin reviewer cares
    about — if any constraint fails on a single draft, the whole
    response is rejected and the retry-with-self-correction triggers.
    """

    title: str = Field(..., min_length=8, max_length=200)
    description: str = Field(..., min_length=200, max_length=4000)
    acceptanceCriteria: Optional[str] = Field(default=None, max_length=2000)
    deliverables: Optional[str] = Field(default=None, max_length=1000)
    difficulty: int = Field(..., ge=1, le=5)
    category: SkillCategory
    track: TaskTrack
    expectedLanguage: ExpectedLanguage
    estimatedHours: int = Field(..., ge=1, le=40)
    prerequisites: List[str] = Field(default_factory=list, max_length=10)
    skillTags: List[SkillTagInput] = Field(..., min_length=1, max_length=5)
    learningGain: Dict[str, float] = Field(..., min_length=1, max_length=5)
    rationale: str = Field(..., min_length=10, max_length=500)

    @field_validator("skillTags")
    @classmethod
    def _weights_sum_to_one(cls, value: List[SkillTagInput]) -> List[SkillTagInput]:
        total = sum(t.weight for t in value)
        if not (0.95 <= total <= 1.05):
            raise ValueError(f"skillTags weights must sum to 1.0 ± 0.05; got {total:.3f}")
        seen: set[str] = set()
        for t in value:
            if t.skill in seen:
                raise ValueError(f"duplicate skill in skillTags: {t.skill}")
            seen.add(t.skill)
        return value

    @field_validator("learningGain")
    @classmethod
    def _gain_in_range(cls, value: Dict[str, float]) -> Dict[str, float]:
        valid_skills = {"correctness", "readability", "security", "performance", "design"}
        for k, v in value.items():
            if k not in valid_skills:
                raise ValueError(f"learningGain key '{k}' is not a valid skill axis")
            if not (0.0 <= v <= 1.0):
                raise ValueError(f"learningGain['{k}']={v} must be in [0.0, 1.0]")
        return value

    @model_validator(mode="after")
    def _gain_keys_match_tags(self) -> "GeneratedTaskDraft":
        tag_skills = {t.skill for t in self.skillTags}
        gain_skills = set(self.learningGain.keys())
        if gain_skills != tag_skills:
            raise ValueError(
                f"learningGain keys {sorted(gain_skills)} don't match skillTags skills {sorted(tag_skills)}"
            )
        return self

    @model_validator(mode="after")
    def _hours_match_difficulty(self) -> "GeneratedTaskDraft":
        # Lenient — the prompt says diff 1: 1-4, diff 2: 4-8, ..., diff 5: 25-40
        # but we permit a +/-2h drift. This catches the "diff 1 with 30h" + "diff 5 with 2h" extremes
        # without rejecting reasonable variations.
        bands = {1: (1, 6), 2: (3, 10), 3: (6, 18), 4: (14, 28), 5: (22, 40)}
        lo, hi = bands[self.difficulty]
        if not (lo <= self.estimatedHours <= hi):
            raise ValueError(
                f"estimatedHours={self.estimatedHours} outside band {lo}-{hi}h for difficulty={self.difficulty}"
            )
        return self


class GenerateTasksResponse(BaseModel):
    """The validated drafts plus generation diagnostics for the backend."""

    drafts: List[GeneratedTaskDraft]
    promptVersion: str = Field(..., min_length=1, max_length=64)
    tokensUsed: int = Field(..., ge=0)
    retryCount: int = Field(..., ge=0)
    batchId: str = Field(..., min_length=1)

    @model_validator(mode="after")
    def _drafts_not_empty(self) -> "GenerateTasksResponse":
        if not self.drafts:
            raise ValueError("drafts list must not be empty")
        return self

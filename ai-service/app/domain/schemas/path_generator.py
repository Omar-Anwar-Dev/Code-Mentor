"""S19-T1 / F16: Pydantic schemas for the AI Path Generator endpoint.

    POST /api/generate-path

Hybrid two-stage architecture (ADR-052):

1. **Recall** — backend or AI service builds the candidate list:
   - When the request omits ``candidateTasks`` the AI service does
     embedding recall (cosine over :code:`TaskEmbeddingsCache`).
   - When the request includes ``candidateTasks`` we skip recall and
     use them directly — backend uses this on cache cold-start and
     tests use it to feed deterministic data.

2. **Rerank** — the LLM receives the candidates + learner context and
   returns an ordered path with per-task reasoning + overall narrative.

The schemas enforce the surface invariants the validator + backend
expect: dense order indices, unique task IDs, target-length match,
skill profile in [0, 100], and per-candidate weight sum-to-one.
"""
from __future__ import annotations

from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, Field, field_validator, model_validator


PathTrack = Literal["FullStack", "Backend", "Python"]
SkillAxis = Literal["correctness", "readability", "security", "performance", "design"]
SkillCategoryName = Literal["DataStructures", "Algorithms", "OOP", "Databases", "Security"]


class PathSkillTag(BaseModel):
    """One {skill, weight} pair. Used inside :code:`CandidateTaskInput.skillTags`
    + :code:`TaskEmbeddingCacheUpsertRequest.skillTags`."""

    skill: SkillAxis
    weight: float = Field(..., ge=0.0, le=1.0)


def _weights_sum_check(tags: List[PathSkillTag]) -> None:
    total = sum(t.weight for t in tags)
    if not (0.90 <= total <= 1.10):
        raise ValueError(f"skillTags weights must sum to 1.0 ± 0.10; got {total:.3f}")
    seen: set[str] = set()
    for t in tags:
        if t.skill in seen:
            raise ValueError(f"duplicate skill in skillTags: {t.skill}")
        seen.add(t.skill)


class CandidateTaskInput(BaseModel):
    """One candidate task fed to the LLM rerank stage.

    Either produced by the AI service's recall stage or passed inline
    by the backend (cache cold-start / tests). The shape mirrors the
    metadata stored alongside the embedding so the rerank prompt can
    reason about prerequisites + skill targeting without an extra
    round-trip.
    """

    taskId: str = Field(..., min_length=1, max_length=80)
    title: str = Field(..., min_length=1, max_length=200)
    descriptionSummary: str = Field(..., min_length=1, max_length=1200)
    skillTags: List[PathSkillTag] = Field(..., min_length=1, max_length=5)
    learningGain: Dict[str, float] = Field(..., min_length=1, max_length=5)
    difficulty: int = Field(..., ge=1, le=5)
    prerequisites: List[str] = Field(default_factory=list, max_length=10)
    track: PathTrack
    expectedLanguage: Optional[str] = Field(default=None, max_length=32)
    category: Optional[SkillCategoryName] = None
    estimatedHours: Optional[int] = Field(default=None, ge=1, le=40)

    @field_validator("skillTags")
    @classmethod
    def _weights_sum_to_one(cls, value: List[PathSkillTag]) -> List[PathSkillTag]:
        _weights_sum_check(value)
        return value


class GeneratePathRequest(BaseModel):
    """Backend builds this when :code:`GenerateLearningPathJob` fires.

    ``candidateTasks`` is optional — when None the AI service recall
    stage runs; when populated, recall is bypassed.
    """

    skillProfile: Dict[str, float] = Field(
        ...,
        description="Per-category skill scores 0-100 from LearnerSkillProfile.",
    )
    track: PathTrack
    completedTaskIds: List[str] = Field(
        default_factory=list,
        max_length=200,
        description="Task IDs already completed; excluded from candidates + the result.",
    )
    assessmentSummaryText: Optional[str] = Field(
        default=None,
        max_length=4000,
        description="Free-form text from /api/assessment-summary; grounds the rerank prompt.",
    )
    targetLength: int = Field(default=8, ge=3, le=12)
    recallTopK: int = Field(default=20, ge=5, le=50)
    candidateTasks: Optional[List[CandidateTaskInput]] = Field(
        default=None,
        description="Bypass for the AI service's recall stage — pre-fetched candidates. When None the cache is used.",
    )

    @field_validator("skillProfile")
    @classmethod
    def _validate_skill_profile(cls, value: Dict[str, float]) -> Dict[str, float]:
        if not value:
            raise ValueError("skillProfile must contain at least one category.")
        for category, score in value.items():
            try:
                score_f = float(score)
            except (TypeError, ValueError) as exc:
                raise ValueError(f"skillProfile[{category}] must be numeric: {exc}") from exc
            if not (0.0 <= score_f <= 100.0):
                raise ValueError(
                    f"skillProfile[{category}]={score_f} must be in [0.0, 100.0]"
                )
        return value

    @model_validator(mode="after")
    def _candidate_tasks_have_enough_for_target(self) -> "GeneratePathRequest":
        if self.candidateTasks is None:
            return self
        if len(self.candidateTasks) < self.targetLength:
            raise ValueError(
                f"candidateTasks ({len(self.candidateTasks)}) < targetLength "
                f"({self.targetLength}) — caller must provide ≥ targetLength candidates"
            )
        ids = [c.taskId for c in self.candidateTasks]
        if len(set(ids)) != len(ids):
            raise ValueError("duplicate taskId in candidateTasks")
        completed = set(self.completedTaskIds)
        overlap = completed.intersection(ids)
        if overlap:
            raise ValueError(
                f"candidateTasks contains already-completed task(s): {sorted(overlap)}"
            )
        return self


class GeneratedPathEntry(BaseModel):
    """One task in the generated path with the LLM's per-task reasoning."""

    taskId: str = Field(..., min_length=1, max_length=80)
    orderIndex: int = Field(..., ge=1, le=12)
    reasoning: str = Field(
        ...,
        min_length=10,
        max_length=500,
        description="1-2 sentences mentioning the learner's actual scores + what this task targets.",
    )


class GeneratePathResponse(BaseModel):
    """Validated path + diagnostics for backend persistence + audit."""

    pathTasks: List[GeneratedPathEntry] = Field(..., min_length=1, max_length=12)
    overallReasoning: str = Field(
        ...,
        min_length=20,
        max_length=2000,
        description="LLM's overall narrative; persisted in LearningPath.GenerationReasoningText.",
    )
    recallSize: int = Field(
        ...,
        ge=0,
        description="Number of candidates considered after recall (or len(candidateTasks) if bypassed).",
    )
    promptVersion: str = Field(..., min_length=1, max_length=64)
    tokensUsed: int = Field(..., ge=0)
    retryCount: int = Field(..., ge=0)

    @model_validator(mode="after")
    def _order_indices_dense_and_unique(self) -> "GeneratePathResponse":
        n = len(self.pathTasks)
        seen_indices = sorted(p.orderIndex for p in self.pathTasks)
        if seen_indices != list(range(1, n + 1)):
            raise ValueError(
                f"orderIndex must be dense 1..{n}; got {seen_indices}"
            )
        ids = [p.taskId for p in self.pathTasks]
        if len(set(ids)) != len(ids):
            raise ValueError("duplicate taskId in pathTasks")
        return self


# --- cache-population endpoint (called by the backend EmbedEntityJob<Task>) ---


class TaskEmbeddingCacheUpsertRequest(BaseModel):
    """Backend POSTs this once per Task approve to seed the AI cache.

    Carries the embedding vector plus the metadata the LLM rerank
    prompt needs. Sent after :code:`POST /api/embed` writes the vector
    to ``Tasks.EmbeddingJson`` on the backend side.
    """

    taskId: str = Field(..., min_length=1, max_length=80)
    vector: List[float] = Field(..., min_length=8)
    title: str = Field(..., min_length=1, max_length=200)
    descriptionSummary: str = Field(..., min_length=1, max_length=1200)
    skillTags: List[PathSkillTag] = Field(..., min_length=1, max_length=5)
    learningGain: Dict[str, float] = Field(default_factory=dict, max_length=5)
    difficulty: int = Field(..., ge=1, le=5)
    prerequisites: List[str] = Field(default_factory=list, max_length=10)
    track: PathTrack
    expectedLanguage: Optional[str] = Field(default=None, max_length=32)
    category: Optional[SkillCategoryName] = None
    estimatedHours: Optional[int] = Field(default=None, ge=1, le=40)

    @field_validator("skillTags")
    @classmethod
    def _check_skill_tags(cls, value: List[PathSkillTag]) -> List[PathSkillTag]:
        _weights_sum_check(value)
        return value


class TaskEmbeddingCacheUpsertResponse(BaseModel):
    """Acknowledgement returned to the backend job."""

    ok: bool = True
    taskId: str
    cacheSize: int = Field(..., ge=0)

"""S20-T1 / F16: Pydantic schemas for the AI Path Adaptation endpoint.

    POST /api/adapt-path

Signal-driven action plan generator. The backend computes a
:code:`signalLevel` from the post-submission score swing + completed
count, and passes it to the AI service. The model produces an action
plan whose **scope** is enforced server-side by these schemas:

- ``signal_level == "no_action"`` → action list MUST be empty.
- ``signal_level == "small"``     → only ``reorder`` allowed; no swaps.
- ``signal_level == "medium"``    → reorder + swap allowed.
- ``signal_level == "large"``     → reorder + swap allowed; multiple swaps OK.

Swap actions require ``newTaskId`` and that ID MUST appear in the
caller-supplied :code:`candidateReplacements`. Reorder actions require
``newTaskId is None``.

Backend layer enforces two additional rules outside this schema:
1. **Auto-apply 3-of-3** (`type==reorder AND confidence>0.8 AND
   intra-skill-area`) gating between Pending and AutoApplied —
   enforced in :code:`PathAdaptationJob`, not here.
2. **Cooldown** (24h, bypassed by Completion100/OnDemand) — enforced
   in :code:`PathAdaptationJob`, not here.
"""
from __future__ import annotations

from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, Field, field_validator, model_validator


SignalLevel = Literal["no_action", "small", "medium", "large"]
AdaptationActionType = Literal["reorder", "swap"]

# Shared with path_generator: we mirror the SkillAxis literal here rather than
# importing from path_generator to keep the two endpoints loosely coupled.
SkillAxis = Literal["correctness", "readability", "security", "performance", "design"]
PathTrack = Literal["FullStack", "Backend", "Python"]


class AdaptSkillTag(BaseModel):
    """One {skill, weight} pair attached to a task. Used inside the current
    path entries and the candidate replacements."""

    skill: SkillAxis
    weight: float = Field(..., ge=0.0, le=1.0)


def _weights_sum_check(tags: List[AdaptSkillTag]) -> None:
    total = sum(t.weight for t in tags)
    if not (0.85 <= total <= 1.15):
        # Tolerance widened vs. path_generator (1.0±0.10) to accept
        # already-persisted skill tags that drifted slightly during
        # admin edits; the validator here is informational, not the
        # source of truth.
        raise ValueError(f"skillTags weights must sum to 1.0 ± 0.15; got {total:.3f}")
    seen: set[str] = set()
    for t in tags:
        if t.skill in seen:
            raise ValueError(f"duplicate skill in skillTags: {t.skill}")
        seen.add(t.skill)


class CurrentPathEntry(BaseModel):
    """One entry in the learner's current path. ``status`` mirrors
    :code:`PathTask.Status` from the backend domain."""

    pathTaskId: str = Field(..., min_length=1, max_length=80)
    taskId: str = Field(..., min_length=1, max_length=80)
    title: str = Field(..., min_length=1, max_length=200)
    orderIndex: int = Field(..., ge=1, le=20)
    status: Literal["NotStarted", "InProgress", "Completed", "Skipped"]
    skillTags: List[AdaptSkillTag] = Field(..., min_length=1, max_length=5)

    @field_validator("skillTags")
    @classmethod
    def _check_skill_tags(cls, value: List[AdaptSkillTag]) -> List[AdaptSkillTag]:
        _weights_sum_check(value)
        return value


class RecentSubmissionInput(BaseModel):
    """A recent submission's scoring outcome — last 3 are passed in by
    the backend when the job fires. Drives the "why now" reasoning the
    model writes into the per-action ``reason`` string.
    """

    taskId: str = Field(..., min_length=1, max_length=80)
    overallScore: float = Field(..., ge=0.0, le=100.0)
    scoresPerCategory: Dict[str, float] = Field(..., min_length=1, max_length=10)
    summaryText: Optional[str] = Field(default=None, max_length=2000)

    @field_validator("scoresPerCategory")
    @classmethod
    def _validate_scores(cls, value: Dict[str, float]) -> Dict[str, float]:
        for cat, score in value.items():
            try:
                score_f = float(score)
            except (TypeError, ValueError) as exc:
                raise ValueError(f"scoresPerCategory[{cat}] must be numeric: {exc}") from exc
            if not (0.0 <= score_f <= 100.0):
                raise ValueError(
                    f"scoresPerCategory[{cat}]={score_f} must be in [0.0, 100.0]"
                )
        return value


class CandidateReplacement(BaseModel):
    """A task the model MAY swap into the path for a ``swap`` action.

    Backend builds this from the same task_embeddings_cache the
    Path Generator uses — top-K cosine over the learner's updated
    skill profile, excluding the path's existing taskIds + completed
    taskIds. For ``signal_level=small`` the field is normally empty
    since swaps aren't allowed at that level.
    """

    taskId: str = Field(..., min_length=1, max_length=80)
    title: str = Field(..., min_length=1, max_length=200)
    descriptionSummary: str = Field(..., min_length=1, max_length=1200)
    difficulty: int = Field(..., ge=1, le=5)
    skillTags: List[AdaptSkillTag] = Field(..., min_length=1, max_length=5)
    prerequisites: List[str] = Field(default_factory=list, max_length=10)

    @field_validator("skillTags")
    @classmethod
    def _check_skill_tags(cls, value: List[AdaptSkillTag]) -> List[AdaptSkillTag]:
        _weights_sum_check(value)
        return value


class AdaptPathRequest(BaseModel):
    """Backend payload to :code:`POST /api/adapt-path`.

    Required fields are everything the prompt needs to make a decision:
    the current path snapshot, the learner's updated skill profile, the
    last 3 submissions' scores, the computed signal level, and the
    candidate replacement pool.
    """

    currentPath: List[CurrentPathEntry] = Field(..., min_length=1, max_length=20)
    recentSubmissions: List[RecentSubmissionInput] = Field(
        default_factory=list, max_length=10,
    )
    signalLevel: SignalLevel
    skillProfile: Dict[str, float] = Field(
        ...,
        description="Per-category skill scores 0-100 from LearnerSkillProfile (after submission).",
    )
    candidateReplacements: List[CandidateReplacement] = Field(
        default_factory=list, max_length=30,
    )
    completedTaskIds: List[str] = Field(default_factory=list, max_length=200)
    track: PathTrack

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
    def _path_invariants(self) -> "AdaptPathRequest":
        # currentPath order indices must be dense 1..N
        n = len(self.currentPath)
        seen_indices = sorted(p.orderIndex for p in self.currentPath)
        if seen_indices != list(range(1, n + 1)):
            raise ValueError(
                f"currentPath orderIndex must be dense 1..{n}; got {seen_indices}"
            )
        # currentPath taskIds must be unique
        ids = [p.taskId for p in self.currentPath]
        if len(set(ids)) != len(ids):
            raise ValueError("duplicate taskId in currentPath")
        # candidateReplacements taskIds must be unique
        cand_ids = [c.taskId for c in self.candidateReplacements]
        if len(set(cand_ids)) != len(cand_ids):
            raise ValueError("duplicate taskId in candidateReplacements")
        # candidateReplacements must not overlap with currentPath or completed
        path_set = set(ids)
        completed_set = set(self.completedTaskIds)
        for c in self.candidateReplacements:
            if c.taskId in path_set:
                raise ValueError(
                    f"candidateReplacements contains taskId already in currentPath: {c.taskId}"
                )
            if c.taskId in completed_set:
                raise ValueError(
                    f"candidateReplacements contains already-completed taskId: {c.taskId}"
                )
        return self


class ProposedAction(BaseModel):
    """One action the model proposes. Backend's :code:`PathAdaptationJob`
    decides per action whether to AutoApply (3-of-3 rule) or stage as
    Pending for learner approval.
    """

    type: AdaptationActionType
    targetPosition: int = Field(
        ...,
        ge=1,
        le=20,
        description="1-based position in the current path to apply this action against.",
    )
    newTaskId: Optional[str] = Field(
        default=None,
        max_length=80,
        description="Required for swap; null for reorder.",
    )
    newOrderIndex: Optional[int] = Field(
        default=None,
        ge=1,
        le=20,
        description="For reorder: the new 1-based position. Required for reorder; null for swap.",
    )
    reason: str = Field(
        ...,
        min_length=10,
        max_length=500,
        description="1-sentence justification grounded in the learner's recent scores.",
    )
    confidence: float = Field(..., ge=0.0, le=1.0)

    @model_validator(mode="after")
    def _shape_per_type(self) -> "ProposedAction":
        if self.type == "swap":
            if self.newTaskId is None or not self.newTaskId.strip():
                raise ValueError("swap action requires newTaskId.")
            if self.newOrderIndex is not None:
                raise ValueError("swap action must NOT set newOrderIndex (keeps the same position).")
        elif self.type == "reorder":
            if self.newTaskId is not None:
                raise ValueError("reorder action must NOT set newTaskId.")
            if self.newOrderIndex is None:
                raise ValueError("reorder action requires newOrderIndex.")
            if self.newOrderIndex == self.targetPosition:
                raise ValueError(
                    "reorder action newOrderIndex must differ from targetPosition (no-op reorder is invalid)."
                )
        return self


class AdaptPathResponse(BaseModel):
    """Validated adaptation plan + diagnostics for backend persistence."""

    actions: List[ProposedAction] = Field(..., max_length=10)
    overallReasoning: str = Field(
        ...,
        min_length=10,
        max_length=2000,
        description="LLM's overall narrative; persisted in PathAdaptationEvents.AIReasoningText.",
    )
    signalLevel: SignalLevel = Field(
        ...,
        description="Echoed back from the request — backend uses it for the audit log.",
    )
    promptVersion: str = Field(..., min_length=1, max_length=64)
    tokensUsed: int = Field(..., ge=0)
    retryCount: int = Field(..., ge=0)

    @model_validator(mode="after")
    def _check_signal_scope(self) -> "AdaptPathResponse":
        # signal_level=no_action → actions MUST be empty
        if self.signalLevel == "no_action" and len(self.actions) > 0:
            raise ValueError(
                "signalLevel=no_action requires an empty actions list; "
                f"got {len(self.actions)} action(s)."
            )
        # signal_level=small → no swaps allowed
        if self.signalLevel == "small":
            for idx, action in enumerate(self.actions):
                if action.type == "swap":
                    raise ValueError(
                        f"signalLevel=small allows only 'reorder' actions; "
                        f"actions[{idx}] is a swap."
                    )
        # Multiple actions on the same targetPosition would be ambiguous —
        # the backend applies them in order, but if two reorders point at the
        # same source position the second one's source is stale. Reject.
        target_counts: Dict[int, int] = {}
        for action in self.actions:
            target_counts[action.targetPosition] = (
                target_counts.get(action.targetPosition, 0) + 1
            )
        duplicate_targets = sorted(
            pos for pos, count in target_counts.items() if count > 1
        )
        if duplicate_targets:
            raise ValueError(
                f"multiple actions target the same position(s): {duplicate_targets}; "
                "each position can be acted on at most once per cycle."
            )
        return self

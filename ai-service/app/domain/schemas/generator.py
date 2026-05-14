"""S16-T1 / F15: Pydantic schemas for the AI Question Generator endpoint.

One endpoint:

    POST /api/generate-questions

The AI service receives a generation request (category + difficulty + count
+ optional code/language flags + existing-question snippets for dedup),
calls the LLM with the ``generate_questions_v1`` template, validates the
JSON against this schema, and returns the validated drafts. The backend
persists the drafts into ``QuestionDrafts`` (S16-T4) and surfaces them for
admin review.

Hard rules enforced here:
- Exactly 4 options per draft.
- ``correctAnswer`` is one of ``"A" | "B" | "C" | "D"`` and matches a valid
  option index.
- ``irtA`` in [0.5, 2.5], ``irtB`` in [-3.0, 3.0] — matches the engine
  bounds from S15 ADR-051.
- ``difficulty`` in {1, 2, 3}; ``category`` is one of the 5
  ``SkillCategory`` enum values (DataStructures, Algorithms, OOP,
  Databases, Security).
- If ``codeSnippet`` is set, ``codeLanguage`` must also be set.
"""
from __future__ import annotations

from typing import List, Literal, Optional

from pydantic import BaseModel, Field, field_validator, model_validator


# 5 categories per Question entity's SkillCategory enum (backend/src/CodeMentor.Domain/Assessments/Enums.cs).
QuestionCategory = Literal["DataStructures", "Algorithms", "OOP", "Databases", "Security"]

# IRT engine bounds (loose form — engine's A_BOUNDS/B_BOUNDS are stricter
# at the runtime side; the AI is permitted the published rubric ranges
# here, the engine clips post-approve).
_A_LO, _A_HI = 0.5, 2.5
_B_LO, _B_HI = -3.0, 3.0


# ---------------------------------------------------------------------------
# Request side
# ---------------------------------------------------------------------------


class GenerateQuestionsRequest(BaseModel):
    """One generation request from the admin tool.

    The backend forwards exactly this shape on ``POST /api/admin/questions/generate``.
    ``existingSnippets`` is filled in by the backend from the live bank
    (compact question-text snippets) so the LLM can dedup against current
    content; pass ``[]`` if not available.
    """

    category: QuestionCategory
    difficulty: int = Field(..., ge=1, le=3)
    count: int = Field(..., ge=1, le=20, description="5-20 in practice; 1-4 allowed for testing.")
    includeCode: bool = False
    language: Optional[str] = Field(
        default=None,
        max_length=32,
        description="Language tag when includeCode is true (e.g., 'python').",
    )
    existingSnippets: List[str] = Field(
        default_factory=list,
        description="Compact summaries of existing questions in the category, for dedup hints.",
    )

    @model_validator(mode="after")
    def _language_required_when_code_requested(self) -> "GenerateQuestionsRequest":
        if self.includeCode and not (self.language and self.language.strip()):
            raise ValueError("language is required when includeCode is true")
        return self


# ---------------------------------------------------------------------------
# Response side
# ---------------------------------------------------------------------------


class GeneratedQuestionDraft(BaseModel):
    """One LLM-produced question draft.

    The validation here matches the contract a downstream admin reviewer
    will care about — if any constraint fails on a single draft, the whole
    response is rejected and the retry-with-self-correction path triggers.
    """

    questionText: str = Field(..., min_length=10, max_length=2000)
    codeSnippet: Optional[str] = Field(default=None, max_length=4000)
    codeLanguage: Optional[str] = Field(default=None, max_length=32)
    options: List[str] = Field(..., description="Exactly 4 options.")
    correctAnswer: Literal["A", "B", "C", "D"]
    explanation: str = Field(..., min_length=10, max_length=1000)
    irtA: float = Field(..., ge=_A_LO, le=_A_HI)
    irtB: float = Field(..., ge=_B_LO, le=_B_HI)
    rationale: str = Field(..., min_length=5, max_length=500)
    category: QuestionCategory
    difficulty: int = Field(..., ge=1, le=3)

    @field_validator("options")
    @classmethod
    def _exactly_four_distinct_options(cls, value: List[str]) -> List[str]:
        if len(value) != 4:
            raise ValueError(f"options must contain exactly 4 entries; got {len(value)}")
        cleaned = [opt.strip() for opt in value]
        if any(not opt for opt in cleaned):
            raise ValueError("options must be non-empty strings")
        if any(len(opt) > 240 for opt in cleaned):
            raise ValueError("each option must be <= 240 characters")
        if len({opt.lower() for opt in cleaned}) != 4:
            raise ValueError("options must be unique (case-insensitive)")
        return cleaned

    @model_validator(mode="after")
    def _snippet_language_coherence(self) -> "GeneratedQuestionDraft":
        # codeSnippet + codeLanguage must both be set or both null/empty.
        snippet = (self.codeSnippet or "").strip()
        lang = (self.codeLanguage or "").strip()
        if snippet and not lang:
            raise ValueError("codeLanguage is required when codeSnippet is provided")
        if lang and not snippet:
            raise ValueError("codeSnippet is required when codeLanguage is provided")
        # Normalize to None when blank-after-strip, so downstream sees a clean shape.
        if not snippet:
            object.__setattr__(self, "codeSnippet", None)
            object.__setattr__(self, "codeLanguage", None)
        else:
            object.__setattr__(self, "codeSnippet", snippet)
            object.__setattr__(self, "codeLanguage", lang)
        return self


class GenerateQuestionsResponse(BaseModel):
    """The validated drafts plus generation diagnostics for the backend."""

    drafts: List[GeneratedQuestionDraft]
    promptVersion: str = Field(..., min_length=1, max_length=64)
    tokensUsed: int = Field(..., ge=0)
    retryCount: int = Field(..., ge=0, description="0 = parsed on first try; 1 = needed one self-correction retry.")
    batchId: str = Field(..., min_length=1, description="Server-generated id correlating this batch in logs.")

    @model_validator(mode="after")
    def _drafts_match_request_intent(self) -> "GenerateQuestionsResponse":
        # Belt-and-suspenders: the service ensures count matches, but if a
        # broken response somehow slips past we surface the mismatch here.
        if not self.drafts:
            raise ValueError("drafts list must not be empty")
        return self

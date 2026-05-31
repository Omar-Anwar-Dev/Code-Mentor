"""S16-T1: Pydantic schema tests for the AI Question Generator.

Covers the validation invariants on the request/response/draft contracts.
No OpenAI calls — pure pydantic exercise.
"""
from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.domain.schemas.generator import (
    GenerateQuestionsRequest,
    GenerateQuestionsResponse,
    GeneratedQuestionDraft,
)


def _draft(**overrides):
    """Build a minimal valid GeneratedQuestionDraft, allow per-field overrides."""
    base = dict(
        questionText="What is the time complexity of accessing an array element by index?",
        codeSnippet=None,
        codeLanguage=None,
        options=["O(1)", "O(log n)", "O(n)", "O(n log n)"],
        correctAnswer="A",
        explanation="Array access by index is constant time because the address can be computed directly.",
        irtA=1.2,
        irtB=-1.5,
        rationale="Basic recall-level question; b matches difficulty=1.",
        category="DataStructures",
        difficulty=1,
    )
    base.update(overrides)
    return base


# ---------------------------------------------------------------------------
# Request validation
# ---------------------------------------------------------------------------


class TestGenerateQuestionsRequest:
    def test_minimum_valid_request(self) -> None:
        req = GenerateQuestionsRequest(
            category="DataStructures", difficulty=2, count=5,
        )
        assert req.includeCode is False
        assert req.language is None
        assert req.existingSnippets == []

    def test_count_capped_at_20(self) -> None:
        with pytest.raises(ValidationError):
            GenerateQuestionsRequest(category="Algorithms", difficulty=1, count=21)

    def test_count_floor_is_1(self) -> None:
        with pytest.raises(ValidationError):
            GenerateQuestionsRequest(category="Algorithms", difficulty=1, count=0)

    def test_difficulty_bounded(self) -> None:
        with pytest.raises(ValidationError):
            GenerateQuestionsRequest(category="OOP", difficulty=4, count=5)
        with pytest.raises(ValidationError):
            GenerateQuestionsRequest(category="OOP", difficulty=0, count=5)

    def test_invalid_category_rejected(self) -> None:
        with pytest.raises(ValidationError):
            GenerateQuestionsRequest(category="NotACategory", difficulty=1, count=5)  # type: ignore[arg-type]

    def test_language_required_when_includeCode_true(self) -> None:
        with pytest.raises(ValidationError) as exc:
            GenerateQuestionsRequest(
                category="Algorithms", difficulty=2, count=5, includeCode=True,
            )
        assert "language is required" in str(exc.value)

    def test_includeCode_with_language_is_valid(self) -> None:
        req = GenerateQuestionsRequest(
            category="Algorithms", difficulty=2, count=5,
            includeCode=True, language="python",
        )
        assert req.language == "python"


# ---------------------------------------------------------------------------
# Draft validation
# ---------------------------------------------------------------------------


class TestGeneratedQuestionDraft:
    def test_minimum_valid_draft(self) -> None:
        draft = GeneratedQuestionDraft(**_draft())
        assert draft.correctAnswer == "A"
        assert len(draft.options) == 4

    def test_exactly_four_options_required(self) -> None:
        with pytest.raises(ValidationError) as exc:
            GeneratedQuestionDraft(**_draft(options=["O(1)", "O(n)", "O(log n)"]))
        assert "exactly 4 entries" in str(exc.value)

        with pytest.raises(ValidationError) as exc:
            GeneratedQuestionDraft(**_draft(
                options=["O(1)", "O(n)", "O(log n)", "O(n^2)", "O(n^3)"],
            ))
        assert "exactly 4 entries" in str(exc.value)

    def test_duplicate_options_rejected_case_insensitive(self) -> None:
        with pytest.raises(ValidationError):
            GeneratedQuestionDraft(**_draft(
                options=["O(1)", "o(1)", "O(n)", "O(log n)"],
            ))

    def test_correct_answer_must_be_letter(self) -> None:
        with pytest.raises(ValidationError):
            GeneratedQuestionDraft(**_draft(correctAnswer="E"))  # type: ignore[arg-type]
        with pytest.raises(ValidationError):
            GeneratedQuestionDraft(**_draft(correctAnswer="1"))  # type: ignore[arg-type]

    def test_irtA_bounded(self) -> None:
        with pytest.raises(ValidationError):
            GeneratedQuestionDraft(**_draft(irtA=3.0))
        with pytest.raises(ValidationError):
            GeneratedQuestionDraft(**_draft(irtA=0.4))

    def test_irtB_bounded(self) -> None:
        with pytest.raises(ValidationError):
            GeneratedQuestionDraft(**_draft(irtB=3.5))
        with pytest.raises(ValidationError):
            GeneratedQuestionDraft(**_draft(irtB=-3.5))

    def test_difficulty_bounded(self) -> None:
        with pytest.raises(ValidationError):
            GeneratedQuestionDraft(**_draft(difficulty=4))
        with pytest.raises(ValidationError):
            GeneratedQuestionDraft(**_draft(difficulty=0))

    def test_snippet_requires_language_and_vice_versa(self) -> None:
        # snippet without language → reject
        with pytest.raises(ValidationError) as exc:
            GeneratedQuestionDraft(**_draft(
                codeSnippet="print('hi')",
                codeLanguage=None,
            ))
        assert "codeLanguage is required" in str(exc.value)

        # language without snippet → reject
        with pytest.raises(ValidationError) as exc:
            GeneratedQuestionDraft(**_draft(
                codeSnippet=None,
                codeLanguage="python",
            ))
        assert "codeSnippet is required" in str(exc.value)

    def test_snippet_with_language_round_trips(self) -> None:
        draft = GeneratedQuestionDraft(**_draft(
            codeSnippet="def f(x):\n    return x + 1",
            codeLanguage="python",
        ))
        assert draft.codeSnippet == "def f(x):\n    return x + 1"
        assert draft.codeLanguage == "python"

    def test_blank_snippet_normalises_to_none(self) -> None:
        draft = GeneratedQuestionDraft(**_draft(
            codeSnippet="   ",
            codeLanguage="   ",
        ))
        assert draft.codeSnippet is None
        assert draft.codeLanguage is None


# ---------------------------------------------------------------------------
# Response envelope
# ---------------------------------------------------------------------------


class TestGenerateQuestionsResponse:
    def test_round_trip_envelope(self) -> None:
        resp = GenerateQuestionsResponse(
            drafts=[GeneratedQuestionDraft(**_draft()).model_dump()],
            promptVersion="generate_questions_v1",
            tokensUsed=1234,
            retryCount=0,
            batchId="batch_abc123",
        )
        assert resp.promptVersion == "generate_questions_v1"
        assert resp.retryCount == 0
        assert len(resp.drafts) == 1

    def test_empty_drafts_rejected(self) -> None:
        with pytest.raises(ValidationError) as exc:
            GenerateQuestionsResponse(
                drafts=[],
                promptVersion="generate_questions_v1",
                tokensUsed=0,
                retryCount=0,
                batchId="batch_empty",
            )
        assert "drafts list must not be empty" in str(exc.value)

    def test_negative_token_count_rejected(self) -> None:
        with pytest.raises(ValidationError):
            GenerateQuestionsResponse(
                drafts=[GeneratedQuestionDraft(**_draft()).model_dump()],
                promptVersion="generate_questions_v1",
                tokensUsed=-1,
                retryCount=0,
                batchId="batch_x",
            )

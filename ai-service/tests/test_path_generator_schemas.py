"""S19-T1 / F16: schema-validation tests for the path-generator wire shapes.

Covers the Pydantic surface of:
- :class:`CandidateTaskInput`  (skillTags weight sum-to-one)
- :class:`GeneratePathRequest` (skillProfile range, completed-vs-candidate
  overlap rejection, targetLength bounds)
- :class:`GeneratedPathEntry` (length bounds)
- :class:`GeneratePathResponse` (dense order indices, unique IDs)
- :class:`TaskEmbeddingCacheUpsertRequest` (weight sum-to-one)
"""
from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.domain.schemas.path_generator import (
    CandidateTaskInput,
    GeneratedPathEntry,
    GeneratePathRequest,
    GeneratePathResponse,
    TaskEmbeddingCacheUpsertRequest,
)


def _candidate(
    task_id: str = "T1",
    *,
    difficulty: int = 2,
    prereqs: list[str] | None = None,
) -> dict:
    return {
        "taskId": task_id,
        "title": f"Title for {task_id}",
        "descriptionSummary": "A multi-skill backend task summary.",
        "skillTags": [
            {"skill": "correctness", "weight": 0.6},
            {"skill": "design", "weight": 0.4},
        ],
        "learningGain": {"correctness": 0.5, "design": 0.4},
        "difficulty": difficulty,
        "prerequisites": prereqs or [],
        "track": "FullStack",
    }


def _valid_request(**overrides) -> dict:
    base = {
        "skillProfile": {"DataStructures": 50.0, "Algorithms": 45.0},
        "track": "FullStack",
        "completedTaskIds": [],
        "targetLength": 3,
        "recallTopK": 20,
        "candidateTasks": [
            _candidate("T1"),
            _candidate("T2"),
            _candidate("T3"),
        ],
    }
    base.update(overrides)
    return base


# ---------------------------------------------------------------------------
# CandidateTaskInput
# ---------------------------------------------------------------------------


def test_candidate_happy_path() -> None:
    c = CandidateTaskInput(**_candidate())
    assert c.taskId == "T1"


def test_candidate_weights_must_sum_to_one() -> None:
    bad = _candidate()
    bad["skillTags"] = [{"skill": "correctness", "weight": 0.7}, {"skill": "design", "weight": 0.7}]
    with pytest.raises(ValidationError, match="weights must sum to 1.0"):
        CandidateTaskInput(**bad)


def test_candidate_weight_negative_rejected() -> None:
    bad = _candidate()
    bad["skillTags"] = [{"skill": "correctness", "weight": -0.1}, {"skill": "design", "weight": 1.1}]
    with pytest.raises(ValidationError, match=r"greater_than_equal|less_than_equal"):
        CandidateTaskInput(**bad)


def test_candidate_missing_skill_key_rejected() -> None:
    bad = _candidate()
    bad["skillTags"] = [{"weight": 0.5}, {"skill": "design", "weight": 0.5}]
    with pytest.raises(ValidationError, match=r"Field required"):
        CandidateTaskInput(**bad)


def test_candidate_difficulty_bounds() -> None:
    bad = _candidate()
    bad["difficulty"] = 6
    with pytest.raises(ValidationError):
        CandidateTaskInput(**bad)


# ---------------------------------------------------------------------------
# GeneratePathRequest
# ---------------------------------------------------------------------------


def test_request_happy_path() -> None:
    GeneratePathRequest(**_valid_request())


def test_request_skill_profile_must_be_non_empty() -> None:
    with pytest.raises(ValidationError, match="at least one category"):
        GeneratePathRequest(**_valid_request(skillProfile={}))


def test_request_skill_profile_out_of_range() -> None:
    with pytest.raises(ValidationError, match=r"must be in"):
        GeneratePathRequest(**_valid_request(skillProfile={"X": 150.0}))


def test_request_target_length_under_minimum() -> None:
    with pytest.raises(ValidationError):
        GeneratePathRequest(**_valid_request(targetLength=2))


def test_request_target_length_over_maximum() -> None:
    with pytest.raises(ValidationError):
        GeneratePathRequest(**_valid_request(targetLength=13))


def test_request_recall_top_k_too_high() -> None:
    with pytest.raises(ValidationError):
        GeneratePathRequest(**_valid_request(recallTopK=100))


def test_request_candidate_tasks_below_target_length() -> None:
    bad = _valid_request(targetLength=5)  # only 3 candidates in the fixture
    with pytest.raises(ValidationError, match="candidateTasks .* < targetLength"):
        GeneratePathRequest(**bad)


def test_request_duplicate_candidate_ids() -> None:
    bad = _valid_request()
    bad["candidateTasks"] = [_candidate("T1"), _candidate("T2"), _candidate("T2")]
    with pytest.raises(ValidationError, match="duplicate taskId in candidateTasks"):
        GeneratePathRequest(**bad)


def test_request_completed_task_in_candidates_rejected() -> None:
    bad = _valid_request()
    bad["completedTaskIds"] = ["T1"]
    with pytest.raises(ValidationError, match="already-completed task"):
        GeneratePathRequest(**bad)


def test_request_candidate_tasks_none_means_recall_will_run() -> None:
    # When backend omits candidateTasks, the service uses recall.
    payload = _valid_request()
    payload["candidateTasks"] = None
    req = GeneratePathRequest(**payload)
    assert req.candidateTasks is None


# ---------------------------------------------------------------------------
# GeneratedPathEntry + GeneratePathResponse
# ---------------------------------------------------------------------------


def test_response_happy_path() -> None:
    GeneratePathResponse(
        pathTasks=[
            GeneratedPathEntry(
                taskId="T1", orderIndex=1, reasoning="Target the lowest scoring area."
            ),
            GeneratedPathEntry(
                taskId="T2", orderIndex=2, reasoning="Build on T1 with the next skill."
            ),
        ],
        overallReasoning="Two-task path; lowest skill first, then design.",
        recallSize=20,
        promptVersion="generate_path_v1",
        tokensUsed=512,
        retryCount=0,
    )


def test_response_dense_indices_required() -> None:
    with pytest.raises(ValidationError, match="dense"):
        GeneratePathResponse(
            pathTasks=[
                GeneratedPathEntry(taskId="T1", orderIndex=1, reasoning="x" * 30),
                GeneratedPathEntry(taskId="T2", orderIndex=3, reasoning="x" * 30),  # skip 2
            ],
            overallReasoning="x" * 30,
            recallSize=2,
            promptVersion="generate_path_v1",
            tokensUsed=100,
            retryCount=0,
        )


def test_response_duplicate_task_ids_rejected() -> None:
    with pytest.raises(ValidationError, match="duplicate taskId"):
        GeneratePathResponse(
            pathTasks=[
                GeneratedPathEntry(taskId="T1", orderIndex=1, reasoning="x" * 30),
                GeneratedPathEntry(taskId="T1", orderIndex=2, reasoning="x" * 30),
            ],
            overallReasoning="x" * 30,
            recallSize=2,
            promptVersion="generate_path_v1",
            tokensUsed=100,
            retryCount=0,
        )


def test_response_reasoning_too_short_rejected() -> None:
    with pytest.raises(ValidationError):
        GeneratedPathEntry(taskId="T1", orderIndex=1, reasoning="hi")


def test_response_overall_reasoning_too_short_rejected() -> None:
    with pytest.raises(ValidationError):
        GeneratePathResponse(
            pathTasks=[GeneratedPathEntry(taskId="T1", orderIndex=1, reasoning="x" * 30)],
            overallReasoning="short",
            recallSize=1,
            promptVersion="generate_path_v1",
            tokensUsed=100,
            retryCount=0,
        )


# ---------------------------------------------------------------------------
# TaskEmbeddingCacheUpsertRequest
# ---------------------------------------------------------------------------


def test_upsert_request_happy_path() -> None:
    TaskEmbeddingCacheUpsertRequest(
        taskId="T1",
        vector=[0.1] * 16,
        title="A task",
        descriptionSummary="A task summary",
        skillTags=[{"skill": "correctness", "weight": 0.6}, {"skill": "design", "weight": 0.4}],
        learningGain={"correctness": 0.5, "design": 0.4},
        difficulty=2,
        prerequisites=[],
        track="FullStack",
    )


def test_upsert_request_short_vector_rejected() -> None:
    with pytest.raises(ValidationError):
        TaskEmbeddingCacheUpsertRequest(
            taskId="T1",
            vector=[0.1, 0.2],  # too short
            title="A task",
            descriptionSummary="A task summary",
            skillTags=[{"skill": "correctness", "weight": 1.0}],
            learningGain={"correctness": 0.5},
            difficulty=2,
            track="FullStack",
        )


def test_upsert_request_weight_sum_drift_rejected() -> None:
    with pytest.raises(ValidationError, match=r"weights must sum"):
        TaskEmbeddingCacheUpsertRequest(
            taskId="T1",
            vector=[0.1] * 16,
            title="A task",
            descriptionSummary="A task summary",
            skillTags=[{"skill": "correctness", "weight": 0.4}, {"skill": "design", "weight": 0.3}],
            learningGain={"correctness": 0.5, "design": 0.3},
            difficulty=2,
            track="FullStack",
        )

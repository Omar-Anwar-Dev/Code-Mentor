"""S19-T1 / F16: path-generator service tests.

Covers the retry state machine, candidate resolution (recall + bypass),
topological validation, taskId hallucination, count mismatch, exhausted
retries, and the 3-profile × 2-track happy path acceptance bar from
S19-T1's acceptance criterion.
"""
from __future__ import annotations

import asyncio
import json
from typing import List, Tuple

import pytest

from app.domain.schemas.path_generator import (
    CandidateTaskInput,
    GeneratePathRequest,
)
from app.services import path_generator as svc_module
from app.services.path_generator import (
    PathGenerator,
    PathGeneratorUnavailable,
    reset_path_generator_for_tests,
)
from app.services.task_embeddings_cache import (
    TaskCacheEntry,
    TaskEmbeddingsCache,
    reset_task_embeddings_cache_for_tests,
)


# ---------------------------------------------------------------------------
# Test fixtures + helpers
# ---------------------------------------------------------------------------


@pytest.fixture(autouse=True)
def _reset_state():
    reset_path_generator_for_tests()
    reset_task_embeddings_cache_for_tests()
    yield
    reset_path_generator_for_tests()
    reset_task_embeddings_cache_for_tests()


def _candidate(
    task_id: str,
    *,
    difficulty: int = 2,
    prereqs: list[str] | None = None,
    track: str = "FullStack",
) -> CandidateTaskInput:
    return CandidateTaskInput(
        taskId=task_id,
        title=f"Title for {task_id}",
        descriptionSummary="A backend task summary that exercises core skills.",
        skillTags=[
            {"skill": "correctness", "weight": 0.6},
            {"skill": "design", "weight": 0.4},
        ],
        learningGain={"correctness": 0.5, "design": 0.4},
        difficulty=difficulty,
        prerequisites=prereqs or [],
        track=track,
    )


def _scripted_generator(*scripted_responses: Tuple[str, int]) -> PathGenerator:
    """Builds a PathGenerator whose ``_call_openai`` returns the scripted
    (content, tokens) tuples in order. ``_embed_query`` is patched to a
    fixed vector so the recall stage doesn't try to call OpenAI."""
    gen = PathGenerator.__new__(PathGenerator)
    gen.api_key = "test-key"
    gen.model = "gpt-fake"
    gen.embedding_model = "embed-fake"
    gen.timeout = 5
    gen.max_tokens = 1024
    gen.client = object()
    gen._cache = None

    iter_responses = iter(scripted_responses)

    async def fake_call(prompt: str):
        try:
            return next(iter_responses)
        except StopIteration:
            raise AssertionError("scripted: more calls than scripted responses")

    async def fake_embed(_text: str):
        return [1.0, 0.0, 0.0]

    gen._call_openai = fake_call  # type: ignore[method-assign]
    gen._embed_query = fake_embed  # type: ignore[method-assign]
    return gen


def _valid_response_json(
    target_length: int,
    candidate_ids: list[str],
    *,
    overall: str = "Solid path strategy targeting the weakest categories first.",
) -> str:
    return json.dumps({
        "pathTasks": [
            {
                "taskId": candidate_ids[i],
                "orderIndex": i + 1,
                "reasoning": (
                    f"Targets the learner's gap at score 40/100; this {candidate_ids[i]} "
                    "exercises correctness then design."
                ),
            }
            for i in range(target_length)
        ],
        "overallReasoning": overall,
    })


def _basic_request(
    *,
    target_length: int = 3,
    candidates: list[CandidateTaskInput] | None = None,
    completed: list[str] | None = None,
    track: str = "FullStack",
) -> GeneratePathRequest:
    if candidates is None:
        candidates = [_candidate(f"T{i+1}", track=track) for i in range(max(target_length, 3))]
    return GeneratePathRequest(
        skillProfile={"DataStructures": 40.0, "Algorithms": 55.0, "OOP": 65.0},
        track=track,
        completedTaskIds=completed or [],
        targetLength=target_length,
        recallTopK=20,
        candidateTasks=candidates,
    )


# ---------------------------------------------------------------------------
# Availability + cache cold start
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_missing_api_key_raises_503() -> None:
    gen = PathGenerator.__new__(PathGenerator)
    gen.api_key = None
    gen.client = None
    gen._cache = None
    with pytest.raises(PathGeneratorUnavailable) as exc:
        await gen.generate(_basic_request())
    assert exc.value.http_status == 503


@pytest.mark.asyncio
async def test_empty_cache_no_candidates_raises_503() -> None:
    # Request has candidateTasks=None and the cache is empty.
    gen = _scripted_generator()
    request = GeneratePathRequest(
        skillProfile={"DataStructures": 40.0},
        track="FullStack",
        completedTaskIds=[],
        targetLength=3,
        recallTopK=20,
        candidateTasks=None,
    )
    with pytest.raises(PathGeneratorUnavailable) as exc:
        await gen.generate(request)
    assert exc.value.http_status == 503
    assert "task_embeddings_cache is empty" in str(exc.value)


# ---------------------------------------------------------------------------
# Happy paths — bypass recall
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_happy_path_bypass_recall_no_retry() -> None:
    request = _basic_request(target_length=3)
    candidate_ids = [c.taskId for c in request.candidateTasks]  # type: ignore[union-attr]
    gen = _scripted_generator(
        (_valid_response_json(3, candidate_ids), 412),
    )
    response = await gen.generate(request)
    assert response.retryCount == 0
    assert len(response.pathTasks) == 3
    assert [p.orderIndex for p in response.pathTasks] == [1, 2, 3]
    assert response.tokensUsed == 412
    assert response.recallSize == len(request.candidateTasks)  # type: ignore[arg-type]


@pytest.mark.asyncio
async def test_happy_path_with_code_fence_no_retry() -> None:
    request = _basic_request(target_length=3)
    candidate_ids = [c.taskId for c in request.candidateTasks]  # type: ignore[union-attr]
    fenced = "```json\n" + _valid_response_json(3, candidate_ids) + "\n```"
    gen = _scripted_generator((fenced, 380))
    response = await gen.generate(request)
    assert response.retryCount == 0


@pytest.mark.asyncio
async def test_happy_path_with_prose_before_json_no_retry() -> None:
    request = _basic_request(target_length=3)
    candidate_ids = [c.taskId for c in request.candidateTasks]  # type: ignore[union-attr]
    prefixed = "Here is the path:\n" + _valid_response_json(3, candidate_ids)
    gen = _scripted_generator((prefixed, 400))
    response = await gen.generate(request)
    assert response.retryCount == 0


# ---------------------------------------------------------------------------
# Retry paths
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_invalid_json_first_then_valid_retries_once() -> None:
    request = _basic_request(target_length=3)
    candidate_ids = [c.taskId for c in request.candidateTasks]  # type: ignore[union-attr]
    gen = _scripted_generator(
        ("this is not json {{}", 100),
        (_valid_response_json(3, candidate_ids), 380),
    )
    response = await gen.generate(request)
    assert response.retryCount == 1
    assert response.tokensUsed == 480


@pytest.mark.asyncio
async def test_hallucinated_taskid_triggers_retry() -> None:
    request = _basic_request(target_length=3)
    candidate_ids = [c.taskId for c in request.candidateTasks]  # type: ignore[union-attr]
    # First attempt: returns Z9 not in candidates
    bad = json.dumps({
        "pathTasks": [
            {"taskId": "Z9", "orderIndex": 1, "reasoning": "x" * 30},
            {"taskId": candidate_ids[1], "orderIndex": 2, "reasoning": "x" * 30},
            {"taskId": candidate_ids[2], "orderIndex": 3, "reasoning": "x" * 30},
        ],
        "overallReasoning": "Path with bad ID at first position."
    })
    gen = _scripted_generator(
        (bad, 200),
        (_valid_response_json(3, candidate_ids), 350),
    )
    response = await gen.generate(request)
    assert response.retryCount == 1


@pytest.mark.asyncio
async def test_wrong_count_triggers_retry() -> None:
    request = _basic_request(target_length=3)
    candidate_ids = [c.taskId for c in request.candidateTasks]  # type: ignore[union-attr]
    # First attempt: returns only 2 tasks
    bad = _valid_response_json(2, candidate_ids[:2])
    gen = _scripted_generator(
        (bad, 200),
        (_valid_response_json(3, candidate_ids), 350),
    )
    response = await gen.generate(request)
    assert response.retryCount == 1


@pytest.mark.asyncio
async def test_topology_violation_triggers_retry() -> None:
    # Candidate T2 lists T3 as a prereq, but the LLM puts T2 before T3.
    candidates = [
        _candidate("T1"),
        _candidate("T2", prereqs=["T3"]),
        _candidate("T3"),
    ]
    request = _basic_request(target_length=3, candidates=candidates)
    bad = json.dumps({
        "pathTasks": [
            {"taskId": "T1", "orderIndex": 1, "reasoning": "x" * 30},
            {"taskId": "T2", "orderIndex": 2, "reasoning": "x" * 30},
            {"taskId": "T3", "orderIndex": 3, "reasoning": "x" * 30},
        ],
        "overallReasoning": "Bad order — T2 needs T3 first."
    })
    fixed = json.dumps({
        "pathTasks": [
            {"taskId": "T1", "orderIndex": 1, "reasoning": "x" * 30},
            {"taskId": "T3", "orderIndex": 2, "reasoning": "x" * 30},
            {"taskId": "T2", "orderIndex": 3, "reasoning": "x" * 30},
        ],
        "overallReasoning": "Reordered T3 before T2 to satisfy the prereq."
    })
    gen = _scripted_generator((bad, 200), (fixed, 250))
    response = await gen.generate(request)
    assert response.retryCount == 1
    # Last task should be T2 after the fix
    last = sorted(response.pathTasks, key=lambda p: p.orderIndex)[-1]
    assert last.taskId == "T2"


@pytest.mark.asyncio
async def test_completed_task_in_response_triggers_retry() -> None:
    """If the LLM picks a task in completedTaskIds the response is invalid."""
    request = GeneratePathRequest(
        skillProfile={"DataStructures": 40.0},
        track="FullStack",
        completedTaskIds=["TX"],
        targetLength=3,
        recallTopK=20,
        candidateTasks=[
            _candidate("T1"),
            _candidate("T2"),
            _candidate("T3"),
        ],
    )
    bad = json.dumps({
        "pathTasks": [
            {"taskId": "TX", "orderIndex": 1, "reasoning": "x" * 30},
            {"taskId": "T2", "orderIndex": 2, "reasoning": "x" * 30},
            {"taskId": "T3", "orderIndex": 3, "reasoning": "x" * 30},
        ],
        "overallReasoning": "Includes a completed task — must retry."
    })
    fixed = _valid_response_json(3, ["T1", "T2", "T3"])
    gen = _scripted_generator((bad, 200), (fixed, 250))
    response = await gen.generate(request)
    assert response.retryCount == 1


# ---------------------------------------------------------------------------
# Retry-exhaustion path
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_three_consecutive_failures_raise_422() -> None:
    request = _basic_request(target_length=3)
    bad = "not json at all"
    gen = _scripted_generator((bad, 100), (bad, 100), (bad, 100))
    with pytest.raises(PathGeneratorUnavailable) as exc:
        await gen.generate(request)
    assert exc.value.http_status == 422


# ---------------------------------------------------------------------------
# 3 profiles × 2 tracks happy path (acceptance bar)
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "level,scores,track",
    [
        ("Beginner",     {"DataStructures": 30.0, "Algorithms": 25.0, "OOP": 40.0}, "FullStack"),
        ("Beginner",     {"DataStructures": 30.0, "Algorithms": 25.0, "OOP": 40.0}, "Backend"),
        ("Intermediate", {"DataStructures": 65.0, "Algorithms": 60.0, "OOP": 70.0}, "FullStack"),
        ("Intermediate", {"DataStructures": 65.0, "Algorithms": 60.0, "OOP": 70.0}, "Backend"),
        ("Advanced",     {"DataStructures": 85.0, "Algorithms": 80.0, "OOP": 90.0}, "FullStack"),
        ("Advanced",     {"DataStructures": 85.0, "Algorithms": 80.0, "OOP": 90.0}, "Backend"),
    ],
)
@pytest.mark.asyncio
async def test_three_profiles_two_tracks_all_happy(level, scores, track) -> None:
    candidates = [_candidate(f"T{i+1}", track=track) for i in range(6)]
    request = GeneratePathRequest(
        skillProfile=scores,
        track=track,
        completedTaskIds=[],
        targetLength=4,
        recallTopK=20,
        candidateTasks=candidates,
    )
    candidate_ids = [c.taskId for c in candidates]
    gen = _scripted_generator(
        (_valid_response_json(4, candidate_ids), 500),
    )
    response = await gen.generate(request, correlation_id=f"{level}-{track}")
    assert len(response.pathTasks) == 4
    assert response.retryCount == 0
    assert response.recallSize == 6


# ---------------------------------------------------------------------------
# Recall path with seeded cache
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_recall_path_with_seeded_cache() -> None:
    """When candidateTasks is None, the generator should populate from cache."""
    cache = TaskEmbeddingsCache()
    # Seed 5 tasks with vectors close to [1, 0, 0]
    for i in range(5):
        await cache.upsert(TaskCacheEntry(
            task_id=f"R{i+1}",
            vector=(0.9 + i * 0.01, 0.1, 0.0),  # all similar
            title=f"Recall task {i+1}",
            description_summary="Summary",
            skill_tags=(("correctness", 0.6), ("design", 0.4)),
            learning_gain=(("correctness", 0.5), ("design", 0.4)),
            difficulty=2,
            prerequisites=(),
            track="FullStack",
        ))

    gen = PathGenerator.__new__(PathGenerator)
    gen.api_key = "test-key"
    gen.model = "gpt-fake"
    gen.embedding_model = "embed-fake"
    gen.timeout = 5
    gen.max_tokens = 1024
    gen.client = object()
    gen._cache = cache

    async def fake_embed(_text: str):
        return [1.0, 0.0, 0.0]

    async def fake_call(prompt: str):
        # Recall returned up to 20 candidates; the prompt sees all 5 here.
        return (
            _valid_response_json(3, ["R1", "R2", "R3"]),
            420,
        )

    gen._embed_query = fake_embed  # type: ignore[method-assign]
    gen._call_openai = fake_call  # type: ignore[method-assign]

    request = GeneratePathRequest(
        skillProfile={"DataStructures": 50.0},
        track="FullStack",
        completedTaskIds=[],
        targetLength=3,
        recallTopK=10,
        candidateTasks=None,
    )
    response = await gen.generate(request)
    assert response.recallSize == 5  # all 5 cache entries were returned by top-10
    assert response.retryCount == 0

"""S19-T1 / F16: unit tests for the in-memory task embeddings cache.

Covers: upsert / upsert_many / remove / clear / cosine_top_k +
filtering (track, exclude) + edge cases (empty cache, zero-norm vector,
mismatched dims).
"""
from __future__ import annotations

import asyncio

import pytest

from app.services.task_embeddings_cache import (
    TaskCacheEntry,
    TaskEmbeddingsCache,
    get_task_embeddings_cache,
    reset_task_embeddings_cache_for_tests,
)


def _entry(
    task_id: str,
    vec: list[float],
    *,
    track: str = "FullStack",
    difficulty: int = 2,
    title: str = "T",
    prereqs: tuple[str, ...] = (),
) -> TaskCacheEntry:
    return TaskCacheEntry(
        task_id=task_id,
        vector=tuple(float(x) for x in vec),
        title=title,
        description_summary="A task summary",
        skill_tags=(("correctness", 0.6), ("design", 0.4)),
        learning_gain=(("correctness", 0.5), ("design", 0.4)),
        difficulty=difficulty,
        prerequisites=prereqs,
        track=track,
    )


@pytest.fixture(autouse=True)
def _reset_cache():
    reset_task_embeddings_cache_for_tests()
    yield
    reset_task_embeddings_cache_for_tests()


@pytest.mark.asyncio
async def test_singleton_accessor_returns_same_instance() -> None:
    a = get_task_embeddings_cache()
    b = get_task_embeddings_cache()
    assert a is b


@pytest.mark.asyncio
async def test_upsert_then_size() -> None:
    cache = TaskEmbeddingsCache()
    assert await cache.size() == 0
    await cache.upsert(_entry("T1", [1.0, 0.0, 0.0]))
    assert await cache.size() == 1


@pytest.mark.asyncio
async def test_upsert_overwrites_in_place() -> None:
    cache = TaskEmbeddingsCache()
    await cache.upsert(_entry("T1", [1.0, 0.0]))
    await cache.upsert(_entry("T1", [0.0, 1.0]))
    assert await cache.size() == 1
    fetched = await cache.get("T1")
    assert fetched is not None
    assert fetched.vector == (0.0, 1.0)


@pytest.mark.asyncio
async def test_upsert_many_returns_size() -> None:
    cache = TaskEmbeddingsCache()
    size = await cache.upsert_many([
        _entry("T1", [1.0, 0.0]),
        _entry("T2", [0.0, 1.0]),
        _entry("T3", [0.5, 0.5]),
    ])
    assert size == 3


@pytest.mark.asyncio
async def test_remove_returns_true_for_existing() -> None:
    cache = TaskEmbeddingsCache()
    await cache.upsert(_entry("T1", [1.0, 0.0]))
    assert await cache.remove("T1") is True
    assert await cache.remove("T1") is False


@pytest.mark.asyncio
async def test_clear_returns_count() -> None:
    cache = TaskEmbeddingsCache()
    await cache.upsert_many([_entry("T1", [1.0]), _entry("T2", [1.0])])
    cleared = await cache.clear()
    assert cleared == 2
    assert await cache.size() == 0


@pytest.mark.asyncio
async def test_cosine_top_k_on_empty_cache_returns_empty() -> None:
    cache = TaskEmbeddingsCache()
    result = await cache.cosine_top_k([1.0, 0.0], top_k=5)
    assert result == []


@pytest.mark.asyncio
async def test_cosine_top_k_orders_by_similarity_descending() -> None:
    cache = TaskEmbeddingsCache()
    await cache.upsert_many([
        _entry("orth", [0.0, 1.0]),
        _entry("same", [1.0, 0.0]),
        _entry("close", [0.9, 0.1]),
    ])
    result = await cache.cosine_top_k([1.0, 0.0], top_k=3)
    ids_in_order = [entry.task_id for entry, _sim in result]
    assert ids_in_order[0] == "same"
    # "close" is closer than "orth"
    assert ids_in_order[1] == "close"
    assert ids_in_order[2] == "orth"


@pytest.mark.asyncio
async def test_cosine_top_k_respects_top_k() -> None:
    cache = TaskEmbeddingsCache()
    await cache.upsert_many([
        _entry(f"T{i}", [float(i), 1.0]) for i in range(10)
    ])
    result = await cache.cosine_top_k([5.0, 1.0], top_k=3)
    assert len(result) == 3


@pytest.mark.asyncio
async def test_cosine_top_k_track_filter() -> None:
    cache = TaskEmbeddingsCache()
    await cache.upsert_many([
        _entry("F1", [1.0, 0.0], track="FullStack"),
        _entry("B1", [1.0, 0.0], track="Backend"),
    ])
    result = await cache.cosine_top_k([1.0, 0.0], top_k=5, track_filter="Backend")
    assert len(result) == 1
    assert result[0][0].task_id == "B1"


@pytest.mark.asyncio
async def test_cosine_top_k_exclude_ids() -> None:
    cache = TaskEmbeddingsCache()
    await cache.upsert_many([
        _entry("T1", [1.0, 0.0]),
        _entry("T2", [1.0, 0.0]),
    ])
    result = await cache.cosine_top_k(
        [1.0, 0.0], top_k=5, exclude_task_ids={"T1"}
    )
    assert len(result) == 1
    assert result[0][0].task_id == "T2"


@pytest.mark.asyncio
async def test_cosine_top_k_zero_norm_query_returns_empty() -> None:
    cache = TaskEmbeddingsCache()
    await cache.upsert(_entry("T1", [1.0, 0.0]))
    result = await cache.cosine_top_k([0.0, 0.0], top_k=5)
    assert result == []


@pytest.mark.asyncio
async def test_cosine_top_k_dim_mismatch_skips_entry() -> None:
    cache = TaskEmbeddingsCache()
    await cache.upsert_many([
        _entry("T1", [1.0, 0.0]),         # 2-dim
        _entry("T2", [1.0, 0.0, 0.0]),    # 3-dim — mismatch
    ])
    # Query is 2-dim so T1 matches; T2 is skipped (logged warning).
    result = await cache.cosine_top_k([1.0, 0.0], top_k=5)
    assert [e.task_id for e, _ in result] == ["T1"]


@pytest.mark.asyncio
async def test_cosine_top_k_negative_k_returns_empty() -> None:
    cache = TaskEmbeddingsCache()
    await cache.upsert(_entry("T1", [1.0]))
    assert await cache.cosine_top_k([1.0], top_k=0) == []
    assert await cache.cosine_top_k([1.0], top_k=-1) == []


@pytest.mark.asyncio
async def test_entry_skill_tags_as_list_round_trip() -> None:
    entry = _entry("T1", [1.0])
    assert entry.skill_tags_as_list() == [
        {"skill": "correctness", "weight": 0.6},
        {"skill": "design", "weight": 0.4},
    ]
    assert entry.learning_gain_as_dict() == {"correctness": 0.5, "design": 0.4}

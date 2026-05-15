"""S19-T1 / F16: In-memory task-embeddings + metadata cache for the
hybrid recall stage of the AI Path Generator.

Per ADR-052 ("Vector DB (Qdrant) for tasks. Rejected — overkill for
~50 vectors. In-memory dict + numpy cosine handles the scale"), the
cache lives entirely in-process. Lost on AI-service restart and
rebuilt on demand:

1. Backend's :code:`EmbedEntityJob<Task>` (S18-T6) calls
   :code:`POST /api/task-embeddings/upsert` after each task approve.
2. The one-shot :code:`tools/backfill_task_embeddings.py` (S19) walks
   all tasks and replays their embeddings into the cache after a fresh
   AI-service start (or after a deploy that drops the cache).

Process-wide singleton; async-locked so concurrent upserts + cosine
queries can't observe a half-written entry. Cosine is done in pure
Python — adequate for ≤200 tasks × 1536 dims.
"""
from __future__ import annotations

import asyncio
import logging
import math
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class TaskCacheEntry:
    """One task's vector + the metadata the LLM rerank prompt needs.

    ``vector`` is stored as a tuple so the entry is hashable + immutable.
    ``skill_tags`` keeps the wire shape (``[{"skill": str, "weight":
    float}, ...]``) so it can be inlined into the rerank prompt verbatim.
    """

    task_id: str
    vector: Tuple[float, ...]  # 1536 dims for text-embedding-3-small
    title: str
    description_summary: str  # first ~800 chars of the markdown description
    skill_tags: Tuple[Tuple[str, float], ...]  # ((skill, weight), ...)
    learning_gain: Tuple[Tuple[str, float], ...]  # ((skill, gain), ...)
    difficulty: int
    prerequisites: Tuple[str, ...]
    track: str
    expected_language: Optional[str] = None
    category: Optional[str] = None
    estimated_hours: Optional[int] = None

    def skill_tags_as_list(self) -> List[Dict[str, float]]:
        return [{"skill": skill, "weight": weight} for skill, weight in self.skill_tags]

    def learning_gain_as_dict(self) -> Dict[str, float]:
        return {skill: gain for skill, gain in self.learning_gain}


class TaskEmbeddingsCache:
    """Process-wide cache keyed by ``task_id``.

    Thread-safe under asyncio; ``upsert`` / ``cosine_top_k`` can run
    concurrently from different request handlers without observing
    partial state.
    """

    def __init__(self) -> None:
        self._entries: Dict[str, TaskCacheEntry] = {}
        self._lock: asyncio.Lock = asyncio.Lock()

    async def upsert(self, entry: TaskCacheEntry) -> None:
        async with self._lock:
            self._entries[entry.task_id] = entry

    async def upsert_many(self, entries: List[TaskCacheEntry]) -> int:
        """Bulk-upsert. Returns the new cache size after the operation."""
        async with self._lock:
            for entry in entries:
                self._entries[entry.task_id] = entry
            return len(self._entries)

    async def remove(self, task_id: str) -> bool:
        async with self._lock:
            return self._entries.pop(task_id, None) is not None

    async def clear(self) -> int:
        """Wipes the cache. Returns the number of entries removed."""
        async with self._lock:
            count = len(self._entries)
            self._entries.clear()
            return count

    async def size(self) -> int:
        async with self._lock:
            return len(self._entries)

    async def get(self, task_id: str) -> Optional[TaskCacheEntry]:
        async with self._lock:
            return self._entries.get(task_id)

    async def all_entries(self) -> List[TaskCacheEntry]:
        async with self._lock:
            return list(self._entries.values())

    async def cosine_top_k(
        self,
        query_vector: List[float],
        top_k: int,
        *,
        track_filter: Optional[str] = None,
        exclude_task_ids: Optional[set] = None,
    ) -> List[Tuple[TaskCacheEntry, float]]:
        """Return the top-k entries by cosine similarity to ``query_vector``.

        ``track_filter`` restricts to one track when given (e.g., the
        learner's chosen track). ``exclude_task_ids`` is the set of tasks
        the learner has already completed — those are stripped before
        ranking. Results are sorted descending by similarity.

        Returns ``[]`` for ``top_k <= 0``, an empty cache, or a zero-norm
        query vector. The caller treats either as "recall produced no
        candidates" and falls back accordingly.
        """
        if top_k <= 0:
            return []

        async with self._lock:
            entries = list(self._entries.values())

        candidates = entries
        if track_filter is not None:
            candidates = [c for c in candidates if c.track == track_filter]
        if exclude_task_ids:
            excluded = set(exclude_task_ids)
            candidates = [c for c in candidates if c.task_id not in excluded]
        if not candidates:
            return []

        query_norm = _norm(query_vector)
        if query_norm == 0.0:
            return []

        scored: List[Tuple[TaskCacheEntry, float]] = []
        for entry in candidates:
            entry_norm = _norm_tuple(entry.vector)
            if entry_norm == 0.0:
                continue
            try:
                dot = _dot(query_vector, entry.vector)
            except ValueError as exc:
                # Vector dim mismatch — log + skip. Better than 500'ing the request.
                logger.warning(
                    "task_embeddings_cache: skipping entry %s — %s",
                    entry.task_id,
                    exc,
                )
                continue
            sim = dot / (query_norm * entry_norm)
            scored.append((entry, sim))

        scored.sort(key=lambda item: item[1], reverse=True)
        return scored[:top_k]


def _dot(a: List[float], b: Tuple[float, ...]) -> float:
    if len(a) != len(b):
        raise ValueError(f"vector dim mismatch: query={len(a)} cached={len(b)}")
    return sum(x * y for x, y in zip(a, b))


def _norm(v: List[float]) -> float:
    return math.sqrt(sum(x * x for x in v))


def _norm_tuple(v: Tuple[float, ...]) -> float:
    return math.sqrt(sum(x * x for x in v))


_cache_instance: Optional[TaskEmbeddingsCache] = None


def get_task_embeddings_cache() -> TaskEmbeddingsCache:
    """Process-wide accessor. Lazy-instantiates on first call."""
    global _cache_instance
    if _cache_instance is None:
        _cache_instance = TaskEmbeddingsCache()
    return _cache_instance


def reset_task_embeddings_cache_for_tests() -> None:
    """Reset hook used by the test fixture only."""
    global _cache_instance
    _cache_instance = None

"""S10-T3 / F12: Qdrant client wrapper for the mentor-chat embeddings store
(ADR-036). The collection ``mentor_chunks`` is auto-created on first write.

Design notes:
* Point IDs are deterministic UUID5 from ``sha1(scope|scopeId|filePath|start|end)``
  — re-running the indexer on the same input upserts the same IDs and is a no-op
  on storage (Qdrant overwrites in place when the ID already exists).
* Search calls **filter** to a single ``(scope, scopeId)`` pair via Qdrant
  payload filter so cross-resource leakage is impossible by construction.
* The wrapper is sync (``QdrantClient`` is a blocking HTTP client). Callers run
  it from a FastAPI thread-pool via ``asyncio.to_thread`` when they need to
  preserve event-loop responsiveness.
"""
from __future__ import annotations

import hashlib
import logging
import uuid
from dataclasses import dataclass
from typing import List, Optional, Sequence

from qdrant_client import QdrantClient
from qdrant_client.http import models as qmodels

from app.config import get_settings


logger = logging.getLogger(__name__)


# UUID5 namespace — arbitrary but stable across runs (do NOT change after the
# first deploy or every existing chunk's ID will shift). Generated once via
# uuid.uuid4() during S10-T3 design.
_POINT_ID_NS = uuid.UUID("c9f7a4d9-2f3a-4d1f-9c45-2f8e68f44b21")


def deterministic_point_id(scope: str, scope_id: str, file_path: str, start: int, end: int) -> str:
    """Stable UUID5 derived from the chunk's coordinates.

    Implements the ID scheme from S10-T3 acceptance: re-indexing the same
    submission/audit produces the same IDs, so upserts deduplicate naturally.
    """
    raw = f"{scope}|{scope_id}|{file_path}|{start}|{end}"
    digest = hashlib.sha1(raw.encode("utf-8")).digest()  # noqa: S324 - non-cryptographic ID
    # uuid.uuid5 takes a name and namespace; the digest gives us domain
    # separation so accidental collisions across scopes are impossible.
    return str(uuid.uuid5(_POINT_ID_NS, digest.hex()))


@dataclass(frozen=True)
class IndexedPoint:
    """A point ready to be sent to Qdrant — vector + payload + ID."""
    point_id: str
    vector: List[float]
    payload: dict


class QdrantRepository:
    """Thin wrapper over ``qdrant_client.QdrantClient`` scoped to the
    ``mentor_chunks`` collection. Auto-creates the collection on first use.
    """

    def __init__(self, client: Optional[QdrantClient] = None) -> None:
        settings = get_settings()
        self._client = client or QdrantClient(url=settings.qdrant_url)
        self._collection = settings.qdrant_collection
        # 1536 dims — text-embedding-3-small per ADR-036.
        self._vector_size = 1536
        self._distance = qmodels.Distance.COSINE

    # --- collection management ---------------------------------------------
    def ensure_collection(self) -> None:
        """Idempotent — creates the collection on first call, no-ops thereafter."""
        existing = {c.name for c in self._client.get_collections().collections}
        if self._collection in existing:
            return
        self._client.create_collection(
            collection_name=self._collection,
            vectors_config=qmodels.VectorParams(size=self._vector_size, distance=self._distance),
        )
        logger.info("Qdrant collection %s created", self._collection)

    # --- writes -------------------------------------------------------------
    def upsert(self, points: Sequence[IndexedPoint]) -> int:
        """Upsert a batch of points. Returns the count actually written."""
        if not points:
            return 0
        self.ensure_collection()
        self._client.upsert(
            collection_name=self._collection,
            points=[
                qmodels.PointStruct(id=p.point_id, vector=p.vector, payload=p.payload)
                for p in points
            ],
            wait=True,
        )
        return len(points)

    # --- reads --------------------------------------------------------------
    def search(
        self,
        *,
        query_vector: List[float],
        scope: str,
        scope_id: str,
        top_k: int = 5,
    ) -> List[qmodels.ScoredPoint]:
        """Top-k cosine-similarity search filtered to a single (scope, scopeId).

        Returns an empty list when the collection doesn't exist yet — that's
        the expected "indexing hasn't run" state, not an error.
        """
        existing = {c.name for c in self._client.get_collections().collections}
        if self._collection not in existing:
            return []
        flt = qmodels.Filter(
            must=[
                qmodels.FieldCondition(
                    key="scope", match=qmodels.MatchValue(value=scope),
                ),
                qmodels.FieldCondition(
                    key="scopeId", match=qmodels.MatchValue(value=scope_id),
                ),
            ],
        )
        try:
            return self._client.search(
                collection_name=self._collection,
                query_vector=query_vector,
                query_filter=flt,
                limit=max(1, top_k),
                with_payload=True,
            )
        except Exception:  # pragma: no cover - search rarely throws on healthy server
            logger.exception("Qdrant search failed")
            return []

    # --- inspection (used by tests + dogfood) ------------------------------
    def count_for_scope(self, scope: str, scope_id: str) -> int:
        """Count chunks indexed for a (scope, scopeId). Returns 0 if the
        collection doesn't exist yet — same contract as ``search``.
        """
        existing = {c.name for c in self._client.get_collections().collections}
        if self._collection not in existing:
            return 0
        flt = qmodels.Filter(
            must=[
                qmodels.FieldCondition(key="scope", match=qmodels.MatchValue(value=scope)),
                qmodels.FieldCondition(key="scopeId", match=qmodels.MatchValue(value=scope_id)),
            ],
        )
        return self._client.count(
            collection_name=self._collection,
            count_filter=flt,
            exact=True,
        ).count


_repo_singleton: Optional[QdrantRepository] = None


def get_qdrant_repo() -> QdrantRepository:
    """Lazy singleton — instantiating QdrantClient opens an HTTP session."""
    global _repo_singleton
    if _repo_singleton is None:
        _repo_singleton = QdrantRepository()
    return _repo_singleton


def reset_qdrant_repo() -> None:
    """Test helper — drops the cached singleton so next ``get_qdrant_repo()``
    rebuilds with the latest settings or an injected fake.
    """
    global _repo_singleton
    _repo_singleton = None

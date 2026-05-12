"""S10-T3 / F12: request + response shapes for ``POST /api/embeddings/upsert``.

The backend's Hangfire ``IndexSubmissionForMentorChatJob`` (S10-T4) is the only
caller. The shape mirrors the architecture §6.12 chunk payload but moves the
chunking step to the AI service so the backend doesn't need a Python tokenizer
or chunker.
"""
from __future__ import annotations

from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class EmbeddingsCodeFile(BaseModel):
    """A single file's text content. ``filePath`` is preserved verbatim into
    the Qdrant payload so retrieval can cite source locations."""
    filePath: str = Field(..., min_length=1, max_length=500)
    content: str


class EmbeddingsAnnotation(BaseModel):
    """Inline-annotation chunks (kind=annotation). All fields optional —
    chunker tolerates the older + newer feedback shapes (S6 vs S9)."""
    file: Optional[str] = None
    filePath: Optional[str] = None
    line: Optional[int] = None
    lineNumber: Optional[int] = None
    title: Optional[str] = None
    severity: Optional[str] = None
    message: Optional[str] = None
    description: Optional[str] = None


class EmbeddingsUpsertRequest(BaseModel):
    """Backend builds this from a Submission or ProjectAudit row + its
    feedback payload, then POSTs once per resource.

    S12 / F14 (ADR-040 refined 2026-05-11): ``userId`` and ``taskId`` are
    now part of the payload — F14's history-aware code review filters
    Qdrant chunks by ``userId`` to retrieve a learner's own prior
    feedback excerpts. F12 retrieval is unaffected (it filters by
    ``(scope, scopeId)`` and ignores the new fields).
    """
    scope: Literal["submission", "audit"]
    scopeId: str = Field(..., min_length=1, max_length=80)
    userId: Optional[str] = Field(
        None,
        min_length=1,
        max_length=80,
        description="Owner of the resource. F14 RAG retrieval filters by this. Optional for back-compat with pre-F14 indexing calls.",
    )
    taskId: Optional[str] = Field(
        None,
        min_length=1,
        max_length=80,
        description="Task this submission belongs to (submissions only; null for audits). Surfaced in retrieved chunks for prompt context.",
    )
    taskName: Optional[str] = Field(
        None,
        max_length=200,
        description="Human-readable task title persisted in payload so retrieval can reference it without a DB round-trip.",
    )
    codeFiles: List[EmbeddingsCodeFile] = Field(default_factory=list)
    feedbackSummary: Optional[str] = None
    strengths: List[str] = Field(default_factory=list)
    weaknesses: List[str] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)
    annotations: List[EmbeddingsAnnotation] = Field(default_factory=list)


class EmbeddingsUpsertResponse(BaseModel):
    """Acknowledgement returned to the backend job — purely operational
    metrics, no per-chunk detail (the backend doesn't need it).
    """
    indexed: int
    skipped: int
    chunkCount: int
    durationMs: int
    collection: str
    promptVersion: str = "embeddings.v1"


# S12 / F14 (ADR-040): history-aware code review search.
# Filters mentor_chunks by userId and (optionally) kind, returning top-k
# similarity-ordered chunks for the learner. Distinct from the F12 search
# path which filters by (scope, scopeId) tied to a single submission/audit.

class FeedbackHistorySearchRequest(BaseModel):
    """Backend builds this from a learner + their current submission's static
    findings (the anchor text). Filters Qdrant chunks by ``userId`` so the
    retrieval stays scoped to the learner's own history (ADR-040)."""
    userId: str = Field(..., min_length=1, max_length=80)
    anchorText: str = Field(
        ...,
        description="Free-form text used to derive the query embedding. Typically a serialization of the current submission's static-analysis findings.",
    )
    topK: int = Field(default=5, ge=1, le=20)
    excludeKinds: List[str] = Field(
        default_factory=lambda: ["code"],
        description="Chunk kinds to exclude. Default excludes raw 'code' chunks so the retrieval focuses on prior feedback excerpts (weakness/strength/recommendation/annotation/summary).",
    )


class FeedbackHistoryChunk(BaseModel):
    """One retrieved chunk surfaced to the backend. The backend maps this onto
    its ``PriorFeedbackChunk`` DTO."""
    sourceSubmissionId: str
    taskName: Optional[str] = None
    taskId: Optional[str] = None
    chunkText: str
    kind: str
    similarityScore: float
    sourceDate: Optional[str] = None


class FeedbackHistorySearchResponse(BaseModel):
    """Top-k chunks ordered descending by similarity."""
    chunks: List[FeedbackHistoryChunk] = Field(default_factory=list)
    promptVersion: str = "feedback-history.v1"

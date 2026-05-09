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
    feedback payload, then POSTs once per resource."""
    scope: Literal["submission", "audit"]
    scopeId: str = Field(..., min_length=1, max_length=80)
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

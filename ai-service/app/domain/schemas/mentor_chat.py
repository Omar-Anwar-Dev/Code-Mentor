"""S10-T5 / F12: request shape + SSE event payloads for the mentor-chat
endpoint (ADR-036). Response is a streamed `text/event-stream`, so the
schemas describe individual events rather than a single response body.
"""
from __future__ import annotations

from typing import List, Literal, Optional

from pydantic import BaseModel, Field, field_validator


class MentorChatHistoryTurn(BaseModel):
    """A previously-recorded turn supplied by the backend so the LLM has
    short-term conversational context. Capped at last N turns by the
    backend before they reach this endpoint.
    """
    role: Literal["user", "assistant"]
    content: str = Field(..., min_length=1, max_length=20_000)


class MentorChatRequest(BaseModel):
    """Body of POST /api/mentor-chat. The backend's
    <c>MentorChatProxyController</c> builds this from the persisted session +
    the incoming user message."""
    sessionId: str = Field(..., min_length=1, max_length=80)
    scope: Literal["submission", "audit"]
    scopeId: str = Field(..., min_length=1, max_length=80)
    message: str = Field(..., min_length=1, max_length=8000)
    history: List[MentorChatHistoryTurn] = Field(default_factory=list)
    feedbackPayload: Optional[dict] = None  # raw-fallback context if Qdrant returns nothing

    @field_validator("history")
    @classmethod
    def _cap_history_length(cls, v: List[MentorChatHistoryTurn]) -> List[MentorChatHistoryTurn]:
        if len(v) > 50:  # safety net; backend already trims to 10
            raise ValueError("history exceeds 50 turns; trim before sending")
        return v


# ── Streamed event payloads (each becomes a single SSE `data:` line) ────────


class MentorChatTokenEvent(BaseModel):
    """One streamed assistant token (or chunk of tokens). Many of these per turn."""
    type: Literal["token"] = "token"
    content: str


class MentorChatDoneEvent(BaseModel):
    """Final event: signals stream completion + carries the operational metrics
    the backend persists into MentorChatMessages.TokensInput / TokensOutput /
    ContextMode."""
    done: Literal[True] = True
    messageId: str
    tokensInput: int
    tokensOutput: int
    contextMode: Literal["Rag", "RawFallback"]
    chunkIds: List[str] = Field(default_factory=list)
    promptVersion: str = "mentor_chat.v1"


class MentorChatErrorEvent(BaseModel):
    """Mid-stream error — emitted instead of `done` when an upstream call fails
    after the response started. Lets the FE render a friendly error inside the
    same chat panel without losing the partial assistant text."""
    error: str
    code: Literal[
        "openai_unavailable",
        "input_too_large",
        "internal",
    ] = "internal"

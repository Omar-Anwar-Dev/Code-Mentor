"""S10-T5 / F12: RAG mentor-chat orchestrator (ADR-036).

Pipeline per turn:
  1. Embed the user query with `text-embedding-3-small`.
  2. Retrieve top-k chunks from Qdrant filtered to (scope, scopeId).
  3. If the retrieved chunk count is below
     <c>mentor_chat_rag_min_chunks</c>, drop into "raw fallback" mode and
     stuff the full feedback payload into the prompt instead — guarantees
     the chat is always grounded in *something* even when the index is
     empty / Qdrant is down.
  4. Build the chat prompt (system + retrieved chunks + history + user query),
     enforce the input-character cap, and stream the response via OpenAI's
     async stream API.
  5. Yield SSE-formatted strings for the FastAPI route to forward to the FE.

The orchestrator never raises mid-stream — failures are converted into a
final ``error`` event so the response stays well-formed for the FE.
"""
from __future__ import annotations

import json
import logging
import uuid
from dataclasses import dataclass
from typing import AsyncIterator, List, Optional

from openai import AsyncOpenAI
from openai import APIError, APITimeoutError, RateLimitError

from app.config import get_settings
from app.domain.schemas.mentor_chat import (
    MentorChatDoneEvent,
    MentorChatErrorEvent,
    MentorChatRequest,
    MentorChatTokenEvent,
)
from app.services.qdrant_repo import QdrantRepository, get_qdrant_repo


logger = logging.getLogger(__name__)


PROMPT_VERSION = "mentor_chat.v1"


SYSTEM_PROMPT = (
    "You are Code Mentor — a senior software engineer guiding a learner through "
    "the code they just submitted (or the project they audited). Answer their "
    "follow-up question grounded in the retrieved code/feedback context. "
    "Cite specific file paths and line numbers when relevant. If the context "
    "doesn't contain the information needed, say so plainly rather than "
    "speculating. Use Markdown — fenced code blocks for code, lists for "
    "enumerations. Keep replies focused; one or two paragraphs is usually right."
)


@dataclass(frozen=True)
class _RetrievedChunk:
    point_id: str
    content: str
    file_path: str
    start_line: int
    end_line: int
    kind: str
    score: float


@dataclass(frozen=True)
class _PreparedPrompt:
    """Bundle of everything the LLM call needs once retrieval has run."""
    messages: List[dict]
    chunk_ids: List[str]
    context_mode: str        # "Rag" | "RawFallback"
    input_chars: int


def _format_sse(event: dict) -> str:
    """Encode a payload as a single SSE event terminated by the spec-required
    blank line. Using a stable ``data: ...\\n\\n`` shape keeps the FE parser
    simple."""
    return f"data: {json.dumps(event)}\n\n"


class MentorChatService:
    """Stateless per-request orchestrator. Constructed once per app, callable
    many times concurrently — the OpenAI async client is thread-safe."""

    def __init__(
        self,
        *,
        openai_client: Optional[AsyncOpenAI] = None,
        repo: Optional[QdrantRepository] = None,
    ) -> None:
        settings = get_settings()
        self._client = openai_client or AsyncOpenAI(api_key=settings.openai_api_key)
        self._repo = repo or get_qdrant_repo()
        self._embedding_model = settings.embedding_model
        self._chat_model = settings.openai_model
        self._top_k = settings.mentor_chat_top_k
        self._history_limit = settings.mentor_chat_history_limit
        self._max_input_chars = settings.mentor_chat_max_input_chars
        self._max_output_tokens = settings.mentor_chat_max_output_tokens
        self._rag_min_chunks = settings.mentor_chat_rag_min_chunks

    # ------------------------------------------------------------------
    # public entry point — async generator yielding SSE strings
    # ------------------------------------------------------------------
    async def stream(self, request: MentorChatRequest, correlation_id: str) -> AsyncIterator[str]:
        message_id = str(uuid.uuid4())
        try:
            prepared = await self._prepare_prompt(request)
        except _InputTooLarge as exc:
            yield _format_sse(MentorChatErrorEvent(
                error=str(exc),
                code="input_too_large",
            ).model_dump())
            return
        except Exception:
            logger.exception("[corr=%s] mentor-chat prompt prep failed", correlation_id)
            yield _format_sse(MentorChatErrorEvent(
                error="Internal error preparing the chat prompt.",
                code="internal",
            ).model_dump())
            return

        token_count = 0
        full_text: List[str] = []
        try:
            async for delta in self._stream_completion(prepared.messages):
                if not delta:
                    continue
                token_count += 1
                full_text.append(delta)
                yield _format_sse(MentorChatTokenEvent(content=delta).model_dump())
        except (APIError, APITimeoutError, RateLimitError) as exc:
            logger.warning("[corr=%s] OpenAI streaming error: %s", correlation_id, exc)
            yield _format_sse(MentorChatErrorEvent(
                error=f"OpenAI request failed: {exc.__class__.__name__}",
                code="openai_unavailable",
            ).model_dump())
            return
        except Exception:
            logger.exception("[corr=%s] unexpected mid-stream failure", correlation_id)
            yield _format_sse(MentorChatErrorEvent(
                error="Mid-stream failure",
                code="internal",
            ).model_dump())
            return

        # ── Final done event ─────────────────────────────────────────────
        # Token counts are best-effort — the streaming chat-completions API
        # doesn't return usage; we approximate from input chars + assistant text.
        approx_tokens_input = max(1, prepared.input_chars // 4)
        approx_tokens_output = max(0, sum(len(t) for t in full_text) // 4)
        yield _format_sse(MentorChatDoneEvent(
            messageId=message_id,
            tokensInput=approx_tokens_input,
            tokensOutput=approx_tokens_output,
            contextMode=prepared.context_mode,  # type: ignore[arg-type]
            chunkIds=prepared.chunk_ids,
            promptVersion=PROMPT_VERSION,
        ).model_dump())

    # ------------------------------------------------------------------
    # internals
    # ------------------------------------------------------------------

    async def _prepare_prompt(self, request: MentorChatRequest) -> _PreparedPrompt:
        chunks = await self._retrieve(request)

        if len(chunks) < self._rag_min_chunks:
            messages = self._build_raw_fallback_messages(request)
            context_mode = "RawFallback"
            chunk_ids: List[str] = []
        else:
            messages = self._build_rag_messages(request, chunks)
            context_mode = "Rag"
            chunk_ids = [c.point_id for c in chunks]

        # Enforce input ceiling on the COMBINED message text.
        input_chars = sum(len(m["content"]) for m in messages)
        if input_chars > self._max_input_chars:
            raise _InputTooLarge(
                f"Mentor chat input exceeds the {self._max_input_chars}-char ceiling "
                f"({input_chars} chars). Trim the conversation history or shorten the question."
            )

        return _PreparedPrompt(
            messages=messages,
            chunk_ids=chunk_ids,
            context_mode=context_mode,
            input_chars=input_chars,
        )

    async def _retrieve(self, request: MentorChatRequest) -> List[_RetrievedChunk]:
        try:
            resp = await self._client.embeddings.create(
                model=self._embedding_model,
                input=[request.message],
            )
        except Exception:
            logger.exception("Embedding query failed for session %s", request.sessionId)
            return []

        if not resp.data:
            return []
        query_vector = list(resp.data[0].embedding)

        scored = self._repo.search(
            query_vector=query_vector,
            scope=request.scope,
            scope_id=request.scopeId,
            top_k=self._top_k,
        )

        chunks: List[_RetrievedChunk] = []
        for sp in scored:
            payload = sp.payload or {}
            content = (
                payload.get("content")
                or payload.get("text")
                or ""
            )
            if not content:
                # We don't store content in payload (would duplicate the vector
                # corpus). Construct a synthetic preview from the metadata so
                # the prompt has something to anchor on; the FE can render the
                # file/line fields verbatim. For truly content-less chunks we
                # still pass the metadata to the LLM since "this section came
                # from app/auth.py L40-L80" is itself useful grounding.
                content = (
                    f"(snippet from {payload.get('filePath', 'unknown')}, "
                    f"lines {payload.get('startLine', '?')}-{payload.get('endLine', '?')})"
                )
            chunks.append(_RetrievedChunk(
                point_id=str(sp.id),
                content=content,
                file_path=str(payload.get("filePath", "")),
                start_line=int(payload.get("startLine", 0)),
                end_line=int(payload.get("endLine", 0)),
                kind=str(payload.get("kind", "")),
                score=float(getattr(sp, "score", 0.0) or 0.0),
            ))
        return chunks

    def _build_rag_messages(
        self,
        request: MentorChatRequest,
        chunks: List[_RetrievedChunk],
    ) -> List[dict]:
        retrieved_blocks: List[str] = []
        for c in chunks:
            header = f"[{c.kind} · {c.file_path} L{c.start_line}-{c.end_line}]"
            retrieved_blocks.append(f"{header}\n{c.content.strip()}")
        retrieved = "\n\n".join(retrieved_blocks)

        system = (
            f"{SYSTEM_PROMPT}\n\n"
            f"## Retrieved context (top-{len(chunks)} most relevant chunks):\n\n"
            f"{retrieved}"
        )

        messages: List[dict] = [{"role": "system", "content": system}]
        for turn in request.history[-self._history_limit:]:
            messages.append({"role": turn.role, "content": turn.content})
        messages.append({"role": "user", "content": request.message})
        return messages

    def _build_raw_fallback_messages(self, request: MentorChatRequest) -> List[dict]:
        feedback_blob = ""
        if request.feedbackPayload:
            try:
                feedback_blob = json.dumps(
                    request.feedbackPayload, indent=2, ensure_ascii=False,
                )[: self._max_input_chars // 2]
            except (TypeError, ValueError):
                feedback_blob = ""

        if feedback_blob:
            system = (
                f"{SYSTEM_PROMPT}\n\n"
                "## Limited context mode\n\n"
                "The retrieval index is unavailable for this resource; the full "
                "structured feedback payload is provided below as context.\n\n"
                f"{feedback_blob}"
            )
        else:
            system = (
                f"{SYSTEM_PROMPT}\n\n"
                "## Limited context mode\n\n"
                "No retrieval context is available for this resource. Answer "
                "from general best-practice knowledge and tell the learner if "
                "you cannot give a specific answer about their code."
            )

        messages: List[dict] = [{"role": "system", "content": system}]
        for turn in request.history[-self._history_limit:]:
            messages.append({"role": turn.role, "content": turn.content})
        messages.append({"role": "user", "content": request.message})
        return messages

    async def _stream_completion(self, messages: List[dict]) -> AsyncIterator[str]:
        # `gpt-5.1-codex-mini` (Codex family) only supports the Responses API,
        # not chat-completions — same finding as ai_reviewer.py (S6-T1) and
        # project_auditor.py (S9-T6). Stream via responses.create(stream=True).
        # Concatenate the system + user/assistant turns into a flat input string;
        # the Responses API expects `instructions` + `input` rather than a chat
        # message list.
        system = next((m["content"] for m in messages if m["role"] == "system"), "")
        turns = [m for m in messages if m["role"] != "system"]
        # Build a transcript-style input so the model has the conversation context.
        transcript_lines: List[str] = []
        for t in turns:
            role = t["role"].capitalize()
            transcript_lines.append(f"{role}: {t['content']}")
        flat_input = "\n\n".join(transcript_lines)

        # ADR-045: cap reasoning effort so codex-mini starts streaming visible
        # deltas quickly; without this cap the model burns the budget on
        # internal reasoning and the SSE forwarder yields no tokens.
        stream = await self._client.responses.create(
            model=self._chat_model,
            instructions=system,
            input=flat_input,
            max_output_tokens=self._max_output_tokens,
            reasoning={"effort": "low"},
            stream=True,
        )
        async for event in stream:
            # Responses API streaming emits typed events; the text deltas come
            # through `response.output_text.delta`. Other event types (created,
            # in_progress, content_part.added, completed, ...) we ignore — we
            # only need the user-visible deltas for the SSE forwarder.
            event_type = getattr(event, "type", "")
            if event_type == "response.output_text.delta":
                delta = getattr(event, "delta", "")
                if delta:
                    yield delta


class _InputTooLarge(ValueError):
    """Raised when the prepared prompt exceeds <c>mentor_chat_max_input_chars</c>."""


_service_singleton: Optional[MentorChatService] = None


def get_mentor_chat_service() -> MentorChatService:
    global _service_singleton
    if _service_singleton is None:
        _service_singleton = MentorChatService()
    return _service_singleton


def reset_mentor_chat_service() -> None:
    """Test helper — drops the cached singleton so tests can swap in a fake."""
    global _service_singleton
    _service_singleton = None

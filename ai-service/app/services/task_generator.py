"""S18-T3 / F16: AI Task Generator service.

Patterned after :mod:`app.services.question_generator` (S16-T1) and
:mod:`app.services.assessment_summarizer` (S17-T1):
- prompt template loading (``generate_tasks_v1.md``)
- JSON fence-strip + balanced-block extraction repair
- one retry-with-self-correction on schema validation failure
- token cap + reasoning-effort cap per ADR-045
"""
from __future__ import annotations

import asyncio
import json
import logging
import re
import uuid
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple

from openai import APIError, APITimeoutError, AsyncOpenAI, BadRequestError, RateLimitError
from pydantic import ValidationError

from app.config import get_settings
from app.domain.schemas.task_generator import (
    GenerateTasksRequest,
    GenerateTasksResponse,
)
from app.prompts import load_prompt

logger = logging.getLogger(__name__)


PROMPT_VERSION = "generate_tasks_v1"

# Tasks have richer text than questions (markdown description + criteria + deliverables);
# scale the output budget accordingly. 5 tasks × ~600 visible JSON tokens + reasoning headroom.
TASK_GENERATOR_MAX_OUTPUT_TOKENS = 16384

# Per-call timeout — same as question generator. Realistically a 5-task batch
# takes ~40-60s of model time.
TASK_GENERATOR_TIMEOUT_SECONDS = 240


_FENCE_RE = re.compile(r"^\s*```(?:json|JSON)?\s*\n(.*?)\n?\s*```\s*$", re.DOTALL)


def _strip_code_fences(content: str) -> str:
    if not isinstance(content, str):
        return content
    match = _FENCE_RE.match(content.strip())
    if match:
        return match.group(1).strip()
    return content.strip()


def _extract_json_block(content: str) -> Optional[str]:
    if not isinstance(content, str):
        return None
    best: Tuple[int, int] = (-1, -1)
    depth = 0
    start = -1
    in_string = False
    escape = False
    for idx, ch in enumerate(content):
        if escape:
            escape = False
            continue
        if ch == "\\":
            escape = True
            continue
        if ch == '"':
            in_string = not in_string
            continue
        if in_string:
            continue
        if ch == "{":
            if depth == 0:
                start = idx
            depth += 1
        elif ch == "}":
            if depth > 0:
                depth -= 1
                if depth == 0 and start >= 0:
                    end = idx + 1
                    if (end - start) > (best[1] - best[0]):
                        best = (start, end)
                    start = -1
    if best[0] < 0:
        return None
    return content[best[0]:best[1]]


def _try_load_json(content: str) -> Optional[Dict[str, Any]]:
    if not content:
        return None
    candidate = _strip_code_fences(content)
    try:
        return json.loads(candidate)
    except (json.JSONDecodeError, TypeError):
        pass
    extracted = _extract_json_block(candidate)
    if extracted is None or extracted == candidate:
        return None
    try:
        return json.loads(extracted)
    except (json.JSONDecodeError, TypeError):
        return None


_RETRY_REMINDER = (
    "\n\n=== RETRY (your previous response failed validation) ===\n"
    "Previous response error: {error}\n\n"
    "Respond with PURE JSON ONLY: no markdown fences, no prose, no comments. "
    "The first character of your response MUST be '{{' and the last must be '}}'. "
    "Re-read the schema carefully — especially: skillTags weights MUST sum to 1.0, "
    "learningGain keys MUST match skillTags skills, estimatedHours MUST match the difficulty band, "
    "and the response MUST contain exactly the requested count of drafts."
)


SYSTEM_INSTRUCTIONS = (
    "You are a senior software-engineering curriculum designer producing "
    "real-world coding task briefs. You respond with valid JSON only — "
    "no markdown fences, no prose, no comments."
)


MAX_RETRIES = 1


class TaskGeneratorUnavailable(RuntimeError):
    """Raised when the generator can't produce a valid response after retries."""

    def __init__(self, message: str, *, http_status: int = 503) -> None:
        super().__init__(message)
        self.http_status = http_status


@dataclass
class TaskGeneratorCallStats:
    tokens_used: int
    retry_count: int


class TaskGenerator:
    """Async OpenAI-backed task generator with one self-correction retry."""

    def __init__(self) -> None:
        settings = get_settings()
        self.api_key = settings.openai_api_key
        self.model = settings.openai_model
        self.timeout = TASK_GENERATOR_TIMEOUT_SECONDS
        self.max_tokens = TASK_GENERATOR_MAX_OUTPUT_TOKENS
        self.client: Optional[AsyncOpenAI] = (
            AsyncOpenAI(api_key=self.api_key) if self.api_key else None
        )

    @property
    def is_available(self) -> bool:
        return self.client is not None

    async def generate(
        self,
        request: GenerateTasksRequest,
        *,
        correlation_id: str = "-",
    ) -> GenerateTasksResponse:
        """Generate N task drafts and return the validated response."""
        if not self.is_available:
            raise TaskGeneratorUnavailable(
                "OpenAI API key is not configured; task generator unavailable.",
                http_status=503,
            )

        prompt = self._build_prompt(request)
        batch_id = uuid.uuid4().hex[:12]

        # Attempt 1
        try:
            raw, tokens_1 = await asyncio.wait_for(
                self._call_openai(prompt), timeout=self.timeout
            )
        except asyncio.TimeoutError as exc:
            raise TaskGeneratorUnavailable(
                f"OpenAI request timed out after {self.timeout}s", http_status=504,
            ) from exc

        validated, error = self._validate(raw, request)
        if validated is not None:
            logger.info(
                "[corr=%s] task-gen batch=%s track=%s difficulty=%d count=%d retry=0 tokens=%d",
                correlation_id, batch_id, request.track, request.difficulty, request.count, tokens_1,
            )
            return self._wrap_response(
                validated, batch_id=batch_id,
                stats=TaskGeneratorCallStats(tokens_used=tokens_1, retry_count=0),
            )

        # Attempt 2 (one retry with self-correction prefix)
        logger.warning(
            "[corr=%s] task-gen first response invalid (%s) — retrying with self-correction",
            correlation_id, error,
        )
        try:
            raw_retry, tokens_2 = await asyncio.wait_for(
                self._call_openai(prompt + _RETRY_REMINDER.format(error=error)),
                timeout=self.timeout,
            )
        except asyncio.TimeoutError as exc:
            raise TaskGeneratorUnavailable(
                f"OpenAI retry timed out after {self.timeout}s", http_status=504,
            ) from exc

        validated, error = self._validate(raw_retry, request)
        if validated is not None:
            logger.info(
                "[corr=%s] task-gen batch=%s track=%s difficulty=%d count=%d retry=1 tokens=%d",
                correlation_id, batch_id, request.track, request.difficulty, request.count, tokens_1 + tokens_2,
            )
            return self._wrap_response(
                validated, batch_id=batch_id,
                stats=TaskGeneratorCallStats(tokens_used=tokens_1 + tokens_2, retry_count=1),
            )

        logger.error(
            "[corr=%s] task-gen failed after retry — last error: %s", correlation_id, error,
        )
        raise TaskGeneratorUnavailable(
            f"AI task generator produced invalid output after retry: {error}",
            http_status=422,
        )

    def _build_prompt(self, request: GenerateTasksRequest) -> str:
        template = load_prompt(PROMPT_VERSION)
        focus_skills_str = ", ".join(request.focusSkills)
        existing_titles = self._format_existing_titles(request.existingTitles)
        return template.format(
            count=request.count,
            track=request.track,
            difficulty=request.difficulty,
            focus_skills=focus_skills_str,
            existing_titles=existing_titles,
        )

    @staticmethod
    def _format_existing_titles(titles: List[str]) -> str:
        if not titles:
            return "(none — generate fresh task ideas for this track)"
        compact = []
        for raw in titles[:50]:
            text = re.sub(r"\s+", " ", str(raw)).strip()
            if len(text) > 120:
                text = text[:117].rstrip() + "..."
            compact.append(f"- {text}")
        return "\n".join(compact)

    async def _call_openai(self, prompt: str) -> Tuple[str, int]:
        assert self.client is not None
        try:
            response = await self.client.responses.create(
                model=self.model,
                instructions=SYSTEM_INSTRUCTIONS,
                input=prompt,
                max_output_tokens=self.max_tokens,
                reasoning={"effort": "low"},  # ADR-045
            )
        except RateLimitError as exc:
            raise TaskGeneratorUnavailable(
                "OpenAI rate limit exceeded — try again shortly.", http_status=503,
            ) from exc
        except APITimeoutError as exc:
            raise TaskGeneratorUnavailable(
                "OpenAI request timed out.", http_status=504,
            ) from exc
        except BadRequestError as exc:
            err_code = (getattr(exc, "code", "") or "").lower()
            if err_code == "context_length_exceeded" or "context length" in str(exc).lower():
                raise TaskGeneratorUnavailable(
                    "Task generator prompt exceeded model context window.",
                    http_status=400,
                ) from exc
            raise TaskGeneratorUnavailable(
                f"OpenAI rejected the request: {exc}", http_status=400,
            ) from exc
        except APIError as exc:
            raise TaskGeneratorUnavailable(
                f"OpenAI API error: {exc}", http_status=503,
            ) from exc

        content = response.output_text or ""
        tokens = int(response.usage.total_tokens) if response.usage else 0
        return content, tokens

    def _validate(
        self,
        raw: str,
        request: GenerateTasksRequest,
    ) -> Tuple[Optional[List[Dict[str, Any]]], str]:
        parsed = _try_load_json(raw)
        if parsed is None:
            return None, "response is not valid JSON (after fence-strip + brace-extract repair)"
        if not isinstance(parsed, dict):
            return None, f"response JSON is {type(parsed).__name__}, expected object"
        drafts = parsed.get("drafts")
        if not isinstance(drafts, list):
            return None, "response missing top-level 'drafts' array"
        if len(drafts) != request.count:
            return None, f"expected {request.count} drafts, got {len(drafts)}"

        from app.domain.schemas.task_generator import GeneratedTaskDraft

        validated: List[Dict[str, Any]] = []
        for idx, draft in enumerate(drafts):
            try:
                model = GeneratedTaskDraft(**(draft if isinstance(draft, dict) else {}))
            except ValidationError as exc:
                first_err = exc.errors()[0] if exc.errors() else {"msg": "unknown validation error"}
                loc = ".".join(str(p) for p in first_err.get("loc", ()))
                msg = first_err.get("msg", "")
                return None, f"draft[{idx}] invalid: {loc}: {msg}"

            # Belt-and-suspenders: track + difficulty must echo the request.
            if model.track != request.track:
                return None, f"draft[{idx}] track={model.track} does not match request.track={request.track}"
            if model.difficulty != request.difficulty:
                return None, f"draft[{idx}] difficulty={model.difficulty} does not match request.difficulty={request.difficulty}"

            validated.append(model.model_dump())

        return validated, ""

    def _wrap_response(
        self,
        validated_drafts: List[Dict[str, Any]],
        *,
        batch_id: str,
        stats: TaskGeneratorCallStats,
    ) -> GenerateTasksResponse:
        return GenerateTasksResponse(
            drafts=validated_drafts,
            promptVersion=PROMPT_VERSION,
            tokensUsed=stats.tokens_used,
            retryCount=stats.retry_count,
            batchId=batch_id,
        )


_task_generator_instance: Optional[TaskGenerator] = None


def get_task_generator() -> TaskGenerator:
    global _task_generator_instance
    if _task_generator_instance is None:
        _task_generator_instance = TaskGenerator()
    return _task_generator_instance


def reset_task_generator_for_tests() -> None:
    global _task_generator_instance
    _task_generator_instance = None

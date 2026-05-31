"""S19-T5 / F16: AI per-task framing service.

Patterned after :mod:`app.services.task_generator` and
:mod:`app.services.assessment_summarizer` — same prompt-load +
self-correction retry state machine.

Target latency: p95 ≤ 6 sec end-to-end. Output: 3-sub-card framing.
"""
from __future__ import annotations

import asyncio
import json
import logging
import re
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple

from openai import APIError, APITimeoutError, AsyncOpenAI, BadRequestError, RateLimitError
from pydantic import ValidationError

from app.config import get_settings
from app.domain.schemas.task_framing import (
    TaskFramingRequest,
    TaskFramingResponse,
)
from app.prompts import load_prompt

logger = logging.getLogger(__name__)


PROMPT_VERSION = "task_framing_v1"
TASK_FRAMING_MAX_OUTPUT_TOKENS = 1024
TASK_FRAMING_TIMEOUT_SECONDS = 60
MAX_RETRIES = 1

SYSTEM_INSTRUCTIONS = (
    "You are an AI coding mentor producing JSON only — no markdown "
    "fences, no prose, no comments. Keep tone warm and direct."
)


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
    "Error: {error}\n\n"
    "Respond with PURE JSON ONLY: no markdown fences, no prose, no comments. "
    "Three keys exactly: whyThisMatters (60-300 chars), focusAreas (2-5 bullets, "
    "each 15-200 chars after strip), commonPitfalls (2-5 bullets, each 15-200 "
    "chars after strip)."
)


class TaskFramingUnavailable(RuntimeError):
    """Raised when the framer can't produce a valid response after retries."""

    def __init__(self, message: str, *, http_status: int = 503) -> None:
        super().__init__(message)
        self.http_status = http_status


@dataclass
class _CallStats:
    tokens_used: int
    retry_count: int


class TaskFramer:
    """Async OpenAI-backed framer with one self-correction retry."""

    def __init__(self) -> None:
        settings = get_settings()
        self.api_key = settings.openai_api_key
        self.model = settings.openai_model
        self.timeout = TASK_FRAMING_TIMEOUT_SECONDS
        self.max_tokens = TASK_FRAMING_MAX_OUTPUT_TOKENS
        self.client: Optional[AsyncOpenAI] = (
            AsyncOpenAI(api_key=self.api_key) if self.api_key else None
        )

    @property
    def is_available(self) -> bool:
        return self.client is not None

    async def frame(
        self,
        request: TaskFramingRequest,
        *,
        correlation_id: str = "-",
    ) -> TaskFramingResponse:
        if not self.is_available:
            raise TaskFramingUnavailable(
                "OpenAI API key is not configured; task framing unavailable.",
                http_status=503,
            )

        prompt = self._build_prompt(request)

        # Attempt 1
        try:
            raw, tokens_1 = await asyncio.wait_for(
                self._call_openai(prompt), timeout=self.timeout,
            )
        except asyncio.TimeoutError as exc:
            raise TaskFramingUnavailable(
                f"OpenAI request timed out after {self.timeout}s",
                http_status=504,
            ) from exc

        validated, error = self._parse(raw)
        if validated is not None:
            logger.info(
                "[corr=%s] task-framing taskId=%s retry=0 tokens=%d",
                correlation_id, request.taskId, tokens_1,
            )
            return self._wrap(
                validated, stats=_CallStats(tokens_used=tokens_1, retry_count=0),
            )

        # Attempt 2 (one retry)
        logger.warning(
            "[corr=%s] task-framing first response invalid (%s) — retrying",
            correlation_id, error,
        )
        try:
            raw_retry, tokens_2 = await asyncio.wait_for(
                self._call_openai(prompt + _RETRY_REMINDER.format(error=error)),
                timeout=self.timeout,
            )
        except asyncio.TimeoutError as exc:
            raise TaskFramingUnavailable(
                f"OpenAI retry timed out after {self.timeout}s",
                http_status=504,
            ) from exc

        validated, error = self._parse(raw_retry)
        if validated is not None:
            logger.info(
                "[corr=%s] task-framing taskId=%s retry=1 tokens=%d",
                correlation_id, request.taskId, tokens_1 + tokens_2,
            )
            return self._wrap(
                validated,
                stats=_CallStats(tokens_used=tokens_1 + tokens_2, retry_count=1),
            )

        logger.error(
            "[corr=%s] task-framing failed after retry — last error: %s",
            correlation_id, error,
        )
        raise TaskFramingUnavailable(
            f"AI framer produced invalid output after retry: {error}",
            http_status=422,
        )

    def _build_prompt(self, request: TaskFramingRequest) -> str:
        template = load_prompt(PROMPT_VERSION)
        skill_profile_lines = "\n".join(
            f"- {cat}: {int(round(score))}/100"
            for cat, score in sorted(request.learnerProfile.items())
        )
        skill_tags_block = "\n".join(
            f"- {tag.skill}: {tag.weight:.2f}"
            for tag in request.skillTags
        )
        # Description first paragraph for prompt budget (trim hard).
        desc = request.taskDescription
        if len(desc) > 800:
            desc = desc[:797].rstrip() + "..."
        return template.format(
            track=request.track,
            learner_level=request.learnerLevel or "(unknown)",
            skill_profile_lines=skill_profile_lines,
            task_title=request.taskTitle,
            task_description=desc,
            skill_tags_block=skill_tags_block,
        )

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
            raise TaskFramingUnavailable(
                "OpenAI rate limit exceeded — try again shortly.",
                http_status=503,
            ) from exc
        except APITimeoutError as exc:
            raise TaskFramingUnavailable(
                "OpenAI request timed out.", http_status=504,
            ) from exc
        except BadRequestError as exc:
            raise TaskFramingUnavailable(
                f"OpenAI rejected the request: {exc}", http_status=400,
            ) from exc
        except APIError as exc:
            raise TaskFramingUnavailable(
                f"OpenAI API error: {exc}", http_status=503,
            ) from exc

        content = response.output_text or ""
        tokens = int(response.usage.total_tokens) if response.usage else 0
        return content, tokens

    def _parse(self, raw: str) -> Tuple[Optional[Dict[str, Any]], str]:
        parsed = _try_load_json(raw)
        if parsed is None:
            return None, "response is not valid JSON"
        if not isinstance(parsed, dict):
            return None, f"response is {type(parsed).__name__}, expected object"

        why = parsed.get("whyThisMatters")
        focus = parsed.get("focusAreas")
        pitfalls = parsed.get("commonPitfalls")

        if not isinstance(why, str):
            return None, "missing or non-string 'whyThisMatters'"
        if not isinstance(focus, list):
            return None, "missing or non-list 'focusAreas'"
        if not isinstance(pitfalls, list):
            return None, "missing or non-list 'commonPitfalls'"
        return parsed, ""

    def _wrap(self, parsed: Dict[str, Any], *, stats: _CallStats) -> TaskFramingResponse:
        try:
            return TaskFramingResponse(
                whyThisMatters=str(parsed["whyThisMatters"]).strip(),
                focusAreas=[str(b) for b in parsed["focusAreas"]],
                commonPitfalls=[str(b) for b in parsed["commonPitfalls"]],
                promptVersion=PROMPT_VERSION,
                tokensUsed=stats.tokens_used,
                retryCount=stats.retry_count,
            )
        except ValidationError as exc:
            first_err = exc.errors()[0] if exc.errors() else {"msg": "validation"}
            raise TaskFramingUnavailable(
                f"Pydantic validation rejected framer output: {first_err.get('msg')}",
                http_status=422,
            ) from exc


_framer_instance: Optional[TaskFramer] = None


def get_task_framer() -> TaskFramer:
    global _framer_instance
    if _framer_instance is None:
        _framer_instance = TaskFramer()
    return _framer_instance


def reset_task_framer_for_tests() -> None:
    global _framer_instance
    _framer_instance = None

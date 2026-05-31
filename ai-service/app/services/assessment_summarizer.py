"""S17-T1 / F15: AI Assessment-Summary service.

Wraps OpenAI's Responses API (per ADR-045) with:
- prompt template loading (``assessment_summary_v1.md``)
- JSON fence-strip + balanced-block extraction repair
- one retry-with-self-correction on schema validation failure
- token cap (4k input + 800 output per S17 locked answer #5)
- reasoning-effort cap per ADR-045

Used by the ``POST /api/assessment-summary`` route. Stateless except for
the OpenAI ``AsyncOpenAI`` client; the singleton accessor below caches
the instance per process.

Patterned after :mod:`app.services.question_generator` (S16-T1) — same
retry state machine, same JSON-repair primitives, same singleton model.
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
from app.domain.schemas.assessment_summary import (
    AssessmentSummaryRequest,
    AssessmentSummaryResponse,
    CategoryScoreInput,
)
from app.prompts import load_prompt

logger = logging.getLogger(__name__)


# Prompt template version. Bumped when the .md file is replaced; old
# files stay on disk for thesis / comparison.
PROMPT_VERSION = "assessment_summary_v1"

# Per S17 locked answer #5: 4k input + 800 output cap. The reasoning
# model consumes some of the output budget before the visible JSON
# streams (per ADR-045) — we size this to leave enough headroom for
# ~600 tokens of visible JSON (3 paragraphs * ~200 tokens) plus
# ~200 tokens of reasoning at "low" effort.
SUMMARY_MAX_OUTPUT_TOKENS = 800

# Per-call timeout. p95 latency target is 8s (S17 locked answer #5);
# the timeout is generous so a slow tail (~15-20s) doesn't fail the
# whole job — but the empirical p95 will be the production gate.
SUMMARY_TIMEOUT_SECONDS = 60


# JSON repair helpers — re-used from ai_reviewer / question_generator,
# kept local so the summarizer is a self-contained module.

_FENCE_RE = re.compile(r"^\s*```(?:json|JSON)?\s*\n(.*?)\n?\s*```\s*$", re.DOTALL)


def _strip_code_fences(content: str) -> str:
    """Strip markdown ```...``` fences if the LLM wrapped its JSON."""
    if not isinstance(content, str):
        return content
    match = _FENCE_RE.match(content.strip())
    if match:
        return match.group(1).strip()
    return content.strip()


def _extract_json_block(content: str) -> Optional[str]:
    """Return the largest balanced ``{...}`` substring, or None.

    Last-ditch repair when the model prepends/appends prose. Skips braces
    inside string literals.
    """
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
    """Parse JSON with fence-strip + balanced-block extraction repair."""
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
    "Use EXACTLY these three keys: 'strengthsParagraph', 'weaknessesParagraph', "
    "'pathGuidanceParagraph'. Each paragraph 80-180 words of plain prose."
)


SYSTEM_INSTRUCTIONS = (
    "You are a senior software-engineering instructor giving structured "
    "feedback on an adaptive technical placement test. You respond with "
    "valid JSON only — no markdown fences, no prose, no comments."
)


# Self-correction max attempts (1 means one extra retry beyond the first
# call). Matches the question_generator + assessment-learning-path.md
# §6.3 spec. Bounded so a flaky model doesn't burn tokens indefinitely.
MAX_RETRIES = 1


# Human-readable category labels used inside the prompt body (the API
# wire-shape stays CamelCase, but the LLM should refer to "Data Structures"
# in its written output, not "DataStructures").
_CATEGORY_LABELS: Dict[str, str] = {
    "DataStructures": "Data Structures",
    "Algorithms": "Algorithms",
    "OOP": "Object-Oriented Programming",
    "Databases": "Databases",
    "Security": "Security",
}


class SummarizerUnavailable(RuntimeError):
    """Raised when the summarizer can't produce a valid response after retries.

    Carries an HTTP-friendly status code so the route can map cleanly:
    - 503 — OpenAI down / no key / quota.
    - 422 — model produced unparseable / invalid output after retries.
    - 504 — timeout.
    - 400 — caller's request was malformed (e.g., context too long).
    """

    def __init__(self, message: str, *, http_status: int = 503) -> None:
        super().__init__(message)
        self.http_status = http_status


@dataclass
class SummarizerCallStats:
    tokens_used: int
    retry_count: int


class AssessmentSummarizer:
    """Async OpenAI-backed assessment-summary generator with one retry."""

    def __init__(self) -> None:
        settings = get_settings()
        self.api_key = settings.openai_api_key
        self.model = settings.openai_model
        self.timeout = SUMMARY_TIMEOUT_SECONDS
        self.max_tokens = SUMMARY_MAX_OUTPUT_TOKENS
        self.client: Optional[AsyncOpenAI] = (
            AsyncOpenAI(api_key=self.api_key) if self.api_key else None
        )

    @property
    def is_available(self) -> bool:
        return self.client is not None

    # ---------------------------------------------------------------------
    # Public entry
    # ---------------------------------------------------------------------

    async def summarize(
        self,
        request: AssessmentSummaryRequest,
        *,
        correlation_id: str = "-",
    ) -> AssessmentSummaryResponse:
        """Generate a 3-paragraph summary and return the validated response."""
        if not self.is_available:
            raise SummarizerUnavailable(
                "OpenAI API key is not configured; summarizer unavailable.",
                http_status=503,
            )

        prompt = self._build_prompt(request)

        # Attempt 1
        try:
            raw, tokens_1 = await asyncio.wait_for(
                self._call_openai(prompt), timeout=self.timeout
            )
        except asyncio.TimeoutError as exc:
            raise SummarizerUnavailable(
                f"OpenAI request timed out after {self.timeout}s",
                http_status=504,
            ) from exc

        validated, error = self._validate(raw)
        if validated is not None:
            logger.info(
                "[corr=%s] summary track=%s level=%s score=%.1f tokens=%d retry=0",
                correlation_id, request.track, request.skillLevel,
                request.totalScore, tokens_1,
            )
            return self._wrap_response(
                validated,
                stats=SummarizerCallStats(tokens_used=tokens_1, retry_count=0),
            )

        # Attempt 2 (one retry with self-correction prefix)
        logger.warning(
            "[corr=%s] summary first response invalid (%s) — retrying with self-correction",
            correlation_id, error,
        )
        try:
            raw_retry, tokens_2 = await asyncio.wait_for(
                self._call_openai(prompt + _RETRY_REMINDER.format(error=error)),
                timeout=self.timeout,
            )
        except asyncio.TimeoutError as exc:
            raise SummarizerUnavailable(
                f"OpenAI retry timed out after {self.timeout}s",
                http_status=504,
            ) from exc

        validated, error = self._validate(raw_retry)
        if validated is not None:
            logger.info(
                "[corr=%s] summary track=%s level=%s score=%.1f tokens=%d retry=1",
                correlation_id, request.track, request.skillLevel,
                request.totalScore, tokens_1 + tokens_2,
            )
            return self._wrap_response(
                validated,
                stats=SummarizerCallStats(tokens_used=tokens_1 + tokens_2, retry_count=1),
            )

        logger.error(
            "[corr=%s] summary failed after retry — last error: %s", correlation_id, error,
        )
        raise SummarizerUnavailable(
            f"AI summarizer produced invalid output after retry: {error}",
            http_status=422,
        )

    # ---------------------------------------------------------------------
    # Internals
    # ---------------------------------------------------------------------

    def _build_prompt(self, request: AssessmentSummaryRequest) -> str:
        """Load the prompt template and interpolate request variables."""
        template = load_prompt(PROMPT_VERSION)
        breakdown = self._format_category_breakdown(request.categoryScores)
        duration_min = round(request.durationSec / 60.0, 1)
        return template.format(
            track=request.track,
            total_score=f"{request.totalScore:.0f}",
            skill_level=request.skillLevel,
            duration_sec=request.durationSec,
            duration_min=duration_min,
            category_breakdown=breakdown,
        )

    @staticmethod
    def _format_category_breakdown(rows: List[CategoryScoreInput]) -> str:
        """Render the per-category breakdown as a compact bulleted block.

        Categories are listed in the canonical order regardless of input
        order, so the LLM sees a stable layout across requests. Categories
        with totalAnswered=0 still appear with a clear "(not assessed)"
        marker so the model knows not to invent feedback for them.
        """
        canonical_order = ["DataStructures", "Algorithms", "OOP", "Databases", "Security"]
        by_category = {row.category: row for row in rows}
        lines = []
        for cat in canonical_order:
            row = by_category.get(cat)
            label = _CATEGORY_LABELS[cat]
            if row is None:
                lines.append(f"  - {label}: (not assessed)")
            elif row.totalAnswered == 0:
                lines.append(f"  - {label}: (not assessed)")
            else:
                lines.append(
                    f"  - {label}: {row.score:.0f}/100 "
                    f"({row.totalAnswered} answered, {row.correctCount} correct)"
                )
        return "\n".join(lines)

    async def _call_openai(self, prompt: str) -> Tuple[str, int]:
        """One OpenAI Responses API call. Returns (content, tokens_used)."""
        assert self.client is not None  # is_available checked at entry
        try:
            response = await self.client.responses.create(
                model=self.model,
                instructions=SYSTEM_INSTRUCTIONS,
                input=prompt,
                max_output_tokens=self.max_tokens,
                reasoning={"effort": "low"},  # ADR-045
            )
        except RateLimitError as exc:
            raise SummarizerUnavailable(
                "OpenAI rate limit exceeded — try again shortly.", http_status=503,
            ) from exc
        except APITimeoutError as exc:
            raise SummarizerUnavailable(
                "OpenAI request timed out.", http_status=504,
            ) from exc
        except BadRequestError as exc:
            err_code = (getattr(exc, "code", "") or "").lower()
            if err_code == "context_length_exceeded" or "context length" in str(exc).lower():
                raise SummarizerUnavailable(
                    "Summary prompt exceeded model context window.",
                    http_status=400,
                ) from exc
            raise SummarizerUnavailable(
                f"OpenAI rejected the request: {exc}", http_status=400,
            ) from exc
        except APIError as exc:
            raise SummarizerUnavailable(
                f"OpenAI API error: {exc}", http_status=503,
            ) from exc

        content = response.output_text or ""
        tokens = int(response.usage.total_tokens) if response.usage else 0
        return content, tokens

    def _validate(self, raw: str) -> Tuple[Optional[Dict[str, str]], str]:
        """Parse + validate one OpenAI response.

        Returns ({strengthsParagraph, weaknessesParagraph, pathGuidanceParagraph}, "")
        on success, (None, error_message) on failure.
        """
        parsed = _try_load_json(raw)
        if parsed is None:
            return None, "response is not valid JSON (after fence-strip + brace-extract repair)"
        if not isinstance(parsed, dict):
            return None, f"response JSON is {type(parsed).__name__}, expected object"

        for key in ("strengthsParagraph", "weaknessesParagraph", "pathGuidanceParagraph"):
            if key not in parsed:
                return None, f"response missing required key: {key}"
            if not isinstance(parsed[key], str):
                return None, f"key {key} must be a string, got {type(parsed[key]).__name__}"
            stripped = parsed[key].strip()
            if len(stripped) < 50:
                return None, (
                    f"{key} is {len(stripped)} chars after strip; minimum 50 required "
                    "(target 80-180 words per paragraph)"
                )

        # Belt-and-suspenders: round-trip through the response model so the
        # service-level validation matches the wire-level contract.
        try:
            AssessmentSummaryResponse(
                strengthsParagraph=parsed["strengthsParagraph"],
                weaknessesParagraph=parsed["weaknessesParagraph"],
                pathGuidanceParagraph=parsed["pathGuidanceParagraph"],
                promptVersion=PROMPT_VERSION,
                tokensUsed=0,
                retryCount=0,
            )
        except ValidationError as exc:
            first_err = exc.errors()[0] if exc.errors() else {"msg": "unknown validation error"}
            loc = ".".join(str(p) for p in first_err.get("loc", ()))
            msg = first_err.get("msg", "")
            return None, f"response failed schema validation: {loc}: {msg}"

        return {
            "strengthsParagraph": parsed["strengthsParagraph"].strip(),
            "weaknessesParagraph": parsed["weaknessesParagraph"].strip(),
            "pathGuidanceParagraph": parsed["pathGuidanceParagraph"].strip(),
        }, ""

    def _wrap_response(
        self,
        validated: Dict[str, str],
        *,
        stats: SummarizerCallStats,
    ) -> AssessmentSummaryResponse:
        return AssessmentSummaryResponse(
            strengthsParagraph=validated["strengthsParagraph"],
            weaknessesParagraph=validated["weaknessesParagraph"],
            pathGuidanceParagraph=validated["pathGuidanceParagraph"],
            promptVersion=PROMPT_VERSION,
            tokensUsed=stats.tokens_used,
            retryCount=stats.retry_count,
        )


# Singleton accessor — matches the pattern of get_question_generator() / get_ai_reviewer().
_summarizer_instance: Optional[AssessmentSummarizer] = None


def get_assessment_summarizer() -> AssessmentSummarizer:
    """Get or create the assessment-summarizer singleton."""
    global _summarizer_instance
    if _summarizer_instance is None:
        _summarizer_instance = AssessmentSummarizer()
    return _summarizer_instance


def reset_assessment_summarizer_for_tests() -> None:
    """Test helper — clears the singleton so a fresh client picks up new env."""
    global _summarizer_instance
    _summarizer_instance = None

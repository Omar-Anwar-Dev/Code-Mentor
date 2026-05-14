"""S16-T1 / F15: AI Question Generator service.

Wraps OpenAI's Responses API (per ADR-045) with:
- prompt template loading (``generate_questions_v1.md``)
- JSON fence-strip + balanced-block extraction repair
- one retry-with-self-correction on schema validation failure
- token cap + reasoning-effort cap per ADR-045

Used by the ``POST /api/generate-questions`` route. Stateless except for
the OpenAI ``AsyncOpenAI`` client; the singleton accessor below caches the
instance per process.
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
from app.domain.schemas.generator import (
    GenerateQuestionsRequest,
    GenerateQuestionsResponse,
)
from app.prompts import load_prompt

logger = logging.getLogger(__name__)


# Prompt template version. Bumped when the .md file is replaced; old files
# stay on disk for thesis / comparison.
PROMPT_VERSION = "generate_questions_v1"

# How much of the response budget the model can spend (per ADR-045 the
# reasoning model consumes some of this before the visible JSON streams).
# Sized so the largest realistic batch (count=20, includeCode=true) fits
# comfortably even after reasoning overhead — each draft ~600 visible
# tokens on the JSON side.
GENERATOR_MAX_OUTPUT_TOKENS = 16384

# Per-call timeout in seconds. Matches the audit endpoint's budget — the
# largest request (count=20) takes ~30-40s of model time empirically.
GENERATOR_TIMEOUT_SECONDS = 180

# JSON repair helpers — re-used from ai_reviewer.py, kept local here so
# the generator is a self-contained module. The implementations are
# intentionally identical (same fence behaviour, same brace tracking).

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
    "Re-read the schema carefully, especially: exactly 4 options per draft, "
    "correctAnswer must be one of A|B|C|D, irtA in [0.5, 2.5], irtB in [-3.0, 3.0], "
    "and difficulty in {{1, 2, 3}}."
)


SYSTEM_INSTRUCTIONS = (
    "You are an expert technical assessment author for an undergraduate "
    "computer-science learning platform. You write multiple-choice "
    "questions that probe conceptual understanding, not trivia. "
    "You respond with valid JSON only — no markdown fences, no prose."
)


# Self-correction max attempts (1 means one extra retry beyond the first
# call). Per `assessment-learning-path.md` §6.3 the spec is "max 2
# retries"; current code does 1 retry on top of 1 initial attempt (2
# total calls), which matches the recipe used by `ai_reviewer.review_code`
# and is bounded so a flaky model doesn't burn tokens indefinitely.
MAX_RETRIES = 1


class GeneratorUnavailable(RuntimeError):
    """Raised when the generator can't produce a valid response after retries.

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
class GeneratorCallStats:
    tokens_used: int
    retry_count: int


class QuestionGenerator:
    """Async OpenAI-backed question generator with one self-correction retry."""

    def __init__(self) -> None:
        settings = get_settings()
        self.api_key = settings.openai_api_key
        self.model = settings.openai_model
        self.timeout = GENERATOR_TIMEOUT_SECONDS
        self.max_tokens = GENERATOR_MAX_OUTPUT_TOKENS
        self.client: Optional[AsyncOpenAI] = (
            AsyncOpenAI(api_key=self.api_key) if self.api_key else None
        )

    @property
    def is_available(self) -> bool:
        return self.client is not None

    # ---------------------------------------------------------------------
    # Public entry
    # ---------------------------------------------------------------------

    async def generate(
        self,
        request: GenerateQuestionsRequest,
        *,
        correlation_id: str = "-",
    ) -> GenerateQuestionsResponse:
        """Generate N drafts and return the validated response."""
        if not self.is_available:
            raise GeneratorUnavailable(
                "OpenAI API key is not configured; generator unavailable.",
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
            raise GeneratorUnavailable(
                f"OpenAI request timed out after {self.timeout}s",
                http_status=504,
            ) from exc

        validated, error = self._validate(raw, request)
        if validated is not None:
            logger.info(
                "[corr=%s] generator batch=%s category=%s difficulty=%d count=%d retry=0 tokens=%d",
                correlation_id, batch_id, request.category, request.difficulty, request.count, tokens_1,
            )
            return self._wrap_response(
                validated, batch_id=batch_id,
                stats=GeneratorCallStats(tokens_used=tokens_1, retry_count=0),
            )

        # Attempt 2 (one retry with self-correction prefix)
        logger.warning(
            "[corr=%s] generator first response invalid (%s) — retrying with self-correction",
            correlation_id, error,
        )
        try:
            raw_retry, tokens_2 = await asyncio.wait_for(
                self._call_openai(prompt + _RETRY_REMINDER.format(error=error)),
                timeout=self.timeout,
            )
        except asyncio.TimeoutError as exc:
            raise GeneratorUnavailable(
                f"OpenAI retry timed out after {self.timeout}s",
                http_status=504,
            ) from exc

        validated, error = self._validate(raw_retry, request)
        if validated is not None:
            logger.info(
                "[corr=%s] generator batch=%s category=%s difficulty=%d count=%d retry=1 tokens=%d",
                correlation_id, batch_id, request.category, request.difficulty, request.count, tokens_1 + tokens_2,
            )
            return self._wrap_response(
                validated, batch_id=batch_id,
                stats=GeneratorCallStats(tokens_used=tokens_1 + tokens_2, retry_count=1),
            )

        logger.error(
            "[corr=%s] generator failed after retry — last error: %s", correlation_id, error,
        )
        raise GeneratorUnavailable(
            f"AI generator produced invalid output after retry: {error}",
            http_status=422,
        )

    # ---------------------------------------------------------------------
    # Internals
    # ---------------------------------------------------------------------

    def _build_prompt(self, request: GenerateQuestionsRequest) -> str:
        """Load the prompt template and interpolate request variables."""
        template = load_prompt(PROMPT_VERSION)
        code_block = self._format_code_block(request)
        existing_snippets = self._format_existing_snippets(request.existingSnippets)
        return template.format(
            count=request.count,
            category=request.category,
            difficulty=request.difficulty,
            code_block=code_block,
            existing_snippets=existing_snippets,
        )

    @staticmethod
    def _format_code_block(request: GenerateQuestionsRequest) -> str:
        if not request.includeCode:
            return ""
        language = (request.language or "").strip()
        return (
            "## Include a code snippet\n\n"
            f"Each question MUST include a short, self-contained ``{language}`` code snippet "
            f"(≤ 30 lines) in the ``codeSnippet`` field. The snippet should be a small, complete "
            f"example that the question can reason about. Set ``codeLanguage`` to ``\"{language}\"``."
        )

    @staticmethod
    def _format_existing_snippets(snippets: List[str]) -> str:
        if not snippets:
            return "(none — generate fresh content for this category)"
        # Trim each snippet to the first sentence-ish + cap total list length
        # so a 250-question bank doesn't blow the prompt budget.
        compact = []
        for raw in snippets[:60]:  # cap at 60 hints to keep prompt size bounded
            text = re.sub(r"\s+", " ", str(raw)).strip()
            if len(text) > 200:
                text = text[:197].rstrip() + "..."
            compact.append(f"- {text}")
        return "\n".join(compact)

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
            raise GeneratorUnavailable(
                "OpenAI rate limit exceeded — try again shortly.", http_status=503,
            ) from exc
        except APITimeoutError as exc:
            raise GeneratorUnavailable(
                "OpenAI request timed out.", http_status=504,
            ) from exc
        except BadRequestError as exc:
            err_code = (getattr(exc, "code", "") or "").lower()
            if err_code == "context_length_exceeded" or "context length" in str(exc).lower():
                raise GeneratorUnavailable(
                    "Generator prompt exceeded model context window — reduce existingSnippets or batch size.",
                    http_status=400,
                ) from exc
            raise GeneratorUnavailable(
                f"OpenAI rejected the request: {exc}", http_status=400,
            ) from exc
        except APIError as exc:
            raise GeneratorUnavailable(
                f"OpenAI API error: {exc}", http_status=503,
            ) from exc

        content = response.output_text or ""
        tokens = int(response.usage.total_tokens) if response.usage else 0
        return content, tokens

    def _validate(
        self,
        raw: str,
        request: GenerateQuestionsRequest,
    ) -> Tuple[Optional[List[Dict[str, Any]]], str]:
        """Parse + validate one OpenAI response.

        Returns (drafts_list, "") on success, (None, error_message) on failure.
        """
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

        # Validate each draft via the Pydantic model. We instantiate to
        # catch validation errors uniformly; the route serializer re-uses
        # the same model so the wire shape stays consistent.
        from app.domain.schemas.generator import GeneratedQuestionDraft

        validated: List[Dict[str, Any]] = []
        for idx, draft in enumerate(drafts):
            try:
                model = GeneratedQuestionDraft(**(draft if isinstance(draft, dict) else {}))
            except ValidationError as exc:
                first_err = exc.errors()[0] if exc.errors() else {"msg": "unknown validation error"}
                loc = ".".join(str(p) for p in first_err.get("loc", ()))
                msg = first_err.get("msg", "")
                return None, f"draft[{idx}] invalid: {loc}: {msg}"

            # Belt-and-suspenders: correctAnswer must point to a real option.
            letter_to_idx = {"A": 0, "B": 1, "C": 2, "D": 3}
            chosen_idx = letter_to_idx[model.correctAnswer]
            if chosen_idx >= len(model.options):
                return None, f"draft[{idx}] correctAnswer={model.correctAnswer} but only {len(model.options)} options"

            # Category alignment: the model should echo the requested
            # category; gently enforce so a runaway response can't sneak
            # past with a different category.
            if model.category != request.category:
                return None, f"draft[{idx}] category={model.category} does not match request.category={request.category}"

            # Difficulty alignment: same rule.
            if model.difficulty != request.difficulty:
                return None, f"draft[{idx}] difficulty={model.difficulty} does not match request.difficulty={request.difficulty}"

            validated.append(model.model_dump())

        return validated, ""

    def _wrap_response(
        self,
        validated_drafts: List[Dict[str, Any]],
        *,
        batch_id: str,
        stats: GeneratorCallStats,
    ) -> GenerateQuestionsResponse:
        return GenerateQuestionsResponse(
            drafts=validated_drafts,
            promptVersion=PROMPT_VERSION,
            tokensUsed=stats.tokens_used,
            retryCount=stats.retry_count,
            batchId=batch_id,
        )


# Singleton accessor — matches the pattern of get_ai_reviewer().
_generator_instance: Optional[QuestionGenerator] = None


def get_question_generator() -> QuestionGenerator:
    """Get or create the question generator singleton."""
    global _generator_instance
    if _generator_instance is None:
        _generator_instance = QuestionGenerator()
    return _generator_instance


def reset_question_generator_for_tests() -> None:
    """Test helper — clears the singleton so a fresh client picks up new env."""
    global _generator_instance
    _generator_instance = None

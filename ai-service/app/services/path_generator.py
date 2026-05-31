"""S19-T1 / F16: AI Path Generator service (hybrid recall + LLM rerank).

Architecture per ADR-052:

1. **Recall** — when ``candidateTasks`` is omitted, the AI service
   embeds the learner profile text via :code:`text-embedding-3-small`
   and computes cosine similarity against the in-memory
   :class:`TaskEmbeddingsCache`, returning the top-``recallTopK``.
   When ``candidateTasks`` is provided, recall is bypassed.

2. **Rerank** — the LLM receives the candidates + learner context and
   returns a JSON ordered path. We validate it through:
     - JSON fence-strip + balanced-block extraction repair.
     - Pydantic :class:`GeneratePathResponse` schema.
     - Cross-check: every returned taskId must appear in candidates.
     - Cross-check: ``len(pathTasks) == request.targetLength``.
     - Topological check via :func:`validate_path_topology` — verifies
       every prerequisite appears earlier in the ordering or is in
       the completed-tasks list.

   On any validation failure we **retry with self-correction** up to
   2 times, each retry adding a targeted hint about which constraint
   failed. After all retries are exhausted we raise
   :class:`PathGeneratorUnavailable` with HTTP 422 so the backend
   falls back to the legacy template path generator.

p95 latency target: ≤15 s end-to-end (recall + 1 LLM call). The
retry path can push past that on failure — backend should treat the
fallback as a normal mode of operation, not an error.
"""
from __future__ import annotations

import asyncio
import json
import logging
import re
import uuid
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Sequence, Tuple

from openai import APIError, APITimeoutError, AsyncOpenAI, BadRequestError, RateLimitError
from pydantic import ValidationError

from app.config import get_settings
from app.domain.schemas.path_generator import (
    CandidateTaskInput,
    GeneratedPathEntry,
    GeneratePathRequest,
    GeneratePathResponse,
)
from app.prompts import load_prompt
from app.services.path_topology import (
    TopologyValidationResult,
    validate_path_topology,
)
from app.services.task_embeddings_cache import (
    TaskCacheEntry,
    TaskEmbeddingsCache,
    get_task_embeddings_cache,
)

logger = logging.getLogger(__name__)


PROMPT_VERSION = "generate_path_v1"

PATH_GENERATOR_MAX_OUTPUT_TOKENS = 8192
PATH_GENERATOR_TIMEOUT_SECONDS = 180
MAX_RETRIES = 2  # per S19-T1 acceptance — retry-with-self-correction (max 2)

SYSTEM_INSTRUCTIONS = (
    "You are a senior software-engineering curriculum designer. You respond "
    "with valid JSON only — no markdown fences, no prose, no comments. "
    "The first character of your response is '{' and the last is '}'."
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


# Self-correction hint templates. Each one is added as a suffix to the
# original prompt on retry, telling the model exactly which constraint
# failed.

_RETRY_GENERIC = (
    "\n\n=== RETRY (your previous response failed validation) ===\n"
    "Error: {error}\n\n"
    "Respond with PURE JSON ONLY: no markdown fences, no prose, no comments. "
    "The first character of your response MUST be '{{' and the last must be '}}'. "
    "Re-read the schema carefully — especially: pathTasks must contain exactly "
    "{target_length} entries, orderIndex MUST be dense 1..{target_length}, every "
    "taskId MUST be in the candidate list, and prerequisites MUST appear earlier "
    "in the ordering or be in the completed-tasks list."
)


class PathGeneratorUnavailable(RuntimeError):
    """Raised when the path generator can't produce a valid response."""

    def __init__(self, message: str, *, http_status: int = 503) -> None:
        super().__init__(message)
        self.http_status = http_status


@dataclass
class _CallStats:
    tokens_used: int
    retry_count: int


class PathGenerator:
    """Async OpenAI-backed path generator with bounded retry."""

    def __init__(self, cache: Optional[TaskEmbeddingsCache] = None) -> None:
        settings = get_settings()
        self.api_key = settings.openai_api_key
        self.model = settings.openai_model
        self.embedding_model = settings.embedding_model
        self.timeout = PATH_GENERATOR_TIMEOUT_SECONDS
        self.max_tokens = PATH_GENERATOR_MAX_OUTPUT_TOKENS
        self.client: Optional[AsyncOpenAI] = (
            AsyncOpenAI(api_key=self.api_key) if self.api_key else None
        )
        self._cache = cache  # late-bound via dependency injection; falls back to global

    def _resolve_cache(self) -> TaskEmbeddingsCache:
        return self._cache or get_task_embeddings_cache()

    @property
    def is_available(self) -> bool:
        return self.client is not None

    # ------------------------------------------------------------------
    # Public entry point
    # ------------------------------------------------------------------

    async def generate(
        self,
        request: GeneratePathRequest,
        *,
        correlation_id: str = "-",
    ) -> GeneratePathResponse:
        if not self.is_available:
            raise PathGeneratorUnavailable(
                "OpenAI API key is not configured; path generator unavailable.",
                http_status=503,
            )

        gen_id = uuid.uuid4().hex[:12]

        # Stage 1 — recall (or bypass)
        candidates = await self._resolve_candidates(request, correlation_id=correlation_id)
        if len(candidates) < request.targetLength:
            raise PathGeneratorUnavailable(
                f"Insufficient candidates ({len(candidates)}) for targetLength="
                f"{request.targetLength}; cache may be empty or track has too few tasks.",
                http_status=503,
            )

        # Build prompt prefix; reuse across retries (only the suffix changes).
        prompt_body = self._build_prompt(request, candidates)
        prereq_map: Dict[str, List[str]] = {c.taskId: list(c.prerequisites) for c in candidates}
        candidate_ids = {c.taskId for c in candidates}
        completed_set = set(request.completedTaskIds)
        external_prereqs = completed_set  # treat completed tasks as satisfying any in-list prereq

        # Stage 2 — LLM rerank with retry-with-self-correction
        attempt = 0
        total_tokens = 0
        last_error = "(no attempt yet)"
        last_topology_hint = ""

        while attempt <= MAX_RETRIES:
            attempt_prompt = prompt_body
            if attempt > 0:
                attempt_prompt = prompt_body + _RETRY_GENERIC.format(
                    error=last_error,
                    target_length=request.targetLength,
                ) + last_topology_hint
            try:
                raw, tokens_n = await asyncio.wait_for(
                    self._call_openai(attempt_prompt), timeout=self.timeout,
                )
            except asyncio.TimeoutError as exc:
                raise PathGeneratorUnavailable(
                    f"OpenAI request timed out after {self.timeout}s",
                    http_status=504,
                ) from exc

            total_tokens += tokens_n

            parsed_pathtasks, parsed_reasoning, error = self._parse_and_pydantic(
                raw, target_length=request.targetLength,
            )
            if parsed_pathtasks is None:
                last_error = error
                last_topology_hint = ""
                logger.warning(
                    "[corr=%s] path-gen gen=%s attempt %d failed parse/Pydantic: %s",
                    correlation_id, gen_id, attempt + 1, error,
                )
                attempt += 1
                continue

            # Cross-check: every taskId in pathTasks must be in candidates
            unknown_ids = [
                entry.taskId for entry in parsed_pathtasks
                if entry.taskId not in candidate_ids
            ]
            if unknown_ids:
                last_error = (
                    f"pathTasks contains taskId(s) not in the candidate list: "
                    f"{unknown_ids[:5]}"
                )
                last_topology_hint = ""
                logger.warning(
                    "[corr=%s] path-gen gen=%s attempt %d hallucinated IDs: %s",
                    correlation_id, gen_id, attempt + 1, unknown_ids[:5],
                )
                attempt += 1
                continue

            # Cross-check: every taskId must not be in completedTaskIds
            collisions = [
                entry.taskId for entry in parsed_pathtasks
                if entry.taskId in completed_set
            ]
            if collisions:
                last_error = (
                    f"pathTasks includes already-completed task(s): {collisions[:5]}"
                )
                last_topology_hint = ""
                attempt += 1
                continue

            # Cross-check: count matches targetLength
            if len(parsed_pathtasks) != request.targetLength:
                last_error = (
                    f"pathTasks count={len(parsed_pathtasks)} doesn't match "
                    f"targetLength={request.targetLength}"
                )
                last_topology_hint = ""
                attempt += 1
                continue

            # Topological check: walk the proposed order; every prereq must appear
            # earlier or be in the completed-tasks set.
            ordered_ids = [
                entry.taskId for entry in sorted(parsed_pathtasks, key=lambda e: e.orderIndex)
            ]
            # Build the effective prereq map for the validator: only include prereqs
            # that are *in* the proposed order; external prereqs that are in the
            # completed-tasks list are dropped (treated as already satisfied).
            ordered_set = set(ordered_ids)
            effective_prereqs: Dict[str, List[str]] = {}
            for tid in ordered_ids:
                raw_prereqs = prereq_map.get(tid, [])
                # Keep both in-list AND completely external prereqs; the validator
                # treats prereqs not in ordered_set as satisfied externally.
                # But we want to FAIL if a prereq is external AND NOT completed.
                kept: List[str] = []
                for p in raw_prereqs:
                    if p in ordered_set:
                        kept.append(p)
                        continue
                    # External — only OK if it's in the completed-tasks set.
                    if p in external_prereqs:
                        continue  # satisfied externally — drop from validator input
                    # External AND not completed AND not in candidate list — that's
                    # a real unmet prereq. Synthesize a "phantom in-list" violation so
                    # the validator catches it.
                    kept.append(p)
                effective_prereqs[tid] = kept

            topology = validate_path_topology(ordered_ids, effective_prereqs)
            if not topology.is_valid:
                last_error = topology.reason or "topology validation failed"
                last_topology_hint = (
                    f"\n\nTopological constraint failed: {topology.reason}. "
                    f"Reorder so that '{topology.offending_prerequisite}' "
                    f"appears before '{topology.offending_dependent}', or pick a "
                    f"different candidate whose prerequisites are already met."
                )
                logger.warning(
                    "[corr=%s] path-gen gen=%s attempt %d topology fail: %s",
                    correlation_id, gen_id, attempt + 1, topology.reason,
                )
                attempt += 1
                continue

            # All checks passed.
            stats = _CallStats(tokens_used=total_tokens, retry_count=attempt)
            response = self._wrap_response(
                path_tasks=parsed_pathtasks,
                overall_reasoning=parsed_reasoning,
                recall_size=len(candidates),
                stats=stats,
            )
            logger.info(
                "[corr=%s] path-gen gen=%s track=%s target=%d recall=%d retries=%d tokens=%d",
                correlation_id,
                gen_id,
                request.track,
                request.targetLength,
                len(candidates),
                attempt,
                total_tokens,
            )
            return response

        # Out of retries
        logger.error(
            "[corr=%s] path-gen gen=%s exhausted %d retries; last error: %s",
            correlation_id, gen_id, MAX_RETRIES, last_error,
        )
        raise PathGeneratorUnavailable(
            f"AI path generator produced invalid output after {MAX_RETRIES} retries: "
            f"{last_error}",
            http_status=422,
        )

    # ------------------------------------------------------------------
    # Recall stage
    # ------------------------------------------------------------------

    async def _resolve_candidates(
        self,
        request: GeneratePathRequest,
        *,
        correlation_id: str,
    ) -> List[CandidateTaskInput]:
        if request.candidateTasks is not None:
            # Backend bypassed recall — use what they sent.
            return list(request.candidateTasks)

        cache = self._resolve_cache()
        cache_size = await cache.size()
        if cache_size == 0:
            raise PathGeneratorUnavailable(
                "task_embeddings_cache is empty — no candidates available. "
                "Backend should either pass candidateTasks inline or run the "
                "task-embeddings backfill tool first.",
                http_status=503,
            )

        # Build the query text + embed it
        query_text = self._build_recall_query_text(request)
        try:
            query_vector = await self._embed_query(query_text)
        except PathGeneratorUnavailable:
            raise

        completed_set = set(request.completedTaskIds)
        ranked = await cache.cosine_top_k(
            query_vector,
            top_k=request.recallTopK,
            track_filter=request.track,
            exclude_task_ids=completed_set,
        )

        candidates = [
            CandidateTaskInput(
                taskId=entry.task_id,
                title=entry.title,
                descriptionSummary=entry.description_summary,
                skillTags=entry.skill_tags_as_list(),
                learningGain=entry.learning_gain_as_dict(),
                difficulty=entry.difficulty,
                prerequisites=list(entry.prerequisites),
                track=entry.track,
                expectedLanguage=entry.expected_language,
                category=entry.category,
                estimatedHours=entry.estimated_hours,
            )
            for entry, _sim in ranked
        ]
        logger.info(
            "[corr=%s] path-gen recall returned %d candidates (cache=%d, top_k=%d, track=%s)",
            correlation_id, len(candidates), cache_size, request.recallTopK, request.track,
        )
        return candidates

    def _build_recall_query_text(self, request: GeneratePathRequest) -> str:
        """Builds the text we embed for cosine recall.

        Includes the track, the per-category skill scores, and the
        assessment summary (when present) so the recall picks up tasks
        that match the learner's actual weakness profile.
        """
        score_lines = [
            f"- {cat}: {int(round(score))}/100"
            for cat, score in sorted(request.skillProfile.items())
        ]
        parts = [
            f"Learner on the {request.track} track.",
            "Skill scores:",
            *score_lines,
        ]
        if request.assessmentSummaryText:
            parts.append("Recent assessment notes:")
            parts.append(request.assessmentSummaryText)
        return "\n".join(parts)

    async def _embed_query(self, text: str) -> List[float]:
        assert self.client is not None
        try:
            resp = await self.client.embeddings.create(
                model=self.embedding_model,
                input=[text],
            )
        except RateLimitError as exc:
            raise PathGeneratorUnavailable(
                "OpenAI rate limit exceeded during recall embedding.",
                http_status=503,
            ) from exc
        except APIError as exc:
            raise PathGeneratorUnavailable(
                f"OpenAI embedding call failed: {exc}",
                http_status=503,
            ) from exc

        return list(resp.data[0].embedding)

    # ------------------------------------------------------------------
    # Prompt assembly
    # ------------------------------------------------------------------

    def _build_prompt(
        self,
        request: GeneratePathRequest,
        candidates: Sequence[CandidateTaskInput],
    ) -> str:
        template = load_prompt(PROMPT_VERSION)
        return template.format(
            track=request.track,
            skill_profile_lines=self._format_skill_profile(request.skillProfile),
            assessment_summary_text=self._format_assessment_summary(
                request.assessmentSummaryText
            ),
            completed_task_ids_list=self._format_completed_ids(request.completedTaskIds),
            target_length=request.targetLength,
            candidate_tasks_block=self._format_candidate_block(candidates),
        )

    @staticmethod
    def _format_skill_profile(profile: Dict[str, float]) -> str:
        if not profile:
            return "(no skill scores available — treat as Beginner across the board)"
        lines = []
        for cat, score in sorted(profile.items()):
            label = _humanize_category(cat)
            lines.append(f"- {label}: {int(round(score))}/100")
        return "\n".join(lines)

    @staticmethod
    def _format_assessment_summary(text: Optional[str]) -> str:
        if text and text.strip():
            return text.strip()
        return "(no assessment summary available)"

    @staticmethod
    def _format_completed_ids(ids: Sequence[str]) -> str:
        if not ids:
            return "(none — this is the learner's first path)"
        return ", ".join(ids)

    @staticmethod
    def _format_candidate_block(candidates: Sequence[CandidateTaskInput]) -> str:
        lines: List[str] = []
        for c in candidates:
            tag_str = ", ".join(
                f"{tag.skill}:{tag.weight:.2f}"
                for tag in c.skillTags
            )
            prereq_str = (
                ", ".join(c.prerequisites) if c.prerequisites else "(none)"
            )
            summary = c.descriptionSummary
            if len(summary) > 600:
                summary = summary[:597].rstrip() + "..."
            lines.append(
                f"- ID={c.taskId}\n"
                f"  Title: {c.title}\n"
                f"  Difficulty: {c.difficulty}/5\n"
                f"  Skill tags: {tag_str}\n"
                f"  Prerequisites: {prereq_str}\n"
                f"  Summary: {summary}"
            )
        return "\n\n".join(lines)

    # ------------------------------------------------------------------
    # OpenAI call + parse
    # ------------------------------------------------------------------

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
            raise PathGeneratorUnavailable(
                "OpenAI rate limit exceeded — try again shortly.",
                http_status=503,
            ) from exc
        except APITimeoutError as exc:
            raise PathGeneratorUnavailable(
                "OpenAI request timed out.",
                http_status=504,
            ) from exc
        except BadRequestError as exc:
            err_code = (getattr(exc, "code", "") or "").lower()
            if err_code == "context_length_exceeded" or "context length" in str(exc).lower():
                raise PathGeneratorUnavailable(
                    "Path generator prompt exceeded model context window.",
                    http_status=400,
                ) from exc
            raise PathGeneratorUnavailable(
                f"OpenAI rejected the request: {exc}",
                http_status=400,
            ) from exc
        except APIError as exc:
            raise PathGeneratorUnavailable(
                f"OpenAI API error: {exc}",
                http_status=503,
            ) from exc

        content = response.output_text or ""
        tokens = int(response.usage.total_tokens) if response.usage else 0
        return content, tokens

    def _parse_and_pydantic(
        self,
        raw: str,
        *,
        target_length: int,
    ) -> Tuple[Optional[List[GeneratedPathEntry]], str, str]:
        """Returns (entries, overallReasoning, error)."""
        parsed = _try_load_json(raw)
        if parsed is None:
            return None, "", "response is not valid JSON (after fence-strip + brace-extract repair)"
        if not isinstance(parsed, dict):
            return None, "", f"response JSON is {type(parsed).__name__}, expected object"

        path_tasks_raw = parsed.get("pathTasks")
        if not isinstance(path_tasks_raw, list):
            return None, "", "response missing top-level 'pathTasks' array"
        overall = parsed.get("overallReasoning")
        if not isinstance(overall, str):
            return None, "", "response missing or non-string 'overallReasoning'"
        if len(overall.strip()) < 20:
            return None, "", "overallReasoning must be at least 20 chars"

        # Validate each pathTask via Pydantic
        validated: List[GeneratedPathEntry] = []
        for idx, item in enumerate(path_tasks_raw):
            try:
                entry = GeneratedPathEntry(**(item if isinstance(item, dict) else {}))
            except ValidationError as exc:
                first_err = exc.errors()[0] if exc.errors() else {"msg": "unknown validation error"}
                loc = ".".join(str(p) for p in first_err.get("loc", ()))
                msg = first_err.get("msg", "")
                return None, "", f"pathTasks[{idx}] invalid: {loc}: {msg}"
            validated.append(entry)

        if len(validated) != target_length:
            return (
                None,
                "",
                f"pathTasks count={len(validated)} doesn't match targetLength={target_length}",
            )

        # Dense indices + unique IDs are already enforced by the response model,
        # but we run them here too because we haven't constructed the response yet.
        order_indices = sorted(e.orderIndex for e in validated)
        if order_indices != list(range(1, target_length + 1)):
            return None, "", f"orderIndex must be dense 1..{target_length}; got {order_indices}"
        ids = [e.taskId for e in validated]
        if len(set(ids)) != len(ids):
            return None, "", "duplicate taskId in pathTasks"

        return validated, overall.strip(), ""

    def _wrap_response(
        self,
        *,
        path_tasks: List[GeneratedPathEntry],
        overall_reasoning: str,
        recall_size: int,
        stats: _CallStats,
    ) -> GeneratePathResponse:
        return GeneratePathResponse(
            pathTasks=path_tasks,
            overallReasoning=overall_reasoning,
            recallSize=recall_size,
            promptVersion=PROMPT_VERSION,
            tokensUsed=stats.tokens_used,
            retryCount=stats.retry_count,
        )


_HUMAN_LABELS = {
    "DataStructures": "Data Structures",
    "Algorithms": "Algorithms",
    "OOP": "Object-Oriented Programming",
    "Databases": "Databases",
    "Security": "Security",
    "correctness": "Correctness",
    "readability": "Readability",
    "security": "Security",
    "performance": "Performance",
    "design": "Design",
}


def _humanize_category(raw: str) -> str:
    return _HUMAN_LABELS.get(raw, raw)


_path_generator_instance: Optional[PathGenerator] = None


def get_path_generator() -> PathGenerator:
    global _path_generator_instance
    if _path_generator_instance is None:
        _path_generator_instance = PathGenerator()
    return _path_generator_instance


def reset_path_generator_for_tests() -> None:
    global _path_generator_instance
    _path_generator_instance = None

"""S20-T1 / F16: AI Path Adaptation service (signal-driven action plan).

Sibling to :mod:`app.services.path_generator` — same retry-with-self-
correction state machine, same OpenAI Responses API surface, same
prompt-loader pattern. The differences are scope:

- This endpoint **edits** an existing path; it doesn't build a new one.
- Output is an action list (`reorder` / `swap`), not a full path.
- Scope enforcement: signal level constrains which action types are
  allowed (see `assessment-learning-path.md` §6.2.3 + ADR-053).

The cross-checks performed after LLM response (in order):

1. JSON fence-strip + balanced-block extraction repair.
2. Pydantic :class:`AdaptPathResponse` schema validation (enforces:
   - signal=no_action → empty actions
   - signal=small → all actions are reorder
   - no duplicate targetPositions
   - reorder ↔ newOrderIndex / swap ↔ newTaskId shape).
3. Cross-check: `signalLevel` in the response matches the request.
4. Cross-check: every `targetPosition` ∈ [1, len(currentPath)] AND the
   task at that position is NOT Completed/Skipped (immutable history).
5. Cross-check: every `swap.newTaskId` is in the candidate pool.
6. Cross-check (`small` signal only): each reorder is intra-skill-area
   — the moved task shares at least one skill tag with the task at its
   new position.
7. Cross-check (`reorder`): newOrderIndex is in [1, len(currentPath)].

On any failure we retry-with-self-correction up to 2 times, each retry
appending a targeted hint pointing at the failed constraint. After
retries are exhausted we raise :class:`PathAdapterUnavailable(422)`;
the backend's :code:`PathAdaptationJob` translates that into a
"AI service unavailable; adaptation deferred" event with empty actions.

p95 latency target: ≤10 s end-to-end. The recall stage is trivial
(candidates come from the request), so the bulk of the budget goes to
the single LLM call.
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
from app.domain.schemas.path_adaptation import (
    AdaptPathRequest,
    AdaptPathResponse,
    CandidateReplacement,
    CurrentPathEntry,
    ProposedAction,
    RecentSubmissionInput,
    SignalLevel,
)
from app.prompts import load_prompt

logger = logging.getLogger(__name__)


PROMPT_VERSION = "adapt_path_v1"

ADAPT_PATH_MAX_OUTPUT_TOKENS = 4096
ADAPT_PATH_TIMEOUT_SECONDS = 120
MAX_RETRIES = 2

SYSTEM_INSTRUCTIONS = (
    "You are a senior software-engineering learning coach. You respond "
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


_RETRY_GENERIC = (
    "\n\n=== RETRY (your previous response failed validation) ===\n"
    "Error: {error}\n\n"
    "Respond with PURE JSON ONLY: no markdown fences, no prose, no comments. "
    "The first character of your response MUST be '{{' and the last must be '}}'. "
    "Re-read the schema: signalLevel MUST be '{signal_level}'; for signal=small "
    "EVERY action MUST be type='reorder' (no swaps); each action targets a "
    "distinct position; reorder requires newOrderIndex AND null newTaskId; swap "
    "requires newTaskId from the candidate list AND null newOrderIndex."
)


class PathAdapterUnavailable(RuntimeError):
    """Raised when the path adapter can't produce a valid response."""

    def __init__(self, message: str, *, http_status: int = 503) -> None:
        super().__init__(message)
        self.http_status = http_status


@dataclass
class _CallStats:
    tokens_used: int
    retry_count: int


class PathAdapter:
    """Async OpenAI-backed adaptation-plan generator with bounded retry."""

    def __init__(self) -> None:
        settings = get_settings()
        self.api_key = settings.openai_api_key
        self.model = settings.openai_model
        self.timeout = ADAPT_PATH_TIMEOUT_SECONDS
        self.max_tokens = ADAPT_PATH_MAX_OUTPUT_TOKENS
        self.client: Optional[AsyncOpenAI] = (
            AsyncOpenAI(api_key=self.api_key) if self.api_key else None
        )

    @property
    def is_available(self) -> bool:
        return self.client is not None

    # ------------------------------------------------------------------
    # Public entry point
    # ------------------------------------------------------------------

    async def adapt(
        self,
        request: AdaptPathRequest,
        *,
        correlation_id: str = "-",
    ) -> AdaptPathResponse:
        if not self.is_available:
            raise PathAdapterUnavailable(
                "OpenAI API key is not configured; path adapter unavailable.",
                http_status=503,
            )

        adapt_id = uuid.uuid4().hex[:12]

        # Fast-path: signal_level=no_action — no LLM call needed.
        if request.signalLevel == "no_action":
            logger.info(
                "[corr=%s] adapt-path adapt=%s signalLevel=no_action; "
                "returning empty action plan without an LLM call.",
                correlation_id, adapt_id,
            )
            return AdaptPathResponse(
                actions=[],
                overallReasoning=(
                    "Signal level evaluated as no_action: the learner's recent "
                    "score swings did not exceed the 10-point threshold and "
                    "no other trigger conditions fired. Current path remains "
                    "on track without changes."
                ),
                signalLevel="no_action",
                promptVersion=PROMPT_VERSION,
                tokensUsed=0,
                retryCount=0,
            )

        prompt_body = self._build_prompt(request)
        path_positions: Dict[int, CurrentPathEntry] = {
            entry.orderIndex: entry for entry in request.currentPath
        }
        candidate_ids = {c.taskId for c in request.candidateReplacements}
        candidate_map: Dict[str, CandidateReplacement] = {
            c.taskId: c for c in request.candidateReplacements
        }

        attempt = 0
        total_tokens = 0
        last_error = "(no attempt yet)"
        last_topology_hint = ""

        while attempt <= MAX_RETRIES:
            attempt_prompt = prompt_body
            if attempt > 0:
                attempt_prompt = (
                    prompt_body
                    + _RETRY_GENERIC.format(
                        error=last_error,
                        signal_level=request.signalLevel,
                    )
                    + last_topology_hint
                )
            try:
                raw, tokens_n = await asyncio.wait_for(
                    self._call_openai(attempt_prompt), timeout=self.timeout,
                )
            except asyncio.TimeoutError as exc:
                raise PathAdapterUnavailable(
                    f"OpenAI request timed out after {self.timeout}s",
                    http_status=504,
                ) from exc

            total_tokens += tokens_n

            parsed_response, error = self._parse_and_pydantic(
                raw, signal_level=request.signalLevel,
            )
            if parsed_response is None:
                last_error = error
                last_topology_hint = ""
                logger.warning(
                    "[corr=%s] adapt-path adapt=%s attempt %d failed parse/Pydantic: %s",
                    correlation_id, adapt_id, attempt + 1, error,
                )
                attempt += 1
                continue

            # Cross-check: signalLevel echoes back matching the request
            if parsed_response.signalLevel != request.signalLevel:
                last_error = (
                    f"response signalLevel='{parsed_response.signalLevel}' "
                    f"does not match request signalLevel='{request.signalLevel}'"
                )
                last_topology_hint = ""
                attempt += 1
                continue

            # Cross-check: every targetPosition is in [1, len(currentPath)] AND
            # the entry at that position is editable (NotStarted | InProgress).
            scope_error = self._check_target_positions(parsed_response.actions, path_positions)
            if scope_error:
                last_error = scope_error
                last_topology_hint = ""
                logger.warning(
                    "[corr=%s] adapt-path adapt=%s attempt %d target-position scope fail: %s",
                    correlation_id, adapt_id, attempt + 1, scope_error,
                )
                attempt += 1
                continue

            # Cross-check: every swap's newTaskId is in the candidate pool
            swap_error = self._check_swap_candidates(parsed_response.actions, candidate_ids)
            if swap_error:
                last_error = swap_error
                last_topology_hint = ""
                attempt += 1
                continue

            # Cross-check: reorder.newOrderIndex is in [1, len(currentPath)]
            reorder_error = self._check_reorder_targets(
                parsed_response.actions, len(request.currentPath),
            )
            if reorder_error:
                last_error = reorder_error
                last_topology_hint = ""
                attempt += 1
                continue

            # Cross-check (small only): intra-skill-area reorders
            if request.signalLevel == "small":
                skill_error = self._check_intra_skill_area_reorders(
                    parsed_response.actions, path_positions,
                )
                if skill_error:
                    last_error = skill_error
                    last_topology_hint = (
                        "\n\nFor signal=small, every reorder must move a task "
                        "into a position whose current occupant shares at least "
                        "one skill tag with the moved task. Pick a different "
                        "target position or skip the action."
                    )
                    attempt += 1
                    continue

            # All checks passed.
            stats = _CallStats(tokens_used=total_tokens, retry_count=attempt)
            response = AdaptPathResponse(
                actions=parsed_response.actions,
                overallReasoning=parsed_response.overallReasoning,
                signalLevel=parsed_response.signalLevel,
                promptVersion=PROMPT_VERSION,
                tokensUsed=stats.tokens_used,
                retryCount=stats.retry_count,
            )
            logger.info(
                "[corr=%s] adapt-path adapt=%s signal=%s actions=%d retries=%d tokens=%d",
                correlation_id, adapt_id, request.signalLevel,
                len(response.actions), attempt, total_tokens,
            )
            return response

        # Out of retries
        logger.error(
            "[corr=%s] adapt-path adapt=%s exhausted %d retries; last error: %s",
            correlation_id, adapt_id, MAX_RETRIES, last_error,
        )
        raise PathAdapterUnavailable(
            f"AI path adapter produced invalid output after {MAX_RETRIES} retries: "
            f"{last_error}",
            http_status=422,
        )

    # ------------------------------------------------------------------
    # Prompt assembly
    # ------------------------------------------------------------------

    def _build_prompt(self, request: AdaptPathRequest) -> str:
        template = load_prompt(PROMPT_VERSION)
        return template.format(
            track=request.track,
            signal_level=request.signalLevel,
            skill_profile_lines=self._format_skill_profile(request.skillProfile),
            recent_submissions_block=self._format_recent_submissions(request.recentSubmissions),
            completed_task_ids_list=self._format_completed_ids(request.completedTaskIds),
            current_path_block=self._format_current_path(request.currentPath),
            candidate_replacements_block=self._format_candidates(request.candidateReplacements),
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
    def _format_completed_ids(ids: Sequence[str]) -> str:
        if not ids:
            return "(none — the learner hasn't completed anything yet)"
        return ", ".join(ids)

    @staticmethod
    def _format_current_path(entries: Sequence[CurrentPathEntry]) -> str:
        lines: List[str] = []
        for entry in sorted(entries, key=lambda e: e.orderIndex):
            tag_str = ", ".join(
                f"{tag.skill}:{tag.weight:.2f}" for tag in entry.skillTags
            )
            lines.append(
                f"- Position {entry.orderIndex} ({entry.status})\n"
                f"  ID={entry.taskId} (pathTaskId={entry.pathTaskId})\n"
                f"  Title: {entry.title}\n"
                f"  Skill tags: {tag_str}"
            )
        return "\n\n".join(lines)

    @staticmethod
    def _format_candidates(candidates: Sequence[CandidateReplacement]) -> str:
        if not candidates:
            return "(no candidate replacements supplied — swap actions are not possible)"
        lines: List[str] = []
        for c in candidates:
            tag_str = ", ".join(
                f"{tag.skill}:{tag.weight:.2f}" for tag in c.skillTags
            )
            prereq_str = (
                ", ".join(c.prerequisites) if c.prerequisites else "(none)"
            )
            summary = c.descriptionSummary
            if len(summary) > 500:
                summary = summary[:497].rstrip() + "..."
            lines.append(
                f"- ID={c.taskId}\n"
                f"  Title: {c.title}\n"
                f"  Difficulty: {c.difficulty}/5\n"
                f"  Skill tags: {tag_str}\n"
                f"  Prerequisites: {prereq_str}\n"
                f"  Summary: {summary}"
            )
        return "\n\n".join(lines)

    @staticmethod
    def _format_recent_submissions(submissions: Sequence[RecentSubmissionInput]) -> str:
        if not submissions:
            return "(no recent submissions — the trigger is likely Completion100 or OnDemand)"
        lines: List[str] = []
        for s in submissions:
            cat_lines = ", ".join(
                f"{cat}:{int(round(score))}" for cat, score in sorted(s.scoresPerCategory.items())
            )
            summary = (s.summaryText or "(no submission summary)").strip()
            if len(summary) > 400:
                summary = summary[:397].rstrip() + "..."
            lines.append(
                f"- taskId={s.taskId} overall={int(round(s.overallScore))}/100\n"
                f"  Per-category: {cat_lines}\n"
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
            raise PathAdapterUnavailable(
                "OpenAI rate limit exceeded — try again shortly.",
                http_status=503,
            ) from exc
        except APITimeoutError as exc:
            raise PathAdapterUnavailable(
                "OpenAI request timed out.",
                http_status=504,
            ) from exc
        except BadRequestError as exc:
            err_code = (getattr(exc, "code", "") or "").lower()
            if err_code == "context_length_exceeded" or "context length" in str(exc).lower():
                raise PathAdapterUnavailable(
                    "Path adapter prompt exceeded model context window.",
                    http_status=400,
                ) from exc
            raise PathAdapterUnavailable(
                f"OpenAI rejected the request: {exc}",
                http_status=400,
            ) from exc
        except APIError as exc:
            raise PathAdapterUnavailable(
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
        signal_level: SignalLevel,
    ) -> Tuple[Optional["_ParsedResponse"], str]:
        """Returns (response, error). On success the response carries the actions
        + overallReasoning + echoed signalLevel; on failure error is non-empty."""
        parsed = _try_load_json(raw)
        if parsed is None:
            return None, "response is not valid JSON (after fence-strip + brace-extract repair)"
        if not isinstance(parsed, dict):
            return None, f"response JSON is {type(parsed).__name__}, expected object"

        actions_raw = parsed.get("actions")
        if not isinstance(actions_raw, list):
            return None, "response missing top-level 'actions' array"
        overall = parsed.get("overallReasoning")
        if not isinstance(overall, str):
            return None, "response missing or non-string 'overallReasoning'"
        if len(overall.strip()) < 10:
            return None, "overallReasoning must be at least 10 chars"
        signal_echo = parsed.get("signalLevel")
        if signal_echo not in ("no_action", "small", "medium", "large"):
            return None, (
                f"response missing or invalid 'signalLevel'; "
                f"got {type(signal_echo).__name__}={signal_echo!r}"
            )

        # Per-action Pydantic validation
        validated_actions: List[ProposedAction] = []
        for idx, item in enumerate(actions_raw):
            try:
                action = ProposedAction(**(item if isinstance(item, dict) else {}))
            except ValidationError as exc:
                first_err = exc.errors()[0] if exc.errors() else {"msg": "unknown validation error"}
                loc = ".".join(str(p) for p in first_err.get("loc", ()))
                msg = first_err.get("msg", "")
                return None, f"actions[{idx}] invalid: {loc}: {msg}"
            validated_actions.append(action)

        # Build the AdaptPathResponse-shaped payload to leverage the
        # response-level model_validator (no_action → empty, small → reorder-only,
        # no dup positions).
        try:
            built = AdaptPathResponse(
                actions=validated_actions,
                overallReasoning=overall.strip(),
                signalLevel=signal_echo,
                promptVersion=PROMPT_VERSION,
                tokensUsed=0,
                retryCount=0,
            )
        except ValidationError as exc:
            first_err = exc.errors()[0] if exc.errors() else {"msg": "unknown validation error"}
            loc = ".".join(str(p) for p in first_err.get("loc", ()))
            msg = first_err.get("msg", "")
            return None, f"response invalid: {loc}: {msg}"

        return _ParsedResponse(
            actions=built.actions,
            overallReasoning=built.overallReasoning,
            signalLevel=built.signalLevel,
        ), ""

    def _check_target_positions(
        self,
        actions: Sequence[ProposedAction],
        path_positions: Dict[int, CurrentPathEntry],
    ) -> str:
        max_pos = max(path_positions.keys()) if path_positions else 0
        for idx, action in enumerate(actions):
            if action.targetPosition not in path_positions:
                return (
                    f"actions[{idx}].targetPosition={action.targetPosition} "
                    f"is out of range [1, {max_pos}]"
                )
            entry = path_positions[action.targetPosition]
            if entry.status in ("Completed", "Skipped"):
                return (
                    f"actions[{idx}].targetPosition={action.targetPosition} "
                    f"points at an immutable {entry.status} entry "
                    f"(taskId={entry.taskId}); cannot edit history."
                )
        return ""

    def _check_swap_candidates(
        self,
        actions: Sequence[ProposedAction],
        candidate_ids: set[str],
    ) -> str:
        for idx, action in enumerate(actions):
            if action.type != "swap":
                continue
            if action.newTaskId not in candidate_ids:
                preview = sorted(list(candidate_ids))[:5]
                return (
                    f"actions[{idx}] swap newTaskId='{action.newTaskId}' is not "
                    f"in the candidate pool (e.g. {preview})"
                )
        return ""

    def _check_reorder_targets(
        self,
        actions: Sequence[ProposedAction],
        path_length: int,
    ) -> str:
        for idx, action in enumerate(actions):
            if action.type != "reorder":
                continue
            if action.newOrderIndex is None:
                # Already caught by Pydantic, but keep a defensive check.
                return f"actions[{idx}] reorder missing newOrderIndex"
            if not (1 <= action.newOrderIndex <= path_length):
                return (
                    f"actions[{idx}].newOrderIndex={action.newOrderIndex} "
                    f"is out of range [1, {path_length}]"
                )
        return ""

    def _check_intra_skill_area_reorders(
        self,
        actions: Sequence[ProposedAction],
        path_positions: Dict[int, CurrentPathEntry],
    ) -> str:
        for idx, action in enumerate(actions):
            if action.type != "reorder":
                # signal=small forbids swaps anyway (Pydantic catches that), but
                # be defensive — only reorder needs intra-skill-area check here.
                continue
            assert action.newOrderIndex is not None
            source_entry = path_positions.get(action.targetPosition)
            target_entry = path_positions.get(action.newOrderIndex)
            if source_entry is None or target_entry is None:
                # Already caught earlier — keep here for completeness.
                return f"actions[{idx}] reorder targets out of range"
            source_skills = {t.skill for t in source_entry.skillTags}
            target_skills = {t.skill for t in target_entry.skillTags}
            if not (source_skills & target_skills):
                return (
                    f"actions[{idx}] reorder is cross-skill-area for signal=small "
                    f"(source skills={sorted(source_skills)} vs. "
                    f"target skills={sorted(target_skills)}); pick a different "
                    f"newOrderIndex or skip the action."
                )
        return ""


@dataclass
class _ParsedResponse:
    actions: List[ProposedAction]
    overallReasoning: str
    signalLevel: SignalLevel


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


_path_adapter_instance: Optional[PathAdapter] = None


def get_path_adapter() -> PathAdapter:
    global _path_adapter_instance
    if _path_adapter_instance is None:
        _path_adapter_instance = PathAdapter()
    return _path_adapter_instance


def reset_path_adapter_for_tests() -> None:
    global _path_adapter_instance
    _path_adapter_instance = None

"""S9-T6 / F11: Project Auditor service for `POST /api/project-audit`.

Mirrors `ai_reviewer.py` structure but runs the audit prompt (ADR-034) and
returns an `AuditResult` that maps to the `AuditResponse` Pydantic schema.

Implements the same JSON-repair + 1-retry-on-malformed contract as the per-task
reviewer (S6-T2 carried into F11).
"""

import asyncio
import json
import logging
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from openai import APIError, APITimeoutError, AsyncOpenAI, RateLimitError

from app.config import get_settings
from app.services.ai_reviewer import (
    _RETRY_REMINDER,
    _try_load_json,
)
from app.services.audit_prompts import (
    AUDIT_PROMPT_VERSION,
    AUDIT_SYSTEM_PROMPT,
    build_audit_prompt,
)


logger = logging.getLogger(__name__)


@dataclass
class AuditResult:
    """In-memory result of a project audit. Maps 1:1 to `AuditResponse` schema."""
    overall_score: int = 0
    grade: str = "F"
    scores: Dict[str, int] = field(default_factory=lambda: {
        "codeQuality": 0,
        "security": 0,
        "performance": 0,
        "architectureDesign": 0,
        "maintainability": 0,
        "completeness": 0,
    })
    strengths: List[str] = field(default_factory=list)
    critical_issues: List[Dict[str, Any]] = field(default_factory=list)
    warnings: List[Dict[str, Any]] = field(default_factory=list)
    suggestions: List[Dict[str, Any]] = field(default_factory=list)
    missing_features: List[str] = field(default_factory=list)
    recommended_improvements: List[Dict[str, Any]] = field(default_factory=list)
    tech_stack_assessment: str = ""
    # SBF-1 / audit-v2 (2026-05-14): two new long-form fields. Default empty so
    # legacy v1 responses parse cleanly.
    executive_summary: str = ""
    architecture_notes: str = ""
    inline_annotations: List[Dict[str, Any]] = field(default_factory=list)

    model_used: str = ""
    tokens_input: int = 0
    tokens_output: int = 0
    prompt_version: str = AUDIT_PROMPT_VERSION
    available: bool = True
    error: Optional[str] = None


class ProjectAuditor:
    """Audit engine for personal-project uploads. Uses the same OpenAI
    Responses API surface as `AIReviewer` but with the audit prompt + 6-category
    score + 8-section response shape per ADR-034."""

    def __init__(self, client: Optional[AsyncOpenAI] = None):
        settings = get_settings()
        self.api_key = settings.openai_api_key
        self.model = settings.openai_model
        self.timeout = settings.ai_timeout
        self.max_output_tokens = settings.ai_audit_max_output_tokens

        # Allow tests to inject a mock client; otherwise build the real one.
        if client is not None:
            self.client = client
        elif self.api_key:
            self.client = AsyncOpenAI(api_key=self.api_key)
        else:
            self.client = None
            logger.warning("OpenAI API key not configured. Project audits will be disabled.")

    @property
    def is_available(self) -> bool:
        return self.client is not None

    async def audit_project(
        self,
        code_files: List[Dict[str, Any]],
        project_description_json: str,
        static_summary: Optional[Dict[str, Any]] = None,
    ) -> AuditResult:
        """Run a project audit against the AI model.

        Args:
            code_files: list of `{"path", "content", "language"}` dicts (matches
                AIReviewer.review_code's input shape).
            project_description_json: structured project description from the
                backend, persisted as `ProjectAudit.ProjectDescriptionJson`.
            static_summary: optional summary from the static-analysis phase
                (counts, top categories) — same shape as ai_reviewer's input.

        Returns:
            `AuditResult`. When the call fails or the model returns
            unparseable JSON twice, `available` is False and `error` is set.
        """
        if not self.is_available:
            return self._unavailable("Project auditor not configured — OPENAI_API_KEY missing.")

        prompt = build_audit_prompt(project_description_json, code_files, static_summary)

        try:
            logger.info(
                "Calling OpenAI for project audit (model=%s, prompt_version=%s, max_output=%d)",
                self.model, AUDIT_PROMPT_VERSION, self.max_output_tokens,
            )
            response = await asyncio.wait_for(self._call_openai(prompt), timeout=self.timeout)
            result = self._parse_response(response)

            # 1-retry-on-malformed: mirrors S6-T2 contract from ai_reviewer.
            if not result.available and result.error == "Failed to parse audit response":
                # SBF-1 (2026-05-14): log the first 800 chars + last 400 chars of the
                # raw response on parse failure so we can diagnose whether the model
                # produced truncated JSON (last chars don't have closing `}`),
                # malformed JSON (bad escapes), or non-JSON prose. Without this we
                # only see "did not parse" with no clue what went wrong.
                _content = response.get("content", "") or ""
                logger.warning(
                    "First audit response did not parse — retrying once with PURE-JSON reminder. "
                    "RawLen=%d RawHead=%r RawTail=%r OutputTokens=%s",
                    len(_content),
                    _content[:800],
                    _content[-400:] if len(_content) > 400 else _content,
                    response.get("tokens_output", "?"),
                )
                retry = await asyncio.wait_for(
                    self._call_openai(prompt + _RETRY_REMINDER),
                    timeout=self.timeout,
                )
                retry_result = self._parse_response(retry)
                if retry_result.available:
                    # Combine token usage so callers see the true cost of the repair.
                    retry_result.tokens_input = (response.get("tokens_input", 0) or 0) + (retry.get("tokens_input", 0) or 0)
                    retry_result.tokens_output = (response.get("tokens_output", 0) or 0) + (retry.get("tokens_output", 0) or 0)
                    return retry_result
                _retry_content = retry.get("content", "") or ""
                logger.error(
                    "Audit retry also failed to parse; giving up. "
                    "RetryRawLen=%d RetryRawHead=%r RetryRawTail=%r RetryOutputTokens=%s",
                    len(_retry_content),
                    _retry_content[:800],
                    _retry_content[-400:] if len(_retry_content) > 400 else _retry_content,
                    retry.get("tokens_output", "?"),
                )
                return self._unavailable("Failed to parse audit response after one retry.")

            return result

        except asyncio.TimeoutError:
            logger.error("Project audit timed out after %ds", self.timeout)
            return self._unavailable(f"Project audit timed out after {self.timeout}s")
        except RateLimitError as ex:
            logger.error("OpenAI rate limit during audit: %s", ex)
            return self._unavailable("AI service rate limit exceeded")
        except APITimeoutError as ex:
            logger.error("OpenAI API timeout during audit: %s", ex)
            return self._unavailable("AI service timeout")
        except APIError as ex:
            logger.error("OpenAI API error during audit: %s", ex)
            return self._unavailable(f"AI service error: {ex}")
        except Exception as ex:  # pragma: no cover — last-resort safety net
            logger.exception("Unexpected error in project audit: %s", ex)
            return self._unavailable(f"Unexpected error: {ex}")

    async def _call_openai(self, prompt: str) -> Dict[str, Any]:
        """Invoke the OpenAI Responses API. Returns dict with `content`,
        `tokens_input`, `tokens_output`.

        ADR-045: originally capped reasoning effort at "low" so the model
        spent the budget on visible JSON, not internal reasoning.
        SBF-1 / audit-v2 (2026-05-14): bumped to **"medium"** for audit. The
        v2 prompt is significantly more complex than the review prompt (10+
        JSON sections, mandatory exec summary + architecture notes,
        comprehensive findings). At "low" reasoning the model produced
        truncated/invalid JSON (observed live: 2 parse failures in a row
        on the Code-Mentor repo audit). The output budget was simultaneously
        bumped to 32k so the model has room for both medium reasoning AND a
        complete v2-shaped JSON.
        """
        response = await self.client.responses.create(
            model=self.model,
            instructions=AUDIT_SYSTEM_PROMPT,
            input=prompt,
            max_output_tokens=self.max_output_tokens,
            reasoning={"effort": "medium"},
        )
        usage = getattr(response, "usage", None)
        return {
            "content": response.output_text,
            "tokens_input": getattr(usage, "input_tokens", 0) if usage else 0,
            "tokens_output": getattr(usage, "output_tokens", 0) if usage else 0,
        }

    def _parse_response(self, raw: Dict[str, Any]) -> AuditResult:
        """Validate the model's JSON output against the audit schema."""
        content = raw.get("content", "")
        parsed = _try_load_json(content)
        if parsed is None:
            return AuditResult(available=False, error="Failed to parse audit response")

        try:
            scores_in = parsed.get("scores") or {}
            scores = {
                "codeQuality": _clamp_score(scores_in.get("codeQuality")),
                "security": _clamp_score(scores_in.get("security")),
                "performance": _clamp_score(scores_in.get("performance")),
                "architectureDesign": _clamp_score(scores_in.get("architectureDesign")),
                "maintainability": _clamp_score(scores_in.get("maintainability")),
                "completeness": _clamp_score(scores_in.get("completeness")),
            }
            grade = str(parsed.get("grade", "F"))[:2] or "F"

            return AuditResult(
                overall_score=_clamp_score(parsed.get("overallScore")),
                grade=grade,
                scores=scores,
                strengths=_str_list(parsed.get("strengths")),
                critical_issues=_dict_list(parsed.get("criticalIssues")),
                warnings=_dict_list(parsed.get("warnings")),
                suggestions=_dict_list(parsed.get("suggestions")),
                missing_features=_str_list(parsed.get("missingFeatures")),
                recommended_improvements=_dict_list(parsed.get("recommendedImprovements")),
                tech_stack_assessment=str(parsed.get("techStackAssessment", "")),
                executive_summary=str(parsed.get("executiveSummary", "")),
                architecture_notes=str(parsed.get("architectureNotes", "")),
                inline_annotations=_dict_list(parsed.get("inlineAnnotations")),
                model_used=self.model,
                tokens_input=int(raw.get("tokens_input", 0) or 0),
                tokens_output=int(raw.get("tokens_output", 0) or 0),
                prompt_version=AUDIT_PROMPT_VERSION,
                available=True,
                error=None,
            )
        except (TypeError, ValueError) as ex:
            logger.exception("Audit response parsed as JSON but failed schema mapping: %s", ex)
            return AuditResult(available=False, error=f"Audit schema mapping failed: {ex}")

    def _unavailable(self, error: str) -> AuditResult:
        return AuditResult(available=False, error=error)


def _clamp_score(raw: Any) -> int:
    """Coerce to int and clamp to [0, 100]; return 0 on garbage input."""
    try:
        value = int(raw)
    except (TypeError, ValueError):
        return 0
    return max(0, min(100, value))


def _str_list(raw: Any) -> List[str]:
    if not isinstance(raw, list):
        return []
    return [str(x) for x in raw if x is not None]


def _dict_list(raw: Any) -> List[Dict[str, Any]]:
    if not isinstance(raw, list):
        return []
    return [x for x in raw if isinstance(x, dict)]


_AUDITOR_SINGLETON: Optional[ProjectAuditor] = None


def get_project_auditor() -> ProjectAuditor:
    """Module-level cache of the auditor instance (mirrors get_ai_reviewer pattern)."""
    global _AUDITOR_SINGLETON
    if _AUDITOR_SINGLETON is None:
        _AUDITOR_SINGLETON = ProjectAuditor()
    return _AUDITOR_SINGLETON


def reset_project_auditor() -> None:
    """Test helper — drop the cached singleton so the next get_project_auditor()
    rebuilds with the current (possibly mocked) client."""
    global _AUDITOR_SINGLETON
    _AUDITOR_SINGLETON = None

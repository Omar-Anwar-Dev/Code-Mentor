# AI Code Reviewer Service
"""
AI-powered code review service using OpenAI GPT-5.1-codex-mini.
Provides structured code analysis with scores, strengths, weaknesses, and recommendations.
Enhanced to support comprehensive in-depth analysis with learning resources.
"""

import json
import logging
import asyncio
import re
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, field

from openai import AsyncOpenAI
from openai import APIError, RateLimitError, APITimeoutError, BadRequestError

from app.config import get_settings
from app.services.prompts import (
    SYSTEM_PROMPT,
    PROMPT_VERSION,
    build_review_prompt,
    build_enhanced_review_prompt,
    truncate_code_files_to_budget,
    PromptBudgetExceeded,
)

logger = logging.getLogger(__name__)


@dataclass
class AIReviewResult:
    """Result from AI code review."""
    overall_score: int
    scores: Dict[str, int]
    strengths: List[str]
    weaknesses: List[str]
    recommendations: List[Dict[str, Any]]
    summary: str
    model_used: str
    tokens_used: int
    available: bool = True
    error: Optional[str] = None
    prompt_version: str = ""
    # Enhanced fields
    detailed_issues: List[Dict[str, Any]] = field(default_factory=list)
    strengths_detailed: List[Dict[str, Any]] = field(default_factory=list)
    weaknesses_detailed: List[Dict[str, Any]] = field(default_factory=list)
    learning_resources: List[Dict[str, Any]] = field(default_factory=list)
    executive_summary: str = ""
    progress_analysis: str = ""
    # SBF-1 / T5: 1-2 sentence justification for the taskFit score. Empty when
    # the model didn't emit it (e.g., legacy prompt) or when the AI was unavailable.
    task_fit_rationale: str = ""


# S6-T1: defensive remap of legacy score names. The OpenAI model occasionally
# emits the pre-S6 names (functionality / bestPractices) when its training
# distribution drifts from the new prompt; remap them at parse time so the
# DB and frontend always see the 5 PRD F6 names.
_LEGACY_SCORE_ALIASES = {
    "functionality": "correctness",
    "bestPractices": "design",
    "best_practices": "design",
    "bestpractices": "design",
}


def _normalize_scores(raw_scores: Dict[str, Any]) -> Dict[str, int]:
    """Map legacy score keys to the canonical 5+1 PRD F6 names + clamp to int 0..100.

    SBF-1 / T5: `taskFit` is now the 6th axis. Default 70 keeps legacy
    responses (pre-T5 prompts that don't emit taskFit) on a neutral mark so
    they don't artificially drag the overall — the capping rule in
    `_parse_response` only activates when the model EXPLICITLY emitted a
    low taskFit, not when the key was absent.
    """
    canonical = {
        "correctness": 70, "readability": 70, "security": 70,
        "performance": 70, "design": 70, "taskFit": 70,
    }
    if not isinstance(raw_scores, dict):
        return canonical
    for raw_key, raw_value in raw_scores.items():
        key = _LEGACY_SCORE_ALIASES.get(raw_key, raw_key)
        if key not in canonical:
            continue
        try:
            value = int(raw_value)
        except (TypeError, ValueError):
            continue
        canonical[key] = max(0, min(100, value))
    return canonical


# S6-T2: response repair helpers. The model occasionally wraps its JSON in
# markdown fences (```json ... ```) or prepends a sentence of prose. We try a
# cheap repair pass before declaring the response unparseable and retrying.

_FENCE_RE = re.compile(r"^\s*```(?:json|JSON)?\s*\n(.*?)\n?\s*```\s*$", re.DOTALL)


def _strip_code_fences(content: str) -> str:
    """Strip markdown code fences if the response is wrapped in them."""
    if not isinstance(content, str):
        return content
    match = _FENCE_RE.match(content.strip())
    if match:
        return match.group(1).strip()
    return content.strip()


def _extract_json_block(content: str) -> Optional[str]:
    """Return the largest balanced {...} block in `content`, or None.

    Used as a last-ditch repair when the model prepends/appends prose around the JSON.
    Tracks brace depth (ignoring braces inside string literals) and returns the
    longest top-level object substring found.
    """
    if not isinstance(content, str):
        return None
    best: Tuple[int, int] = (-1, -1)  # (start, end-exclusive)
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
    """Attempt to parse JSON from the response, applying fence-strip + extract repair."""
    if not content:
        return None
    # Pass 1: raw / fence-stripped.
    candidate = _strip_code_fences(content)
    try:
        return json.loads(candidate)
    except (json.JSONDecodeError, TypeError):
        pass
    # Pass 2: extract the largest balanced JSON object.
    extracted = _extract_json_block(candidate)
    if extracted is None or extracted == candidate:
        return None
    try:
        return json.loads(extracted)
    except (json.JSONDecodeError, TypeError):
        return None


# Reminder appended to a prompt when the first response failed to parse — keeps the
# retry single and tightly scoped per S6-T2 acceptance ("repairs or retries once").
_RETRY_REMINDER = (
    "\n\n=== RETRY ===\n"
    "Your previous response could not be parsed as JSON. "
    "Respond with PURE JSON ONLY: no markdown fences, no prose before or after, no comments. "
    "The first character of your response MUST be '{' and the last must be '}'.\n"
)


class AIReviewer:
    """AI Code Review engine using OpenAI."""
    
    def __init__(self):
        settings = get_settings()
        self.api_key = settings.openai_api_key
        self.model = settings.openai_model
        self.timeout = settings.ai_timeout
        self.max_tokens = settings.ai_max_tokens
        
        # Initialize OpenAI client if API key is available
        if self.api_key:
            self.client = AsyncOpenAI(api_key=self.api_key)
        else:
            self.client = None
            logger.warning("OpenAI API key not configured. AI review will be disabled.")
    
    @property
    def is_available(self) -> bool:
        """Check if AI reviewer is available."""
        return self.client is not None
    
    async def review_code(
        self,
        code_files: List[Dict[str, Any]],
        task_context: Optional[Dict[str, Any]] = None,
        static_summary: Optional[Dict[str, Any]] = None,
        project_context: Optional[Dict[str, Any]] = None,
        learner_profile: Optional[Dict[str, Any]] = None,
        learner_history: Optional[Dict[str, Any]] = None,
        enhanced: bool = False
    ) -> AIReviewResult:
        """
        Perform AI code review on the provided code files.
        
        Args:
            code_files: List of dicts with 'path', 'content', 'language' keys
            task_context: Optional task context (title, description, difficulty) - for basic mode
            static_summary: Optional static analysis summary for context
            project_context: Optional project context for enhanced mode
            learner_profile: Optional learner profile for personalized feedback
            enhanced: If True, use enhanced prompt with detailed analysis
            
        Returns:
            AIReviewResult with scores, feedback, and recommendations
        """
        if not self.is_available:
            return self._unavailable_result("AI reviewer not configured - API key missing")
        
        # Auto-detect enhanced mode if project, learner context, or history provided
        if project_context or learner_profile or learner_history:
            enhanced = True

        # SBF-1 / B2: proactive input-budget enforcement. Trim files so the
        # assembled prompt fits inside the configured ceiling — catches the
        # "context_length_exceeded" failure mode BEFORE the OpenAI call.
        settings = get_settings()
        try:
            code_files = truncate_code_files_to_budget(
                code_files, settings.ai_review_max_input_chars
            )
        except PromptBudgetExceeded as exc:
            return self._unavailable_result(str(exc))

        try:
            # Build the appropriate review prompt
            if enhanced:
                prompt = build_enhanced_review_prompt(
                    code_files, 
                    project_context, 
                    learner_profile, 
                    static_summary,
                    learner_history
                )
            else:
                prompt = build_review_prompt(code_files, task_context, static_summary)
            
            # Call OpenAI API
            logger.info(f"Calling OpenAI API with model: {self.model} (enhanced={enhanced})")

            response = await asyncio.wait_for(
                self._call_openai(prompt),
                timeout=self.timeout
            )

            # Parse the response — fence-strip / JSON-block extraction handled inside.
            result = self._parse_response(response, enhanced=enhanced)

            # S6-T2: if the parse failed, give the model exactly ONE retry with a
            # tighter "respond with PURE JSON" reminder. If that retry also fails
            # to parse, we surface the failure cleanly via _unavailable_result.
            if not result.available and result.error == "Failed to parse AI response":
                logger.warning("First AI response did not parse — retrying once with stricter JSON-only reminder.")
                retry_response = await asyncio.wait_for(
                    self._call_openai(prompt + _RETRY_REMINDER),
                    timeout=self.timeout
                )
                retry_result = self._parse_response(retry_response, enhanced=enhanced)
                if retry_result.available:
                    # Combine token usage so callers see the true cost of the repair.
                    retry_result.tokens_used = (response.get("tokens", 0) or 0) + (retry_response.get("tokens", 0) or 0)
                    return retry_result
                logger.error("Retry also failed to parse; giving up cleanly.")
                return self._unavailable_result("Failed to parse AI response after one retry")

            return result
            
        except asyncio.TimeoutError:
            logger.error(f"AI review timed out after {self.timeout}s")
            return self._unavailable_result(f"AI review timed out after {self.timeout}s")
            
        except RateLimitError as e:
            logger.error(f"OpenAI rate limit exceeded: {e}")
            return self._unavailable_result("[rate_limit] AI service rate limit exceeded")

        except APITimeoutError as e:
            logger.error(f"OpenAI API timeout: {e}")
            return self._unavailable_result("[timeout] AI service timeout")

        except BadRequestError as e:
            # SBF-1 / B2: classify context-length-exceeded vs other 400s so the
            # backend can map to a learner-friendly message. OpenAI Python SDK
            # exposes the structured error body via `e.body` (a dict) or
            # `e.response.json()` — we use `e.code` / message string parsing
            # because the SDK keeps both stable across versions.
            err_code = (getattr(e, "code", "") or "").lower()
            err_msg_lower = str(e).lower()
            if err_code == "context_length_exceeded" or "context length" in err_msg_lower \
                    or "maximum context" in err_msg_lower or "context_length_exceeded" in err_msg_lower:
                logger.error(f"OpenAI rejected prompt as too long: {e}")
                return self._unavailable_result(
                    "[token_limit_exceeded] The submission is larger than the AI can analyze in one pass. "
                    "Try splitting the project into smaller modules or removing dependency directories before re-uploading."
                )
            logger.error(f"OpenAI 400 BadRequest: {e}")
            return self._unavailable_result(f"[bad_request] AI service rejected the request: {str(e)}")

        except APIError as e:
            logger.error(f"OpenAI API error: {e}")
            return self._unavailable_result(f"[api_error] AI service error: {str(e)}")
            
        except Exception as e:
            logger.exception(f"Unexpected error in AI review: {e}")
            return self._unavailable_result(f"Unexpected error: {str(e)}")
    
    async def _call_openai(self, prompt: str) -> Dict[str, Any]:
        """Make the actual OpenAI API call using the Responses API."""
        # gpt-5.1-codex-mini uses the Responses API, not Chat Completions.
        # ADR-045: cap reasoning effort at "low" so the model spends the
        # ``max_output_tokens`` budget on the visible JSON response rather than
        # on internal reasoning. Without this cap the codex-mini reasoning
        # model exhausted the entire 8k budget on reasoning and produced empty
        # output_text — observed twice (initial + retry) on F14-enhanced
        # prompts with 9-prior-submission context.
        response = await self.client.responses.create(
            model=self.model,
            instructions=SYSTEM_PROMPT,
            input=prompt,
            max_output_tokens=self.max_tokens,
            reasoning={"effort": "low"},
        )
        
        # Extract content and usage from Responses API format
        content = response.output_text
        tokens = response.usage.total_tokens if response.usage else 0
        
        return {
            "content": content,
            "model": response.model,
            "tokens": tokens
        }
    
    def _parse_response(self, response: Dict[str, Any], enhanced: bool = False) -> AIReviewResult:
        """Parse the OpenAI response into AIReviewResult.

        S6-T2: applies fence-strip + JSON-block extraction repair before declaring
        the response unparseable. The caller (`review_code`) is responsible for
        triggering at most one retry against the model when this returns
        unavailable due to JSON failure.
        """
        content = _try_load_json(response.get("content", ""))
        if content is None:
            logger.error("Failed to parse AI response as JSON (after repair attempts).")
            return self._unavailable_result("Failed to parse AI response")
        if not isinstance(content, dict):
            logger.error("AI response JSON was not an object: type=%s", type(content).__name__)
            return self._unavailable_result("AI response JSON was not an object")

        scores = _normalize_scores(content.get("scores", {}))

        try:
            overall_score = int(content.get("overallScore", 70))
        except (TypeError, ValueError):
            overall_score = 70
        overall_score = max(0, min(100, overall_score))

        # SBF-1 / T5: same capping rule as in multi_agent._merge. If the model
        # EXPLICITLY emitted a low taskFit (raw_scores has the key + value
        # under 50), cap overall at 30 — the learner must see they delivered
        # something off-topic regardless of how clean their code is. Absence
        # of the key keeps legacy behaviour (default 70 in _normalize_scores
        # never triggers the cap).
        raw_scores = content.get("scores", {}) if isinstance(content.get("scores"), dict) else {}
        raw_task_fit = raw_scores.get("taskFit")
        if raw_task_fit is not None:
            try:
                tf = max(0, min(100, int(raw_task_fit)))
                if tf < 50:
                    overall_score = min(overall_score, 30)
            except (TypeError, ValueError):
                pass

        result = AIReviewResult(
            overall_score=overall_score,
            scores=scores,
            strengths=content.get("strengths", []) or [],
            weaknesses=content.get("weaknesses", []) or [],
            recommendations=content.get("recommendations", []) or [],
            summary=content.get("summary", "AI review completed."),
            model_used=response.get("model", self.model),
            tokens_used=response.get("tokens", 0),
            prompt_version=PROMPT_VERSION,
            available=True
        )

        # Parse enhanced fields if available
        if enhanced:
            result.detailed_issues = content.get("detailedIssues", []) or []
            result.strengths_detailed = content.get("strengthsDetailed", []) or []
            result.weaknesses_detailed = content.get("weaknessesDetailed", []) or []
            result.learning_resources = content.get("learningResources", []) or []
            result.executive_summary = content.get("executiveSummary", "") or ""
            result.progress_analysis = content.get("progressAnalysis", "") or ""

        # SBF-1 / T5: parse the taskFit rationale string regardless of `enhanced`
        # mode — the new axis is universal.
        result.task_fit_rationale = content.get("taskFitRationale", "") or ""

        return result
    
    def _unavailable_result(self, error: str) -> AIReviewResult:
        """Return a result indicating AI review is unavailable."""
        return AIReviewResult(
            overall_score=0,
            scores={
                "correctness": 0,
                "readability": 0,
                "security": 0,
                "performance": 0,
                "design": 0
            },
            strengths=[],
            weaknesses=[],
            recommendations=[],
            summary="AI review unavailable.",
            model_used=self.model,
            tokens_used=0,
            prompt_version=PROMPT_VERSION,
            available=False,
            error=error,
            detailed_issues=[],
            strengths_detailed=[],
            weaknesses_detailed=[],
            learning_resources=[],
            executive_summary=""
        )


# Singleton instance
_reviewer_instance: Optional[AIReviewer] = None


def get_ai_reviewer() -> AIReviewer:
    """Get or create the AI reviewer singleton."""
    global _reviewer_instance
    if _reviewer_instance is None:
        _reviewer_instance = AIReviewer()
    return _reviewer_instance

# Multi-Agent Code Review Orchestrator
"""
Sprint 11 / S11-T2 / F13 (ADR-037): the multi-agent counterpart to the
single-prompt reviewer in `ai_reviewer.py`.

Three specialist agents run in parallel via `asyncio.gather`:
  - `SecurityAgent`      → owns the `security` score
  - `PerformanceAgent`   → owns the `performance` score
  - `ArchitectureAgent`  → owns `correctness`, `readability`, `design`
                           and produces all learner-facing summaries
                           (strengths, weaknesses, recommendations,
                           learning resources, executive summary).

Each agent has its own versioned prompt template
(`prompts/agent_*.v1.txt`) and a constrained output schema (only the
categories that agent owns).  The orchestrator merges the three
responses into the existing `AIReviewResult` dataclass shape so the
backend and frontend continue to consume the same response contract.

Per-agent timeout: 90s. If any agent times out or returns malformed
JSON the orchestrator marks affected categories as `null`, populates
`partial_agents`, and stamps `prompt_version = "multi-agent.v1.partial"`.
"""

import asyncio
import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from openai import AsyncOpenAI

from app.config import get_settings
from app.services.ai_reviewer import (
    AIReviewResult,
    _RETRY_REMINDER,
    _try_load_json,
)
from app.services.prompts import format_code_files


logger = logging.getLogger(__name__)


# ----- Versioning ------------------------------------------------------------

MULTI_AGENT_PROMPT_VERSION = "multi-agent.v1"
MULTI_AGENT_PROMPT_VERSION_PARTIAL = "multi-agent.v1.partial"

# Per-agent timeout per ADR-037.
PER_AGENT_TIMEOUT_S = 90

# Per-agent output token cap per ADR-037 (3 × 1.5k = 4.5k total output
# vs 2k for single-prompt → roughly 2.2× cost per submission).
PER_AGENT_MAX_OUTPUT_TOKENS = 1536


# ----- Template loading ------------------------------------------------------

# `prompts/` lives at the ai-service repo root, two levels up from this file
# (app/services/multi_agent.py → ai-service/prompts/).
_PROMPTS_DIR = Path(__file__).resolve().parent.parent.parent / "prompts"


def _load_template(name: str) -> str:
    """Read a versioned `.txt` prompt template from `prompts/`."""
    path = _PROMPTS_DIR / name
    if not path.is_file():
        raise FileNotFoundError(f"Prompt template not found: {path}")
    return path.read_text(encoding="utf-8")


# ----- Agent results ---------------------------------------------------------


@dataclass
class AgentInvocation:
    """One agent's contribution to a multi-agent run."""

    name: str  # "security" | "performance" | "architecture"
    succeeded: bool
    payload: Dict[str, Any] = field(default_factory=dict)
    tokens_used: int = 0
    model_used: str = ""
    error: Optional[str] = None


# ----- Per-agent invokers ----------------------------------------------------


class _BaseAgent:
    """Shared OpenAI invocation + JSON-parse-with-one-retry pattern."""

    name: str = ""
    template_filename: str = ""
    system_section_marker: str = "## SYSTEM"
    user_section_marker: str = "## USER"

    def __init__(self, client: AsyncOpenAI, model: str):
        self.client = client
        self.model = model
        # Cache template text on first construction. Tests may reset the
        # singleton via `reset_multi_agent_orchestrator()` if templates are
        # edited mid-process.
        text = _load_template(self.template_filename)
        self._system_text, self._user_text = self._split_template(text)

    @classmethod
    def _split_template(cls, text: str) -> Tuple[str, str]:
        """Split a template into (system instructions, user prompt body).

        Templates have a `## SYSTEM` section followed by a `## USER`
        section. We pass the SYSTEM block as `instructions=` and format
        the USER block with the placeholder dict at call time.
        """
        if cls.system_section_marker not in text or cls.user_section_marker not in text:
            # Fall back to whole-template-as-user if markers absent.
            return "", text
        sys_idx = text.index(cls.system_section_marker)
        usr_idx = text.index(cls.user_section_marker)
        if sys_idx > usr_idx:
            return "", text
        system_block = text[sys_idx + len(cls.system_section_marker):usr_idx].strip()
        user_block = text[usr_idx + len(cls.user_section_marker):].strip()
        return system_block, user_block

    def build_user_prompt(self, placeholders: Dict[str, Any]) -> str:
        """Format the user-block template with placeholders, swallowing
        missing keys (templates may reference keys not all callers
        provide; missing → empty string)."""
        safe = _SafeFormatDict(placeholders)
        return self._user_text.format_map(safe)

    async def run(self, placeholders: Dict[str, Any]) -> AgentInvocation:
        prompt = self.build_user_prompt(placeholders)
        try:
            response = await self._call_with_retry(prompt)
        except asyncio.TimeoutError:
            return AgentInvocation(
                name=self.name, succeeded=False,
                error=f"agent timeout >{PER_AGENT_TIMEOUT_S}s"
            )
        except Exception as exc:  # noqa: BLE001 — orchestrator handles all error modes
            logger.exception("[multi-agent/%s] OpenAI call failed", self.name)
            return AgentInvocation(
                name=self.name, succeeded=False,
                error=f"agent error: {type(exc).__name__}: {exc}"
            )

        parsed = _try_load_json(response.get("content", ""))
        if parsed is None or not isinstance(parsed, dict):
            return AgentInvocation(
                name=self.name, succeeded=False,
                tokens_used=response.get("tokens", 0),
                model_used=response.get("model", self.model),
                error="agent returned malformed JSON after retry",
            )

        return AgentInvocation(
            name=self.name,
            succeeded=True,
            payload=parsed,
            tokens_used=response.get("tokens", 0),
            model_used=response.get("model", self.model),
        )

    async def _call_with_retry(self, prompt: str) -> Dict[str, Any]:
        """One LLM call with one retry-on-malformed-JSON, mirroring
        `AIReviewer._call_openai` + the retry pattern in `review_code`.

        Both attempts share the per-agent 90 s timeout budget — we don't
        give the retry a fresh 90 s.
        """
        async def _attempt(p: str) -> Dict[str, Any]:
            response = await self.client.responses.create(
                model=self.model,
                instructions=self._system_text,
                input=p,
                max_output_tokens=PER_AGENT_MAX_OUTPUT_TOKENS,
            )
            return {
                "content": response.output_text,
                "model": response.model,
                "tokens": response.usage.total_tokens if response.usage else 0,
            }

        async def _attempt_pair() -> Dict[str, Any]:
            first = await _attempt(prompt)
            parsed = _try_load_json(first.get("content", ""))
            if parsed is not None and isinstance(parsed, dict):
                return first
            logger.warning(
                "[multi-agent/%s] first response did not parse; retrying with reminder",
                self.name,
            )
            second = await _attempt(prompt + _RETRY_REMINDER)
            # Combine token usage so cost telemetry sees true spend.
            second["tokens"] = (first.get("tokens", 0) or 0) + (second.get("tokens", 0) or 0)
            return second

        return await asyncio.wait_for(_attempt_pair(), timeout=PER_AGENT_TIMEOUT_S)


class _SafeFormatDict(dict):
    """`str.format_map` helper that returns '' for missing keys instead
    of raising KeyError. Lets templates reference optional placeholders
    without forcing every caller to provide them."""

    def __missing__(self, key):  # type: ignore[override]
        return ""


class SecurityAgent(_BaseAgent):
    name = "security"
    template_filename = "agent_security.v1.txt"


class PerformanceAgent(_BaseAgent):
    name = "performance"
    template_filename = "agent_performance.v1.txt"


class ArchitectureAgent(_BaseAgent):
    name = "architecture"
    template_filename = "agent_architecture.v1.txt"


# ----- Orchestrator ----------------------------------------------------------


class MultiAgentOrchestrator:
    """Runs the three specialist agents in parallel and merges their
    outputs into a single `AIReviewResult` matching the existing
    single-prompt response shape."""

    def __init__(self):
        settings = get_settings()
        self.api_key = settings.openai_api_key
        self.model = settings.openai_model
        if self.api_key:
            self.client: Optional[AsyncOpenAI] = AsyncOpenAI(api_key=self.api_key)
            self.security = SecurityAgent(self.client, self.model)
            self.performance = PerformanceAgent(self.client, self.model)
            self.architecture = ArchitectureAgent(self.client, self.model)
        else:
            self.client = None
            logger.warning(
                "OpenAI API key not configured. Multi-agent reviewer disabled."
            )

    @property
    def is_available(self) -> bool:
        return self.client is not None

    async def orchestrate(
        self,
        code_files: List[Dict[str, Any]],
        project_context: Optional[Dict[str, Any]] = None,
        learner_profile: Optional[Dict[str, Any]] = None,
        static_summary: Optional[Dict[str, Any]] = None,
    ) -> AIReviewResult:
        if not self.is_available:
            return _unavailable_result(self.model, "Multi-agent reviewer not configured - API key missing")

        placeholders = self._build_placeholders(
            code_files=code_files,
            project_context=project_context or {},
            learner_profile=learner_profile or {},
            static_summary=static_summary or {},
        )

        # Spawn the three agents in parallel. `return_exceptions=True` so
        # one agent's structured failure doesn't tank the others.
        results = await asyncio.gather(
            self.security.run(placeholders),
            self.performance.run(placeholders),
            self.architecture.run(placeholders),
            return_exceptions=True,
        )

        invocations: Dict[str, AgentInvocation] = {}
        for idx, agent_name in enumerate(("security", "performance", "architecture")):
            outcome = results[idx]
            if isinstance(outcome, AgentInvocation):
                invocations[agent_name] = outcome
            else:
                # Unexpected exception (`gather` only catches if return_exceptions=True;
                # AgentInvocation already wraps known failure modes — this branch
                # is the orchestration safety-net).
                logger.exception(
                    "[multi-agent/%s] unexpected exception: %r", agent_name, outcome
                )
                invocations[agent_name] = AgentInvocation(
                    name=agent_name, succeeded=False,
                    error=f"orchestrator: unhandled {type(outcome).__name__}",
                )

        return _merge(invocations, model_used=self.model)

    @staticmethod
    def _build_placeholders(
        code_files: List[Dict[str, Any]],
        project_context: Dict[str, Any],
        learner_profile: Dict[str, Any],
        static_summary: Dict[str, Any],
    ) -> Dict[str, Any]:
        focus_areas = project_context.get("focusAreas") or []
        weak_areas = learner_profile.get("weakAreas") or []
        strong_areas = learner_profile.get("strongAreas") or []
        return {
            "project_name": project_context.get("name", "Code Review"),
            "project_description": project_context.get("description", "General code review"),
            "learning_track": project_context.get("learningTrack", "General"),
            "difficulty": project_context.get("difficulty", "Unknown"),
            "focus_areas": ", ".join(focus_areas) if focus_areas else "general review",
            "skill_level": learner_profile.get("skillLevel", "Intermediate"),
            "weak_areas": ", ".join(weak_areas) if weak_areas else "None identified",
            "strong_areas": ", ".join(strong_areas) if strong_areas else "None identified",
            "code_files": format_code_files(code_files),
            "static_issues": static_summary.get("totalIssues", 0),
            "critical_issues": static_summary.get("criticalIssues", 0),
            "top_categories": ", ".join(static_summary.get("topCategories", []))
            if static_summary.get("topCategories")
            else "general",
        }


# ----- Merge logic ----------------------------------------------------------


def _clamp_score(value: Any, fallback: int = 70) -> int:
    try:
        v = int(value)
    except (TypeError, ValueError):
        return fallback
    return max(0, min(100, v))


def _jaccard(a: str, b: str) -> float:
    """Cheap word-set Jaccard similarity for strength/weakness dedup."""
    if not a or not b:
        return 0.0
    sa = {w for w in a.lower().split() if w.isalnum() or w.isalpha()}
    sb = {w for w in b.lower().split() if w.isalnum() or w.isalpha()}
    if not sa or not sb:
        return 0.0
    return len(sa & sb) / len(sa | sb)


def _dedup_jaccard(items: List[str], threshold: float = 0.7) -> List[str]:
    """Drop later items whose Jaccard similarity to any earlier-kept
    item is ≥ threshold. ADR-037 calls for ≥0.7."""
    kept: List[str] = []
    for item in items:
        if not item:
            continue
        if any(_jaccard(item, k) >= threshold for k in kept):
            continue
        kept.append(item)
    return kept


def _merge_annotations(
    sec_ann: List[Dict[str, Any]],
    perf_ann: List[Dict[str, Any]],
    arch_ann: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """Union of inline annotations, prefixed with the agent name when
    multiple agents annotate the same (file, line)."""
    # Group all annotations by (file, line) to detect overlap.
    by_loc: Dict[Tuple[str, int], List[Tuple[str, Dict[str, Any]]]] = {}
    for agent_label, source in (
        ("security", sec_ann),
        ("performance", perf_ann),
        ("architecture", arch_ann),
    ):
        for ann in source or []:
            file_path = ann.get("file") or ann.get("filePath") or ""
            try:
                line_no = int(ann.get("line", 0))
            except (TypeError, ValueError):
                line_no = 0
            by_loc.setdefault((file_path, line_no), []).append((agent_label, ann))

    merged: List[Dict[str, Any]] = []
    for (file_path, line_no), bucket in by_loc.items():
        if len(bucket) == 1:
            agent_label, ann = bucket[0]
            merged.append(_format_annotation(agent_label, ann, prefixed=False))
        else:
            for agent_label, ann in bucket:
                merged.append(_format_annotation(agent_label, ann, prefixed=True))
    return merged


def _format_annotation(
    agent_label: str, ann: Dict[str, Any], *, prefixed: bool
) -> Dict[str, Any]:
    message = ann.get("message", "") or ""
    if prefixed:
        message = f"[{agent_label}] {message}".strip()
    return {
        "file": ann.get("file") or ann.get("filePath") or "",
        "line": ann.get("line", 0),
        "message": message,
        "severity": ann.get("severity", "medium"),
    }


def _findings_to_detailed_issues(
    findings: List[Dict[str, Any]], *, default_issue_type: str
) -> List[Dict[str, Any]]:
    """Coerce per-agent findings into the orchestrator's `detailed_issues`
    shape (matches `DetailedIssue` schema fields)."""
    issues: List[Dict[str, Any]] = []
    for f in findings or []:
        issues.append({
            "file": f.get("file", ""),
            "line": f.get("line", 1),
            "endLine": f.get("endLine"),
            "codeSnippet": f.get("codeSnippet"),
            "issueType": f.get("issueType") or default_issue_type,
            "severity": f.get("severity", "medium"),
            "title": f.get("title", ""),
            "message": f.get("message", ""),
            "explanation": f.get("explanation", ""),
            "isRepeatedMistake": f.get("isRepeatedMistake", False),
            "suggestedFix": f.get("suggestedFix", ""),
            "codeExample": f.get("codeExample"),
        })
    return issues


def _merge(
    invocations: Dict[str, AgentInvocation], model_used: str
) -> AIReviewResult:
    """Merge three agent invocations into a single AIReviewResult.

    Score columns owned by failed agents are reported as 0 in the
    `scores` dict (the existing AIReviewResult shape uses int, not
    Optional[int]) but their absence is signalled to callers via
    `partial_agents` on the metadata dict, and the prompt-version
    string switches to `multi-agent.v1.partial`.
    """
    sec = invocations.get("security")
    perf = invocations.get("performance")
    arch = invocations.get("architecture")

    partial_agents: List[str] = [
        name for name, inv in invocations.items() if inv is None or not inv.succeeded
    ]

    # ----- Scores ------------------------------------------------------------
    scores: Dict[str, int] = {
        "correctness": 0,
        "readability": 0,
        "security": 0,
        "performance": 0,
        "design": 0,
    }
    available_scores: List[int] = []

    if sec and sec.succeeded:
        scores["security"] = _clamp_score(sec.payload.get("securityScore"))
        available_scores.append(scores["security"])

    if perf and perf.succeeded:
        scores["performance"] = _clamp_score(perf.payload.get("performanceScore"))
        available_scores.append(scores["performance"])

    if arch and arch.succeeded:
        scores["correctness"] = _clamp_score(arch.payload.get("correctnessScore"))
        scores["readability"] = _clamp_score(arch.payload.get("readabilityScore"))
        scores["design"] = _clamp_score(arch.payload.get("designScore"))
        available_scores.extend([scores["correctness"], scores["readability"], scores["design"]])

    overall_score = (
        round(sum(available_scores) / len(available_scores)) if available_scores else 0
    )

    # ----- Strengths / weaknesses (architecture-owned) -----------------------
    strengths: List[str] = []
    weaknesses: List[str] = []
    strengths_detailed: List[Dict[str, Any]] = []
    weaknesses_detailed: List[Dict[str, Any]] = []
    learning_resources: List[Dict[str, Any]] = []
    recommendations: List[Dict[str, Any]] = []
    executive_summary = ""
    summary = ""
    progress_analysis = ""

    if arch and arch.succeeded:
        raw_s = [s for s in (arch.payload.get("strengths") or []) if isinstance(s, str)]
        raw_w = [w for w in (arch.payload.get("weaknesses") or []) if isinstance(w, str)]
        # Jaccard ≥0.7 dedup per ADR-037 — no-op for a single source today,
        # but the merge is future-proofed if security/performance start
        # contributing summary lines in v2.
        strengths = _dedup_jaccard(raw_s, threshold=0.7)
        weaknesses = _dedup_jaccard(raw_w, threshold=0.7)
        strengths_detailed = arch.payload.get("strengthsDetailed") or []
        weaknesses_detailed = arch.payload.get("weaknessesDetailed") or []
        learning_resources = arch.payload.get("learningResources") or []
        recommendations = arch.payload.get("recommendations") or []
        executive_summary = arch.payload.get("executiveSummary", "") or ""
        summary = arch.payload.get("summary", "") or ""
        progress_analysis = arch.payload.get("progressAnalysis", "") or ""

    # ----- Detailed issues (union of all three agents' findings) -------------
    detailed_issues: List[Dict[str, Any]] = []
    if sec and sec.succeeded:
        detailed_issues.extend(
            _findings_to_detailed_issues(
                sec.payload.get("securityFindings"), default_issue_type="security"
            )
        )
    if perf and perf.succeeded:
        detailed_issues.extend(
            _findings_to_detailed_issues(
                perf.payload.get("performanceFindings"), default_issue_type="performance"
            )
        )
    if arch and arch.succeeded:
        detailed_issues.extend(
            _findings_to_detailed_issues(
                arch.payload.get("architectureFindings"),
                default_issue_type="design",
            )
        )

    # ----- Inline annotations (union by (file,line)) -------------------------
    sec_ann = sec.payload.get("securityAnnotations") if (sec and sec.succeeded) else []
    perf_ann = perf.payload.get("performanceAnnotations") if (perf and perf.succeeded) else []
    arch_ann = arch.payload.get("architectureAnnotations") if (arch and arch.succeeded) else []
    annotations = _merge_annotations(sec_ann or [], perf_ann or [], arch_ann or [])
    # Annotations are not part of `AIReviewResult` directly — they live
    # inside the merged response's `meta` block today and may be promoted
    # to a first-class field in a future schema migration. We stash them
    # on the result via a private attr so the route layer can attach
    # them to the response `meta` block.

    # ----- Tokens + summary --------------------------------------------------
    tokens_used = sum(
        inv.tokens_used for inv in invocations.values() if inv is not None
    )

    overall_available = (sec and sec.succeeded) or (perf and perf.succeeded) or (arch and arch.succeeded)
    error = (
        None if not partial_agents
        else f"partial agents: {', '.join(partial_agents)}"
        if overall_available
        else "all agents failed"
    )

    prompt_version = (
        MULTI_AGENT_PROMPT_VERSION
        if not partial_agents
        else MULTI_AGENT_PROMPT_VERSION_PARTIAL
    )

    if not summary:
        if not overall_available:
            summary = "Multi-agent review failed: all agents unavailable."
        elif partial_agents:
            summary = (
                f"Multi-agent review completed with partial results "
                f"(failed agents: {', '.join(partial_agents)})."
            )
        else:
            summary = "Multi-agent review completed."

    result = AIReviewResult(
        overall_score=overall_score,
        scores=scores,
        strengths=strengths,
        weaknesses=weaknesses,
        recommendations=recommendations,
        summary=summary,
        model_used=model_used,
        tokens_used=tokens_used,
        prompt_version=prompt_version,
        available=bool(overall_available),
        error=error,
        detailed_issues=detailed_issues,
        strengths_detailed=strengths_detailed,
        weaknesses_detailed=weaknesses_detailed,
        learning_resources=learning_resources,
        executive_summary=executive_summary,
        progress_analysis=progress_analysis,
    )

    # Attach orchestrator-only metadata (annotations + partial-agent list)
    # via setattr so routes can pull them for the response `meta` block
    # without touching the dataclass definition (which is shared with
    # the single-prompt code path).
    setattr(result, "_multi_agent_partial", list(partial_agents))
    setattr(result, "_multi_agent_annotations", annotations)
    return result


def _unavailable_result(model: str, error: str) -> AIReviewResult:
    res = AIReviewResult(
        overall_score=0,
        scores={"correctness": 0, "readability": 0, "security": 0, "performance": 0, "design": 0},
        strengths=[], weaknesses=[], recommendations=[],
        summary="Multi-agent review unavailable.",
        model_used=model,
        tokens_used=0,
        prompt_version=MULTI_AGENT_PROMPT_VERSION_PARTIAL,
        available=False,
        error=error,
    )
    setattr(res, "_multi_agent_partial", ["security", "performance", "architecture"])
    setattr(res, "_multi_agent_annotations", [])
    return res


# ----- Singleton accessor ----------------------------------------------------

_orchestrator_instance: Optional[MultiAgentOrchestrator] = None


def get_multi_agent_orchestrator() -> MultiAgentOrchestrator:
    """Singleton accessor — mirrors `get_ai_reviewer()` in `ai_reviewer.py`."""
    global _orchestrator_instance
    if _orchestrator_instance is None:
        _orchestrator_instance = MultiAgentOrchestrator()
    return _orchestrator_instance


def reset_multi_agent_orchestrator() -> None:
    """Test hook — drops the cached singleton so tests can swap clients."""
    global _orchestrator_instance
    _orchestrator_instance = None

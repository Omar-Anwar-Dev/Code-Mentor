"""S11-T3 / F13 (ADR-037): regression suite for the multi-agent code review endpoint.

Covers:
  1. Parallel-success on Python sample → all 3 agents merged into one response.
  2. Parallel-success on JavaScript sample.
  3. Parallel-success on C# sample.
  4. Token-cap enforcement → over-cap input returns HTTP 413.
  5. Partial-agent failure (one agent times out) → returns partial result with
     `partialAgents` populated and prompt_version stamped `multi-agent.v1.partial`.
  6. Parallel-error path (all agents fail) → returns `available=false` with a
     consolidated error message and prompt_version `multi-agent.v1.partial`.
  7. Prompt-version surfacing in `meta.promptVersion` for both happy and
     partial paths.
  8. Strengths/weaknesses Jaccard ≥0.7 dedup on the architecture agent's output.
  9. Inline-annotation merge — same `(file, line)` from two agents → both kept
     with agent prefix; non-overlapping annotations preserved as-is.

The 6-test floor in the plan acceptance is met; the extras above harden the
merge invariants that downstream consumers (backend `IAiReviewClient`, FE
feedback panel) will rely on.

All tests run with mocked agents — zero OpenAI cost. Live LLM dogfood happens
through the S11-T6 evaluation harness.
"""
from __future__ import annotations

import asyncio
import os
from typing import Any, Dict, List
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient


# Force a fake API key so the orchestrator initializes its inner OpenAI client.
# Real OpenAI calls are patched out per-test; the key just needs to be non-empty.
os.environ.setdefault("AI_ANALYSIS_OPENAI_API_KEY", "sk-test-fake")


# -----------------------------------------------------------------------------
# Shared fixtures
# -----------------------------------------------------------------------------


@pytest.fixture
def app_client():
    """Fresh FastAPI TestClient with a reset multi-agent orchestrator singleton."""
    from app.services import multi_agent as ma

    ma.reset_multi_agent_orchestrator()
    from app.main import create_app

    app = create_app()
    return TestClient(app)


@pytest.fixture
def orchestrator():
    """Reset + return the multi-agent orchestrator singleton."""
    from app.services.multi_agent import (
        get_multi_agent_orchestrator,
        reset_multi_agent_orchestrator,
    )

    reset_multi_agent_orchestrator()
    return get_multi_agent_orchestrator()


def _agent_ok(name: str, payload: Dict[str, Any], tokens: int = 1500) -> Any:
    """Helper: build a successful AgentInvocation for mocking."""
    from app.services.multi_agent import AgentInvocation

    return AgentInvocation(
        name=name,
        succeeded=True,
        payload=payload,
        tokens_used=tokens,
        model_used="mock-gpt",
    )


def _agent_fail(name: str, error: str = "agent timeout >90s") -> Any:
    """Helper: build a failed AgentInvocation for mocking."""
    from app.services.multi_agent import AgentInvocation

    return AgentInvocation(name=name, succeeded=False, error=error)


# Per-language sample payloads. Each agent emits the schema its template
# constrains it to (only the fields the agent owns).

SECURITY_SAMPLE = {
    "securityScore": 88,
    "securityFindings": [
        {
            "file": "main.py", "line": 42, "codeSnippet": "eval(req.args.get('q'))",
            "severity": "critical", "title": "eval on user input",
            "message": "RCE via eval", "explanation": "...",
            "suggestedFix": "use ast.literal_eval", "codeExample": "ast.literal_eval(...)"
        }
    ],
    "securityAnnotations": [
        {"file": "main.py", "line": 42, "message": "eval injection", "severity": "critical"}
    ],
    "summary": "One critical eval injection.",
}

PERFORMANCE_SAMPLE = {
    "performanceScore": 75,
    "performanceFindings": [
        {
            "file": "main.py", "line": 60, "codeSnippet": "for u in users: db.query(...)",
            "severity": "high", "title": "N+1 query",
            "message": "one DB call per user", "explanation": "O(n)",
            "suggestedFix": "batch via JOIN", "codeExample": "db.bulk_query(...)"
        }
    ],
    "performanceAnnotations": [
        {"file": "main.py", "line": 60, "message": "N+1", "severity": "high"}
    ],
    "summary": "One N+1 query in user listing.",
}

ARCHITECTURE_SAMPLE = {
    "correctnessScore": 82,
    "readabilityScore": 90,
    "designScore": 78,
    "strengths": [
        "Clear function naming throughout",
        "Tests cover the primary happy path",
        "Modular file structure",
    ],
    "weaknesses": [
        "Missing error handling on external calls",
        "Some functions exceed 50 lines",
        "No input validation at the API boundary",
    ],
    "strengthsDetailed": [
        {
            "category": "readability", "location": "main.py:1-15",
            "codeSnippet": "def calculate_total(items): ...",
            "observation": "Clear name", "whyGood": "Self-documenting",
        }
    ],
    "weaknessesDetailed": [
        {
            "category": "error_handling", "location": "main.py:25-30",
            "codeSnippet": "open(path).read()",
            "observation": "No exception handling", "explanation": "Crashes on missing file",
            "howToFix": "Wrap in try/except", "howToAvoid": "Validate before opening",
        }
    ],
    "architectureFindings": [
        {
            "file": "main.py", "line": 25, "codeSnippet": "open(path).read()",
            "issueType": "correctness", "severity": "medium",
            "title": "Unhandled FileNotFoundError",
            "message": "Crashes when path is missing",
            "explanation": "...",
            "suggestedFix": "try/except", "codeExample": "try: ... except FileNotFoundError: ..."
        }
    ],
    "architectureAnnotations": [
        {"file": "main.py", "line": 25, "message": "wrap in try/except", "severity": "medium"}
    ],
    "recommendations": [
        {
            "priority": "high", "category": "correctness",
            "message": "Add input validation at the API boundary",
            "suggestedFix": "Use pydantic at request entry",
            "estimatedEffort": "moderate",
        }
    ],
    "learningResources": [
        {
            "weakness": "Error handling",
            "resources": [
                {
                    "title": "Python Errors and Exceptions",
                    "url": "https://docs.python.org/3/tutorial/errors.html",
                    "type": "documentation",
                    "description": "Official guidance on exception design.",
                }
            ],
        }
    ],
    "executiveSummary": "Solid foundation with clear naming and tests; three issues need attention: a critical eval injection, an N+1 query, and missing error handling.",
    "summary": "Decent code, three priorities to fix.",
    "progressAnalysis": "",
}


# -----------------------------------------------------------------------------
# Test 1-3: parallel-success on Python / JavaScript / C#
# -----------------------------------------------------------------------------


def _run_with_mocked_agents(
    orch: Any,
    sec_outcome: Any,
    perf_outcome: Any,
    arch_outcome: Any,
    code_files: List[Dict[str, Any]],
):
    async def _go():
        with patch.object(orch.security, "run", new=AsyncMock(return_value=sec_outcome)), \
             patch.object(orch.performance, "run", new=AsyncMock(return_value=perf_outcome)), \
             patch.object(orch.architecture, "run", new=AsyncMock(return_value=arch_outcome)):
            return await orch.orchestrate(code_files=code_files)

    return asyncio.get_event_loop().run_until_complete(_go()) if asyncio._get_running_loop() else asyncio.run(_go())


def test_parallel_success_python_sample(orchestrator):
    """Test 1: Python submission, all 3 agents succeed → merged response."""
    from app.services.multi_agent import MULTI_AGENT_PROMPT_VERSION

    result = _run_with_mocked_agents(
        orchestrator,
        _agent_ok("security", SECURITY_SAMPLE, tokens=1800),
        _agent_ok("performance", PERFORMANCE_SAMPLE, tokens=1500),
        _agent_ok("architecture", ARCHITECTURE_SAMPLE, tokens=2100),
        code_files=[{"path": "main.py", "content": "def f(x): return x", "language": "python"}],
    )
    assert result.available is True
    assert result.prompt_version == MULTI_AGENT_PROMPT_VERSION
    assert getattr(result, "_multi_agent_partial") == []
    # All 5 scores propagated from owning agents.
    assert result.scores["security"] == 88
    assert result.scores["performance"] == 75
    assert result.scores["correctness"] == 82
    assert result.scores["readability"] == 90
    assert result.scores["design"] == 78
    # overall = mean of 5 = round((88+75+82+90+78)/5) = 83
    assert result.overall_score == round((88 + 75 + 82 + 90 + 78) / 5)
    # Tokens summed across agents.
    assert result.tokens_used == 1800 + 1500 + 2100
    # Detailed issues = union of all 3 agents' findings, each with correct issueType.
    types = sorted({i["issueType"] for i in result.detailed_issues})
    assert types == ["correctness", "performance", "security"]
    # Strengths/weaknesses from architecture agent.
    assert len(result.strengths) == 3
    assert len(result.weaknesses) == 3
    # Annotations merged.
    annotations = getattr(result, "_multi_agent_annotations")
    assert len(annotations) == 3  # 3 distinct (file, line) tuples


def test_parallel_success_javascript_sample(orchestrator):
    """Test 2: JavaScript submission with same agent payloads — merge invariant
    holds regardless of language (the orchestrator doesn't branch on language)."""
    from app.services.multi_agent import MULTI_AGENT_PROMPT_VERSION

    js_security = dict(SECURITY_SAMPLE)
    js_security["securityFindings"] = [
        {**SECURITY_SAMPLE["securityFindings"][0], "file": "app.js", "line": 17,
         "codeSnippet": "eval(req.body.code)"}
    ]
    js_security["securityAnnotations"] = [
        {"file": "app.js", "line": 17, "message": "eval injection", "severity": "critical"}
    ]

    result = _run_with_mocked_agents(
        orchestrator,
        _agent_ok("security", js_security),
        _agent_ok("performance", PERFORMANCE_SAMPLE),
        _agent_ok("architecture", ARCHITECTURE_SAMPLE),
        code_files=[{"path": "app.js", "content": "function f(x){return x}", "language": "javascript"}],
    )
    assert result.available is True
    assert result.prompt_version == MULTI_AGENT_PROMPT_VERSION
    # Security finding is on the JS file path.
    sec_issue = [i for i in result.detailed_issues if i["issueType"] == "security"][0]
    assert sec_issue["file"] == "app.js"
    assert sec_issue["line"] == 17


def test_parallel_success_csharp_sample(orchestrator):
    """Test 3: C# submission. Same merge invariants apply."""
    from app.services.multi_agent import MULTI_AGENT_PROMPT_VERSION

    cs_arch = dict(ARCHITECTURE_SAMPLE)
    cs_arch["architectureFindings"] = [
        {**ARCHITECTURE_SAMPLE["architectureFindings"][0], "file": "Program.cs", "line": 33,
         "issueType": "design"}
    ]

    result = _run_with_mocked_agents(
        orchestrator,
        _agent_ok("security", SECURITY_SAMPLE),
        _agent_ok("performance", PERFORMANCE_SAMPLE),
        _agent_ok("architecture", cs_arch),
        code_files=[{"path": "Program.cs", "content": "class P { static void Main(){} }", "language": "csharp"}],
    )
    assert result.available is True
    assert result.prompt_version == MULTI_AGENT_PROMPT_VERSION
    # Architecture finding routed with its own issueType (design here).
    arch_issues = [i for i in result.detailed_issues
                   if i["file"] == "Program.cs" and i["issueType"] == "design"]
    assert len(arch_issues) == 1


# -----------------------------------------------------------------------------
# Test 4: token-cap enforcement (S11-T3 acceptance: over-cap → 413)
# -----------------------------------------------------------------------------


def test_over_cap_input_returns_413(app_client):
    """Test 4: input larger than `ai_multi_max_input_chars` is rejected with
    HTTP 413 BEFORE any agent is invoked. ADR-037 cost-containment guarantee."""
    from app.config import get_settings

    cap = get_settings().ai_multi_max_input_chars
    big = "x" * (cap + 1000)
    resp = app_client.post(
        "/api/ai-review-multi",
        json={
            "submissionId": "big-input",
            "language": "python",
            "codeFiles": [{"path": "big.py", "content": big, "language": "python"}],
        },
    )
    assert resp.status_code == 413
    detail = resp.json()["detail"]
    assert "Code too large" in detail
    assert "ADR-037" in detail


# -----------------------------------------------------------------------------
# Test 5: partial-agent failure (one agent times out)
# -----------------------------------------------------------------------------


def test_partial_agent_failure_returns_partial_result(orchestrator):
    """Test 5: Security agent times out → orchestrator returns partial result
    with `partialAgents=['security']` and `prompt_version='multi-agent.v1.partial'`.
    Other agents' scores are preserved; security score reports 0 (failed agent
    has no score) but `available=True` because the other two agents succeeded."""
    from app.services.multi_agent import MULTI_AGENT_PROMPT_VERSION_PARTIAL

    result = _run_with_mocked_agents(
        orchestrator,
        _agent_fail("security", error="agent timeout >90s"),
        _agent_ok("performance", PERFORMANCE_SAMPLE, tokens=1500),
        _agent_ok("architecture", ARCHITECTURE_SAMPLE, tokens=2100),
        code_files=[{"path": "x.py", "content": "x = 1", "language": "python"}],
    )
    assert result.available is True
    assert result.prompt_version == MULTI_AGENT_PROMPT_VERSION_PARTIAL
    assert getattr(result, "_multi_agent_partial") == ["security"]
    # Security score reports 0 (failed agent has no score in available_scores).
    assert result.scores["security"] == 0
    # Other agents' scores preserved.
    assert result.scores["performance"] == 75
    assert result.scores["correctness"] == 82
    # overall = mean of 4 available (perf + 3 arch) = round((75+82+90+78)/4)
    assert result.overall_score == round((75 + 82 + 90 + 78) / 4)
    # Error string flags the partial agents (without bringing down the response).
    assert result.error is not None and "security" in result.error


# -----------------------------------------------------------------------------
# Test 6: parallel-error (all agents fail)
# -----------------------------------------------------------------------------


def test_all_agents_fail_returns_unavailable(orchestrator):
    """Test 6: all three agents fail (timeout / malformed / 5xx) →
    `available=False`, all 3 names in partialAgents, version=v1.partial."""
    from app.services.multi_agent import MULTI_AGENT_PROMPT_VERSION_PARTIAL

    result = _run_with_mocked_agents(
        orchestrator,
        _agent_fail("security", error="agent timeout >90s"),
        _agent_fail("performance", error="agent returned malformed JSON after retry"),
        _agent_fail("architecture", error="agent error: APIError: 502 bad gateway"),
        code_files=[{"path": "x.py", "content": "x = 1", "language": "python"}],
    )
    assert result.available is False
    assert result.prompt_version == MULTI_AGENT_PROMPT_VERSION_PARTIAL
    assert sorted(getattr(result, "_multi_agent_partial")) == [
        "architecture", "performance", "security"
    ]
    assert result.overall_score == 0
    assert result.error is not None and "all agents failed" in result.error


# -----------------------------------------------------------------------------
# Test 7: prompt-version surfacing in `meta.promptVersion`
# -----------------------------------------------------------------------------


def test_prompt_version_surfaces_in_meta_block(app_client, orchestrator):
    """Test 7: integration check that `meta.promptVersion` surfaces correctly
    on both happy and partial paths (ADR-037 acceptance: thesis-eval harness
    needs to read this from the wire response)."""
    # Happy path
    with patch.object(orchestrator.security, "run", new=AsyncMock(return_value=_agent_ok("security", SECURITY_SAMPLE))), \
         patch.object(orchestrator.performance, "run", new=AsyncMock(return_value=_agent_ok("performance", PERFORMANCE_SAMPLE))), \
         patch.object(orchestrator.architecture, "run", new=AsyncMock(return_value=_agent_ok("architecture", ARCHITECTURE_SAMPLE))):
        resp = app_client.post("/api/ai-review-multi", json={
            "submissionId": "test-meta", "language": "python",
            "codeFiles": [{"path": "main.py", "content": "x = 1", "language": "python"}],
        })
    assert resp.status_code == 200
    body = resp.json()
    assert body["promptVersion"] == "multi-agent.v1"
    assert body["meta"]["mode"] == "multi"
    assert body["meta"]["promptVersion"] == "multi-agent.v1"
    assert body["meta"]["partialAgents"] == []

    # Partial path
    with patch.object(orchestrator.security, "run", new=AsyncMock(return_value=_agent_fail("security"))), \
         patch.object(orchestrator.performance, "run", new=AsyncMock(return_value=_agent_ok("performance", PERFORMANCE_SAMPLE))), \
         patch.object(orchestrator.architecture, "run", new=AsyncMock(return_value=_agent_ok("architecture", ARCHITECTURE_SAMPLE))):
        resp2 = app_client.post("/api/ai-review-multi", json={
            "submissionId": "test-meta-partial", "language": "python",
            "codeFiles": [{"path": "main.py", "content": "x = 1", "language": "python"}],
        })
    assert resp2.status_code == 200
    body2 = resp2.json()
    assert body2["promptVersion"] == "multi-agent.v1.partial"
    assert body2["meta"]["promptVersion"] == "multi-agent.v1.partial"
    assert body2["meta"]["partialAgents"] == ["security"]


# -----------------------------------------------------------------------------
# Test 8: Jaccard ≥0.7 dedup on architecture agent's strengths/weaknesses
# -----------------------------------------------------------------------------


def test_jaccard_dedup_drops_near_duplicate_strengths(orchestrator):
    """Test 8: ADR-037 specifies Jaccard ≥0.7 dedup on strengths/weaknesses.
    Verify that two near-identical strength lines collapse to one in the merge."""
    arch_with_dups = dict(ARCHITECTURE_SAMPLE)
    arch_with_dups["strengths"] = [
        "The naming is clear and consistent throughout the module",
        "The naming is clear and consistent across the module",  # ~0.86 Jaccard → drop
        "The test suite covers all the public API surface",       # different → keep
    ]
    arch_with_dups["weaknesses"] = [
        "Missing error handling on file operations",
        "Missing error handling on the file operations",          # 6/7 ≈ 0.86 Jaccard → drop
        "Functions sometimes exceed 50 lines",                    # different → keep
    ]
    result = _run_with_mocked_agents(
        orchestrator,
        _agent_ok("security", SECURITY_SAMPLE),
        _agent_ok("performance", PERFORMANCE_SAMPLE),
        _agent_ok("architecture", arch_with_dups),
        code_files=[{"path": "x.py", "content": "x", "language": "python"}],
    )
    # Near-duplicate dropped — 2 strengths, 2 weaknesses survive.
    assert len(result.strengths) == 2, f"expected 2, got {len(result.strengths)}: {result.strengths}"
    assert len(result.weaknesses) == 2, f"expected 2, got {len(result.weaknesses)}: {result.weaknesses}"


# -----------------------------------------------------------------------------
# Test 9: inline annotation merge — agent prefix on overlapping (file, line)
# -----------------------------------------------------------------------------


def test_annotations_on_same_line_get_agent_prefix(orchestrator):
    """Test 9: When two agents annotate the same (file, line), both annotations
    are kept and tagged with the agent name. Non-overlapping annotations stay
    bare. ADR-037 + architecture §4.6 spec."""
    sec_with_overlap = dict(SECURITY_SAMPLE)
    sec_with_overlap["securityAnnotations"] = [
        {"file": "main.py", "line": 25, "message": "secret in clear", "severity": "high"},
        {"file": "main.py", "line": 100, "message": "no rate limit", "severity": "medium"},
    ]
    perf_with_overlap = dict(PERFORMANCE_SAMPLE)
    perf_with_overlap["performanceAnnotations"] = []
    arch_with_overlap = dict(ARCHITECTURE_SAMPLE)
    arch_with_overlap["architectureAnnotations"] = [
        {"file": "main.py", "line": 25, "message": "wrap in try/except", "severity": "medium"},
    ]

    result = _run_with_mocked_agents(
        orchestrator,
        _agent_ok("security", sec_with_overlap),
        _agent_ok("performance", perf_with_overlap),
        _agent_ok("architecture", arch_with_overlap),
        code_files=[{"path": "main.py", "content": "x", "language": "python"}],
    )
    annotations = getattr(result, "_multi_agent_annotations")
    # 3 total annotations — line 25 from sec + arch (both kept with prefix);
    # line 100 from sec alone (no prefix).
    assert len(annotations) == 3
    line_25 = [a for a in annotations if a["line"] == 25]
    assert len(line_25) == 2  # both kept
    assert any(a["message"].startswith("[security]") for a in line_25)
    assert any(a["message"].startswith("[architecture]") for a in line_25)
    line_100 = [a for a in annotations if a["line"] == 100]
    assert len(line_100) == 1
    # No prefix when only one agent annotates the line.
    assert not line_100[0]["message"].startswith("[")

"""S5-T7: per-tool partitioned static analysis output + endpoint rename."""
import asyncio

import pytest

from app.services.analysis_orchestrator import AnalysisOrchestrator
from app.services.analyzer_base import AnalyzerBase, AnalyzerResult
from app.domain.schemas.requests import AnalysisRequest, CodeFile, SupportedLanguage
from app.domain.schemas.responses import AnalysisIssue, IssueSeverity, IssueCategory


class _FakePyAnalyzer(AnalyzerBase):
    @property
    def name(self) -> str:
        return "bandit"

    @property
    def supported_languages(self):
        return ["python"]

    async def analyze(self, files):
        issues = [
            AnalysisIssue(
                severity=IssueSeverity.WARNING,
                category=IssueCategory.SECURITY,
                message="use of assert",
                file="a.py", line=3, rule="B101",
            )
        ]
        return AnalyzerResult(tool_name=self.name, issues=issues, execution_time_ms=11)


class _FakeOtherAnalyzer(AnalyzerBase):
    @property
    def name(self) -> str:
        # Use an alias → should normalize to "roslyn".
        return "roslynator"

    @property
    def supported_languages(self):
        return ["python"]  # force it to match so it runs

    async def analyze(self, files):
        issues = [
            AnalysisIssue(
                severity=IssueSeverity.ERROR,
                category=IssueCategory.BUG,
                message="fake roslyn issue",
                file="a.py", line=5, rule="CS0168",
            ),
            AnalysisIssue(
                severity=IssueSeverity.INFO,
                category=IssueCategory.STYLE,
                message="fake style hint",
                file="a.py", line=7, rule="IDE0001",
            ),
        ]
        return AnalyzerResult(tool_name=self.name, issues=issues, execution_time_ms=22)


@pytest.mark.asyncio
async def test_orchestrator_returns_per_tool_blocks_with_normalized_names():
    orch = AnalysisOrchestrator()
    orch.analyzers = [_FakePyAnalyzer(), _FakeOtherAnalyzer()]

    req = AnalysisRequest(
        submissionId="s-001",
        language=SupportedLanguage.PYTHON,
        codeFiles=[CodeFile(path="a.py", content="x = 1\n", language=SupportedLanguage.PYTHON)],
    )

    resp = await orch.analyze(req)

    # Flat merged list preserved for UI backwards-compat.
    assert len(resp.issues) == 3
    assert resp.toolsUsed == ["bandit", "roslynator"]

    # Per-tool blocks — one per analyzer, names normalized.
    assert len(resp.perTool) == 2
    tools = {b.tool for b in resp.perTool}
    assert tools == {"bandit", "roslyn"}

    by_tool = {b.tool: b for b in resp.perTool}
    assert by_tool["bandit"].summary.totalIssues == 1
    assert by_tool["bandit"].summary.warnings == 1
    assert by_tool["bandit"].executionTimeMs == 11
    assert by_tool["roslyn"].summary.totalIssues == 2
    assert by_tool["roslyn"].summary.errors == 1
    assert by_tool["roslyn"].summary.info == 1
    assert by_tool["roslyn"].executionTimeMs == 22


@pytest.mark.asyncio
async def test_orchestrator_omits_pertool_for_nonmatching_language():
    orch = AnalysisOrchestrator()
    orch.analyzers = [_FakePyAnalyzer()]

    req = AnalysisRequest(
        submissionId="s-002",
        language=SupportedLanguage.JAVA,  # no analyzer claims Java here
        codeFiles=[CodeFile(path="A.java", content="class A {}", language=SupportedLanguage.JAVA)],
    )

    resp = await orch.analyze(req)
    assert resp.perTool == []
    assert resp.overallScore == 100


def test_ai_review_endpoint_is_aliased_to_api_ai_review():
    """S5-T7 / architecture §6.10 alignment: endpoint is /api/ai-review, not /api/review."""
    from app.api.routes.analysis import analysis_router

    paths = [r.path for r in analysis_router.routes]
    assert "/api/ai-review" in paths
    assert "/api/review" not in paths

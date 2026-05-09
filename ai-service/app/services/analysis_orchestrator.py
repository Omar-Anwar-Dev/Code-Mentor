# Analysis Orchestrator - Coordinates all analyzers
import asyncio
import logging
import time
from typing import List, Dict

from app.services.analyzer_base import AnalyzerBase, AnalyzerResult
from app.services.eslint_analyzer import ESLintAnalyzer
from app.services.bandit_analyzer import BanditAnalyzer
from app.services.cpp_analyzer import CppAnalyzer
from app.services.php_analyzer import PhpAnalyzer
from app.services.java_analyzer import JavaAnalyzer
from app.services.csharp_analyzer import CSharpAnalyzer
from app.domain.schemas.requests import AnalysisRequest
from app.domain.schemas.responses import (
    AnalysisResponse,
    AnalysisIssue,
    AnalysisSummary,
    IssueSeverity,
    PerToolResult,
    PerToolSummary,
)


logger = logging.getLogger(__name__)


class AnalysisOrchestrator:
    """Orchestrates multiple static analysis tools."""
    
    def __init__(self):
        self.analyzers: List[AnalyzerBase] = [
            ESLintAnalyzer(),
            BanditAnalyzer(),
            CppAnalyzer(),
            PhpAnalyzer(),
            JavaAnalyzer(),
            CSharpAnalyzer(),
        ]
    
    async def analyze(self, request: AnalysisRequest) -> AnalysisResponse:
        """
        Run all applicable analyzers on the request.
        
        Args:
            request: Analysis request with code files
            
        Returns:
            Aggregated analysis response
        """
        start_time = time.time()
        
        # Get applicable analyzers for the language
        applicable_analyzers = [
            analyzer for analyzer in self.analyzers
            if analyzer.supports_language(request.language.value)
        ]
        
        if not applicable_analyzers:
            logger.warning(f"No analyzers available for language: {request.language}")
            # Return empty result
            return AnalysisResponse(
                submissionId=request.submissionId,
                analysisType="static",
                overallScore=100,
                issues=[],
                summary=AnalysisSummary(totalIssues=0, errors=0, warnings=0, info=0),
                toolsUsed=[],
                perTool=[],
                executionTimeMs=0
            )
        
        # Run analyzers in parallel
        logger.info(f"Running {len(applicable_analyzers)} analyzers for {request.language}")
        
        tasks = [
            analyzer.analyze(request.codeFiles) 
            for analyzer in applicable_analyzers
        ]
        results: List[AnalyzerResult] = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Aggregate results — keep per-tool blocks AND a merged flat list.
        all_issues: List[AnalysisIssue] = []
        tools_used: List[str] = []
        per_tool: List[PerToolResult] = []

        for result in results:
            if isinstance(result, Exception):
                logger.error(f"Analyzer failed with exception: {result}")
                continue

            all_issues.extend(result.issues)
            tools_used.append(result.tool_name)

            tool_summary = self._calculate_summary(result.issues)
            per_tool.append(PerToolResult(
                tool=self._normalize_tool_name(result.tool_name),
                issues=result.issues,
                summary=PerToolSummary(
                    totalIssues=tool_summary.totalIssues,
                    errors=tool_summary.errors,
                    warnings=tool_summary.warnings,
                    info=tool_summary.info,
                ),
                executionTimeMs=result.execution_time_ms,
            ))

        # Calculate overall summary + score over all issues combined.
        summary = self._calculate_summary(all_issues)
        overall_score = self._calculate_score(summary)

        execution_time_ms = int((time.time() - start_time) * 1000)

        return AnalysisResponse(
            submissionId=request.submissionId,
            analysisType="static",
            overallScore=overall_score,
            issues=all_issues,
            summary=summary,
            toolsUsed=tools_used,
            perTool=per_tool,
            executionTimeMs=execution_time_ms
        )

    @staticmethod
    def _normalize_tool_name(name: str) -> str:
        """Map analyzer tool_name → backend StaticAnalysisTool enum value (lowercase tag).

        The backend's StaticAnalysisTool enum accepts these tags:
        eslint, bandit, cppcheck, phpstan, pmd, roslyn. We normalize here so the
        shape of `perTool[].tool` is stable regardless of how an analyzer names
        itself internally.
        """
        n = name.lower().strip()
        aliases = {
            "roslynator": "roslyn",
            "dotnet-format": "roslyn",
            "dotnet format": "roslyn",
            "cpp": "cppcheck",
        }
        return aliases.get(n, n)
    
    def _calculate_summary(self, issues: List[AnalysisIssue]) -> AnalysisSummary:
        """Calculate summary statistics from issues."""
        errors = sum(1 for i in issues if i.severity == IssueSeverity.ERROR)
        warnings = sum(1 for i in issues if i.severity == IssueSeverity.WARNING)
        info = sum(1 for i in issues if i.severity == IssueSeverity.INFO)
        
        return AnalysisSummary(
            totalIssues=len(issues),
            errors=errors,
            warnings=warnings,
            info=info
        )
    
    def _calculate_score(self, summary: AnalysisSummary) -> int:
        """
        Calculate overall quality score based on issues.
        
        Scoring:
        - Start at 100
        - Subtract 10 per error
        - Subtract 3 per warning  
        - Subtract 1 per info
        - Minimum score is 0
        """
        penalty = (
            summary.errors * 10 +
            summary.warnings * 3 +
            summary.info * 1
        )
        
        score = max(0, 100 - penalty)
        return score

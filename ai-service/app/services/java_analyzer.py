# Java Analyzer using PMD
import asyncio
import json
import logging
import subprocess
import tempfile
import time
from pathlib import Path
from typing import List

from app.services.analyzer_base import AnalyzerBase, AnalyzerResult
from app.domain.schemas.requests import CodeFile
from app.domain.schemas.responses import AnalysisIssue, IssueSeverity, IssueCategory
from app.config import get_settings


logger = logging.getLogger(__name__)


class JavaAnalyzer(AnalyzerBase):
    """Static analyzer for Java using PMD."""
    
    @property
    def name(self) -> str:
        return "pmd"
    
    @property
    def supported_languages(self) -> List[str]:
        return ["java"]
    
    async def analyze(self, files: List[CodeFile]) -> AnalyzerResult:
        """Run PMD on Java files."""
        start_time = time.time()
        issues: List[AnalysisIssue] = []

        # Filter to only Java files
        java_files = [f for f in files if f.path.lower().endswith('.java')]

        if not java_files:
            return AnalyzerResult(
                tool_name=self.name,
                issues=[],
                execution_time_ms=int((time.time() - start_time) * 1000),
            )
        
        with tempfile.TemporaryDirectory() as tmp_dir:
            tmp_path = Path(tmp_dir)
            
            # Write files to temp directory
            for file in java_files:
                file_path = tmp_path / file.path
                file_path.parent.mkdir(parents=True, exist_ok=True)
                file_path.write_text(file.content, encoding='utf-8')
            
            # Run PMD
            settings = get_settings()
            try:
                pmd_path = settings.pmd_path or "pmd"
                
                # Quote path if contains spaces
                if ' ' in pmd_path:
                    pmd_path = f'"{pmd_path}"'
                
                # Use PMD 7 syntax
                cmd = f"{pmd_path} check -d . -R rulesets/java/quickstart.xml -f json --no-cache"
                logger.info(f"Running PMD: {cmd}")
                
                result = await asyncio.to_thread(
                    subprocess.run,
                    cmd,
                    shell=True,
                    cwd=tmp_dir,
                    capture_output=True,
                    text=True,
                    timeout=settings.analysis_timeout
                )
                
                # PMD outputs JSON to stdout
                if result.stdout:
                    issues = self._parse_pmd_output(result.stdout, tmp_path)
                    logger.info(f"PMD found {len(issues)} issues")
                    
            except subprocess.TimeoutExpired:
                logger.warning("PMD analysis timed out")
            except FileNotFoundError:
                logger.warning("PMD not found - skipping Java analysis")
            except Exception as e:
                logger.error(f"PMD analysis failed: {e}")
        
        return AnalyzerResult(
            tool_name=self.name,
            issues=issues,
            execution_time_ms=int((time.time() - start_time) * 1000),
        )

    def _parse_pmd_output(self, json_output: str, tmp_path: Path) -> List[AnalysisIssue]:
        """Parse PMD JSON output."""
        issues = []
        
        try:
            data = json.loads(json_output)
            
            # PMD 7 format: {"formatVersion": 0, "pmdVersion": "...", "files": [...]}
            for file_data in data.get('files', []):
                file_path = file_data.get('filename', 'unknown')
                
                for violation in file_data.get('violations', []):
                    message = violation.get('message', 'Java issue detected')
                    line = violation.get('beginLine', 1)
                    column = violation.get('beginColumn')
                    rule = violation.get('rule', 'unknown')
                    priority = violation.get('priority', 3)
                    
                    # Make path relative
                    try:
                        rel_path = Path(file_path).relative_to(tmp_path)
                    except ValueError:
                        rel_path = Path(file_path).name
                    
                    severity = self._map_priority(priority)
                    col_value = column if column and column >= 1 else None
                    
                    try:
                        issues.append(AnalysisIssue(
                            severity=severity,
                            category=self._get_category(rule),
                            message=message.strip(),
                            file=str(rel_path),
                            line=max(1, line),
                            column=col_value,
                            rule=rule,
                            suggestedFix=None
                        ))
                    except Exception as e:
                        logger.error(f"Failed to create issue: {e}")
                        
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse PMD JSON: {e}")
        
        return issues
    
    def _map_priority(self, priority: int) -> IssueSeverity:
        """Map PMD priority (1-5) to our severity."""
        if priority <= 2:
            return IssueSeverity.ERROR
        elif priority == 3:
            return IssueSeverity.WARNING
        else:
            return IssueSeverity.INFO
    
    def _get_category(self, rule: str) -> IssueCategory:
        """Determine issue category from rule name."""
        rule_lower = rule.lower()
        if 'security' in rule_lower or 'injection' in rule_lower:
            return IssueCategory.SECURITY
        elif 'performance' in rule_lower:
            return IssueCategory.PERFORMANCE
        elif 'naming' in rule_lower or 'style' in rule_lower:
            return IssueCategory.STYLE
        else:
            return IssueCategory.BEST_PRACTICE

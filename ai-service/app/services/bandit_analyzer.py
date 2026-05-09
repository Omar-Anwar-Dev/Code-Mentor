# Bandit Analyzer for Python Security
import asyncio
import json
import logging
import subprocess
import tempfile
import time
from typing import List
from pathlib import Path

from app.services.analyzer_base import AnalyzerBase, AnalyzerResult
from app.domain.schemas.requests import CodeFile
from app.domain.schemas.responses import AnalysisIssue, IssueSeverity, IssueCategory
from app.config import get_settings


logger = logging.getLogger(__name__)


class BanditAnalyzer(AnalyzerBase):
    """Bandit-based security analyzer for Python code."""
    
    @property
    def name(self) -> str:
        return "bandit"
    
    @property
    def supported_languages(self) -> List[str]:
        return ["python"]
    
    async def analyze(self, files: List[CodeFile]) -> AnalyzerResult:
        """Run Bandit security analysis on Python files."""
        start_time = time.time()
        issues: List[AnalysisIssue] = []
        
        # Filter to only Python files
        py_files = [f for f in files if self._is_python_file(f.path)]
        
        if not py_files:
            return AnalyzerResult(
                tool_name=self.name,
                issues=[],
                execution_time_ms=int((time.time() - start_time) * 1000)
            )
        
        # Create temporary directory with code files
        with tempfile.TemporaryDirectory() as tmp_dir:
            tmp_path = Path(tmp_dir)
            
            # Write files to temp directory
            for code_file in py_files:
                file_path = tmp_path / code_file.path
                file_path.parent.mkdir(parents=True, exist_ok=True)
                file_path.write_text(code_file.content, encoding='utf-8')
                logger.info(f"Wrote file: {file_path}, content length: {len(code_file.content)}")
                logger.debug(f"File content: {code_file.content[:200]}")
            
            # Run Bandit
            settings = get_settings()
            try:
                # Note: Bandit returns exit code 1 when issues are found
                # Quote the path to handle spaces in Windows paths
                bandit_path = f'"{settings.bandit_path}"' if ' ' in settings.bandit_path else settings.bandit_path
                cmd = f"{bandit_path} -r . -f json"
                logger.info(f"Running Bandit command: {cmd}")
                logger.info(f"Working directory: {tmp_dir}")
                
                # Use synchronous subprocess.run in a thread for Windows compatibility
                # asyncio.create_subprocess_shell has issues on Windows with ProactorEventLoop
                result = await asyncio.to_thread(
                    subprocess.run,
                    cmd,
                    shell=True,
                    cwd=tmp_dir,
                    capture_output=True,
                    text=True,
                    timeout=settings.analysis_timeout
                )
                
                logger.info(f"Bandit exit code: {result.returncode}")
                logger.info(f"Bandit stdout length: {len(result.stdout) if result.stdout else 0}")
                if result.stderr:
                    logger.debug(f"Bandit stderr: {result.stderr[:500]}")
                
                # Parse Bandit JSON output (exit code 1 = issues found, not an error)
                if result.stdout:
                    try:
                        bandit_results = json.loads(result.stdout)
                        result_count = len(bandit_results.get('results', []))
                        logger.info(f"Bandit results count: {result_count}")
                        issues = self._parse_bandit_output(bandit_results, tmp_path)
                        logger.info(f"Bandit found {len(issues)} issues after parsing")
                    except json.JSONDecodeError as e:
                        logger.error(f"Failed to parse Bandit output: {e}")
                        logger.error(f"Raw stdout: {result.stdout[:500]}")
                else:
                    logger.warning("Bandit returned empty stdout")
                    
            except subprocess.TimeoutExpired:
                logger.warning("Bandit analysis timed out")
            except Exception as e:
                logger.error(f"Bandit analysis failed: {e}", exc_info=True)
        
        execution_time_ms = int((time.time() - start_time) * 1000)
        return AnalyzerResult(
            tool_name=self.name,
            issues=issues,
            execution_time_ms=execution_time_ms
        )
    
    def _is_python_file(self, path: str) -> bool:
        """Check if file is a Python file."""
        return Path(path).suffix.lower() == '.py'
    
    def _parse_bandit_output(self, results: dict, tmp_path: Path) -> List[AnalysisIssue]:
        """Parse Bandit JSON output into AnalysisIssue objects."""
        issues = []
        
        for result in results.get("results", []):
            file_path = result.get("filename", "")
            # Make path relative to temp directory
            try:
                rel_path = Path(file_path).relative_to(tmp_path)
            except ValueError:
                rel_path = Path(file_path).name
            
            severity = self._map_severity(result.get("issue_severity", "LOW"))
            
            # Ensure line number is at least 1 (schema constraint)
            line_number = result.get("line_number", 1)
            if line_number < 1:
                line_number = 1
            
            # Get end line number if available
            end_line = result.get("end_col_offset")
            line_range = result.get("line_range", [])
            if line_range and len(line_range) > 1:
                end_line = line_range[-1]
            else:
                end_line = None
            
            # Column must be None or >= 1 (schema constraint)  
            col_offset = result.get("col_offset")
            if col_offset is not None and col_offset < 1:
                col_offset = None
            
            # Get code snippet if available
            code_snippet = result.get("code")
            if code_snippet:
                # Clean up the code snippet (remove excessive whitespace)
                code_snippet = code_snippet.strip()
            
            try:
                issues.append(AnalysisIssue(
                    severity=severity,
                    category=IssueCategory.SECURITY,  # Bandit is security-focused
                    message=result.get("issue_text", "Security issue detected"),
                    file=str(rel_path),
                    line=line_number,
                    column=col_offset,
                    endLine=end_line,
                    endColumn=None,
                    rule=result.get("test_id", "unknown"),
                    suggestedFix=None,  # Bandit doesn't provide automatic fixes
                    codeSnippet=code_snippet
                ))
            except Exception as e:
                logger.error(f"Failed to create AnalysisIssue: {e}, result: {result}")
        
        return issues
    
    def _map_severity(self, bandit_severity: str) -> IssueSeverity:
        """Map Bandit severity to our severity enum."""
        severity_map = {
            "HIGH": IssueSeverity.ERROR,
            "MEDIUM": IssueSeverity.WARNING,
            "LOW": IssueSeverity.INFO
        }
        return severity_map.get(bandit_severity.upper(), IssueSeverity.WARNING)

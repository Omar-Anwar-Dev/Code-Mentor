# C/C++ Analyzer using cppcheck
import asyncio
import logging
import subprocess
import tempfile
import time
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import List

from app.services.analyzer_base import AnalyzerBase, AnalyzerResult
from app.domain.schemas.requests import CodeFile
from app.domain.schemas.responses import AnalysisIssue, IssueSeverity, IssueCategory
from app.config import get_settings


logger = logging.getLogger(__name__)


class CppAnalyzer(AnalyzerBase):
    """Static analyzer for C/C++ using cppcheck."""
    
    @property
    def name(self) -> str:
        return "cppcheck"
    
    @property
    def supported_languages(self) -> List[str]:
        return ["c", "cpp"]
    
    async def analyze(self, files: List[CodeFile]) -> AnalyzerResult:
        """Run cppcheck on C/C++ files."""
        start_time = time.time()
        issues: List[AnalysisIssue] = []

        # Filter to only C/C++ files
        cpp_files = [f for f in files if self._is_cpp_file(f.path)]

        if not cpp_files:
            return AnalyzerResult(
                tool_name=self.name,
                issues=[],
                execution_time_ms=int((time.time() - start_time) * 1000),
            )
        
        with tempfile.TemporaryDirectory() as tmp_dir:
            tmp_path = Path(tmp_dir)
            
            # Write files to temp directory
            for file in cpp_files:
                file_path = tmp_path / file.path
                file_path.parent.mkdir(parents=True, exist_ok=True)
                file_path.write_text(file.content, encoding='utf-8')
            
            # Run cppcheck
            settings = get_settings()
            try:
                cppcheck_path = settings.cppcheck_path or "cppcheck"
                
                # Quote path if contains spaces
                if ' ' in cppcheck_path:
                    cppcheck_path = f'"{cppcheck_path}"'
                
                cmd = f"{cppcheck_path} --enable=all --xml --xml-version=2 ."
                logger.info(f"Running cppcheck: {cmd}")
                
                result = await asyncio.to_thread(
                    subprocess.run,
                    cmd,
                    shell=True,
                    cwd=tmp_dir,
                    capture_output=True,
                    text=True,
                    timeout=settings.analysis_timeout
                )
                
                # cppcheck outputs XML to stderr
                if result.stderr:
                    issues = self._parse_cppcheck_xml(result.stderr, tmp_path)
                    logger.info(f"cppcheck found {len(issues)} issues")
                    
            except subprocess.TimeoutExpired:
                logger.warning("cppcheck analysis timed out")
            except FileNotFoundError:
                logger.warning("cppcheck not found - skipping C/C++ analysis")
            except Exception as e:
                logger.error(f"cppcheck analysis failed: {e}")
        
        return AnalyzerResult(
            tool_name=self.name,
            issues=issues,
            execution_time_ms=int((time.time() - start_time) * 1000),
        )

    def _is_cpp_file(self, path: str) -> bool:
        """Check if file is a C/C++ file."""
        ext = Path(path).suffix.lower()
        return ext in {'.c', '.h', '.cpp', '.hpp', '.cc', '.cxx', '.hxx'}
    
    def _parse_cppcheck_xml(self, xml_output: str, tmp_path: Path) -> List[AnalysisIssue]:
        """Parse cppcheck XML output."""
        issues = []
        
        try:
            root = ET.fromstring(xml_output)
            
            for error in root.findall('.//error'):
                error_id = error.get('id', 'unknown')
                severity_str = error.get('severity', 'warning')
                message = error.get('msg', 'Issue detected')
                
                # Get location info
                location = error.find('location')
                if location is not None:
                    file_path = location.get('file', 'unknown')
                    line = int(location.get('line', 1))
                    column = location.get('column')
                    
                    # Make path relative
                    try:
                        rel_path = Path(file_path).relative_to(tmp_path)
                    except ValueError:
                        rel_path = Path(file_path).name
                    
                    severity = self._map_severity(severity_str)
                    col_value = int(column) if column and int(column) >= 1 else None
                    
                    try:
                        issues.append(AnalysisIssue(
                            severity=severity,
                            category=self._get_category(error_id),
                            message=message,
                            file=str(rel_path),
                            line=max(1, line),
                            column=col_value,
                            rule=error_id,
                            suggestedFix=None
                        ))
                    except Exception as e:
                        logger.error(f"Failed to create issue: {e}")
                        
        except ET.ParseError as e:
            logger.error(f"Failed to parse cppcheck XML: {e}")
        
        return issues
    
    def _map_severity(self, cppcheck_severity: str) -> IssueSeverity:
        """Map cppcheck severity to our severity."""
        mapping = {
            'error': IssueSeverity.ERROR,
            'warning': IssueSeverity.WARNING,
            'style': IssueSeverity.INFO,
            'performance': IssueSeverity.WARNING,
            'portability': IssueSeverity.INFO,
            'information': IssueSeverity.INFO,
        }
        return mapping.get(cppcheck_severity.lower(), IssueSeverity.WARNING)
    
    def _get_category(self, error_id: str) -> IssueCategory:
        """Determine issue category from error ID."""
        if 'null' in error_id.lower() or 'memory' in error_id.lower():
            return IssueCategory.SECURITY
        elif 'unused' in error_id.lower() or 'style' in error_id.lower():
            return IssueCategory.STYLE
        elif 'performance' in error_id.lower():
            return IssueCategory.PERFORMANCE
        else:
            return IssueCategory.BEST_PRACTICE

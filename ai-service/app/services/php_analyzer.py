# PHP Analyzer using PHPStan
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


class PhpAnalyzer(AnalyzerBase):
    """Static analyzer for PHP using PHPStan."""
    
    @property
    def name(self) -> str:
        return "phpstan"
    
    @property
    def supported_languages(self) -> List[str]:
        return ["php"]
    
    async def analyze(self, files: List[CodeFile]) -> AnalyzerResult:
        """Run PHPStan on PHP files."""
        start_time = time.time()
        issues: List[AnalysisIssue] = []

        # Filter to only PHP files
        php_files = [f for f in files if f.path.lower().endswith('.php')]

        if not php_files:
            return AnalyzerResult(
                tool_name=self.name,
                issues=[],
                execution_time_ms=int((time.time() - start_time) * 1000),
            )
        
        with tempfile.TemporaryDirectory() as tmp_dir:
            tmp_path = Path(tmp_dir)
            
            # Write files to temp directory
            for file in php_files:
                file_path = tmp_path / file.path
                file_path.parent.mkdir(parents=True, exist_ok=True)
                file_path.write_text(file.content, encoding='utf-8')
            
            # Run PHPStan
            settings = get_settings()
            try:
                phpstan_path = settings.phpstan_path or "phpstan"
                
                # Quote path if contains spaces
                if ' ' in phpstan_path:
                    phpstan_path = f'"{phpstan_path}"'
                
                cmd = f"{phpstan_path} analyse --error-format=json --no-progress ."
                logger.info(f"Running PHPStan: {cmd}")
                
                result = await asyncio.to_thread(
                    subprocess.run,
                    cmd,
                    shell=True,
                    cwd=tmp_dir,
                    capture_output=True,
                    text=True,
                    timeout=settings.analysis_timeout
                )
                
                # PHPStan outputs JSON to stdout
                if result.stdout:
                    issues = self._parse_phpstan_output(result.stdout, tmp_path)
                    logger.info(f"PHPStan found {len(issues)} issues")
                    
            except subprocess.TimeoutExpired:
                logger.warning("PHPStan analysis timed out")
            except FileNotFoundError:
                logger.warning("PHPStan not found - skipping PHP analysis")
            except Exception as e:
                logger.error(f"PHPStan analysis failed: {e}")
        
        return AnalyzerResult(
            tool_name=self.name,
            issues=issues,
            execution_time_ms=int((time.time() - start_time) * 1000),
        )

    def _parse_phpstan_output(self, json_output: str, tmp_path: Path) -> List[AnalysisIssue]:
        """Parse PHPStan JSON output."""
        issues = []
        
        try:
            data = json.loads(json_output)
            
            # PHPStan format: {"totals": {...}, "files": {"/path/file.php": {"errors": 1, "messages": [...]}}}
            for file_path, file_data in data.get('files', {}).items():
                for msg in file_data.get('messages', []):
                    message = msg.get('message', 'PHP issue detected')
                    line = msg.get('line', 1)
                    
                    # Make path relative
                    try:
                        rel_path = Path(file_path).relative_to(tmp_path)
                    except ValueError:
                        rel_path = Path(file_path).name
                    
                    try:
                        issues.append(AnalysisIssue(
                            severity=IssueSeverity.ERROR,  # PHPStan reports errors
                            category=IssueCategory.BEST_PRACTICE,
                            message=message,
                            file=str(rel_path),
                            line=max(1, line),
                            column=None,
                            rule="phpstan",
                            suggestedFix=None
                        ))
                    except Exception as e:
                        logger.error(f"Failed to create issue: {e}")
                        
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse PHPStan JSON: {e}")
        
        return issues

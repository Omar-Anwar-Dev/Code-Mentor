# ESLint Analyzer for JavaScript/TypeScript
import asyncio
import json
import logging
import tempfile
import os
import time
from typing import List
from pathlib import Path

from app.services.analyzer_base import AnalyzerBase, AnalyzerResult
from app.domain.schemas.requests import CodeFile
from app.domain.schemas.responses import AnalysisIssue, IssueSeverity, IssueCategory
from app.config import get_settings


logger = logging.getLogger(__name__)


class ESLintAnalyzer(AnalyzerBase):
    """ESLint-based analyzer for JavaScript and TypeScript."""
    
    @property
    def name(self) -> str:
        return "eslint"
    
    @property
    def supported_languages(self) -> List[str]:
        return ["javascript", "typescript"]
    
    async def analyze(self, files: List[CodeFile]) -> AnalyzerResult:
        """Run ESLint on the provided files."""
        start_time = time.time()
        issues: List[AnalysisIssue] = []
        
        # Filter to only supported files
        js_files = [f for f in files if self._is_js_file(f.path)]
        
        if not js_files:
            return AnalyzerResult(
                tool_name=self.name,
                issues=[],
                execution_time_ms=int((time.time() - start_time) * 1000)
            )
        
        # Create temporary directory with code files
        with tempfile.TemporaryDirectory() as tmp_dir:
            tmp_path = Path(tmp_dir)
            
            # Write files to temp directory
            for code_file in js_files:
                file_path = tmp_path / code_file.path
                file_path.parent.mkdir(parents=True, exist_ok=True)
                file_path.write_text(code_file.content, encoding='utf-8')
            
            # Create basic ESLint config if not present
            eslint_config = tmp_path / ".eslintrc.json"
            eslint_config.write_text(json.dumps({
                "env": {"browser": True, "es2021": True, "node": True},
                "extends": ["eslint:recommended"],
                "parserOptions": {"ecmaVersion": "latest", "sourceType": "module"},
                "rules": {
                    "no-eval": "error",
                    "no-implied-eval": "error",
                    "no-unused-vars": "warn",
                    "no-undef": "error",
                    "no-console": "warn",
                    "eqeqeq": "warn"
                }
            }))
            
            # Run ESLint
            settings = get_settings()
            try:
                cmd = f"{settings.eslint_path} . --format json --no-error-on-unmatched-pattern"
                process = await asyncio.create_subprocess_shell(
                    cmd,
                    cwd=tmp_dir,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE
                )
                stdout, stderr = await asyncio.wait_for(
                    process.communicate(),
                    timeout=settings.analysis_timeout
                )
                
                # Parse ESLint JSON output
                if stdout:
                    eslint_results = json.loads(stdout.decode('utf-8'))
                    issues = self._parse_eslint_output(eslint_results, tmp_path)
                    
            except asyncio.TimeoutError:
                logger.warning("ESLint analysis timed out")
            except json.JSONDecodeError as e:
                logger.warning(f"Failed to parse ESLint output: {e}")
            except Exception as e:
                logger.error(f"ESLint analysis failed: {e}")
        
        execution_time_ms = int((time.time() - start_time) * 1000)
        return AnalyzerResult(
            tool_name=self.name,
            issues=issues,
            execution_time_ms=execution_time_ms
        )
    
    def _is_js_file(self, path: str) -> bool:
        """Check if file is a JavaScript/TypeScript file."""
        extensions = {'.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'}
        return Path(path).suffix.lower() in extensions
    
    def _parse_eslint_output(self, results: List[dict], tmp_path: Path) -> List[AnalysisIssue]:
        """Parse ESLint JSON output into AnalysisIssue objects."""
        issues = []
        
        for file_result in results:
            file_path = file_result.get("filePath", "")
            # Make path relative to temp directory
            try:
                rel_path = Path(file_path).relative_to(tmp_path)
            except ValueError:
                rel_path = Path(file_path).name
            
            for msg in file_result.get("messages", []):
                severity = self._map_severity(msg.get("severity", 1))
                category = self._categorize_rule(msg.get("ruleId", ""))
                
                issues.append(AnalysisIssue(
                    severity=severity,
                    category=category,
                    message=msg.get("message", "Unknown issue"),
                    file=str(rel_path),
                    line=msg.get("line", 1),
                    column=msg.get("column"),
                    rule=msg.get("ruleId") or "unknown",
                    suggestedFix=msg.get("fix", {}).get("text") if msg.get("fix") else None
                ))
        
        return issues
    
    def _map_severity(self, eslint_severity: int) -> IssueSeverity:
        """Map ESLint severity to our severity enum."""
        if eslint_severity >= 2:
            return IssueSeverity.ERROR
        elif eslint_severity == 1:
            return IssueSeverity.WARNING
        return IssueSeverity.INFO
    
    def _categorize_rule(self, rule_id: str) -> IssueCategory:
        """Categorize ESLint rule into our categories."""
        if not rule_id:
            return IssueCategory.CODE_SMELL
        
        security_rules = {'no-eval', 'no-implied-eval', 'no-new-func', 'no-script-url'}
        style_rules = {'indent', 'quotes', 'semi', 'comma-dangle', 'no-trailing-spaces'}
        
        if rule_id in security_rules:
            return IssueCategory.SECURITY
        elif rule_id in style_rules:
            return IssueCategory.STYLE
        elif 'prefer' in rule_id:
            return IssueCategory.BEST_PRACTICE
        
        return IssueCategory.CODE_SMELL

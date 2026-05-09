# C# Analyzer using dotnet format / Roslynator
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


class CSharpAnalyzer(AnalyzerBase):
    """Static analyzer for C# using dotnet format or Roslynator."""
    
    @property
    def name(self) -> str:
        return "roslynator"
    
    @property
    def supported_languages(self) -> List[str]:
        return ["csharp"]
    
    async def analyze(self, files: List[CodeFile]) -> AnalyzerResult:
        """Run analysis on C# files."""
        start_time = time.time()
        issues: List[AnalysisIssue] = []

        # Filter to only C# files
        csharp_files = [f for f in files if f.path.lower().endswith('.cs')]

        if not csharp_files:
            return AnalyzerResult(
                tool_name=self.name,
                issues=[],
                execution_time_ms=int((time.time() - start_time) * 1000),
            )
        
        with tempfile.TemporaryDirectory() as tmp_dir:
            tmp_path = Path(tmp_dir)
            
            # Write files to temp directory
            for file in csharp_files:
                file_path = tmp_path / file.path
                file_path.parent.mkdir(parents=True, exist_ok=True)
                file_path.write_text(file.content, encoding='utf-8')
            
            # Create a minimal .csproj for analysis
            csproj_content = """<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
  </PropertyGroup>
</Project>"""
            (tmp_path / "temp.csproj").write_text(csproj_content)
            
            # Run dotnet format for style analysis
            settings = get_settings()
            try:
                dotnet_path = settings.dotnet_path or "dotnet"
                
                # Quote path if contains spaces
                if ' ' in dotnet_path:
                    dotnet_path = f'"{dotnet_path}"'
                
                # Use dotnet format to check for issues
                cmd = f"{dotnet_path} format --verify-no-changes --report format-report.json 2>&1"
                logger.info(f"Running dotnet format: {cmd}")
                
                result = await asyncio.to_thread(
                    subprocess.run,
                    cmd,
                    shell=True,
                    cwd=tmp_dir,
                    capture_output=True,
                    text=True,
                    timeout=settings.analysis_timeout
                )
                
                # Check for format report
                report_path = tmp_path / "format-report.json"
                if report_path.exists():
                    report_content = report_path.read_text()
                    issues = self._parse_format_report(report_content, tmp_path)
                    logger.info(f"dotnet format found {len(issues)} issues")
                else:
                    # Parse stdout/stderr for warnings
                    issues = self._parse_output(result.stdout + result.stderr, tmp_path)
                    
            except subprocess.TimeoutExpired:
                logger.warning("C# analysis timed out")
            except FileNotFoundError:
                logger.warning("dotnet not found - skipping C# analysis")
            except Exception as e:
                logger.error(f"C# analysis failed: {e}")
        
        return AnalyzerResult(
            tool_name=self.name,
            issues=issues,
            execution_time_ms=int((time.time() - start_time) * 1000),
        )

    def _parse_format_report(self, json_output: str, tmp_path: Path) -> List[AnalysisIssue]:
        """Parse dotnet format JSON report."""
        issues = []
        
        try:
            data = json.loads(json_output)
            
            for document in data:
                file_path = document.get('FilePath', 'unknown')
                
                for change in document.get('FileChanges', []):
                    line = change.get('LineNumber', 1)
                    message = change.get('FormatDescription', 'Formatting issue')
                    
                    # Make path relative
                    try:
                        rel_path = Path(file_path).relative_to(tmp_path)
                    except ValueError:
                        rel_path = Path(file_path).name
                    
                    try:
                        issues.append(AnalysisIssue(
                            severity=IssueSeverity.INFO,
                            category=IssueCategory.STYLE,
                            message=message,
                            file=str(rel_path),
                            line=max(1, line),
                            column=None,
                            rule="format",
                            suggestedFix=None
                        ))
                    except Exception as e:
                        logger.error(f"Failed to create issue: {e}")
                        
        except json.JSONDecodeError as e:
            logger.debug(f"No valid JSON report: {e}")
        
        return issues
    
    def _parse_output(self, output: str, tmp_path: Path) -> List[AnalysisIssue]:
        """Parse dotnet build/format text output for warnings."""
        issues = []
        
        # Parse lines like: "Program.cs(10,5): warning CS0168: The variable 'x' is declared but never used"
        import re
        pattern = r'(.+?)\((\d+),(\d+)\):\s*(warning|error)\s+(\w+):\s*(.+)'
        
        for line in output.split('\n'):
            match = re.match(pattern, line)
            if match:
                file_path, line_num, col, severity_str, code, message = match.groups()
                
                try:
                    rel_path = Path(file_path).relative_to(tmp_path)
                except ValueError:
                    rel_path = Path(file_path).name
                
                severity = IssueSeverity.ERROR if severity_str == 'error' else IssueSeverity.WARNING
                
                try:
                    issues.append(AnalysisIssue(
                        severity=severity,
                        category=IssueCategory.BEST_PRACTICE,
                        message=message,
                        file=str(rel_path),
                        line=max(1, int(line_num)),
                        column=int(col) if int(col) >= 1 else None,
                        rule=code,
                        suggestedFix=None
                    ))
                except Exception as e:
                    logger.error(f"Failed to create issue: {e}")
        
        return issues

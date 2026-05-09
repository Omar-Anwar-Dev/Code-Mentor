# Abstract base class for code analyzers
from abc import ABC, abstractmethod
from typing import List
from app.domain.schemas.responses import AnalysisIssue
from app.domain.schemas.requests import CodeFile


class AnalyzerResult:
    """Result from a single analyzer."""
    def __init__(
        self,
        tool_name: str,
        issues: List[AnalysisIssue],
        execution_time_ms: int = 0,
    ):
        self.tool_name = tool_name
        self.issues = issues
        self.execution_time_ms = execution_time_ms


class AnalyzerBase(ABC):
    """Abstract base class for static analysis tools."""
    
    @property
    @abstractmethod
    def name(self) -> str:
        """Return the name of this analyzer."""
        pass
    
    @property
    @abstractmethod
    def supported_languages(self) -> List[str]:
        """Return list of supported language identifiers."""
        pass
    
    @abstractmethod
    async def analyze(self, files: List[CodeFile]) -> AnalyzerResult:
        """
        Analyze the provided code files.
        
        Args:
            files: List of CodeFile objects to analyze
            
        Returns:
            AnalyzerResult with issues found
        """
        pass
    
    def supports_language(self, language: str) -> bool:
        """Check if this analyzer supports the given language."""
        return language.lower() in [lang.lower() for lang in self.supported_languages]

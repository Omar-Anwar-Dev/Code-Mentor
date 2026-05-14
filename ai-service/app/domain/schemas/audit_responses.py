"""S9-T6 / F11 (Project Audit — ADR-034 / ADR-035): Pydantic schemas for the
`POST /api/project-audit` endpoint.

Mirrors the C# `AiAuditCombinedResponse` shape from the backend
(`CodeMentor.Application.CodeReview.AiAuditContracts`). Field names are
camelCase (matches the Refit deserializer's CamelCase policy on the .NET side).
"""

from typing import List, Optional

from pydantic import BaseModel, Field

from app.domain.schemas.responses import (
    StaticAnalysisResult,
    AnalysisMetadata,
    DetailedIssue,
)


class AuditScores(BaseModel):
    """6-category audit breakdown. Completeness is unique to F11 (compares
    project description vs implemented behavior)."""
    codeQuality: int = Field(..., ge=0, le=100)
    security: int = Field(..., ge=0, le=100)
    performance: int = Field(..., ge=0, le=100)
    architectureDesign: int = Field(..., ge=0, le=100)
    maintainability: int = Field(..., ge=0, le=100)
    completeness: int = Field(..., ge=0, le=100)


class AuditIssue(BaseModel):
    """A single audit finding with optional location + fix.

    Severity is a free-form string in the LLM output but bucketed by the prompt
    to one of: critical | high | medium | low | info.
    """
    title: str
    file: Optional[str] = None
    line: Optional[int] = None
    severity: str
    description: str
    fix: Optional[str] = None


class AuditRecommendation(BaseModel):
    """Top-N prioritized improvement (priority 1 = highest)."""
    priority: int = Field(..., ge=1)
    title: str
    howTo: str


class AuditResponse(BaseModel):
    """LLM audit result — the 8 sections from architecture §4.4 step 6."""
    overallScore: int = Field(..., ge=0, le=100)
    grade: str = Field(..., min_length=1, max_length=2)
    scores: AuditScores
    strengths: List[str] = Field(default_factory=list)
    criticalIssues: List[AuditIssue] = Field(default_factory=list)
    warnings: List[AuditIssue] = Field(default_factory=list)
    suggestions: List[AuditIssue] = Field(default_factory=list)
    missingFeatures: List[str] = Field(default_factory=list)
    recommendedImprovements: List[AuditRecommendation] = Field(default_factory=list)
    techStackAssessment: str = ""
    # SBF-1 (2026-05-14): two new long-form fields so the audit feels as rich
    # as the per-task review. `executiveSummary` is the 3-4-paragraph human
    # readable opener; `architectureNotes` is the structural / design call.
    # Optional + default empty so legacy audits parse cleanly.
    executiveSummary: str = ""
    architectureNotes: str = ""
    inlineAnnotations: Optional[List[DetailedIssue]] = None

    # Metadata
    modelUsed: str = ""
    tokensInput: int = Field(default=0, ge=0)
    tokensOutput: int = Field(default=0, ge=0)
    promptVersion: str = ""
    available: bool = True
    error: Optional[str] = None


class CombinedAuditResponse(BaseModel):
    """Combined static + audit response (single round-trip per ADR-035).

    Mirrors `CodeMentor.Application.CodeReview.AiAuditCombinedResponse` on the
    backend side. When the LLM portion fails but static succeeds, `aiAudit`
    is None and `staticAnalysis` is populated (graceful degradation).
    """
    auditId: str
    overallScore: int = Field(..., ge=0, le=100)
    grade: str
    staticAnalysis: Optional[StaticAnalysisResult] = None
    aiAudit: Optional[AuditResponse] = None
    metadata: AnalysisMetadata

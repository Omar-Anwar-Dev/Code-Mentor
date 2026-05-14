# Response schemas for AI Analysis Layer
from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional, Dict, Any
from enum import Enum


class IssueSeverity(str, Enum):
    """Severity level of an issue."""
    ERROR = "error"
    WARNING = "warning"
    INFO = "info"


class IssueCategory(str, Enum):
    """Category of the issue."""
    SECURITY = "security"
    BUG = "bug"
    CODE_SMELL = "code_smell"
    STYLE = "style"
    PERFORMANCE = "performance"
    BEST_PRACTICE = "best_practice"


class AnalysisIssue(BaseModel):
    """A single issue found during analysis."""
    severity: IssueSeverity = Field(..., description="Issue severity level")
    category: IssueCategory = Field(..., description="Issue category")
    message: str = Field(..., description="Human-readable description")
    file: str = Field(..., description="File path where issue was found")
    line: int = Field(..., ge=1, description="Line number (1-indexed)")
    column: Optional[int] = Field(None, ge=1, description="Column number")
    endLine: Optional[int] = Field(None, ge=1, description="End line number")
    endColumn: Optional[int] = Field(None, ge=1, description="End column number")
    rule: str = Field(..., description="Rule or check that triggered this issue")
    suggestedFix: Optional[str] = Field(None, description="Suggested fix if available")
    codeSnippet: Optional[str] = Field(None, description="Code snippet showing the issue")


class AnalysisSummary(BaseModel):
    """Summary statistics of the analysis."""
    totalIssues: int = Field(..., ge=0)
    errors: int = Field(..., ge=0)
    warnings: int = Field(..., ge=0)
    info: int = Field(..., ge=0)


class PerToolSummary(BaseModel):
    """S5-T7: per-tool summary counts."""
    totalIssues: int = Field(..., ge=0)
    errors: int = Field(..., ge=0)
    warnings: int = Field(..., ge=0)
    info: int = Field(..., ge=0)


class PerToolResult(BaseModel):
    """S5-T7: one static-analysis tool's output, partitioned for per-tool persistence."""
    tool: str = Field(..., description="Normalized tool name: eslint|bandit|cppcheck|phpstan|pmd|roslyn")
    issues: List[AnalysisIssue] = Field(default_factory=list)
    summary: PerToolSummary
    executionTimeMs: int = Field(..., ge=0)


class AnalysisResponse(BaseModel):
    """Response from static code analysis."""
    submissionId: str = Field(..., description="Original submission ID")
    analysisType: str = Field(default="static", description="Type of analysis performed")
    overallScore: int = Field(..., ge=0, le=100, description="Quality score 0-100")
    issues: List[AnalysisIssue] = Field(default_factory=list)
    summary: AnalysisSummary
    toolsUsed: List[str] = Field(default_factory=list)
    perTool: List[PerToolResult] = Field(
        default_factory=list,
        description="Per-tool partitioned results — one entry per tool that ran (S5-T7).",
    )
    executionTimeMs: int = Field(..., ge=0, description="Total execution time in milliseconds")


# ============================================================================
# AI Review Response Schemas
# ============================================================================

class AIReviewScores(BaseModel):
    """Individual scores from AI review across the PRD F6 categories.

    S6-T1: aligned with PRD F6 (`correctness`, `readability`, `security`,
    `performance`, `design`). Older field names (`functionality`,
    `bestPractices`) are mapped at parse time for back-compat with any
    in-flight responses; the contract surface is exactly the 5 PRD names.

    SBF-1 / T5: `taskFit` is the 6th axis added 2026-05-14. Captures how
    closely the submitted code addresses the task brief (title / description /
    acceptance criteria / deliverables). Optional for back-compat with
    pre-T5 responses; absence means "not graded against a task brief".
    """
    correctness: int = Field(..., ge=0, le=100, description="Correctness score")
    readability: int = Field(..., ge=0, le=100, description="Readability score")
    security: int = Field(..., ge=0, le=100, description="Security score")
    performance: int = Field(..., ge=0, le=100, description="Performance score")
    design: int = Field(..., ge=0, le=100, description="Design / best-practices score")
    taskFit: Optional[int] = Field(None, ge=0, le=100, description="How closely the code implements the task brief")


class AIRecommendation(BaseModel):
    """A specific recommendation from AI review."""
    priority: str = Field(..., description="Priority: high, medium, or low")
    category: str = Field(..., description="Category: functionality, readability, security, performance, bestPractices")
    message: str = Field(..., description="Specific actionable recommendation")
    suggestedFix: Optional[str] = Field(None, description="Code snippet or fix suggestion")


# ============================================================================
# Enhanced Detailed Feedback Schemas
# ============================================================================

class DetailedIssue(BaseModel):
    """A detailed issue found during AI code review."""
    file: str = Field(..., description="File path where the issue was found")
    line: int = Field(..., ge=1, description="Line number (1-indexed)")
    endLine: Optional[int] = Field(None, ge=1, description="End line number for multi-line issues")
    codeSnippet: Optional[str] = Field(None, description="The exact problematic code from the file")
    issueType: str = Field(..., description="Type: correctness, readability, security, performance, design")
    severity: str = Field(..., description="Severity: critical, high, medium, low")
    title: str = Field(..., description="Brief title of the issue")
    message: str = Field(..., description="Detailed description of the issue")
    explanation: str = Field(..., description="Educational explanation of why this is a problem")
    isRepeatedMistake: bool = Field(default=False, description="Whether this matches a pattern from learner's history")
    suggestedFix: str = Field(..., description="How to fix this issue")
    codeExample: Optional[str] = Field(None, description="Corrected code example")


class StrengthDetail(BaseModel):
    """A detailed strength observation from the code."""
    category: str = Field(..., description="Category: readability, security, performance, architecture, etc.")
    location: Optional[str] = Field(None, description="File and line range, e.g., 'utils.py:15-30'")
    codeSnippet: Optional[str] = Field(None, description="The actual good code from the submission")
    observation: str = Field(..., description="What was good about this code")
    whyGood: str = Field(..., description="Why this is considered good practice")


class WeaknessDetail(BaseModel):
    """A detailed weakness observation requiring improvement."""
    category: str = Field(..., description="Category: security, error_handling, performance, etc.")
    location: Optional[str] = Field(None, description="File and line range where issue occurs")
    codeSnippet: Optional[str] = Field(None, description="The problematic code pattern")
    observation: str = Field(..., description="What the weakness is")
    explanation: str = Field(..., description="Why this is problematic")
    howToFix: str = Field(..., description="How to address this weakness")
    howToAvoid: str = Field(..., description="How to avoid this in the future")
    isRecurring: bool = Field(default=False, description="Whether this appears in learner's recurring weaknesses")


class LearningResource(BaseModel):
    """A learning resource recommendation for a weakness."""
    title: str = Field(..., description="Resource title")
    url: str = Field(..., description="URL to the resource")
    type: str = Field(..., description="Type: documentation, tutorial, video, article")
    description: str = Field(default="", description="Brief description of what the resource covers")


class WeaknessWithResources(BaseModel):
    """A weakness paired with learning resources to address it."""
    weakness: str = Field(..., description="The weakness topic, e.g., SQL Injection")
    resources: List[LearningResource] = Field(default_factory=list, description="Learning resources for this topic")


class AIReviewResponse(BaseModel):
    """Response from AI code review."""
    overallScore: int = Field(..., ge=0, le=100, description="Overall AI review score")
    scores: AIReviewScores = Field(..., description="Category-specific scores")
    # Basic feedback arrays (for backward compatibility)
    strengths: List[str] = Field(default_factory=list, description="Identified code strengths")
    weaknesses: List[str] = Field(default_factory=list, description="Identified weaknesses")
    recommendations: List[AIRecommendation] = Field(default_factory=list, description="Specific recommendations")
    summary: str = Field(default="", description="Brief overall assessment")
    # Enhanced detailed feedback
    detailedIssues: List[DetailedIssue] = Field(default_factory=list, description="Detailed issues with locations and fixes")
    strengthsDetailed: List[StrengthDetail] = Field(default_factory=list, description="Detailed strength observations")
    weaknessesDetailed: List[WeaknessDetail] = Field(default_factory=list, description="Detailed weakness observations")
    learningResources: List[WeaknessWithResources] = Field(default_factory=list, description="Learning resources for weaknesses")
    executiveSummary: str = Field(default="", description="Comprehensive 2-3 paragraph executive summary")
    progressAnalysis: str = Field(default="", description="Analysis of learner's progress based on execution history")
    taskFitRationale: str = Field(default="", description="SBF-1 / T5: 1-2 sentences explaining the taskFit score")
    # Metadata
    modelUsed: str = Field(..., description="AI model used for review")
    tokensUsed: int = Field(default=0, ge=0, description="Tokens consumed")
    promptVersion: str = Field(default="", description="Prompt template version used")
    available: bool = Field(default=True, description="Whether AI review was available")
    error: Optional[str] = Field(None, description="Error message if AI review failed")
    # S11-T2 / F13 (ADR-037): multi-agent review metadata. Populated only when
    # the response was produced by the multi-agent orchestrator. Single-prompt
    # responses leave this `None`.
    meta: Optional[Dict[str, Any]] = Field(
        None,
        description=(
            "Multi-agent metadata: {mode: 'multi', promptVersion, "
            "partialAgents: [...], annotations: [...]}. None for single-prompt responses."
        ),
    )


class StaticAnalysisResult(BaseModel):
    """Static analysis portion of combined response."""
    score: int = Field(..., ge=0, le=100)
    issues: List[AnalysisIssue] = Field(default_factory=list)
    summary: AnalysisSummary
    toolsUsed: List[str] = Field(default_factory=list)
    perTool: List[PerToolResult] = Field(
        default_factory=list,
        description="Per-tool partitioned results so the backend can save one row per tool (S5-T7).",
    )


class AnalysisMetadata(BaseModel):
    """Metadata about the analysis run."""
    projectName: str = Field(default="Unknown", description="Project or ZIP file name")
    languagesDetected: List[str] = Field(default_factory=list, description="Languages detected")
    filesAnalyzed: int = Field(default=0, ge=0, description="Number of files analyzed")
    executionTimeMs: int = Field(default=0, ge=0, description="Total execution time")
    staticAvailable: bool = Field(default=True, description="Whether static analysis was available")
    aiAvailable: bool = Field(default=True, description="Whether AI review was available")


class CombinedAnalysisResponse(BaseModel):
    """Combined response with both static and AI analysis results."""
    submissionId: str = Field(..., description="Submission ID")
    analysisType: str = Field(default="combined", description="Type: combined, static, or ai")
    overallScore: int = Field(..., ge=0, le=100, description="Combined overall score")
    staticAnalysis: Optional[StaticAnalysisResult] = Field(None, description="Static analysis results")
    aiReview: Optional[AIReviewResponse] = Field(None, description="AI review results")
    metadata: AnalysisMetadata = Field(default_factory=AnalysisMetadata, description="Analysis metadata")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "submissionId": "550e8400-e29b-41d4-a716-446655440000",
                "analysisType": "combined",
                "overallScore": 78,
                "staticAnalysis": {
                    "score": 85,
                    "issues": [],
                    "summary": {"totalIssues": 5, "errors": 1, "warnings": 3, "info": 1},
                    "toolsUsed": ["eslint", "bandit"]
                },
                "aiReview": {
                    "overallScore": 72,
                    "scores": {
                        "correctness": 85,
                        "readability": 75,
                        "security": 70,
                        "performance": 80,
                        "design": 75
                    },
                    "strengths": ["Good code structure"],
                    "weaknesses": ["Missing error handling"],
                    "recommendations": [],
                    "summary": "Well-structured code with room for improvement.",
                    "modelUsed": "gpt-5.1-codex-mini",
                    "tokensUsed": 2500,
                    "promptVersion": "v1.0.0",
                    "available": True
                },
                "metadata": {
                    "projectName": "my-project",
                    "languagesDetected": ["python", "javascript"],
                    "filesAnalyzed": 10,
                    "executionTimeMs": 3500,
                    "staticAvailable": True,
                    "aiAvailable": True
                }
            }
        }
    )

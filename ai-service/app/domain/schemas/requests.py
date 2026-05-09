# Request schemas for Static Analysis Service
from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional
from enum import Enum


class SupportedLanguage(str, Enum):
    """Supported programming languages for analysis."""
    JAVASCRIPT = "javascript"
    TYPESCRIPT = "typescript"
    PYTHON = "python"
    CSHARP = "csharp"
    CPP = "cpp"
    C = "c"
    PHP = "php"
    JAVA = "java"


class CodeFile(BaseModel):
    """A single code file for analysis."""
    path: str = Field(..., description="File path within the submission")
    content: str = Field(..., description="File content as string")
    language: Optional[SupportedLanguage] = Field(
        None, 
        description="Language override (auto-detected if not provided)"
    )


class ProjectContext(BaseModel):
    """Context about the task/project being reviewed."""
    name: str = Field(default="Code Review", description="Project or task name")
    description: str = Field(default="", description="Task description and requirements")
    learningTrack: Optional[str] = Field(None, description="Learning track: Full Stack, Backend, Frontend, Python, CS Fundamentals")
    difficulty: str = Field(default="Unknown", description="Difficulty level: Beginner, Intermediate, Advanced")
    expectedOutcomes: List[str] = Field(default_factory=list, description="Expected learning outcomes for this task")
    focusAreas: List[str] = Field(default_factory=list, description="Areas to focus on: security, performance, architecture, etc.")


class LearnerProfile(BaseModel):
    """Profile information about the learner for personalized feedback."""
    skillLevel: str = Field(default="Intermediate", description="Current skill level: Beginner, Intermediate, Advanced")
    previousSubmissions: int = Field(default=0, ge=0, description="Number of previous submissions")
    averageScore: Optional[float] = Field(None, ge=0, le=100, description="Average score from previous submissions")
    weakAreas: List[str] = Field(default_factory=list, description="Known weak areas: security, error_handling, async, etc.")
    strongAreas: List[str] = Field(default_factory=list, description="Known strong areas")
    improvementTrend: Optional[str] = Field(None, description="Trend: improving, stable, declining")


class ExecutionAttempt(BaseModel):
    """A single execution attempt from the learner for the current submission."""
    attemptNumber: int = Field(..., ge=1, description="Attempt number (1-indexed)")
    timestamp: Optional[str] = Field(None, description="ISO timestamp when the attempt was made")
    status: str = Field(..., description="Execution status: pass, fail, partial, error, timeout")
    errorType: Optional[str] = Field(None, description="Type of error if failed: syntax, runtime, logic, compilation")
    errorMessage: Optional[str] = Field(None, description="Full error message if failed")
    errorLine: Optional[int] = Field(None, ge=1, description="Line number where error occurred")
    errorFile: Optional[str] = Field(None, description="File where error occurred")
    testsPassed: Optional[int] = Field(None, ge=0, description="Number of tests passed")
    testsTotal: Optional[int] = Field(None, ge=0, description="Total number of tests")
    executionTimeMs: Optional[int] = Field(None, ge=0, description="Execution time in milliseconds")


class LearnerHistory(BaseModel):
    """Historical data about the learner's submissions and execution attempts."""
    executionAttempts: List[ExecutionAttempt] = Field(
        default_factory=list,
        description="Execution attempts for the current submission (most recent first)"
    )
    recentSubmissions: List[dict] = Field(
        default_factory=list, 
        description="Recent submission summaries: [{taskName, score, date, mainIssues}]"
    )
    commonMistakes: List[str] = Field(
        default_factory=list,
        description="Patterns of mistakes the learner frequently makes across submissions"
    )
    recurringWeaknesses: List[str] = Field(
        default_factory=list,
        description="Weaknesses that appear repeatedly: error_handling, input_validation, etc."
    )
    progressNotes: Optional[str] = Field(
        None,
        description="Instructor or system notes about learner's progress over time"
    )



class AnalysisRequest(BaseModel):
    """Request to analyze code for static issues."""
    submissionId: str = Field(..., description="Unique submission identifier")
    language: SupportedLanguage = Field(
        ..., 
        description="Primary language of the submission"
    )
    codeFiles: List[CodeFile] = Field(
        ..., 
        description="List of code files to analyze",
        min_length=1
    )
    # Enhanced fields for comprehensive AI review
    projectContext: Optional[ProjectContext] = Field(
        None,
        description="Context about the project/task for AI review"
    )
    learnerProfile: Optional[LearnerProfile] = Field(
        None,
        description="Learner profile for personalized feedback"
    )
    learnerHistory: Optional[LearnerHistory] = Field(
        None,
        description="Learner's execution history and past submissions for pattern analysis"
    )
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "submissionId": "550e8400-e29b-41d4-a716-446655440000",
                "language": "javascript",
                "codeFiles": [
                    {
                        "path": "src/app.js",
                        "content": "const x = eval('1+1');"
                    }
                ],
                "projectContext": {
                    "name": "REST API Task",
                    "description": "Build a secure REST API with user authentication",
                    "learningTrack": "Backend",
                    "difficulty": "Intermediate",
                    "focusAreas": ["security", "error_handling"]
                },
                "learnerProfile": {
                    "skillLevel": "Intermediate",
                    "previousSubmissions": 5,
                    "averageScore": 72.5,
                    "weakAreas": ["security", "async"]
                }
            }
        }
    )


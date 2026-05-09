# Analysis endpoints for AI Analysis Layer
import logging
import tempfile
import time
import uuid
from pathlib import Path
from collections import Counter
from typing import Any, Dict, Optional

from fastapi import APIRouter, Form, HTTPException, Request, status, UploadFile, File

from app.config import get_settings
from app.domain.schemas.requests import AnalysisRequest, CodeFile, SupportedLanguage
from app.domain.schemas.responses import (
    AnalysisResponse,
    CombinedAnalysisResponse,
    StaticAnalysisResult,
    AIReviewResponse,
    AIReviewScores,
    AIRecommendation,
    AnalysisMetadata,
    AnalysisSummary,
    DetailedIssue,
    StrengthDetail,
    WeaknessDetail,
    LearningResource,
    WeaknessWithResources
)
from app.domain.schemas.audit_responses import (
    AuditIssue,
    AuditRecommendation,
    AuditResponse,
    AuditScores,
    CombinedAuditResponse,
)
from app.services.analysis_orchestrator import AnalysisOrchestrator
from app.services.zip_processor import ZipProcessor
from app.services.ai_reviewer import get_ai_reviewer, AIReviewResult
from app.services.multi_agent import (
    MULTI_AGENT_PROMPT_VERSION,
    MULTI_AGENT_PROMPT_VERSION_PARTIAL,
    get_multi_agent_orchestrator,
)
from app.services.project_auditor import (
    AuditResult,
    get_project_auditor,
)


logger = logging.getLogger(__name__)

analysis_router = APIRouter(prefix="/api", tags=["Analysis"])


@analysis_router.post("/analyze", response_model=AnalysisResponse, status_code=200)
async def analyze_code(request: AnalysisRequest, http_request: Request):
    """
    Run static analysis on submitted code.

    Executes applicable static analysis tools based on the language
    and returns aggregated results with scoring.
    """
    correlation_id = _read_correlation_id(http_request)
    try:
        logger.info(f"[corr={correlation_id}] Analyzing submission: {request.submissionId}")
        
        orchestrator = AnalysisOrchestrator()
        response = await orchestrator.analyze(request)
        
        logger.info(
            f"Analysis complete for {request.submissionId}. "
            f"Score: {response.overallScore}, Issues: {response.summary.totalIssues}"
        )
        
        return response
        
    except Exception as e:
        logger.error(f"Analysis failed for {request.submissionId}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Analysis failed: {str(e)}"
        )


_CORRELATION_HEADER = "x-correlation-id"


def _read_correlation_id(request: Request) -> str:
    """S5-T10: propagate the backend-issued X-Correlation-Id so both services' logs can be joined."""
    return request.headers.get(_CORRELATION_HEADER) or "-"


@analysis_router.post("/analyze-zip", response_model=CombinedAnalysisResponse, status_code=200)
async def analyze_zip(request: Request, file: UploadFile = File(...)):
    """
    Upload a ZIP file, run combined static + AI analysis, and return JSON results.

    The ZIP file should contain source code files (.py, .js, .ts, etc.).
    Hidden directories and common build artifacts are automatically excluded.

    Enforces (S5-T8):
      - Content-Length ≤ max_zip_size_bytes  → 413 otherwise
      - ≤ max_zip_entries ZIP entries         → 400 otherwise (inside ZipProcessor)
      - Uncompressed total ≤ max_uncompressed_bytes (ZIP-bomb defense)

    Returns:
        CombinedAnalysisResponse with both static analysis and AI review results.
    """
    start_time = time.time()
    settings = get_settings()
    correlation_id = _read_correlation_id(request)

    # Validate file type
    if not file.filename or not file.filename.lower().endswith('.zip'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only ZIP files are accepted"
        )

    # Reject oversize uploads before reading the body (S5-T8 acceptance: 413).
    content_length = request.headers.get("content-length")
    if content_length is not None:
        try:
            cl = int(content_length)
        except ValueError:
            cl = None
        if cl is not None and cl > settings.max_zip_size_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                detail=f"ZIP too large: {cl} bytes exceeds max {settings.max_zip_size_bytes} bytes"
            )

    try:
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(suffix='.zip', delete=False) as tmp_file:
            content = await file.read()
            # Second-line defense if Content-Length was missing/wrong.
            if len(content) > settings.max_zip_size_bytes:
                tmp_file.close()
                Path(tmp_file.name).unlink(missing_ok=True)
                raise HTTPException(
                    status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                    detail=f"ZIP too large: {len(content)} bytes exceeds max {settings.max_zip_size_bytes} bytes"
                )
            tmp_file.write(content)
            tmp_path = Path(tmp_file.name)

        logger.info(f"[corr={correlation_id}] Received ZIP file: {file.filename} ({len(content)} bytes)")

        try:
            # Process ZIP file
            zip_processor = ZipProcessor(
                max_entries=settings.max_zip_entries,
                max_uncompressed_bytes=settings.max_uncompressed_bytes,
            )
            code_files, project_name = zip_processor.extract_and_process(tmp_path)
            
            if not code_files:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No analyzable files found in ZIP. Supported: .py, .js, .ts, .jsx, .tsx"
                )
            
            # Determine primary language from extracted files
            language_counts = Counter(f.language for f in code_files if f.language)
            if language_counts:
                primary_language = language_counts.most_common(1)[0][0]
            else:
                primary_language = SupportedLanguage.PYTHON  # Default fallback
            
            # Get list of detected languages
            languages_detected = list(set(
                f.language.value for f in code_files if f.language
            ))
            
            # Create analysis request
            submission_id = str(uuid.uuid4())
            request = AnalysisRequest(
                submissionId=submission_id,
                language=primary_language,
                codeFiles=code_files
            )
            
            # Run static analysis
            orchestrator = AnalysisOrchestrator()
            static_response = await orchestrator.analyze(request)
            
            logger.info(
                f"Static analysis complete for {project_name}. "
                f"Score: {static_response.overallScore}, Issues: {static_response.summary.totalIssues}"
            )
            
            # Run AI review.
            # S6-T1 / S6-T13 fix: force enhanced=True so detailedIssues +
            # learningResources are populated. The enhanced prompt is also
            # what produces the inline annotations the FeedbackPanel needs.
            ai_reviewer = get_ai_reviewer()
            ai_result = await ai_reviewer.review_code(
                code_files=[
                    {"path": f.path, "content": f.content, "language": f.language.value if f.language else ""}
                    for f in code_files
                ],
                task_context={
                    "title": project_name,
                    "description": "Code review for uploaded project",
                    "expectedLanguage": primary_language.value,
                    "difficulty": "Unknown"
                },
                project_context={
                    "name": project_name,
                    "description": "Code review for uploaded project",
                    "learningTrack": "General",
                    "difficulty": "Intermediate",
                    "expectedOutcomes": [],
                    "focusAreas": ["security", "correctness", "design"],
                },
                static_summary={
                    "totalIssues": static_response.summary.totalIssues,
                    "criticalIssues": static_response.summary.errors,
                    "topCategories": ["security", "code_quality"]
                },
                enhanced=True,
            )
            
            # Calculate execution time
            execution_time_ms = int((time.time() - start_time) * 1000)
            
            # Build combined response
            combined_response = _build_combined_response(
                submission_id=submission_id,
                static_response=static_response,
                ai_result=ai_result,
                project_name=project_name,
                languages_detected=languages_detected,
                files_analyzed=len(code_files),
                execution_time_ms=execution_time_ms
            )
            
            logger.info(
                f"[corr={correlation_id}] Combined analysis complete for {project_name}. "
                f"Overall Score: {combined_response.overallScore}"
            )

            return combined_response
        
        finally:
            # Clean up temp file
            tmp_path.unlink(missing_ok=True)
        
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Analysis failed for ZIP {file.filename}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Analysis failed: {str(e)}"
        )


@analysis_router.post("/ai-review", response_model=AIReviewResponse, status_code=200)
async def ai_review(request: AnalysisRequest, http_request: Request):
    """
    Run AI code review on submitted code (standalone endpoint).

    This endpoint only runs AI review without static analysis.
    Use /analyze-zip for combined results.
    """
    correlation_id = _read_correlation_id(http_request)
    try:
        logger.info(f"[corr={correlation_id}] AI review for submission: {request.submissionId}")
        
        ai_reviewer = get_ai_reviewer()
        
        if not ai_reviewer.is_available:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="AI review service is not configured. Set OPENAI_API_KEY environment variable."
            )
        
        # Extract learner history if provided
        learner_history = None
        if request.learnerHistory:
            learner_history = {
                "executionAttempts": [
                    {
                        "attemptNumber": a.attemptNumber,
                        "timestamp": a.timestamp,
                        "status": a.status,
                        "errorType": a.errorType,
                        "errorMessage": a.errorMessage,
                        "errorLine": a.errorLine,
                        "errorFile": a.errorFile,
                        "testsPassed": a.testsPassed,
                        "testsTotal": a.testsTotal,
                        "executionTimeMs": a.executionTimeMs
                    }
                    for a in request.learnerHistory.executionAttempts
                ],
                "recentSubmissions": request.learnerHistory.recentSubmissions,
                "commonMistakes": request.learnerHistory.commonMistakes,
                "recurringWeaknesses": request.learnerHistory.recurringWeaknesses,
                "progressNotes": request.learnerHistory.progressNotes
            }
        
        # Extract project context if provided
        project_context = None
        if request.projectContext:
            project_context = {
                "name": request.projectContext.name,
                "description": request.projectContext.description,
                "learningTrack": request.projectContext.learningTrack,
                "difficulty": request.projectContext.difficulty,
                "expectedOutcomes": request.projectContext.expectedOutcomes,
                "focusAreas": request.projectContext.focusAreas
            }
        
        # Extract learner profile if provided
        learner_profile = None
        if request.learnerProfile:
            learner_profile = {
                "skillLevel": request.learnerProfile.skillLevel,
                "previousSubmissions": request.learnerProfile.previousSubmissions,
                "averageScore": request.learnerProfile.averageScore,
                "weakAreas": request.learnerProfile.weakAreas,
                "strongAreas": request.learnerProfile.strongAreas,
                "improvementTrend": request.learnerProfile.improvementTrend
            }
        
        ai_result = await ai_reviewer.review_code(
            code_files=[
                {"path": f.path, "content": f.content, "language": f.language.value if f.language else ""}
                for f in request.codeFiles
            ],
            task_context={
                "title": project_context.get("name", "Code Review") if project_context else "Code Review",
                "description": project_context.get("description", "AI code review") if project_context else "AI code review",
                "expectedLanguage": request.language.value,
                "difficulty": project_context.get("difficulty", "Unknown") if project_context else "Unknown"
            },
            project_context=project_context,
            learner_profile=learner_profile,
            learner_history=learner_history
        )
        
        return _convert_ai_result_to_response(ai_result)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"AI review failed for {request.submissionId}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI review failed: {str(e)}"
        )


@analysis_router.post("/ai-review-multi", response_model=AIReviewResponse, status_code=200)
async def ai_review_multi(request: AnalysisRequest, http_request: Request):
    """S11-T2 / F13 (ADR-037): multi-agent code review.

    Three specialist agents (security / performance / architecture) run in
    parallel via `asyncio.gather` and merge into the same `AIReviewResponse`
    shape that `/api/ai-review` returns, plus a `meta` block with the
    multi-agent prompt version and any `partialAgents` that failed.

    Default `AI_REVIEW_MODE=single` in production (ADR-037 cost note);
    this endpoint is opt-in for thesis evaluation runs (S11-T6) and direct
    multi-agent testing.
    """
    correlation_id = _read_correlation_id(http_request)
    settings = get_settings()

    # Input cap (S11-T2 acceptance: over-cap → 413). Same chars-as-tokens proxy
    # we use for project audits (S9-T7) and mentor chat (S10-T5).
    total_input_chars = sum(len(f.content) for f in request.codeFiles)
    if total_input_chars > settings.ai_multi_max_input_chars:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail=(
                f"Code too large for multi-agent review: ~{total_input_chars} chars "
                f"exceeds cap of {settings.ai_multi_max_input_chars} (~6k tokens per agent, "
                "ADR-037). Submit a smaller subset or use the single-prompt endpoint."
            ),
        )

    try:
        logger.info(
            f"[corr={correlation_id}] Multi-agent AI review for submission: {request.submissionId}"
        )

        orchestrator = get_multi_agent_orchestrator()
        if not orchestrator.is_available:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=(
                    "Multi-agent reviewer is not configured. "
                    "Set OPENAI_API_KEY environment variable."
                ),
            )

        project_context = None
        if request.projectContext:
            project_context = {
                "name": request.projectContext.name,
                "description": request.projectContext.description,
                "learningTrack": request.projectContext.learningTrack,
                "difficulty": request.projectContext.difficulty,
                "expectedOutcomes": request.projectContext.expectedOutcomes,
                "focusAreas": request.projectContext.focusAreas,
            }

        learner_profile = None
        if request.learnerProfile:
            learner_profile = {
                "skillLevel": request.learnerProfile.skillLevel,
                "previousSubmissions": request.learnerProfile.previousSubmissions,
                "averageScore": request.learnerProfile.averageScore,
                "weakAreas": request.learnerProfile.weakAreas,
                "strongAreas": request.learnerProfile.strongAreas,
                "improvementTrend": request.learnerProfile.improvementTrend,
            }

        ai_result = await orchestrator.orchestrate(
            code_files=[
                {
                    "path": f.path,
                    "content": f.content,
                    "language": f.language.value if f.language else "",
                }
                for f in request.codeFiles
            ],
            project_context=project_context,
            learner_profile=learner_profile,
            static_summary=None,
        )

        return _convert_ai_result_to_response(ai_result)

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Multi-agent AI review failed for {request.submissionId}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Multi-agent AI review failed: {str(e)}",
        )


@analysis_router.post(
    "/analyze-zip-multi", response_model=CombinedAnalysisResponse, status_code=200
)
async def analyze_zip_multi(request: Request, file: UploadFile = File(...)):
    """S11-T2 / F13 (ADR-037): combined static + multi-agent AI review.

    Parallel to `/api/analyze-zip`. Static analysis runs identically; the AI
    portion is replaced with a multi-agent orchestrator call. Backend
    `SubmissionAnalysisJob` calls this endpoint when `AI_REVIEW_MODE=multi`
    is set (default `single`).
    """
    start_time = time.time()
    settings = get_settings()
    correlation_id = _read_correlation_id(request)

    if not file.filename or not file.filename.lower().endswith(".zip"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only ZIP files are accepted",
        )

    content_length = request.headers.get("content-length")
    if content_length is not None:
        try:
            cl = int(content_length)
        except ValueError:
            cl = None
        if cl is not None and cl > settings.max_zip_size_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                detail=f"ZIP too large: {cl} bytes exceeds max {settings.max_zip_size_bytes} bytes",
            )

    try:
        with tempfile.NamedTemporaryFile(suffix=".zip", delete=False) as tmp_file:
            content = await file.read()
            if len(content) > settings.max_zip_size_bytes:
                tmp_file.close()
                Path(tmp_file.name).unlink(missing_ok=True)
                raise HTTPException(
                    status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                    detail=f"ZIP too large: {len(content)} bytes exceeds max {settings.max_zip_size_bytes} bytes",
                )
            tmp_file.write(content)
            tmp_path = Path(tmp_file.name)

        logger.info(
            f"[corr={correlation_id}] [multi] Received ZIP file: {file.filename} ({len(content)} bytes)"
        )

        try:
            zip_processor = ZipProcessor(
                max_entries=settings.max_zip_entries,
                max_uncompressed_bytes=settings.max_uncompressed_bytes,
            )
            code_files, project_name = zip_processor.extract_and_process(tmp_path)

            if not code_files:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No analyzable files found in ZIP. Supported: .py, .js, .ts, .jsx, .tsx",
                )

            # S11-T2 input cap — same chars-as-tokens proxy used elsewhere.
            total_input_chars = sum(len(f.content) for f in code_files)
            if total_input_chars > settings.ai_multi_max_input_chars:
                raise HTTPException(
                    status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                    detail=(
                        f"Code too large for multi-agent review: ~{total_input_chars} chars "
                        f"exceeds cap of {settings.ai_multi_max_input_chars} (~6k tokens per agent, ADR-037)."
                    ),
                )

            language_counts = Counter(f.language for f in code_files if f.language)
            primary_language = (
                language_counts.most_common(1)[0][0]
                if language_counts
                else SupportedLanguage.PYTHON
            )
            languages_detected = list(set(
                f.language.value for f in code_files if f.language
            ))

            submission_id = str(uuid.uuid4())
            request_obj = AnalysisRequest(
                submissionId=submission_id,
                language=primary_language,
                codeFiles=code_files,
            )

            orchestrator = AnalysisOrchestrator()
            static_response = await orchestrator.analyze(request_obj)

            logger.info(
                f"[multi] Static analysis complete for {project_name}. "
                f"Score: {static_response.overallScore}, Issues: {static_response.summary.totalIssues}"
            )

            multi_orch = get_multi_agent_orchestrator()
            ai_result = await multi_orch.orchestrate(
                code_files=[
                    {
                        "path": f.path,
                        "content": f.content,
                        "language": f.language.value if f.language else "",
                    }
                    for f in code_files
                ],
                project_context={
                    "name": project_name,
                    "description": "Code review for uploaded project",
                    "learningTrack": "General",
                    "difficulty": "Intermediate",
                    "expectedOutcomes": [],
                    "focusAreas": ["security", "correctness", "design"],
                },
                static_summary={
                    "totalIssues": static_response.summary.totalIssues,
                    "criticalIssues": static_response.summary.errors,
                    "topCategories": ["security", "code_quality"],
                },
            )

            execution_time_ms = int((time.time() - start_time) * 1000)
            combined_response = _build_combined_response(
                submission_id=submission_id,
                static_response=static_response,
                ai_result=ai_result,
                project_name=project_name,
                languages_detected=languages_detected,
                files_analyzed=len(code_files),
                execution_time_ms=execution_time_ms,
            )

            logger.info(
                f"[corr={correlation_id}] [multi] Combined analysis complete for {project_name}. "
                f"Overall Score: {combined_response.overallScore}, "
                f"PromptVersion: {ai_result.prompt_version}, "
                f"Tokens: {ai_result.tokens_used}"
            )

            return combined_response

        finally:
            tmp_path.unlink(missing_ok=True)

    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"[multi] Analysis failed for ZIP {file.filename}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Analysis failed: {str(e)}",
        )


@analysis_router.post("/project-audit", response_model=CombinedAuditResponse, status_code=200)
async def project_audit(
    request: Request,
    file: UploadFile = File(...),
    description: str = Form(""),
):
    """S9-T6 / F11 (ADR-034 / ADR-035): combined static + LLM project audit.

    Single round-trip: backend uploads a ZIP plus the structured project
    description JSON; the AI service runs static fan-out internally, then
    invokes the audit prompt with the static summary baked in. Returns the
    combined response in the shape the .NET backend expects
    (`AiAuditCombinedResponse`).

    Same ZIP caps as `/api/analyze-zip` (S5-T8). Token caps live in
    `Settings.ai_audit_max_output_tokens` (3k per ADR-034).
    """
    start_time = time.time()
    settings = get_settings()
    correlation_id = _read_correlation_id(request)

    if not file.filename or not file.filename.lower().endswith(".zip"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only ZIP files are accepted",
        )

    # Pre-read content-length check (S5-T8 pattern → 413 on oversize).
    content_length = request.headers.get("content-length")
    if content_length is not None:
        try:
            cl = int(content_length)
        except ValueError:
            cl = None
        if cl is not None and cl > settings.max_zip_size_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                detail=f"ZIP too large: {cl} bytes exceeds max {settings.max_zip_size_bytes} bytes",
            )

    try:
        with tempfile.NamedTemporaryFile(suffix=".zip", delete=False) as tmp_file:
            content = await file.read()
            if len(content) > settings.max_zip_size_bytes:
                tmp_file.close()
                Path(tmp_file.name).unlink(missing_ok=True)
                raise HTTPException(
                    status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                    detail=f"ZIP too large: {len(content)} bytes exceeds max {settings.max_zip_size_bytes} bytes",
                )
            tmp_file.write(content)
            tmp_path = Path(tmp_file.name)

        logger.info(
            f"[corr={correlation_id}] Project-audit upload: {file.filename} ({len(content)} bytes)"
        )

        try:
            zip_processor = ZipProcessor(
                max_entries=settings.max_zip_entries,
                max_uncompressed_bytes=settings.max_uncompressed_bytes,
            )
            code_files, project_name = zip_processor.extract_and_process(tmp_path)

            if not code_files:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No analyzable files found in ZIP. Supported: .py, .js, .ts, .jsx, .tsx, etc.",
                )

            # S9-T7: input cap enforcement (10k tokens ≈ 40k chars per ADR-034).
            # Fires BEFORE the LLM call so over-cap projects don't burn tokens.
            total_input_chars = (
                sum(len(f.content) for f in code_files) + len(description or "")
            )
            if total_input_chars > settings.ai_audit_max_input_chars:
                raise HTTPException(
                    status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                    detail=(
                        f"Project content too large for audit: ~{total_input_chars} chars "
                        f"exceeds cap of {settings.ai_audit_max_input_chars} (~10k tokens, ADR-034). "
                        "Upload a smaller subset (e.g. only the source folder, exclude vendored deps)."
                    ),
                )

            language_counts = Counter(f.language for f in code_files if f.language)
            primary_language = language_counts.most_common(1)[0][0] if language_counts else SupportedLanguage.PYTHON
            languages_detected = list(set(f.language.value for f in code_files if f.language))

            audit_id = str(uuid.uuid4())
            analysis_request = AnalysisRequest(
                submissionId=audit_id,
                language=primary_language,
                codeFiles=code_files,
            )

            # ── Static phase ──
            orchestrator = AnalysisOrchestrator()
            static_response = await orchestrator.analyze(analysis_request)

            logger.info(
                f"[corr={correlation_id}] Audit static phase complete for {project_name}. "
                f"Score: {static_response.overallScore}, Issues: {static_response.summary.totalIssues}"
            )

            # ── Audit phase (LLM with structured project description + static summary) ──
            auditor = get_project_auditor()
            audit_result = await auditor.audit_project(
                code_files=[
                    {"path": f.path, "content": f.content, "language": f.language.value if f.language else ""}
                    for f in code_files
                ],
                project_description_json=description or "{}",
                static_summary={
                    "totalIssues": static_response.summary.totalIssues,
                    "errors": static_response.summary.errors,
                    "topCategories": ["security", "code_quality"],
                },
            )

            execution_time_ms = int((time.time() - start_time) * 1000)

            combined = _build_combined_audit_response(
                audit_id=audit_id,
                static_response=static_response,
                audit_result=audit_result,
                project_name=project_name,
                languages_detected=languages_detected,
                files_analyzed=len(code_files),
                execution_time_ms=execution_time_ms,
            )

            logger.info(
                f"[corr={correlation_id}] Project audit complete: "
                f"audit={audit_id} score={combined.overallScore} grade={combined.grade}"
            )

            return combined

        finally:
            tmp_path.unlink(missing_ok=True)

    except HTTPException:
        raise
    except ValueError as ex:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ex))
    except Exception as ex:
        logger.error(f"Project audit failed for ZIP {file.filename}: {ex}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Project audit failed: {ex}",
        )


def _build_combined_audit_response(
    audit_id: str,
    static_response: AnalysisResponse,
    audit_result: AuditResult,
    project_name: str,
    languages_detected: list,
    files_analyzed: int,
    execution_time_ms: int,
) -> CombinedAuditResponse:
    """Assemble the combined static + audit response. When `audit_result.available`
    is False, `aiAudit` is None (graceful degradation per ADR-035)."""

    # Overall score: prefer the audit's score; fall back to static when AI unavailable.
    if audit_result.available:
        overall_score = audit_result.overall_score
        grade = audit_result.grade
    else:
        overall_score = static_response.overallScore
        grade = _grade_from_score(static_response.overallScore)

    static_block = StaticAnalysisResult(
        score=static_response.overallScore,
        issues=static_response.issues,
        summary=static_response.summary,
        toolsUsed=static_response.toolsUsed,
        perTool=static_response.perTool,
    )

    ai_block = _convert_audit_result_to_response(audit_result) if audit_result.available else None

    metadata = AnalysisMetadata(
        projectName=project_name,
        languagesDetected=languages_detected,
        filesAnalyzed=files_analyzed,
        executionTimeMs=execution_time_ms,
        staticAvailable=True,
        aiAvailable=audit_result.available,
    )

    return CombinedAuditResponse(
        auditId=audit_id,
        overallScore=overall_score,
        grade=grade,
        staticAnalysis=static_block,
        aiAudit=ai_block,
        metadata=metadata,
    )


def _convert_audit_result_to_response(audit_result: AuditResult) -> AuditResponse:
    """Map the in-memory AuditResult dataclass to the AuditResponse Pydantic schema."""
    scores = AuditScores(
        codeQuality=audit_result.scores.get("codeQuality", 0),
        security=audit_result.scores.get("security", 0),
        performance=audit_result.scores.get("performance", 0),
        architectureDesign=audit_result.scores.get("architectureDesign", 0),
        maintainability=audit_result.scores.get("maintainability", 0),
        completeness=audit_result.scores.get("completeness", 0),
    )

    def to_issues(raw: list[dict]) -> list[AuditIssue]:
        out = []
        for item in raw:
            try:
                out.append(AuditIssue(
                    title=str(item.get("title", "")),
                    file=item.get("file"),
                    line=item.get("line"),
                    severity=str(item.get("severity", "info")),
                    description=str(item.get("description", "")),
                    fix=item.get("fix"),
                ))
            except Exception:  # tolerate one-off malformed entries
                continue
        return out

    def to_recommendations(raw: list[dict]) -> list[AuditRecommendation]:
        out = []
        for item in raw:
            try:
                out.append(AuditRecommendation(
                    priority=int(item.get("priority", 99)),
                    title=str(item.get("title", "")),
                    howTo=str(item.get("howTo", "")),
                ))
            except Exception:
                continue
        return out

    def to_inline(raw: list[dict]) -> list[DetailedIssue]:
        out = []
        for item in raw:
            try:
                out.append(DetailedIssue(
                    file=item.get("file", ""),
                    line=item.get("line", 1),
                    endLine=item.get("endLine"),
                    codeSnippet=item.get("codeSnippet"),
                    issueType=item.get("issueType", "general"),
                    severity=item.get("severity", "medium"),
                    title=item.get("title", ""),
                    message=item.get("message", ""),
                    explanation=item.get("explanation", ""),
                    isRepeatedMistake=bool(item.get("isRepeatedMistake", False)),
                    suggestedFix=item.get("suggestedFix", ""),
                    codeExample=item.get("codeExample"),
                ))
            except Exception:
                continue
        return out

    return AuditResponse(
        overallScore=audit_result.overall_score,
        grade=audit_result.grade or _grade_from_score(audit_result.overall_score),
        scores=scores,
        strengths=audit_result.strengths,
        criticalIssues=to_issues(audit_result.critical_issues),
        warnings=to_issues(audit_result.warnings),
        suggestions=to_issues(audit_result.suggestions),
        missingFeatures=audit_result.missing_features,
        recommendedImprovements=to_recommendations(audit_result.recommended_improvements),
        techStackAssessment=audit_result.tech_stack_assessment,
        inlineAnnotations=to_inline(audit_result.inline_annotations) or None,
        modelUsed=audit_result.model_used,
        tokensInput=audit_result.tokens_input,
        tokensOutput=audit_result.tokens_output,
        promptVersion=audit_result.prompt_version,
        available=audit_result.available,
        error=audit_result.error,
    )


def _grade_from_score(score: int) -> str:
    """Bucket a 0-100 score into A/B/C/D/F (used as a fallback when the LLM
    didn't produce its own grade or wasn't available)."""
    if score >= 90: return "A"
    if score >= 80: return "B"
    if score >= 70: return "C"
    if score >= 60: return "D"
    return "F"


def _build_combined_response(
    submission_id: str,
    static_response: AnalysisResponse,
    ai_result: AIReviewResult,
    project_name: str,
    languages_detected: list,
    files_analyzed: int,
    execution_time_ms: int
) -> CombinedAnalysisResponse:
    """Build the combined analysis response from static and AI results."""
    
    # Calculate combined overall score
    if ai_result.available:
        # Weighted: 60% static, 40% AI
        overall_score = int(static_response.overallScore * 0.6 + ai_result.overall_score * 0.4)
    else:
        # Only static available
        overall_score = static_response.overallScore
    
    # Build static analysis result — forward `perTool` so backend can persist one row per tool (S5-T7).
    static_result = StaticAnalysisResult(
        score=static_response.overallScore,
        issues=static_response.issues,
        summary=static_response.summary,
        toolsUsed=static_response.toolsUsed,
        perTool=static_response.perTool,
    )
    
    # Build AI review response
    ai_response = _convert_ai_result_to_response(ai_result)
    
    # Build metadata
    metadata = AnalysisMetadata(
        projectName=project_name,
        languagesDetected=languages_detected,
        filesAnalyzed=files_analyzed,
        executionTimeMs=execution_time_ms,
        staticAvailable=True,
        aiAvailable=ai_result.available
    )
    
    return CombinedAnalysisResponse(
        submissionId=submission_id,
        analysisType="combined" if ai_result.available else "static",
        overallScore=overall_score,
        staticAnalysis=static_result,
        aiReview=ai_response,
        metadata=metadata
    )


def _convert_ai_result_to_response(ai_result: AIReviewResult) -> AIReviewResponse:
    """Convert AIReviewResult dataclass to AIReviewResponse schema."""
    # Convert detailed issues
    detailed_issues = [
        DetailedIssue(
            file=issue.get("file", ""),
            line=issue.get("line", 1),
            endLine=issue.get("endLine"),
            codeSnippet=issue.get("codeSnippet"),
            issueType=issue.get("issueType", "general"),
            severity=issue.get("severity", "medium"),
            title=issue.get("title", ""),
            message=issue.get("message", ""),
            explanation=issue.get("explanation", ""),
            isRepeatedMistake=issue.get("isRepeatedMistake", False),
            suggestedFix=issue.get("suggestedFix", ""),
            codeExample=issue.get("codeExample")
        )
        for issue in ai_result.detailed_issues
    ]
    
    # Convert detailed strengths
    strengths_detailed = [
        StrengthDetail(
            category=s.get("category", "general"),
            location=s.get("location"),
            codeSnippet=s.get("codeSnippet"),
            observation=s.get("observation", ""),
            whyGood=s.get("whyGood", "")
        )
        for s in ai_result.strengths_detailed
    ]
    
    # Convert detailed weaknesses
    weaknesses_detailed = [
        WeaknessDetail(
            category=w.get("category", "general"),
            location=w.get("location"),
            codeSnippet=w.get("codeSnippet"),
            observation=w.get("observation", ""),
            explanation=w.get("explanation", ""),
            howToFix=w.get("howToFix", ""),
            howToAvoid=w.get("howToAvoid", ""),
            isRecurring=w.get("isRecurring", False)
        )
        for w in ai_result.weaknesses_detailed
    ]
    
    # Convert learning resources
    learning_resources = [
        WeaknessWithResources(
            weakness=lr.get("weakness", ""),
            resources=[
                LearningResource(
                    title=r.get("title", ""),
                    url=r.get("url", ""),
                    type=r.get("type", "article"),
                    description=r.get("description", "")
                )
                for r in lr.get("resources", [])
            ]
        )
        for lr in ai_result.learning_resources
    ]
    
    # S11-T2 / F13 (ADR-037): if the orchestrator stamped multi-agent metadata
    # on the result (`_multi_agent_partial`, `_multi_agent_annotations`),
    # surface it as the `meta` block. Single-prompt results leave `meta=None`.
    multi_partial = getattr(ai_result, "_multi_agent_partial", None)
    multi_annotations = getattr(ai_result, "_multi_agent_annotations", None)
    meta_block: Optional[Dict[str, Any]] = None
    if multi_partial is not None or multi_annotations is not None:
        meta_block = {
            "mode": "multi",
            "promptVersion": ai_result.prompt_version,
            "partialAgents": list(multi_partial or []),
            "annotations": list(multi_annotations or []),
        }

    return AIReviewResponse(
        overallScore=ai_result.overall_score,
        scores=AIReviewScores(
            correctness=ai_result.scores.get("correctness", 0),
            readability=ai_result.scores.get("readability", 0),
            security=ai_result.scores.get("security", 0),
            performance=ai_result.scores.get("performance", 0),
            design=ai_result.scores.get("design", 0)
        ),
        strengths=ai_result.strengths,
        weaknesses=ai_result.weaknesses,
        recommendations=[
            AIRecommendation(
                priority=rec.get("priority", "medium"),
                category=rec.get("category", "general"),
                message=rec.get("message", ""),
                suggestedFix=rec.get("suggestedFix")
            )
            for rec in ai_result.recommendations
        ],
        summary=ai_result.summary,
        # Enhanced fields
        detailedIssues=detailed_issues,
        strengthsDetailed=strengths_detailed,
        weaknessesDetailed=weaknesses_detailed,
        learningResources=learning_resources,
        executiveSummary=ai_result.executive_summary,
        progressAnalysis=ai_result.progress_analysis,
        # Metadata
        modelUsed=ai_result.model_used,
        tokensUsed=ai_result.tokens_used,
        promptVersion=ai_result.prompt_version,
        available=ai_result.available,
        error=ai_result.error,
        meta=meta_block,
    )

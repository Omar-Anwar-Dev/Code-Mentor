"""S9-T6 acceptance: 3 sample inputs (Python / JS / C#) produce valid
structured output; token usage logged; tone codified in system message
(senior code-reviewer per ADR-034).

These tests use a **mock OpenAI client** so they run without a live API key.
The full live pass (3 sample inputs through the real model) lives in
S9-T7's regression suite (`test_project_audit_regression.py`) using the
self-skip-no-key pattern from `test_ai_review_prompt.py`.

What's verified here:
  * The audit prompt builds correctly and is sent to the model.
  * A well-formed model response parses to AuditResult with all 8 sections.
  * The 6-category scores are populated for each language sample.
  * A malformed response triggers exactly one retry — and a passing retry
    succeeds without losing token-usage accounting.
  * Two failed parses surface a clean `available=False` failure.
  * The system message tone reflects ADR-034 (senior code-reviewer phrasing).
  * The Pydantic schemas (`AuditScores`, `AuditResponse`, `CombinedAuditResponse`)
    accept the canonical shape.
"""
import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.domain.schemas.audit_responses import (
    AuditResponse,
    AuditScores,
    CombinedAuditResponse,
)
from app.services.audit_prompts import (
    AUDIT_PROMPT_VERSION,
    AUDIT_SYSTEM_PROMPT,
    build_audit_prompt,
)
from app.services.project_auditor import (
    AuditResult,
    ProjectAuditor,
    reset_project_auditor,
)


# ── Sample model responses (Python / JS / C# — the 3 acceptance sample inputs) ──

_PYTHON_GOOD_RESPONSE = {
    "overallScore": 78,
    "grade": "B",
    "scores": {
        "codeQuality": 80,
        "security": 70,
        "performance": 75,
        "architectureDesign": 78,
        "maintainability": 82,
        "completeness": 85,
    },
    "strengths": ["Clean module boundaries", "Type hints throughout"],
    "criticalIssues": [],
    "warnings": [
        {
            "title": "N+1 query pattern in /tasks",
            "file": "app/tasks.py",
            "line": 88,
            "severity": "high",
            "description": "Each request loops the user list and queries DB per row. Becomes a problem at >100 users.",
            "fix": "Use selectinload or a single JOIN.",
        },
    ],
    "suggestions": [],
    "missingFeatures": ["Pagination on /tasks list"],
    "recommendedImprovements": [
        {"priority": 1, "title": "Add pagination", "howTo": "Accept ?page+?size, default 20, max 100; index on (user_id, created_at)."},
    ],
    "techStackAssessment": "Flask is appropriate for this scale; no need to migrate.",
    "inlineAnnotations": [],
}

_JS_GOOD_RESPONSE = {
    "overallScore": 65,
    "grade": "C",
    "scores": {
        "codeQuality": 65,
        "security": 55,
        "performance": 70,
        "architectureDesign": 60,
        "maintainability": 65,
        "completeness": 75,
    },
    "strengths": ["Tests in place"],
    "criticalIssues": [
        {
            "title": "Hardcoded API key",
            "file": "src/config.js",
            "line": 4,
            "severity": "critical",
            "description": "API key committed to source.",
            "fix": "Move to environment variables.",
        },
    ],
    "warnings": [],
    "suggestions": [],
    "missingFeatures": [],
    "recommendedImprovements": [
        {"priority": 1, "title": "Rotate API key", "howTo": "Revoke the committed key, regenerate, store in .env."},
    ],
    "techStackAssessment": "React + Vite is fine.",
    "inlineAnnotations": None,
}

_CSHARP_GOOD_RESPONSE = {
    "overallScore": 88,
    "grade": "B+",
    "scores": {
        "codeQuality": 90,
        "security": 85,
        "performance": 88,
        "architectureDesign": 90,
        "maintainability": 88,
        "completeness": 85,
    },
    "strengths": ["Clean Architecture layers respected"],
    "criticalIssues": [],
    "warnings": [],
    "suggestions": [{"title": "Add XML doc comments", "file": None, "line": None, "severity": "low", "description": "Public APIs lack docs.", "fix": "Add /// summary."}],
    "missingFeatures": [],
    "recommendedImprovements": [],
    "techStackAssessment": ".NET 10 + EF Core 10 is current LTS — strong choice.",
    "inlineAnnotations": [],
}


# ── Helpers ────────────────────────────────────────────────────────────────

def _mock_openai_response(payload, tokens_input: int = 5000, tokens_output: int = 1800):
    """Build a mock for `client.responses.create(...)` returning the given payload."""
    response = MagicMock()
    response.output_text = json.dumps(payload) if isinstance(payload, dict) else payload
    usage = MagicMock()
    usage.input_tokens = tokens_input
    usage.output_tokens = tokens_output
    response.usage = usage
    return response


def _make_auditor_with_responses(*responses):
    """Build a ProjectAuditor whose mock client returns `responses` in order."""
    mock_client = MagicMock()
    mock_client.responses = MagicMock()
    mock_client.responses.create = AsyncMock(side_effect=list(responses))
    return ProjectAuditor(client=mock_client)


@pytest.fixture(autouse=True)
def _reset_singleton():
    """Make sure each test gets a fresh auditor (no leaked mock state)."""
    reset_project_auditor()
    yield
    reset_project_auditor()


# ── 1. Prompt + tone ──────────────────────────────────────────────────────

def test_system_prompt_codifies_senior_reviewer_tone_per_adr_034():
    """ADR-034 requires the system message to codify a senior code-reviewer tone."""
    text = AUDIT_SYSTEM_PROMPT.lower()
    assert "senior" in text, "System prompt should establish senior-engineer authority"
    assert "direct" in text or "assertive" in text, "Should establish assertive tone"
    assert "prioritized" in text, "Should require prioritized output"
    assert "pure json" in text, "Should require pure-JSON output"


def test_build_audit_prompt_includes_all_three_sections():
    description_json = '{"summary":"todo app","techStack":["Python","Flask"]}'
    code_files = [{"path": "app.py", "content": "print('hello')", "language": "python"}]
    static_summary = {"totalIssues": 5, "errors": 1, "topCategories": ["security"]}

    prompt = build_audit_prompt(description_json, code_files, static_summary)

    assert "Project Description" in prompt
    assert description_json in prompt
    assert "Static-Analysis Summary" in prompt
    assert "Total issues from static tools: 5" in prompt
    assert "Code Files" in prompt
    assert "app.py" in prompt
    assert "PURE JSON" in prompt or "Required JSON output schema" in prompt


def test_build_audit_prompt_handles_missing_static_summary():
    prompt = build_audit_prompt('{}', [{"path": "x.py", "content": "", "language": "python"}], None)
    assert "static analysis not run" in prompt


# ── 2. Schema validation — 3 sample inputs ────────────────────────────────

@pytest.mark.parametrize("language,response_payload", [
    ("python", _PYTHON_GOOD_RESPONSE),
    ("javascript", _JS_GOOD_RESPONSE),
    ("csharp", _CSHARP_GOOD_RESPONSE),
])
@pytest.mark.asyncio
async def test_audit_produces_valid_structured_output_for_3_sample_inputs(language, response_payload):
    """S9-T6 acceptance: 3 sample inputs (Python / JS / C#) → valid structured output."""
    auditor = _make_auditor_with_responses(_mock_openai_response(response_payload))

    result = await auditor.audit_project(
        code_files=[{"path": f"sample.{language}", "content": "...", "language": language}],
        project_description_json=json.dumps({"summary": "demo", "techStack": [language]}),
        static_summary={"totalIssues": 0, "errors": 0, "topCategories": []},
    )

    # 6-category scores all present + clamped to 0-100.
    assert result.available is True, result.error
    for category in ("codeQuality", "security", "performance", "architectureDesign", "maintainability", "completeness"):
        assert category in result.scores, f"missing score category: {category}"
        assert 0 <= result.scores[category] <= 100, f"{category} out of range: {result.scores[category]}"

    # Overall + grade.
    assert 0 <= result.overall_score <= 100
    assert result.grade

    # Token usage logged (acceptance requirement).
    assert result.tokens_input > 0, "tokensInput should be populated from the API response"
    assert result.tokens_output > 0, "tokensOutput should be populated from the API response"

    # Prompt version is the audit version, NOT the per-task review version.
    assert result.prompt_version == AUDIT_PROMPT_VERSION

    # The Pydantic schema accepts the converted shape (round-trip).
    schema_scores = AuditScores(**result.scores)
    assert schema_scores.completeness == result.scores["completeness"]


# ── 3. Retry-on-malformed (S6-T2 contract carried into F11) ───────────────

@pytest.mark.asyncio
async def test_malformed_then_valid_response_succeeds_after_one_retry():
    """First call returns garbage → auditor retries once with PURE-JSON reminder → succeeds."""
    auditor = _make_auditor_with_responses(
        _mock_openai_response("not json at all", tokens_input=1000, tokens_output=200),
        _mock_openai_response(_PYTHON_GOOD_RESPONSE, tokens_input=1100, tokens_output=1700),
    )

    result = await auditor.audit_project(
        code_files=[{"path": "x.py", "content": "", "language": "python"}],
        project_description_json="{}",
    )

    assert result.available is True
    # Token accounting combines both call costs (failed + successful retry).
    assert result.tokens_input == 2100
    assert result.tokens_output == 1900
    # Mock was called exactly twice (once + retry).
    assert auditor.client.responses.create.await_count == 2


@pytest.mark.asyncio
async def test_two_malformed_responses_surface_clean_failure():
    """Both attempts fail → return AuditResult with available=False + clean error."""
    auditor = _make_auditor_with_responses(
        _mock_openai_response("garbage 1"),
        _mock_openai_response("garbage 2"),
    )

    result = await auditor.audit_project(
        code_files=[{"path": "x.py", "content": "", "language": "python"}],
        project_description_json="{}",
    )

    assert result.available is False
    assert result.error and "parse" in result.error.lower()
    assert auditor.client.responses.create.await_count == 2


# ── 4. JSON-fence repair (existing _try_load_json reuse) ──────────────────

@pytest.mark.asyncio
async def test_json_wrapped_in_markdown_fences_is_repaired_without_retry():
    """Model wraps JSON in ```json``` fences → repair pass succeeds without a retry."""
    fenced = "```json\n" + json.dumps(_PYTHON_GOOD_RESPONSE) + "\n```"
    auditor = _make_auditor_with_responses(_mock_openai_response(fenced))

    result = await auditor.audit_project(
        code_files=[{"path": "x.py", "content": "", "language": "python"}],
        project_description_json="{}",
    )

    assert result.available is True
    assert result.overall_score == _PYTHON_GOOD_RESPONSE["overallScore"]
    # Only one call — the fence-strip repair succeeded without hitting the retry path.
    assert auditor.client.responses.create.await_count == 1


# ── 5. Pydantic schema sanity ─────────────────────────────────────────────

def test_audit_response_schema_accepts_canonical_payload():
    payload = dict(_PYTHON_GOOD_RESPONSE)
    payload.update({
        "modelUsed": "gpt-5.1-codex-mini",
        "tokensInput": 5000,
        "tokensOutput": 1800,
        "promptVersion": AUDIT_PROMPT_VERSION,
        "available": True,
        "error": None,
    })
    response = AuditResponse(**payload)
    assert response.scores.completeness == 85
    assert response.recommendedImprovements[0].priority == 1
    assert response.warnings[0].file == "app/tasks.py"


def test_audit_scores_rejects_out_of_range_values():
    with pytest.raises(Exception):
        AuditScores(
            codeQuality=150,  # invalid
            security=50,
            performance=50,
            architectureDesign=50,
            maintainability=50,
            completeness=50,
        )


def test_combined_audit_response_schema_accepts_static_only_shape():
    """Graceful-degradation contract per ADR-035: aiAudit may be None when LLM portion failed."""
    from app.domain.schemas.responses import AnalysisMetadata

    metadata = AnalysisMetadata(
        projectName="x",
        languagesDetected=["python"],
        filesAnalyzed=1,
        executionTimeMs=10,
        staticAvailable=True,
        aiAvailable=False,
    )
    combined = CombinedAuditResponse(
        auditId="test",
        overallScore=70,
        grade="C",
        staticAnalysis=None,
        aiAudit=None,
        metadata=metadata,
    )
    assert combined.aiAudit is None
    assert combined.metadata.aiAvailable is False

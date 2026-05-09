"""S9-T7 acceptance:
  * 3 regression test cases for /api/project-audit (Python / JS / C# samples)
    against the real OpenAI model. Self-skip when no real key is configured.
  * Token cap enforcement — over-cap input (10k tokens ≈ 40k chars per
    ADR-034) returns 413 before any LLM call.
  * Prompt versioning in repo — `PROMPT_CHANGELOG.md` exists at the
    ai-service root and documents every released prompt version.

Cost envelope for the 3 live tests on `gpt-5.1-codex-mini`:
  ~3 calls × (~3-4k input + ~2-3k output) = ~20k tokens total. Pennies per
  full run.
"""
import io
import json
import os
import zipfile
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.audit_prompts import AUDIT_PROMPT_VERSION
from app.services.project_auditor import (
    ProjectAuditor,
    reset_project_auditor,
)


_PLACEHOLDER_KEYS = {"your-openai-api-key-here", "dummy-key-placeholder", ""}


def _real_key_or_skip() -> None:
    key = os.environ.get("AI_ANALYSIS_OPENAI_API_KEY") or os.environ.get("OPENAI_API_KEY")
    if not key or key in _PLACEHOLDER_KEYS:
        pytest.skip("No real OPENAI_API_KEY configured — live audit regression test skipped.")


def _assert_valid_audit(result) -> None:
    """Shared assertions for any successful audit response (real or fake)."""
    assert result.available is True, result.error

    # All 6 score categories present + clamped.
    for category in ("codeQuality", "security", "performance",
                     "architectureDesign", "maintainability", "completeness"):
        assert category in result.scores, f"missing score: {category}"
        value = result.scores[category]
        assert isinstance(value, int) and 0 <= value <= 100, f"{category} out of range: {value}"

    # Overall + grade.
    assert isinstance(result.overall_score, int) and 0 <= result.overall_score <= 100
    assert result.grade and isinstance(result.grade, str)

    # Token usage logged (S9-T6 acceptance carried into S9-T7).
    assert result.tokens_input > 0, "no input tokens — call did not reach the model"
    assert result.tokens_output > 0, "no output tokens — model returned nothing"

    # Prompt version pinned to the audit version (NOT the per-task review version).
    assert result.prompt_version == AUDIT_PROMPT_VERSION


# ── Sample inputs (3 small projects representing the three primary languages) ──

_PYTHON_TODO_APP = {
    "code_files": [
        {
            "path": "app/main.py",
            "language": "python",
            "content": (
                "from flask import Flask, request, jsonify\n"
                "import sqlite3\n\n"
                "app = Flask(__name__)\n\n"
                "@app.route('/tasks', methods=['GET'])\n"
                "def list_tasks():\n"
                "    conn = sqlite3.connect('todo.db')\n"
                "    cursor = conn.cursor()\n"
                "    user = request.args.get('user', '')\n"
                "    # SQL injection vulnerability — for the model to flag\n"
                "    cursor.execute(f\"SELECT * FROM tasks WHERE owner='{user}'\")\n"
                "    return jsonify(cursor.fetchall())\n"
            ),
        },
    ],
    "description": json.dumps({
        "summary": "A simple Flask todo API with task CRUD.",
        "description": "Stores tasks per user in SQLite. JWT auth in scope but not yet implemented.",
        "projectType": "API",
        "techStack": ["Python", "Flask", "SQLite"],
        "features": ["List tasks per user", "Create task", "Mark complete", "JWT auth (planned)"],
        "focusAreas": ["Security", "Code Quality"],
    }),
}

_JS_REACT_APP = {
    "code_files": [
        {
            "path": "src/App.jsx",
            "language": "javascript",
            "content": (
                "import { useState, useEffect } from 'react';\n\n"
                "// Hardcoded API key — for the model to flag\n"
                "const API_KEY = 'sk-live-AbCdEf1234567890';\n\n"
                "export default function App() {\n"
                "  const [users, setUsers] = useState([]);\n"
                "  useEffect(() => {\n"
                "    fetch('/api/users?key=' + API_KEY)\n"
                "      .then(r => r.json())\n"
                "      .then(setUsers);\n"
                "  }, []);\n"
                "  return <ul>{users.map(u => <li key={u.id}>{u.name}</li>)}</ul>;\n"
                "}\n"
            ),
        },
    ],
    "description": json.dumps({
        "summary": "A small React user-list dashboard.",
        "description": "Calls a backend API to render a user list. No tests yet.",
        "projectType": "WebApp",
        "techStack": ["JavaScript", "React", "Vite"],
        "features": ["Load + render users", "Pagination (planned)"],
        "focusAreas": ["Security", "Best Practices"],
    }),
}

_CSHARP_API = {
    "code_files": [
        {
            "path": "Controllers/ItemsController.cs",
            "language": "csharp",
            "content": (
                "using Microsoft.AspNetCore.Mvc;\n\n"
                "[ApiController]\n[Route(\"api/items\")]\n"
                "public class ItemsController : ControllerBase\n"
                "{\n"
                "    private readonly ItemRepository _repo;\n"
                "    public ItemsController(ItemRepository repo) => _repo = repo;\n\n"
                "    [HttpGet(\"{id:guid}\")]\n"
                "    public IActionResult GetById(Guid id)\n"
                "    {\n"
                "        var item = _repo.Find(id);\n"
                "        return item == null ? NotFound() : Ok(item);\n"
                "    }\n"
                "}\n"
            ),
        },
    ],
    "description": json.dumps({
        "summary": "Minimal ASP.NET Core 10 items API.",
        "description": "GET /api/items/{id} backed by an in-memory repo. Solid foundation for further endpoints.",
        "projectType": "API",
        "techStack": [".NET", "ASP.NET Core", "C#"],
        "features": ["Get item by id", "List items (planned)", "CRUD (planned)"],
        "focusAreas": ["Architecture", "Code Quality"],
    }),
}


# ── Live regression: 3 sample inputs through the real OpenAI model ────────

@pytest.fixture(autouse=True)
def _reset_singleton():
    reset_project_auditor()
    yield
    reset_project_auditor()


@pytest.mark.asyncio
async def test_live_python_todo_app_audit_returns_valid_structured_output():
    _real_key_or_skip()

    auditor = ProjectAuditor()
    result = await auditor.audit_project(
        code_files=_PYTHON_TODO_APP["code_files"],
        project_description_json=_PYTHON_TODO_APP["description"],
        static_summary={"totalIssues": 1, "errors": 1, "topCategories": ["security"]},
    )
    _assert_valid_audit(result)
    # Project description mentions JWT auth as planned — completeness should
    # NOT be perfect since auth is missing.
    assert result.scores["completeness"] <= 90, (
        f"completeness should reflect missing JWT auth: {result.scores}"
    )


@pytest.mark.asyncio
async def test_live_js_react_app_audit_flags_security_issue():
    _real_key_or_skip()

    auditor = ProjectAuditor()
    result = await auditor.audit_project(
        code_files=_JS_REACT_APP["code_files"],
        project_description_json=_JS_REACT_APP["description"],
        static_summary=None,
    )
    _assert_valid_audit(result)

    # The hardcoded API key is a critical security issue — should appear
    # in critical_issues OR security score should be reduced.
    has_security_signal = (
        result.scores["security"] < 70
        or any("api key" in (issue.get("description") or "").lower()
               or "hardcoded" in (issue.get("description") or "").lower()
               or "secret" in (issue.get("title") or "").lower()
               for issue in (result.critical_issues + result.warnings))
    )
    assert has_security_signal, (
        f"hardcoded API key not flagged. scores={result.scores} "
        f"critical={result.critical_issues} warnings={result.warnings}"
    )


@pytest.mark.asyncio
async def test_live_csharp_api_audit_produces_recommendations():
    _real_key_or_skip()

    auditor = ProjectAuditor()
    result = await auditor.audit_project(
        code_files=_CSHARP_API["code_files"],
        project_description_json=_CSHARP_API["description"],
        static_summary=None,
    )
    _assert_valid_audit(result)
    # The description mentions multiple planned features — recommended improvements
    # OR missing features should be non-empty.
    assert (result.recommended_improvements or result.missing_features), (
        f"audit produced no actionable items: recs={result.recommended_improvements} missing={result.missing_features}"
    )


# ── Token cap enforcement (no API key needed — cap fires pre-LLM) ────────

def _make_zip_with_oversize_file(path_in_zip: str = "big.py") -> bytes:
    """Return a ZIP containing one file whose content easily exceeds the 40k-char cap."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        # 50KB of valid-looking Python comment lines so ZipProcessor accepts it
        # as an analyzable .py file.
        big_content = "# valid line\n" * 5000  # ~65k chars
        z.writestr(path_in_zip, big_content)
    return buf.getvalue()


def test_endpoint_returns_413_when_input_exceeds_cap():
    """Cap enforcement — no OpenAI key needed because the cap fires before any LLM call."""
    client = TestClient(app)

    zip_bytes = _make_zip_with_oversize_file()
    files = {"file": ("oversize.zip", zip_bytes, "application/zip")}
    data = {"description": json.dumps({"summary": "huge"})}

    response = client.post("/api/project-audit", files=files, data=data)
    assert response.status_code == 413, response.text
    body = response.json()
    detail = body.get("detail", "").lower()
    assert "exceed" in detail or "too large" in detail or "cap" in detail, body


def test_endpoint_returns_400_when_zip_has_no_analyzable_files():
    """Sanity: empty ZIP is rejected at the ZipProcessor stage with 400, not 413."""
    client = TestClient(app)

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("README.md", "no code here")
    zip_bytes = buf.getvalue()

    response = client.post(
        "/api/project-audit",
        files={"file": ("docs-only.zip", zip_bytes, "application/zip")},
        data={"description": "{}"},
    )
    assert response.status_code == 400, response.text


# ── Prompt-versioning convention check ────────────────────────────────────

def test_prompt_changelog_exists_and_documents_audit_v1():
    """Acceptance: 'CHANGELOG entry per prompt version bump' — verify the file
    exists at the documented location and references the current audit version."""
    repo_root = Path(__file__).parent.parent  # ai-service/
    changelog = repo_root / "PROMPT_CHANGELOG.md"
    assert changelog.exists(), f"PROMPT_CHANGELOG.md missing at {changelog}"

    text = changelog.read_text(encoding="utf-8")
    assert AUDIT_PROMPT_VERSION in text, (
        f"PROMPT_CHANGELOG.md does not document {AUDIT_PROMPT_VERSION}; "
        f"every released prompt version must have an entry."
    )
    # Sanity: the changelog should mention the per-task review prompt convention too,
    # so a new contributor sees the pattern.
    assert "PROMPT_VERSION" in text or "prompts.py" in text, (
        "PROMPT_CHANGELOG should cover both the audit and per-task review prompts."
    )

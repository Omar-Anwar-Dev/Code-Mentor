"""S6-T1 acceptance: 5 representative inputs produce valid structured AI reviews.

These tests hit the **real OpenAI API** via the in-process FastAPI app. They
self-skip when no real OPENAI_API_KEY is configured so CI without secrets
stays green. Each test asserts:

  * the response parses to AIReviewResponse (Pydantic schema),
  * all 5 PRD F6 score names are present and within [0, 100],
  * promptVersion is the current PROMPT_VERSION,
  * tokensUsed > 0 (proves we actually hit the model),
  * the textual summary is non-empty.

Cost envelope: ~5 calls × ~3k input + ~2k output tokens = ~25k tokens total
on gpt-5.1-codex-mini. Cents per full run.
"""
import os

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.prompts import PROMPT_VERSION


_PLACEHOLDER_KEYS = {
    "your-openai-api-key-here",
    "dummy-key-placeholder",
    "",
}


def _real_key_or_skip() -> None:
    key = os.environ.get("AI_ANALYSIS_OPENAI_API_KEY") or os.environ.get("OPENAI_API_KEY")
    if not key or key in _PLACEHOLDER_KEYS:
        pytest.skip("No real OPENAI_API_KEY configured — live AI test skipped.")


@pytest.fixture
def client() -> TestClient:
    _real_key_or_skip()
    return TestClient(app)


def _assert_valid_review(payload: dict) -> None:
    """Shared assertions for any successful AI review response."""
    assert payload.get("available") is True, payload.get("error")

    scores = payload.get("scores") or {}
    for category in ("correctness", "readability", "security", "performance", "design"):
        assert category in scores, f"missing score category {category}: got {scores}"
        value = scores[category]
        assert isinstance(value, int) and 0 <= value <= 100, f"{category} out of range: {value}"

    overall = payload.get("overallScore")
    assert isinstance(overall, int) and 0 <= overall <= 100

    assert payload.get("promptVersion") == PROMPT_VERSION
    assert payload.get("tokensUsed", 0) > 0, "no tokens used — call did not reach the model"
    assert isinstance(payload.get("summary", ""), str) and payload["summary"], "empty summary"


def _post_ai_review(client: TestClient, language: str, files: list[dict]) -> dict:
    body = {
        "submissionId": f"s6t1-{language}",
        "language": language,
        "codeFiles": files,
    }
    response = client.post("/api/ai-review", json=body)
    assert response.status_code == 200, response.text
    return response.json()


# ----- Test inputs ----------------------------------------------------------

_PYTHON_GOOD = """\
from dataclasses import dataclass


@dataclass(frozen=True)
class Point:
    x: float
    y: float

    def distance_to(self, other: 'Point') -> float:
        return ((self.x - other.x) ** 2 + (self.y - other.y) ** 2) ** 0.5


def midpoint(a: Point, b: Point) -> Point:
    return Point((a.x + b.x) / 2, (a.y + b.y) / 2)
"""

_PYTHON_SQL_INJECTION = """\
import sqlite3


def find_user(name: str):
    conn = sqlite3.connect('app.db')
    cursor = conn.cursor()
    cursor.execute(f"SELECT * FROM users WHERE name = '{name}'")
    return cursor.fetchall()
"""

_JS_EVAL_AND_NO_VALIDATION = """\
function calculate(input) {
    // user-controlled input passed to eval — classic XSS / RCE vector
    return eval(input);
}

function divide(a, b) {
    return a / b;  // no zero-check
}
"""

_CSHARP_NO_NULL_CHECK = """\
using System;

public class Greeter
{
    public string Greet(string name)
    {
        return "Hello, " + name.ToUpper();
    }
}
"""

_TINY_EDGE_CASE = """\
def noop():
    pass
"""


# ----- The 5 cases ----------------------------------------------------------

def test_python_clean_code_returns_high_correctness(client: TestClient) -> None:
    payload = _post_ai_review(client, "python", [
        {"path": "geometry.py", "content": _PYTHON_GOOD, "language": "python"},
    ])
    _assert_valid_review(payload)
    assert payload["scores"]["correctness"] >= 60, payload["scores"]


def test_python_sql_injection_lowers_security_score(client: TestClient) -> None:
    payload = _post_ai_review(client, "python", [
        {"path": "users.py", "content": _PYTHON_SQL_INJECTION, "language": "python"},
    ])
    _assert_valid_review(payload)
    # Security must be the dominant concern — lower than the average of the other 4.
    other_avg = (
        payload["scores"]["correctness"]
        + payload["scores"]["readability"]
        + payload["scores"]["performance"]
        + payload["scores"]["design"]
    ) / 4
    assert payload["scores"]["security"] <= other_avg, payload["scores"]


def test_javascript_eval_flags_security_and_correctness(client: TestClient) -> None:
    payload = _post_ai_review(client, "javascript", [
        {"path": "calc.js", "content": _JS_EVAL_AND_NO_VALIDATION, "language": "javascript"},
    ])
    _assert_valid_review(payload)
    # Either the security score is reduced OR there's a security weakness/issue called out.
    has_security_signal = (
        payload["scores"]["security"] < 70
        or any("security" in (w or "").lower() for w in payload.get("weaknesses", []))
        or any(
            (i.get("issueType") == "security") or ("security" in (i.get("message") or "").lower())
            for i in payload.get("detailedIssues", [])
        )
    )
    assert has_security_signal, f"no security signal in payload: {payload}"


def test_csharp_missing_null_check_produces_recommendations(client: TestClient) -> None:
    payload = _post_ai_review(client, "csharp", [
        {"path": "Greeter.cs", "content": _CSHARP_NO_NULL_CHECK, "language": "csharp"},
    ])
    _assert_valid_review(payload)
    assert payload.get("recommendations"), "expected at least one recommendation"
    for rec in payload["recommendations"]:
        assert rec.get("category") in {
            "correctness", "readability", "security", "performance", "design",
            # tolerate model occasionally using "general" as a fallback
            "general",
        }, f"unknown recommendation category: {rec}"


def test_tiny_edge_case_still_returns_valid_response(client: TestClient) -> None:
    payload = _post_ai_review(client, "python", [
        {"path": "noop.py", "content": _TINY_EDGE_CASE, "language": "python"},
    ])
    _assert_valid_review(payload)

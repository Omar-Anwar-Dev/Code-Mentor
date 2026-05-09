"""S9-T12 dogfood runner — calls /api/project-audit (via the in-process auditor)
on each of the 3 sample inputs from `tests/test_project_audit_regression.py`,
dumps the full `AuditResult` to `docs/demos/audit-dogfood-runs/{lang}.json`,
and prints a compact summary to stdout.

Reuses the test fixtures so the dogfood pass exercises the exact same inputs
as the live regression tests. Reads `AI_ANALYSIS_OPENAI_API_KEY` (or bridges
from `OPENAI_API_KEY`) the same way conftest.py does.

Usage (from ai-service/ as cwd):
    .venv/Scripts/python.exe tools/dogfood_audit.py
"""
import asyncio
import dataclasses
import json
import os
import sys
from pathlib import Path

# Make `app` importable + bridge OPENAI_API_KEY if needed (mirrors conftest.py).
_HERE = Path(__file__).parent.parent
sys.path.insert(0, str(_HERE))

try:
    from dotenv import load_dotenv
    for _p in (_HERE / ".env", _HERE.parent / ".env", _HERE / ".env.example"):
        if _p.exists():
            load_dotenv(_p, override=False)
except ImportError:
    pass

_PLACEHOLDER_KEYS = {"your-openai-api-key-here", "dummy-key-placeholder", ""}
_unp = os.environ.get("OPENAI_API_KEY", "")
_pre = os.environ.get("AI_ANALYSIS_OPENAI_API_KEY", "")
if _unp and (_pre in _PLACEHOLDER_KEYS):
    os.environ["AI_ANALYSIS_OPENAI_API_KEY"] = _unp

# Import test fixtures — single source of truth so dogfood + regression match.
from tests.test_project_audit_regression import (  # noqa: E402
    _PYTHON_TODO_APP, _JS_REACT_APP, _CSHARP_API,
)
from app.services.project_auditor import (  # noqa: E402
    AuditResult, ProjectAuditor, reset_project_auditor,
)


SAMPLES = [
    ("python", _PYTHON_TODO_APP, {"totalIssues": 1, "errors": 1, "topCategories": ["security"]}),
    ("javascript", _JS_REACT_APP, None),
    ("csharp", _CSHARP_API, None),
]


def _result_to_dict(result: AuditResult) -> dict:
    """Convert the AuditResult dataclass to a plain dict for JSON dump."""
    return dataclasses.asdict(result)


async def _run_one(label: str, sample: dict, static_summary: dict | None) -> AuditResult:
    print(f"\n=== Running audit: {label} ===", flush=True)
    reset_project_auditor()
    auditor = ProjectAuditor()
    if not auditor.is_available:
        raise SystemExit(
            "AI_ANALYSIS_OPENAI_API_KEY not set or empty — can't run live dogfood."
        )
    result = await auditor.audit_project(
        code_files=sample["code_files"],
        project_description_json=sample["description"],
        static_summary=static_summary,
    )
    return result


def _print_compact_summary(label: str, result: AuditResult) -> None:
    if not result.available:
        print(f"  ⚠ unavailable — {result.error}", flush=True)
        return
    print(
        f"  Overall {result.overall_score}/100 ({result.grade}) · "
        f"{result.tokens_input}+{result.tokens_output} tokens", flush=True,
    )
    print(f"  Scores: {result.scores}", flush=True)
    print(
        f"  Strengths: {len(result.strengths)} · "
        f"Critical: {len(result.critical_issues)} · "
        f"Warnings: {len(result.warnings)} · "
        f"Suggestions: {len(result.suggestions)}", flush=True,
    )
    print(
        f"  Missing: {len(result.missing_features)} · "
        f"Recommendations: {len(result.recommended_improvements)} · "
        f"Inline annotations: {len(result.inline_annotations)}", flush=True,
    )


async def main() -> None:
    out_dir = _HERE.parent / "docs" / "demos" / "audit-dogfood-runs"
    out_dir.mkdir(parents=True, exist_ok=True)

    for label, sample, static_summary in SAMPLES:
        result = await _run_one(label, sample, static_summary)
        _print_compact_summary(label, result)

        out_file = out_dir / f"{label}.json"
        out_file.write_text(json.dumps(_result_to_dict(result), indent=2), encoding="utf-8")
        # ASCII-only arrow so the Windows cp1252 console doesn't choke.
        print(f"  Wrote -> {out_file.relative_to(_HERE.parent)}", flush=True)


if __name__ == "__main__":
    asyncio.run(main())

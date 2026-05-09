"""S6-T13 helper: turn 5 dogfood-results/*.json files into a markdown table.

Usage:
    python summarize_dogfood.py
"""
from __future__ import annotations
import json
from pathlib import Path

HERE = Path(__file__).parent
RESULTS = HERE / "dogfood-results"

SAMPLES = [
    "sample-1-python-sql-injection",
    "sample-2-python-clean",
    "sample-3-js-eval",
    "sample-4-csharp-null-check",
    "sample-5-edge-case",
]


def load(name: str) -> dict | None:
    p = RESULTS / f"{name}.json"
    if not p.exists():
        return None
    try:
        with p.open(encoding="utf-8") as f:
            return json.load(f)
    except json.JSONDecodeError:
        return None


def fmt(payload: dict, name: str) -> str:
    if "error" in payload:
        return f"| {name} | ⚠ {payload['error']} | — | — | — | — | — | — | — | — | — | — |"

    s = payload.get("scores", {})
    md = payload.get("metadata", {})
    return (
        f"| {name} "
        f"| {payload.get('overallScore', '?')} "
        f"| {s.get('correctness', '?')} "
        f"| {s.get('readability', '?')} "
        f"| {s.get('security', '?')} "
        f"| {s.get('performance', '?')} "
        f"| {s.get('design', '?')} "
        f"| {len(payload.get('strengths', []))} "
        f"| {len(payload.get('weaknesses', []))} "
        f"| {len(payload.get('inlineAnnotations', []))} "
        f"| {len(payload.get('recommendations', []))} "
        f"| {len(payload.get('resources', []))} "
        f"| {md.get('tokensUsed', '?')} "
        f"| {md.get('promptVersion', '?')} |"
    )


def main() -> int:
    rows = []
    for name in SAMPLES:
        payload = load(name)
        if payload is None:
            rows.append(f"| {name} | (no result file) | — | — | — | — | — | — | — | — | — | — | — | — |")
        else:
            rows.append(fmt(payload, name))

    print("| Sample | Overall | Correct | Read | Sec | Perf | Design | Str | Wk | Inline | Recs | Res | Tokens | Prompt |")
    print("|---|---|---|---|---|---|---|---|---|---|---|---|---|---|")
    for r in rows:
        print(r)

    print()
    # Quick aggregate
    valid = [load(n) for n in SAMPLES]
    valid = [v for v in valid if v and "error" not in v]
    if valid:
        total_tokens = sum(v.get("metadata", {}).get("tokensUsed", 0) for v in valid)
        avg_score = sum(v.get("overallScore", 0) for v in valid) / len(valid)
        print(f"**{len(valid)}/{len(SAMPLES)} succeeded.** Average overallScore = {avg_score:.1f}. Total tokens = {total_tokens}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

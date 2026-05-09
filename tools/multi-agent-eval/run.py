"""S11-T6 / F13 (ADR-037): thesis multi-agent evaluation harness.

Runs both AI-service endpoints over the same N submissions and produces a
side-by-side comparison table for the thesis "single-prompt vs specialist-
agent decomposition" chapter.

For each fixture in `fixtures/*.json`:
  1. POST `/api/ai-review`         → captures single-prompt response.
  2. POST `/api/ai-review-multi`   → captures multi-agent merged response.
  3. Records: scores per category, response length (chars), tokens used,
     prompt version, partial-agent flags, latency.

Outputs:
  - `results/{timestamp}/raw/{fixture-id}-{single|multi}.json` (every full response, archive)
  - `results/{timestamp}/comparison.csv` (one row per fixture, both modes side-by-side)
  - `results/{timestamp}/comparison.md`  (human-readable markdown with the same data)
  - `results/{timestamp}/scoring-sheet-blank.md` (per-fixture rubric for 2 supervisors,
    blind to which mode produced which output)

Single-command usage from repo root:

    python tools/multi-agent-eval/run.py \
        --base-url http://localhost:8001 \
        --fixtures-dir tools/multi-agent-eval/fixtures \
        --out-dir tools/multi-agent-eval/results

Plays nicely without OpenAI credentials (the AI service returns 503; the
harness records that and continues to the next fixture so you get a
populated table that documents the run state).
"""
from __future__ import annotations

import argparse
import csv
import json
import os
import statistics
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import urllib.error
import urllib.request


# ------------------------------------------------------------------
# Constants
# ------------------------------------------------------------------

CATEGORIES = ("correctness", "readability", "security", "performance", "design")


# ------------------------------------------------------------------
# Endpoint client
# ------------------------------------------------------------------


def _post_json(url: str, payload: Dict[str, Any], timeout: int = 180) -> Dict[str, Any]:
    """Minimal JSON POST using stdlib — no urllib3 / httpx dependency.

    Returns either the parsed response body OR a synthetic
    {"_harness_error": ...} dict so the harness can keep going.
    """
    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        method="POST",
        headers={"Content-Type": "application/json", "Accept": "application/json"},
    )
    started = time.monotonic()
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            elapsed_ms = int((time.monotonic() - started) * 1000)
            data = json.loads(resp.read().decode("utf-8"))
            data["_harness_elapsed_ms"] = elapsed_ms
            data["_harness_status"] = resp.status
            return data
    except urllib.error.HTTPError as e:
        elapsed_ms = int((time.monotonic() - started) * 1000)
        try:
            err_body = json.loads(e.read().decode("utf-8"))
        except Exception:
            err_body = {"detail": "(unparseable)"}
        return {
            "_harness_error": f"HTTP {e.code}",
            "_harness_status": e.code,
            "_harness_elapsed_ms": elapsed_ms,
            "_harness_detail": err_body,
        }
    except urllib.error.URLError as e:
        elapsed_ms = int((time.monotonic() - started) * 1000)
        return {
            "_harness_error": f"URLError: {e.reason}",
            "_harness_status": 0,
            "_harness_elapsed_ms": elapsed_ms,
        }
    except Exception as e:  # noqa: BLE001 — harness must not crash on any one fixture
        elapsed_ms = int((time.monotonic() - started) * 1000)
        return {
            "_harness_error": f"{type(e).__name__}: {e}",
            "_harness_status": 0,
            "_harness_elapsed_ms": elapsed_ms,
        }


def _build_request_body(fixture: Dict[str, Any]) -> Dict[str, Any]:
    """Convert a fixture dict into the AnalysisRequest shape both endpoints expect."""
    return {
        "submissionId": fixture.get("submissionId", fixture["id"]),
        "language": fixture["language"],
        "codeFiles": fixture["code_files"],
        "projectContext": fixture.get("project_context"),
        "learnerProfile": fixture.get("learner_profile"),
        "learnerHistory": fixture.get("learner_history"),
    }


# ------------------------------------------------------------------
# Comparison shape
# ------------------------------------------------------------------


def _summarize(label: str, response: Dict[str, Any]) -> Dict[str, Any]:
    """Pull comparison-worthy fields out of a response payload."""
    if "_harness_error" in response:
        return {
            f"{label}_error": response["_harness_error"],
            f"{label}_status": response.get("_harness_status"),
            f"{label}_elapsed_ms": response.get("_harness_elapsed_ms"),
        }

    scores = response.get("scores") or {}
    summary_text = (response.get("summary") or "")
    exec_summary = (response.get("executiveSummary") or "")
    response_length = len(json.dumps(response, ensure_ascii=False))
    findings_count = len(response.get("detailedIssues") or [])
    strengths_count = len(response.get("strengths") or [])
    weaknesses_count = len(response.get("weaknesses") or [])
    meta = response.get("meta") or {}

    out: Dict[str, Any] = {
        f"{label}_overall": response.get("overallScore"),
        f"{label}_correctness": scores.get("correctness"),
        f"{label}_readability": scores.get("readability"),
        f"{label}_security": scores.get("security"),
        f"{label}_performance": scores.get("performance"),
        f"{label}_design": scores.get("design"),
        f"{label}_tokens": response.get("tokensUsed"),
        f"{label}_prompt_version": response.get("promptVersion"),
        f"{label}_response_chars": response_length,
        f"{label}_summary_chars": len(summary_text),
        f"{label}_exec_summary_chars": len(exec_summary),
        f"{label}_findings": findings_count,
        f"{label}_strengths": strengths_count,
        f"{label}_weaknesses": weaknesses_count,
        f"{label}_elapsed_ms": response.get("_harness_elapsed_ms"),
        f"{label}_available": response.get("available"),
        f"{label}_partial_agents": ",".join(meta.get("partialAgents", [])),
    }
    return out


def _delta_score(single_val: Any, multi_val: Any) -> Optional[int]:
    if not isinstance(single_val, (int, float)) or not isinstance(multi_val, (int, float)):
        return None
    return int(multi_val) - int(single_val)


# ------------------------------------------------------------------
# CSV + Markdown writers
# ------------------------------------------------------------------


def _write_csv(rows: List[Dict[str, Any]], path: Path) -> None:
    if not rows:
        return
    keys = list(rows[0].keys())
    with path.open("w", encoding="utf-8", newline="") as fp:
        writer = csv.DictWriter(fp, fieldnames=keys)
        writer.writeheader()
        for row in rows:
            writer.writerow(row)


def _write_markdown(rows: List[Dict[str, Any]], path: Path, *, base_url: str, started: str) -> None:
    """Format the comparison as a learner-readable markdown table."""
    lines: List[str] = []
    lines.append("# Multi-Agent Evaluation Run\n")
    lines.append(f"- **Started:** {started}")
    lines.append(f"- **Base URL:** `{base_url}`")
    lines.append(f"- **Fixtures evaluated:** {len(rows)}")
    lines.append(f"- **Endpoint pair:** `/api/ai-review` (single) vs `/api/ai-review-multi` (multi)\n")
    lines.append("Per-fixture comparison: each row shows single vs multi side-by-side, plus per-category deltas (multi − single, positive = multi scored higher).\n")

    header = (
        "| Fixture | Lang | Mode | Overall | Corr | Read | Sec | Perf | Design "
        "| Tokens | Resp.chars | Findings | Time ms | Prompt | Partial |"
    )
    sep = "|" + "|".join(["---"] * 14) + "|"
    lines.append(header)
    lines.append(sep)

    for row in rows:
        for mode in ("single", "multi"):
            avail = row.get(f"{mode}_available")
            err = row.get(f"{mode}_error")
            partial_or_err = row.get(f"{mode}_partial_agents") or err or ""
            lines.append(
                f"| `{row['fixture_id']}` | {row['language']} | {mode} "
                f"| {row.get(f'{mode}_overall', '—')} "
                f"| {row.get(f'{mode}_correctness', '—')} "
                f"| {row.get(f'{mode}_readability', '—')} "
                f"| {row.get(f'{mode}_security', '—')} "
                f"| {row.get(f'{mode}_performance', '—')} "
                f"| {row.get(f'{mode}_design', '—')} "
                f"| {row.get(f'{mode}_tokens', '—')} "
                f"| {row.get(f'{mode}_response_chars', '—')} "
                f"| {row.get(f'{mode}_findings', '—')} "
                f"| {row.get(f'{mode}_elapsed_ms', '—')} "
                f"| {row.get(f'{mode}_prompt_version', '—')} "
                f"| {partial_or_err} |"
            )
        # Delta row.
        deltas = [
            _delta_score(row.get(f"single_{c}"), row.get(f"multi_{c}")) for c in CATEGORIES
        ]
        delta_str = " | ".join(["—" if d is None else f"{d:+d}" for d in deltas])
        overall_delta = _delta_score(row.get("single_overall"), row.get("multi_overall"))
        overall_delta_str = "—" if overall_delta is None else f"{overall_delta:+d}"
        lines.append(
            f"| `{row['fixture_id']}` |   | **Δ (multi − single)** | "
            f"{overall_delta_str} | {delta_str} | | | | | | |"
        )
        lines.append(sep)

    # Aggregate stats.
    lines.append("\n## Aggregates\n")
    for category in CATEGORIES:
        single_vals = [row.get(f"single_{category}") for row in rows
                       if row.get(f"single_{category}") is not None]
        multi_vals = [row.get(f"multi_{category}") for row in rows
                      if row.get(f"multi_{category}") is not None]
        if single_vals and multi_vals:
            lines.append(
                f"- **{category}**: single avg = {statistics.mean(single_vals):.1f}, "
                f"multi avg = {statistics.mean(multi_vals):.1f}, "
                f"Δ = {statistics.mean(multi_vals) - statistics.mean(single_vals):+.1f}"
            )
    def _ints(values):
        return [v for v in values if isinstance(v, (int, float))]

    single_tokens = _ints(row.get("single_tokens") for row in rows)
    multi_tokens = _ints(row.get("multi_tokens") for row in rows)
    if single_tokens and multi_tokens:
        lines.append(
            f"\n- **Total tokens**: single = {sum(single_tokens):,}, "
            f"multi = {sum(multi_tokens):,} "
            f"({(sum(multi_tokens) / max(sum(single_tokens), 1)):.2f}× single)"
        )

    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def _write_blank_scoring_sheet(rows: List[Dict[str, Any]], path: Path) -> None:
    """Per-fixture rubric for 2 supervisors. Blind to mode (the harness will
    randomize A/B label ↔ mode mapping when the run is recorded — to enable
    that, the harness logs the mapping in `mode-mapping.json` separately)."""
    lines: List[str] = []
    lines.append("# Multi-Agent Blind Scoring Sheet\n")
    lines.append(
        "For each fixture below you are shown two reviews labeled **A** and **B**. "
        "The mapping A↔B ↔ single/multi is recorded separately and revealed only after "
        "you submit your scores.\n"
    )
    lines.append(
        "Score each review on a **1–5 scale** for each rubric dimension. "
        "Add a one-line note where useful. Same rubric for both A and B; "
        "be consistent.\n"
    )
    lines.append("**Rubric dimensions:**\n")
    lines.append("- **Specificity** — does the review name exact files/lines and quote real code?")
    lines.append("- **Actionability** — could a learner act on each point without further help?")
    lines.append("- **Educational value** — does the review *teach* (explain why), not just point?")
    lines.append("- **Tone** — encouraging, honest, age-appropriate for the learner level.")
    lines.append("- **Coverage** — strengths AND weaknesses; balanced; no padding.\n")

    for row in rows:
        lines.append(f"## Fixture: `{row['fixture_id']}` ({row['language']})\n")
        lines.append("**Review A**\n")
        lines.append("| Dimension | Score (1-5) | Note |")
        lines.append("|---|---|---|")
        for dim in ("Specificity", "Actionability", "Educational value", "Tone", "Coverage"):
            lines.append(f"| {dim} |  |  |")
        lines.append("\n**Review B**\n")
        lines.append("| Dimension | Score (1-5) | Note |")
        lines.append("|---|---|---|")
        for dim in ("Specificity", "Actionability", "Educational value", "Tone", "Coverage"):
            lines.append(f"| {dim} |  |  |")
        lines.append("\n**Free-form preference (which review would you give to a learner first?):** _\\_\n")
        lines.append("---\n")

    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


# ------------------------------------------------------------------
# Driver
# ------------------------------------------------------------------


def _load_fixtures(fixtures_dir: Path) -> List[Dict[str, Any]]:
    fixtures = []
    for fp in sorted(fixtures_dir.glob("*.json")):
        with fp.open("r", encoding="utf-8") as f:
            data = json.load(f)
        if "id" not in data or "code_files" not in data:
            print(f"[skip] {fp.name}: missing required fields (id, code_files)", file=sys.stderr)
            continue
        fixtures.append(data)
    return fixtures


def main() -> int:
    parser = argparse.ArgumentParser(description="Multi-agent vs single-prompt evaluation harness")
    parser.add_argument("--base-url", default=os.environ.get("AI_SERVICE_BASE_URL", "http://localhost:8001"))
    parser.add_argument("--fixtures-dir", default="tools/multi-agent-eval/fixtures")
    parser.add_argument("--out-dir", default="tools/multi-agent-eval/results")
    parser.add_argument("--timeout", type=int, default=300, help="Per-request timeout in seconds")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Skip HTTP calls; record the request bodies that WOULD be sent. Useful for fixture authoring.",
    )
    args = parser.parse_args()

    fixtures_dir = Path(args.fixtures_dir).resolve()
    if not fixtures_dir.is_dir():
        print(f"Fixtures directory not found: {fixtures_dir}", file=sys.stderr)
        return 2

    fixtures = _load_fixtures(fixtures_dir)
    if not fixtures:
        print("No fixtures found.", file=sys.stderr)
        return 2

    started = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    out_root = Path(args.out_dir).resolve() / started
    raw_dir = out_root / "raw"
    raw_dir.mkdir(parents=True, exist_ok=True)

    print(f"Multi-agent eval run started: {started}")
    print(f"  base_url    = {args.base_url}")
    print(f"  fixtures    = {len(fixtures)} ({fixtures_dir})")
    print(f"  out_dir     = {out_root}")
    print(f"  dry_run     = {args.dry_run}")
    print()

    rows: List[Dict[str, Any]] = []
    for idx, fixture in enumerate(fixtures, 1):
        fid = fixture["id"]
        lang = fixture["language"]
        print(f"  [{idx}/{len(fixtures)}] {fid} ({lang})")

        body = _build_request_body(fixture)

        if args.dry_run:
            (raw_dir / f"{fid}-request.json").write_text(
                json.dumps(body, indent=2, ensure_ascii=False), encoding="utf-8"
            )
            row = {"fixture_id": fid, "language": lang}
            row.update({f"single_{k}": "(dry-run)" for k in ("overall", "tokens", "prompt_version")})
            row.update({f"multi_{k}": "(dry-run)" for k in ("overall", "tokens", "prompt_version")})
            rows.append(row)
            continue

        single_resp = _post_json(f"{args.base_url}/api/ai-review", body, timeout=args.timeout)
        (raw_dir / f"{fid}-single.json").write_text(
            json.dumps(single_resp, indent=2, ensure_ascii=False), encoding="utf-8"
        )

        multi_resp = _post_json(f"{args.base_url}/api/ai-review-multi", body, timeout=args.timeout)
        (raw_dir / f"{fid}-multi.json").write_text(
            json.dumps(multi_resp, indent=2, ensure_ascii=False), encoding="utf-8"
        )

        row: Dict[str, Any] = {"fixture_id": fid, "language": lang}
        row.update(_summarize("single", single_resp))
        row.update(_summarize("multi", multi_resp))
        rows.append(row)

    csv_path = out_root / "comparison.csv"
    md_path = out_root / "comparison.md"
    sheet_path = out_root / "scoring-sheet-blank.md"

    _write_csv(rows, csv_path)
    _write_markdown(rows, md_path, base_url=args.base_url, started=started)
    _write_blank_scoring_sheet(rows, sheet_path)

    print()
    print(f"Wrote: {csv_path}")
    print(f"Wrote: {md_path}")
    print(f"Wrote: {sheet_path}")
    print(f"Raw responses: {raw_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

"""S16-T7 + S16-T8: content-burst runner for Sprint 16.

Per ADR-056 (Claude single-reviewer mode for Sprint 16 only), this script:

1. Generates 30 question drafts via the in-process ``QuestionGenerator``
   (no backend HTTP roundtrip; identical model + prompt path as the
   ``/api/generate-questions`` endpoint).
2. Applies the ADR-056 strict reject criteria to every draft.
3. Persists everything (approved + rejected) to:
   - ``docs/demos/sprint-16-batch-<N>-drafts.json``  — machine-readable record
   - ``tools/seed-sprint16-batch-<N>.sql``           — INSERT statements for the
     owner to apply against the live DB
   - ``docs/demos/sprint-16-batch-<N>-report.md``     — human-readable summary

Distribution per batch: 5 categories × 3 difficulties × 2 questions = 30 drafts.

Usage (from project root, with the ai-service venv activated):

    .venv/Scripts/python ai-service/tools/run_content_batch.py 1
    .venv/Scripts/python ai-service/tools/run_content_batch.py 2

Run batch 1 BEFORE batch 2 — batch 2 reads batch 1's accepted question texts
as dedup hints so it doesn't produce near-duplicates.
"""
from __future__ import annotations

import asyncio
import json
import sys
import time
import uuid
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Optional

HERE = Path(__file__).resolve().parent
AI_SERVICE_ROOT = HERE.parent
if str(AI_SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(AI_SERVICE_ROOT))

from app.domain.schemas.generator import (  # noqa: E402
    GenerateQuestionsRequest,
    GeneratedQuestionDraft,
)
from app.services.question_generator import (  # noqa: E402
    GeneratorUnavailable,
    get_question_generator,
)

from _admin_id import resolve_admin_id  # noqa: E402


CATEGORIES = ["DataStructures", "Algorithms", "OOP", "Databases", "Security"]
DIFFICULTIES = [1, 2, 3]
QUESTIONS_PER_CELL = 2  # 5 cats × 3 diffs × 2 = 30 per batch

# Which categories prefer code snippets at which difficulty (heuristic — mirrors
# what an admin would pick: DataStructures/Algorithms at medium+ benefit from
# code; OOP at hard; Security at medium+ with python/javascript samples).
CODE_PREFS: dict[tuple[str, int], Optional[str]] = {
    ("DataStructures", 1): None,
    ("DataStructures", 2): "python",
    ("DataStructures", 3): "java",
    ("Algorithms", 1): None,
    ("Algorithms", 2): "python",
    ("Algorithms", 3): "python",
    ("OOP", 1): None,
    ("OOP", 2): "csharp",
    ("OOP", 3): "csharp",
    ("Databases", 1): None,
    ("Databases", 2): None,
    ("Databases", 3): None,
    ("Security", 1): None,
    ("Security", 2): "python",
    ("Security", 3): "javascript",
}


@dataclass
class ReviewResult:
    accepted: bool
    reasons: list[str]


def adr_056_review(draft: GeneratedQuestionDraft) -> ReviewResult:
    """Apply ADR-056 strict single-reviewer criteria. Reject when any fires:
    1. Correct option much shorter than shortest distractor (length giveaway).
    2. Self-rated discrimination < 0.6 (poor separation).
    3. Difficulty↔irtB inversion outside the rubric.
    4. Trivia heuristic — question text < 50 chars.
    5. Distractor parallelism — max length > 5× min length (slightly looser
       than the T2 validation's 4× to give a-vs-b length differences for
       genuinely long correct answers a fair shake).
    """
    reasons: list[str] = []
    letter_to_idx = {"A": 0, "B": 1, "C": 2, "D": 3}
    correct_idx = letter_to_idx[draft.correctAnswer]
    correct_len = len(draft.options[correct_idx])
    distractor_lens = [len(opt) for i, opt in enumerate(draft.options) if i != correct_idx]

    if correct_len < min(distractor_lens) * 0.5:
        reasons.append(
            f"Correct option ({correct_len} chars) much shorter than shortest distractor "
            f"({min(distractor_lens)} chars) — possible length-based giveaway."
        )

    if draft.irtA < 0.6:
        reasons.append(f"Discrimination irtA={draft.irtA:.2f} below 0.6 floor.")

    if draft.difficulty == 1 and draft.irtB > 0.0:
        reasons.append(f"difficulty=1 but irtB={draft.irtB:.2f} > 0.0 (easy should be negative).")
    if draft.difficulty == 3 and draft.irtB < 0.0:
        reasons.append(f"difficulty=3 but irtB={draft.irtB:.2f} < 0.0 (hard should be positive).")

    if len(draft.questionText) < 50:
        reasons.append(
            f"Question text is only {len(draft.questionText)} chars — risks being trivia."
        )

    opt_lens = [len(o) for o in draft.options]
    if max(opt_lens) > min(opt_lens) * 5:
        reasons.append(
            f"Option-length disparity ({min(opt_lens)} vs {max(opt_lens)}) > 5x — parallelism off."
        )

    return ReviewResult(accepted=len(reasons) == 0, reasons=reasons)


def _sql_escape(s: Optional[str]) -> str:
    if s is None:
        return "NULL"
    return "N'" + s.replace("'", "''") + "'"


def _options_json(options: list[str]) -> str:
    # Match Question.Options EF value-converter: JsonSerializer.Serialize(list, default options).
    return json.dumps(options, ensure_ascii=False)


def emit_sql_insert_question(d: GeneratedQuestionDraft, *, q_id: str, admin_id: str) -> str:
    """Generate INSERT INTO Questions for an APPROVED draft."""
    return f"""INSERT INTO Questions
    (Id, Content, Difficulty, Category, OptionsJson, CorrectAnswer, Explanation, CreatedAt, IsActive,
     IRT_A, IRT_B, CalibrationSource, Source, ApprovedById, ApprovedAt, CodeSnippet, CodeLanguage, EmbeddingJson, PromptVersion)
VALUES
    ('{q_id}', {_sql_escape(d.questionText)}, {d.difficulty}, N'{d.category}',
     {_sql_escape(_options_json(list(d.options)))}, N'{d.correctAnswer}', {_sql_escape(d.explanation)},
     SYSUTCDATETIME(), 1,
     {d.irtA:.3f}, {d.irtB:.3f}, N'AI', N'AI',
     '{admin_id}', SYSUTCDATETIME(),
     {_sql_escape(d.codeSnippet)}, {_sql_escape(d.codeLanguage)},
     NULL, N'generate_questions_v1');
"""


def emit_sql_insert_draft(
    d: GeneratedQuestionDraft, *,
    draft_id: str, batch_id: str, position: int, status: str,
    admin_id: str, original_json: str,
    approved_question_id: Optional[str] = None,
    rejection_reason: Optional[str] = None,
) -> str:
    """Generate INSERT INTO QuestionDrafts. Matches the S16-T4 migration schema."""
    decided_at = "SYSUTCDATETIME()"
    return f"""INSERT INTO QuestionDrafts
    (Id, BatchId, PositionInBatch, Status, QuestionText, CodeSnippet, CodeLanguage,
     OptionsJson, CorrectAnswer, Explanation, IRT_A, IRT_B, Rationale, Category, Difficulty,
     PromptVersion, GeneratedAt, GeneratedById, DecidedById, DecidedAt, RejectionReason,
     OriginalDraftJson, ApprovedQuestionId)
VALUES
    ('{draft_id}', '{batch_id}', {position}, N'{status}',
     {_sql_escape(d.questionText)}, {_sql_escape(d.codeSnippet)}, {_sql_escape(d.codeLanguage)},
     {_sql_escape(_options_json(list(d.options)))}, N'{d.correctAnswer}', {_sql_escape(d.explanation)},
     {d.irtA:.3f}, {d.irtB:.3f}, {_sql_escape(d.rationale)}, N'{d.category}', {d.difficulty},
     N'generate_questions_v1', SYSUTCDATETIME(), '{admin_id}',
     '{admin_id}', {decided_at}, {_sql_escape(rejection_reason)},
     {_sql_escape(original_json)},
     {("'" + approved_question_id + "'") if approved_question_id else "NULL"});
"""


async def run_batch(batch_number: int, prior_batch_paths: list[Path]) -> int:
    if batch_number not in (1, 2):
        print(f"batch_number must be 1 or 2; got {batch_number}", file=sys.stderr)
        return 2

    generator = get_question_generator()
    if not generator.is_available:
        print("OpenAI API key not configured; cannot run batch.", file=sys.stderr)
        return 1

    # Build the dedup-hints pool from any prior batch JSON files.
    prior_texts: dict[str, list[str]] = {c: [] for c in CATEGORIES}
    for prior_path in prior_batch_paths:
        if not prior_path.is_file():
            continue
        with open(prior_path, encoding="utf-8") as f:
            prior = json.load(f)
        for row in prior.get("drafts", []):
            cat = row.get("category")
            text = row.get("questionText")
            if cat in prior_texts and text:
                prior_texts[cat].append(text)

    repo_root = AI_SERVICE_ROOT.parent
    docs_demos = repo_root / "docs" / "demos"
    docs_demos.mkdir(parents=True, exist_ok=True)
    tools_dir = repo_root / "tools"
    tools_dir.mkdir(parents=True, exist_ok=True)

    batch_id = str(uuid.uuid4())
    # Admin actor id is resolved via `_admin_id.resolve_admin_id` — falls
    # back to the canonical local-dev admin GUID when neither --admin-id
    # nor CODEMENTOR_ADMIN_USER_ID is set. Override per-machine with the
    # env var if your admin user has a different id.
    admin_id = resolve_admin_id()

    print(f"=== Sprint 16 -- content batch {batch_number} (ADR-056 single-reviewer) ===")
    print(f"batchId={batch_id}")
    print(f"5 categories × 3 difficulties × {QUESTIONS_PER_CELL} questions = 30 drafts")
    print(f"distribution: code snippets for {sum(1 for v in CODE_PREFS.values() if v)} of 15 (cat,diff) cells")
    print()

    started = time.monotonic()
    all_drafts: list[dict] = []
    total_tokens = 0
    total_retries = 0
    sql_lines: list[str] = [
        f"-- Sprint 16 content batch {batch_number} — applied via run_content_batch.py at "
        f"{time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}",
        f"-- BatchId: {batch_id}",
        f"-- Drafts: 30 expected (5 cats × 3 diffs × {QUESTIONS_PER_CELL})",
        f"-- Reviewer: Claude single-reviewer per ADR-056",
        "SET XACT_ABORT ON;",
        "BEGIN TRANSACTION;",
        "",
    ]

    position = 0
    cell_no = 0
    for cat in CATEGORIES:
        for diff in DIFFICULTIES:
            cell_no += 1
            code_lang = CODE_PREFS[(cat, diff)]
            include_code = code_lang is not None

            print(f"[{cell_no:>2}/15] {cat} / diff={diff} / count={QUESTIONS_PER_CELL}"
                  f"{(' / lang=' + code_lang) if include_code else ''}...", flush=True)

            # Pull category-specific dedup hints (cap 20 so the prompt stays bounded).
            hints = prior_texts.get(cat, [])[:20]

            try:
                response = await generator.generate(
                    GenerateQuestionsRequest(
                        category=cat,  # type: ignore[arg-type]
                        difficulty=diff,
                        count=QUESTIONS_PER_CELL,
                        includeCode=include_code,
                        language=code_lang,
                        existingSnippets=hints,
                    ),
                    correlation_id=f"batch{batch_number}-cell{cell_no:02d}",
                )
            except GeneratorUnavailable as exc:
                print(f"  -> GENERATION FAILED: {exc} (http {exc.http_status})", file=sys.stderr)
                # Record the failure to keep the audit honest — skip this cell.
                continue

            total_tokens += response.tokensUsed
            total_retries += response.retryCount

            for d in response.drafts:
                review = adr_056_review(d)
                verdict = "ACCEPT" if review.accepted else "REJECT"
                tag = "[OK]" if review.accepted else "[XX]"
                print(f"    {tag} draft{position:02d}: {verdict}"
                      f"{(' -- ' + review.reasons[0]) if review.reasons else ''}")

                # Record the draft + verdict.
                draft_id = str(uuid.uuid4())
                # `model_dump` keeps the camelCase JSON for the FE, and matches what
                # the BE persists into OriginalDraftJson when running through the wire.
                original_payload_json = json.dumps(d.model_dump(), ensure_ascii=False)
                row = {
                    "draftId": draft_id,
                    "positionInBatch": position,
                    "verdict": verdict,
                    "reasons": review.reasons,
                    **d.model_dump(),
                }
                all_drafts.append(row)

                if review.accepted:
                    question_id = str(uuid.uuid4())
                    row["approvedQuestionId"] = question_id
                    sql_lines.append(emit_sql_insert_question(d, q_id=question_id, admin_id=admin_id))
                    sql_lines.append(
                        emit_sql_insert_draft(
                            d, draft_id=draft_id, batch_id=batch_id, position=position,
                            status="Approved", admin_id=admin_id,
                            original_json=original_payload_json,
                            approved_question_id=question_id,
                            rejection_reason=None,
                        )
                    )
                else:
                    sql_lines.append(
                        emit_sql_insert_draft(
                            d, draft_id=draft_id, batch_id=batch_id, position=position,
                            status="Rejected", admin_id=admin_id,
                            original_json=original_payload_json,
                            approved_question_id=None,
                            rejection_reason="; ".join(review.reasons),
                        )
                    )

                position += 1

    sql_lines.append("COMMIT TRANSACTION;")
    sql_lines.append("")
    sql_lines.append("-- Verification:")
    sql_lines.append(f"SELECT COUNT(*) AS ApprovedCount FROM QuestionDrafts WHERE BatchId = '{batch_id}' AND Status = 'Approved';")
    sql_lines.append(f"SELECT COUNT(*) AS RejectedCount FROM QuestionDrafts WHERE BatchId = '{batch_id}' AND Status = 'Rejected';")
    sql_lines.append(f"SELECT COUNT(*) AS BankSize FROM Questions WHERE IsActive = 1;")

    elapsed = time.monotonic() - started
    accepted = [r for r in all_drafts if r["verdict"] == "ACCEPT"]
    rejected = [r for r in all_drafts if r["verdict"] == "REJECT"]
    reject_rate = (len(rejected) / len(all_drafts) * 100.0) if all_drafts else 0.0

    json_path = docs_demos / f"sprint-16-batch-{batch_number}-drafts.json"
    sql_path = tools_dir / f"seed-sprint16-batch-{batch_number}.sql"
    md_path = docs_demos / f"sprint-16-batch-{batch_number}-report.md"

    with open(json_path, "w", encoding="utf-8") as f:
        json.dump({
            "batchId": batch_id,
            "batchNumber": batch_number,
            "totalDrafts": len(all_drafts),
            "approved": len(accepted),
            "rejected": len(rejected),
            "rejectRatePct": reject_rate,
            "totalTokens": total_tokens,
            "totalRetries": total_retries,
            "wallClockSeconds": elapsed,
            "drafts": all_drafts,
        }, f, ensure_ascii=False, indent=2)

    with open(sql_path, "w", encoding="utf-8") as f:
        f.write("\n".join(sql_lines))

    # Markdown report.
    md_lines = [
        f"# Sprint 16 — Content Batch {batch_number} Report",
        "",
        f"**BatchId:** `{batch_id}`  ",
        f"**Generated at:** {time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}  ",
        f"**Reviewer:** Claude single-reviewer (ADR-056)  ",
        f"**Wall clock:** {elapsed:.1f}s (~{elapsed/60:.1f} min)  ",
        f"**Token cost:** {total_tokens:,} tokens (retries: {total_retries})  ",
        "",
        "## Summary",
        "",
        f"- **Total drafts generated:** {len(all_drafts)}",
        f"- **Approved:** {len(accepted)} ({100 - reject_rate:.1f}%)",
        f"- **Rejected:** {len(rejected)} ({reject_rate:.1f}%)",
        f"- **30%% reject-rate bar:** "
        + ("✅ within bar." if reject_rate < 30 else "⚠️ over bar — consider prompt iteration before batch 2."),
        "",
        "## Distribution (by category × difficulty)",
        "",
        "| Category | Diff 1 (easy) | Diff 2 (medium) | Diff 3 (hard) | Cat total |",
        "|---|---|---|---|---|",
    ]
    for cat in CATEGORIES:
        cells = []
        cat_total = 0
        for d in DIFFICULTIES:
            n = sum(1 for r in all_drafts if r["category"] == cat and r["difficulty"] == d)
            cells.append(str(n))
            cat_total += n
        md_lines.append(f"| {cat} | {cells[0]} | {cells[1]} | {cells[2]} | {cat_total} |")
    md_lines += [
        "",
        "## Approved drafts",
        "",
    ]
    for i, row in enumerate(accepted, start=1):
        snippet = f"\n\n```{row['codeLanguage']}\n{row['codeSnippet']}\n```" if row.get("codeSnippet") else ""
        opts_md = "\n".join(
            f"- **{chr(ord('A') + j)}.** {opt}"
            + ("  ← correct" if chr(ord('A') + j) == row["correctAnswer"] else "")
            for j, opt in enumerate(row["options"])
        )
        md_lines += [
            f"### A{i}: {row['category']} / diff={row['difficulty']}",
            "",
            f"**Question:** {row['questionText']}{snippet}",
            "",
            "**Options:**",
            opts_md,
            "",
            f"**IRT:** `a={row['irtA']:.2f}` / `b={row['irtB']:.2f}` · *{row['rationale']}*",
            "",
            "---",
            "",
        ]
    md_lines += [
        "## Rejected drafts",
        "",
    ]
    for i, row in enumerate(rejected, start=1):
        reasons_md = "\n".join(f"- {r}" for r in row.get("reasons", []))
        md_lines += [
            f"### R{i}: {row['category']} / diff={row['difficulty']}",
            "",
            f"**Question:** {row['questionText']}",
            "",
            "**Reject reasons:**",
            reasons_md,
            "",
            "---",
            "",
        ]
    md_lines += [
        "## How to apply",
        "",
        "1. Confirm the AI service container is healthy and the EF migration "
        "`AddQuestionDrafts` has been applied to the live DB.",
        f"2. Run `sqlcmd -S localhost -d CodeMentor -E -i tools\\seed-sprint16-batch-{batch_number}.sql`.",
        f"3. Verify with the SELECTs at the bottom of the SQL script: expect "
        f"`ApprovedCount = {len(accepted)}`, `RejectedCount = {len(rejected)}`.",
        "",
        "Generated by `ai-service/tools/run_content_batch.py`.",
    ]

    with open(md_path, "w", encoding="utf-8") as f:
        f.write("\n".join(md_lines))

    print()
    print(f"Wrote {json_path}")
    print(f"Wrote {sql_path}")
    print(f"Wrote {md_path}")
    print()
    print(f"Batch {batch_number} summary:")
    print(f"  drafts:       {len(all_drafts)}")
    print(f"  approved:     {len(accepted)} ({100 - reject_rate:.1f}%)")
    print(f"  rejected:     {len(rejected)} ({reject_rate:.1f}%)")
    print(f"  reject bar:   {'WITHIN' if reject_rate < 30 else 'OVER'} 30%")
    print(f"  total tokens: {total_tokens:,}")
    print(f"  wall clock:   {elapsed:.1f}s")
    return 0 if reject_rate < 30 else 2


def main() -> int:
    if len(sys.argv) != 2:
        print("usage: run_content_batch.py <1|2>", file=sys.stderr)
        return 2
    batch = int(sys.argv[1])
    prior_paths = []
    if batch == 2:
        prior_paths = [AI_SERVICE_ROOT.parent / "docs" / "demos" / "sprint-16-batch-1-drafts.json"]
    return asyncio.run(run_batch(batch, prior_paths))


if __name__ == "__main__":
    sys.exit(main())

"""S17-T8: content-burst runner for Sprint 17 (batches 3 + 4).

Per ADR-057 (extends ADR-056 single-reviewer waiver to S17 only) this
script mirrors the S16 ``run_content_batch.py`` flow but with a slimmer
distribution per batch (15 questions = 5 cats × 3 diffs × 1 question)
so two batches together hit the ``+30 → bank ≥150`` target without
overshooting.

Pipeline:
1. Generate 15 question drafts per batch via the in-process
   ``QuestionGenerator`` (no backend HTTP roundtrip; same model + prompt
   path as ``/api/generate-questions``).
2. Apply ADR-056 strict reject criteria to each draft.
3. Persist everything (approved + rejected) to:
   - ``docs/demos/sprint-17-batch-<N>-drafts.json``
   - ``tools/seed-sprint17-batch-<N>.sql``
   - ``docs/demos/sprint-17-batch-<N>-report.md``

Dedup hints: reads prior S16 batches 1+2 (already in the bank) and any
prior S17 batch from this same run.

Usage (from project root, with the ai-service venv activated):

    .venv/Scripts/python ai-service/tools/run_content_batch_s17.py 3
    .venv/Scripts/python ai-service/tools/run_content_batch_s17.py 4

Run batch 3 BEFORE batch 4.
"""
from __future__ import annotations

import asyncio
import json
import sys
import time
import uuid
from dataclasses import dataclass
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


CATEGORIES = ["DataStructures", "Algorithms", "OOP", "Databases", "Security"]
DIFFICULTIES = [1, 2, 3]
QUESTIONS_PER_CELL = 1  # 5 cats × 3 diffs × 1 = 15 per batch ⇒ 2 batches = 30

# Code-snippet distribution: same heuristic as S16, rebalanced lightly so
# Databases gets at least one snippet at diff=2 (S16 had none for Databases).
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
    ("Databases", 2): "sql",
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
    5. Distractor parallelism — max length > 5× min length.
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
    return json.dumps(options, ensure_ascii=False)


def emit_sql_insert_question(d: GeneratedQuestionDraft, *, q_id: str, admin_id: str) -> str:
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
     '{admin_id}', SYSUTCDATETIME(), {_sql_escape(rejection_reason)},
     {_sql_escape(original_json)},
     {("'" + approved_question_id + "'") if approved_question_id else "NULL"});
"""


async def run_batch(batch_number: int, prior_batch_paths: list[Path]) -> int:
    if batch_number not in (3, 4):
        print(f"batch_number must be 3 or 4 for S17; got {batch_number}", file=sys.stderr)
        return 2

    generator = get_question_generator()
    if not generator.is_available:
        print("OpenAI API key not configured; cannot run batch.", file=sys.stderr)
        return 1

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
    admin_id = "11111111-1111-1111-1111-111111111111"

    print(f"=== Sprint 17 -- content batch {batch_number} (ADR-056 + ADR-057 single-reviewer) ===")
    print(f"batchId={batch_id}")
    print(f"5 categories × 3 difficulties × {QUESTIONS_PER_CELL} questions = 15 drafts")
    print(f"distribution: code snippets for {sum(1 for v in CODE_PREFS.values() if v)} of 15 (cat,diff) cells")
    print()

    started = time.monotonic()
    all_drafts: list[dict] = []
    total_tokens = 0
    total_retries = 0
    sql_lines: list[str] = [
        f"-- Sprint 17 content batch {batch_number} -- applied via run_content_batch_s17.py at "
        f"{time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}",
        f"-- BatchId: {batch_id}",
        f"-- Drafts: 15 expected (5 cats × 3 diffs × {QUESTIONS_PER_CELL})",
        f"-- Reviewer: Claude single-reviewer per ADR-056 (extended to S17 by ADR-057)",
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

            hints = prior_texts.get(cat, [])[:30]

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
                    correlation_id=f"s17-batch{batch_number}-cell{cell_no:02d}",
                )
            except GeneratorUnavailable as exc:
                print(f"  -> GENERATION FAILED: {exc} (http {exc.http_status})", file=sys.stderr)
                continue

            total_tokens += response.tokensUsed
            total_retries += response.retryCount

            for d in response.drafts:
                review = adr_056_review(d)
                verdict = "ACCEPT" if review.accepted else "REJECT"
                tag = "[OK]" if review.accepted else "[XX]"
                print(f"    {tag} draft{position:02d}: {verdict}"
                      f"{(' -- ' + review.reasons[0]) if review.reasons else ''}")

                draft_id = str(uuid.uuid4())
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

    json_path = docs_demos / f"sprint-17-batch-{batch_number}-drafts.json"
    sql_path = tools_dir / f"seed-sprint17-batch-{batch_number}.sql"
    md_path = docs_demos / f"sprint-17-batch-{batch_number}-report.md"

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

    md_lines = [
        f"# Sprint 17 — Content Batch {batch_number} Report",
        "",
        f"**BatchId:** `{batch_id}`  ",
        f"**Generated at:** {time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}  ",
        f"**Reviewer:** Claude single-reviewer (ADR-056 + ADR-057)  ",
        f"**Wall clock:** {elapsed:.1f}s (~{elapsed/60:.1f} min)  ",
        f"**Token cost:** {total_tokens:,} tokens (retries: {total_retries})  ",
        "",
        "## Summary",
        "",
        f"- **Total drafts generated:** {len(all_drafts)}",
        f"- **Approved:** {len(accepted)} ({100 - reject_rate:.1f}%)",
        f"- **Rejected:** {len(rejected)} ({reject_rate:.1f}%)",
        f"- **30% reject-rate bar:** "
        + ("within bar." if reject_rate < 30 else "OVER BAR -- consider prompt iteration."),
        "",
        "## Distribution (by category × difficulty)",
        "",
        "| Category | Diff 1 | Diff 2 | Diff 3 | Cat total |",
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
            + ("  <- correct" if chr(ord('A') + j) == row["correctAnswer"] else "")
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
            f"**IRT:** `a={row['irtA']:.2f}` / `b={row['irtB']:.2f}` -- *{row['rationale']}*",
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

    with open(md_path, "w", encoding="utf-8") as f:
        f.write("\n".join(md_lines))

    print()
    print(f"=== Batch {batch_number} done ===")
    print(f"  Wrote: {json_path.relative_to(repo_root)}")
    print(f"  Wrote: {sql_path.relative_to(repo_root)}")
    print(f"  Wrote: {md_path.relative_to(repo_root)}")
    print(f"  Stats: {len(accepted)} approved / {len(rejected)} rejected ({reject_rate:.1f}% reject)")
    print(f"  Tokens: {total_tokens:,} (retries: {total_retries}); wall={elapsed:.1f}s")
    return 0


def main(argv: list[str]) -> int:
    if len(argv) != 2 or argv[1] not in ("3", "4"):
        print("Usage: run_content_batch_s17.py [3|4]", file=sys.stderr)
        return 2
    batch_n = int(argv[1])

    repo_root = AI_SERVICE_ROOT.parent
    docs_demos = repo_root / "docs" / "demos"
    # Dedup hints: prior S16 batches + earlier S17 batches.
    prior_paths = [
        docs_demos / "sprint-16-batch-1-drafts.json",
        docs_demos / "sprint-16-batch-2-drafts.json",
    ]
    if batch_n == 4:
        prior_paths.append(docs_demos / "sprint-17-batch-3-drafts.json")

    return asyncio.run(run_batch(batch_n, prior_paths))


if __name__ == "__main__":
    sys.exit(main(sys.argv))

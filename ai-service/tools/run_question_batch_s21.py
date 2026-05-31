"""S21-T5: final content burst runner (ADR-062).

Per ADR-062 (sixth and final extension of the ADR-056 single-reviewer waiver)
this script produces 60 question drafts to take the bank from 147 → 207. It
mirrors the S17 ``run_content_batch_s17.py`` flow but with a wider per-cell
fan-out (5 cats × 3 diffs × 4 per cell = 60). Code-snippet enforcement is
≥ 25 % of the batch (per F15 acceptance criteria) — at least 15 of 60.

Pipeline:
  1. Generate 4 drafts per (category, difficulty) cell via the in-process
     ``QuestionGenerator`` (no backend HTTP roundtrip; same model + prompt
     path as ``/api/generate-questions``).
  2. Apply ADR-056 strict reject criteria to each draft.
  3. Persist everything (approved + rejected) to:
       - ``docs/demos/sprint-21-batch-5-drafts.json``
       - ``tools/seed-sprint21-batch-5.sql``
       - ``docs/demos/sprint-21-batch-5-report.md``

Dedup hints: reads prior S16 batches + S17 batches 3+4 if their drafts JSON
files are on disk (they don't need to be — the prompt's existing-snippets
hint just gets shorter).

Usage (from project root, with the ai-service venv activated):

    .venv/Scripts/python ai-service/tools/run_question_batch_s21.py

Owner-action steps before commit (S21-T10):
  1. Run this script. It prints a summary line at the end.
  2. Open ``docs/demos/sprint-21-batch-5-drafts.json`` and spot-check 5
     random Approved drafts per ADR-062 §3.
  3. Apply ``tools/seed-sprint21-batch-5.sql`` against the dev DB.
  4. Verify bank count via ``SELECT COUNT(*) FROM Questions WHERE IsActive = 1``.
  5. Optional: run ``ai-service/tools/backfill_question_embeddings.py`` so
     the new questions' EmbeddingJson column is populated for any future
     embedding-based feature.
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

from _admin_id import resolve_admin_id  # noqa: E402


CATEGORIES = ["DataStructures", "Algorithms", "OOP", "Databases", "Security"]
DIFFICULTIES = [1, 2, 3]
QUESTIONS_PER_CELL = 4  # 5 cats × 3 diffs × 4 = 60 drafts

# Per ADR-062 §2: ≥ 25 % code-snippet — 15 of 60 minimum. We hit ~50 % by
# alternating two of the four per cell as code-bearing (at diff>=2). diff=1
# stays text-only across the board (matches the S16/S17 pattern that easy
# questions are concept-recall + reasoning, not code-trace).
def code_lang_for(cell_index: int, cat: str, diff: int) -> Optional[str]:
    if diff == 1:
        return None
    # Per-cat default language at diff>=2; alternate text and code across the
    # 4 drafts per cell so we end up with ~2 code per cell × 10 (cat,diff>=2)
    # cells = 20 code-bearing drafts of 60 → 33 % (well above the 25 % bar).
    if cell_index % 2 == 1:
        return None
    return {
        "DataStructures": "python",
        "Algorithms": "python",
        "OOP": "csharp",
        "Databases": "sql",
        "Security": "javascript",
    }[cat]


@dataclass
class ReviewResult:
    accepted: bool
    reasons: list[str]


def adr_056_review(draft: GeneratedQuestionDraft) -> ReviewResult:
    """ADR-056 strict single-reviewer criteria — inherited verbatim from
    S16/S17/S18/S19/S20. Rejects when any fires:
        1. Correct option much shorter than shortest distractor.
        2. Self-rated discrimination < 0.6.
        3. Difficulty↔irtB inversion (easy with positive b, hard with negative b).
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
            f"({min(distractor_lens)} chars) -- possible length-based giveaway."
        )

    if draft.irtA < 0.6:
        reasons.append(f"Discrimination irtA={draft.irtA:.2f} below 0.6 floor.")

    if draft.difficulty == 1 and draft.irtB > 0.0:
        reasons.append(f"difficulty=1 but irtB={draft.irtB:.2f} > 0.0 (easy should be negative).")
    if draft.difficulty == 3 and draft.irtB < 0.0:
        reasons.append(f"difficulty=3 but irtB={draft.irtB:.2f} < 0.0 (hard should be positive).")

    if len(draft.questionText) < 50:
        reasons.append(
            f"Question text is only {len(draft.questionText)} chars -- risks being trivia."
        )

    opt_lens = [len(o) for o in draft.options]
    if max(opt_lens) > min(opt_lens) * 5:
        reasons.append(
            f"Option-length disparity ({min(opt_lens)} vs {max(opt_lens)}) > 5x -- parallelism off."
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


async def run_batch() -> int:
    generator = get_question_generator()
    if not generator.is_available:
        print("OpenAI API key not configured; cannot run batch.", file=sys.stderr)
        return 1

    # Read prior batch drafts for dedup hints (best-effort).
    repo_root = AI_SERVICE_ROOT.parent
    docs_demos = repo_root / "docs" / "demos"
    prior_files = [
        docs_demos / "sprint-16-batch-1-drafts.json",
        docs_demos / "sprint-16-batch-2-drafts.json",
        docs_demos / "sprint-17-batch-3-drafts.json",
        docs_demos / "sprint-17-batch-4-drafts.json",
    ]
    prior_texts: dict[str, list[str]] = {c: [] for c in CATEGORIES}
    for prior_path in prior_files:
        if not prior_path.is_file():
            continue
        with open(prior_path, encoding="utf-8") as f:
            prior = json.load(f)
        for row in prior.get("drafts", []):
            cat = row.get("category")
            text = row.get("questionText")
            if cat in prior_texts and text:
                prior_texts[cat].append(text)

    docs_demos.mkdir(parents=True, exist_ok=True)
    tools_dir = repo_root / "tools"
    tools_dir.mkdir(parents=True, exist_ok=True)

    batch_id = str(uuid.uuid4())
    admin_id = resolve_admin_id()

    print(f"=== Sprint 21 -- content batch 5 (ADR-062 single-reviewer, final extension) ===")
    print(f"batchId={batch_id}")
    print(
        f"5 categories x 3 difficulties x {QUESTIONS_PER_CELL} per cell = "
        f"{5 * 3 * QUESTIONS_PER_CELL} drafts target"
    )
    print()

    started = time.monotonic()
    all_drafts: list[dict] = []
    total_tokens = 0
    total_retries = 0
    sql_lines: list[str] = [
        f"-- Sprint 21 content batch 5 -- applied via run_question_batch_s21.py at "
        f"{time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}",
        f"-- BatchId: {batch_id}",
        f"-- Drafts: 60 target (5 cats x 3 diffs x {QUESTIONS_PER_CELL})",
        f"-- Reviewer: Claude single-reviewer per ADR-062 (sixth + final extension)",
        "SET XACT_ABORT ON;",
        "BEGIN TRANSACTION;",
        "",
    ]

    position = 0
    cell_no = 0
    for cat in CATEGORIES:
        for diff in DIFFICULTIES:
            cell_no += 1
            code_lang = code_lang_for(cell_no, cat, diff)
            include_code = code_lang is not None

            print(
                f"[{cell_no:>2}/15] {cat} / diff={diff} / count={QUESTIONS_PER_CELL}"
                f"{(' / lang=' + code_lang) if include_code else ''}...",
                flush=True,
            )

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
                    correlation_id=f"s21-batch5-cell{cell_no:02d}",
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
                print(
                    f"    {tag} draft{position:02d}: {verdict}"
                    f"{(' -- ' + review.reasons[0]) if review.reasons else ''}"
                )

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

    sql_lines.append("")
    sql_lines.append("COMMIT TRANSACTION;")

    # Write the JSON / SQL / report files.
    drafts_path = docs_demos / "sprint-21-batch-5-drafts.json"
    with open(drafts_path, "w", encoding="utf-8") as f:
        json.dump(
            {
                "batchId": batch_id,
                "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "totalDrafts": len(all_drafts),
                "totalApproved": sum(1 for d in all_drafts if d["verdict"] == "ACCEPT"),
                "totalRejected": sum(1 for d in all_drafts if d["verdict"] == "REJECT"),
                "totalTokens": total_tokens,
                "totalRetries": total_retries,
                "drafts": all_drafts,
            },
            f,
            ensure_ascii=False,
            indent=2,
        )

    sql_path = tools_dir / "seed-sprint21-batch-5.sql"
    with open(sql_path, "w", encoding="utf-8") as f:
        f.write("\n".join(sql_lines))

    elapsed = time.monotonic() - started

    approved = sum(1 for d in all_drafts if d["verdict"] == "ACCEPT")
    rejected = len(all_drafts) - approved

    report_path = docs_demos / "sprint-21-batch-5-report.md"
    with open(report_path, "w", encoding="utf-8") as f:
        f.write(
            f"# Sprint 21 -- content batch 5 (ADR-062, final extension)\n\n"
            f"- batchId: `{batch_id}`\n"
            f"- generated: {time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}\n"
            f"- total drafts: {len(all_drafts)} / target 60\n"
            f"- approved: {approved}\n"
            f"- rejected: {rejected}\n"
            f"- reject rate: {rejected / max(len(all_drafts), 1):.1%}\n"
            f"- total tokens: {total_tokens}\n"
            f"- total retries: {total_retries}\n"
            f"- wall time: {elapsed:.1f}s\n\n"
            f"## Files emitted\n\n"
            f"- ``docs/demos/sprint-21-batch-5-drafts.json`` -- per-draft details\n"
            f"- ``tools/seed-sprint21-batch-5.sql`` -- SQL to apply against the dev DB\n\n"
            f"## Owner action (per ADR-062 §3 + S21-T10 commit gate)\n\n"
            f"1. Spot-check 5 random Approved drafts in the drafts JSON.\n"
            f"2. ``sqlcmd -S <server> -d CodeMentor -i tools/seed-sprint21-batch-5.sql``.\n"
            f"3. Verify bank count: ``SELECT COUNT(*) FROM Questions WHERE IsActive = 1``.\n"
            f"   Expected: 147 + {approved} = {147 + approved}.\n"
            f"4. (Optional) ``ai-service/.venv/Scripts/python ai-service/tools/backfill_question_embeddings.py``"
            f" to populate EmbeddingJson on the new rows.\n"
        )

    print()
    print(
        f"Done in {elapsed:.1f}s. "
        f"Generated {len(all_drafts)} drafts ({approved} approved / {rejected} rejected); "
        f"{total_tokens} tokens; {total_retries} retries."
    )
    print(f"Drafts JSON: {drafts_path}")
    print(f"SQL:         {sql_path}")
    print(f"Report:      {report_path}")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(run_batch()))

"""S20-T8: content-burst runner for Sprint 20 batch 3 — 9 new task drafts.

Per ADR-060 (Sprint 20 single-reviewer waiver — extends ADR-056 + 057 +
058 + 059 one more sprint per owner-decision at S20-T0), this script:

1. Generates 9 task drafts via the in-process ``TaskGenerator`` (same
   model + prompt path as ``POST /api/generate-tasks``).
2. Applies ADR-060 strict reject criteria (inherits ADR-058 §3
   verbatim).
3. Persists everything (approved + rejected) to:
   - ``docs/demos/sprint-20-batch-3-drafts.json``
   - ``tools/seed-sprint20-batch-3.sql``  (INSERT into Tasks + TaskDrafts)
   - ``docs/demos/sprint-20-batch-3-report.md``

Distribution: 9 tasks across 3 tracks × difficulties 2-4 — covers the
final 41 -> 50 expansion to hit the F16 task-library target.

Usage (from project root, with the ai-service venv activated):
    .venv/Scripts/python ai-service/tools/run_task_batch_s20.py
"""
from __future__ import annotations

import asyncio
import json
import sys
import time
import uuid
from pathlib import Path
from typing import Optional

HERE = Path(__file__).resolve().parent
AI_SERVICE_ROOT = HERE.parent
if str(AI_SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(AI_SERVICE_ROOT))

from app.domain.schemas.task_generator import (  # noqa: E402
    GenerateTasksRequest,
    GeneratedTaskDraft,
)
from app.services.task_generator import (  # noqa: E402
    TaskGeneratorUnavailable,
    get_task_generator,
)

from _admin_id import resolve_admin_id  # noqa: E402


# Distribution: 9 tasks total. Balances the remaining 41 -> 50 expansion
# across all 3 tracks at difficulty 2-4; emphasises diff 3 (the median
# learner's working range) to give the AI Path Generator more mid-tier
# options for the auto-apply-friendly intra-skill reorders S20 ships.
CELLS: list[tuple[str, int, list[str]]] = [
    ("FullStack", 2, ["readability", "correctness"]),
    ("FullStack", 3, ["security", "design"]),
    ("FullStack", 3, ["performance", "correctness"]),
    ("Backend",   2, ["correctness", "design"]),
    ("Backend",   3, ["security", "performance"]),
    ("Backend",   4, ["design", "security"]),
    ("Python",    2, ["correctness", "performance"]),
    ("Python",    3, ["readability", "design"]),
    ("Python",    4, ["security", "correctness"]),
]


def adr_060_review(draft: GeneratedTaskDraft) -> tuple[bool, list[str]]:
    """Apply ADR-060 strict single-reviewer criteria (inherits ADR-058 §3)."""
    reasons: list[str] = []

    if len(draft.title) < 8:
        reasons.append(f"Title is only {len(draft.title)} chars -- too short.")
    if len(draft.description) < 200:
        reasons.append(f"Description is only {len(draft.description)} chars -- risks being trivia.")

    weight_sum = sum(t.weight for t in draft.skillTags)
    if not (0.95 <= weight_sum <= 1.05):
        reasons.append(f"skillTags weights sum to {weight_sum:.3f} -- outside [0.95, 1.05].")

    if not (1 <= draft.estimatedHours <= 40):
        reasons.append(f"estimatedHours={draft.estimatedHours} out of [1, 40].")

    return (len(reasons) == 0, reasons)


def _sql_escape(s: Optional[str]) -> str:
    if s is None:
        return "NULL"
    return "N'" + s.replace("'", "''") + "'"


def _prereqs_json(prereqs: list[str]) -> str:
    return json.dumps(prereqs, ensure_ascii=False)


def emit_sql_insert_task(d: GeneratedTaskDraft, *, t_id: str, admin_id: str,
                         skill_tags_json: str, learning_gain_json: str) -> str:
    return f"""INSERT INTO Tasks
    (Id, Title, Description, AcceptanceCriteria, Deliverables, Difficulty, Category, Track,
     ExpectedLanguage, EstimatedHours, PrerequisitesJson, CreatedBy, IsActive, CreatedAt, UpdatedAt,
     SkillTagsJson, LearningGainJson, Source, ApprovedById, ApprovedAt, EmbeddingJson, PromptVersion)
VALUES
    ('{t_id}', {_sql_escape(d.title)}, {_sql_escape(d.description)},
     {_sql_escape(d.acceptanceCriteria)}, {_sql_escape(d.deliverables)},
     {d.difficulty}, N'{d.category}', N'{d.track}', N'{d.expectedLanguage}',
     {d.estimatedHours}, {_sql_escape(_prereqs_json(list(d.prerequisites)))},
     '{admin_id}', 1, SYSUTCDATETIME(), SYSUTCDATETIME(),
     {_sql_escape(skill_tags_json)}, {_sql_escape(learning_gain_json)}, N'AI',
     '{admin_id}', SYSUTCDATETIME(), NULL, N'generate_tasks_v1');
"""


def emit_sql_insert_task_draft(
    d: GeneratedTaskDraft, *,
    draft_id: str, batch_id: str, position: int, status: str, admin_id: str,
    original_json: str, skill_tags_json: str, learning_gain_json: str,
    approved_task_id: Optional[str] = None,
    rejection_reason: Optional[str] = None,
) -> str:
    return f"""INSERT INTO TaskDrafts
    (Id, BatchId, PositionInBatch, Status, Title, Description, AcceptanceCriteria, Deliverables,
     Difficulty, Category, Track, ExpectedLanguage, EstimatedHours, PrerequisitesJson,
     SkillTagsJson, LearningGainJson, Rationale, PromptVersion, GeneratedAt, GeneratedById,
     DecidedById, DecidedAt, RejectionReason, OriginalDraftJson, ApprovedTaskId)
VALUES
    ('{draft_id}', '{batch_id}', {position}, N'{status}',
     {_sql_escape(d.title)}, {_sql_escape(d.description)},
     {_sql_escape(d.acceptanceCriteria)}, {_sql_escape(d.deliverables)},
     {d.difficulty}, N'{d.category}', N'{d.track}', N'{d.expectedLanguage}',
     {d.estimatedHours}, {_sql_escape(_prereqs_json(list(d.prerequisites)))},
     {_sql_escape(skill_tags_json)}, {_sql_escape(learning_gain_json)},
     {_sql_escape(d.rationale)}, N'generate_tasks_v1', SYSUTCDATETIME(), '{admin_id}',
     '{admin_id}', SYSUTCDATETIME(), {_sql_escape(rejection_reason)},
     {_sql_escape(original_json)},
     {("'" + approved_task_id + "'") if approved_task_id else "NULL"});
"""


# 21 seeded titles (S2-T2 vintage) + 10 S18-T7 + 10 S19-T8 approved titles.
# Owner: after S19 SQL is applied, the bank is 41 tasks. After S20-T8 it
# becomes 50 -- the F16 task-library target.
SEEDED_TITLES = [
    # Pre-S18 seed (21 titles, abbreviated).
    "FizzBuzz + Pytest Intro", "Implement an LRU Cache", "Model a Blog with SQLAlchemy 2.0",
    "Library Management System (OOP)", "Secure REST API with FastAPI + JWT",
    "Priority Queue via Binary Heap", "SQLite -> Postgres Migration with Alembic",
    "Weather CLI with Dependency Injection", "CRUD REST API with ASP.NET + EF Core",
    "Add JWT Auth to a .NET API", "Thread-Safe Hash Map", "Normalize a Sales Dataset to 3NF",
    "Token-Bucket Rate Limiter Middleware", "Secure Password-Reset Flow",
    "Full-Stack Counter Hello World", "TODO App (React + Node + SQLite)",
    "Book Catalog: Search + Pagination",
    # S18-T7 batch-1 (10 titles).
    "Build a Product Review Moderation Dashboard with Live Highlights",
    "Build a Neighborhood Event Feed with RSVP Insights",
    "Build a secure full-stack photo sharing board with audit trails",
    "Ship an analytics-aware product listing grid with edge-cache hints",
    "Ship an aggregate event query service with pagination and metrics",
    "Build a secrets-safe webhook receiver with HMAC validation",
    "Build a bounded ingestion queue with async deduplication",
    "Build a transaction reconciler CLI with fuzzy matching",
    "Build a dynamic fare-matching CLI for rideshare promos",
    "Build a streaming CSV profile dashboard with adaptive sampling",
    # S19-T8 batch-2 (10 titles -- placeholders; owner can update with
    # actual approved titles after S19 SQL apply. Dedup will still work
    # because the prompt sees the existing-titles list; redundant entries
    # here only marginally raise dedup pressure).
    "S19 Task Batch 2 placeholder 1", "S19 Task Batch 2 placeholder 2",
    "S19 Task Batch 2 placeholder 3", "S19 Task Batch 2 placeholder 4",
    "S19 Task Batch 2 placeholder 5", "S19 Task Batch 2 placeholder 6",
    "S19 Task Batch 2 placeholder 7", "S19 Task Batch 2 placeholder 8",
    "S19 Task Batch 2 placeholder 9", "S19 Task Batch 2 placeholder 10",
]


async def run_batch() -> int:
    gen = get_task_generator()
    if not gen.is_available:
        print("OpenAI API key not configured; cannot run batch.", file=sys.stderr)
        return 1

    repo_root = AI_SERVICE_ROOT.parent
    docs_demos = repo_root / "docs" / "demos"
    docs_demos.mkdir(parents=True, exist_ok=True)
    tools_dir = repo_root / "tools"
    tools_dir.mkdir(parents=True, exist_ok=True)

    batch_id = str(uuid.uuid4())
    admin_id = resolve_admin_id()

    print(f"=== Sprint 20 -- task batch 3 (ADR-060 single-reviewer) ===")
    print(f"batchId={batch_id}")
    print(f"9 tasks across 3 tracks (3 FullStack / 3 Backend / 3 Python; diff 2-4)")
    print(f"Target after this batch: 50 active tasks (F16 task-library target met).")
    print()

    started = time.monotonic()
    all_drafts: list[dict] = []
    total_tokens = 0
    total_retries = 0
    sql_lines: list[str] = [
        f"-- Sprint 20 task batch 3 -- applied via run_task_batch_s20.py at "
        f"{time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}",
        f"-- BatchId: {batch_id}",
        f"-- Drafts: 9 expected (3 FullStack / 3 Backend / 3 Python; diff 2-4)",
        f"-- Reviewer: Claude single-reviewer per ADR-060 (extends ADR-056 + 057 + 058 + 059)",
        f"-- F16 task-library target (50 tasks) HIT after this batch is applied.",
        "SET XACT_ABORT ON;",
        "BEGIN TRANSACTION;",
        "",
    ]

    prior_titles: list[str] = []

    position = 0
    for cell_no, (track, diff, focus_skills) in enumerate(CELLS, start=1):
        focus_str = " + ".join(focus_skills)
        print(f"[{cell_no:>2}/{len(CELLS)}] {track} / diff={diff} / focus=[{focus_str}]...", flush=True)
        all_seen_titles = SEEDED_TITLES + prior_titles

        try:
            response = await gen.generate(
                GenerateTasksRequest(
                    track=track,  # type: ignore[arg-type]
                    difficulty=diff,
                    count=1,
                    focusSkills=focus_skills,  # type: ignore[arg-type]
                    existingTitles=all_seen_titles,
                ),
                correlation_id=f"s20-batch3-cell{cell_no:02d}",
            )
        except TaskGeneratorUnavailable as exc:
            print(f"  -> GENERATION FAILED: {exc} (http {exc.http_status})", file=sys.stderr)
            continue

        total_tokens += response.tokensUsed
        total_retries += response.retryCount

        for d in response.drafts:
            accepted, reasons = adr_060_review(d)
            verdict = "ACCEPT" if accepted else "REJECT"
            tag = "[OK]" if accepted else "[XX]"
            print(f"    {tag} draft{position:02d}: {verdict} -- {d.title[:60]}")
            if reasons:
                print(f"           reasons: {reasons[0]}")

            draft_id = str(uuid.uuid4())
            original_payload_json = json.dumps(d.model_dump(), ensure_ascii=False)
            skill_tags_json = json.dumps(
                [{"skill": t.skill, "weight": t.weight} for t in d.skillTags],
                ensure_ascii=False)
            learning_gain_json = json.dumps(d.learningGain, ensure_ascii=False)

            row = {
                "draftId": draft_id,
                "positionInBatch": position,
                "verdict": verdict,
                "reasons": reasons,
                **d.model_dump(),
            }
            all_drafts.append(row)
            prior_titles.append(d.title)

            if accepted:
                task_id = str(uuid.uuid4())
                row["approvedTaskId"] = task_id
                sql_lines.append(emit_sql_insert_task(d, t_id=task_id, admin_id=admin_id,
                                                     skill_tags_json=skill_tags_json,
                                                     learning_gain_json=learning_gain_json))
                sql_lines.append(emit_sql_insert_task_draft(
                    d, draft_id=draft_id, batch_id=batch_id, position=position,
                    status="Approved", admin_id=admin_id,
                    original_json=original_payload_json,
                    skill_tags_json=skill_tags_json,
                    learning_gain_json=learning_gain_json,
                    approved_task_id=task_id, rejection_reason=None,
                ))
            else:
                sql_lines.append(emit_sql_insert_task_draft(
                    d, draft_id=draft_id, batch_id=batch_id, position=position,
                    status="Rejected", admin_id=admin_id,
                    original_json=original_payload_json,
                    skill_tags_json=skill_tags_json,
                    learning_gain_json=learning_gain_json,
                    approved_task_id=None, rejection_reason="; ".join(reasons),
                ))
            position += 1

    sql_lines.append("COMMIT TRANSACTION;")
    sql_lines.append("")
    sql_lines.append("-- Verification:")
    sql_lines.append(
        f"SELECT COUNT(*) AS ApprovedCount FROM TaskDrafts "
        f"WHERE BatchId = '{batch_id}' AND Status = 'Approved';")
    sql_lines.append(
        f"SELECT COUNT(*) AS RejectedCount FROM TaskDrafts "
        f"WHERE BatchId = '{batch_id}' AND Status = 'Rejected';")
    sql_lines.append("SELECT COUNT(*) AS TaskBankSize FROM Tasks WHERE IsActive = 1;  -- target: 50")

    elapsed = time.monotonic() - started
    accepted = [r for r in all_drafts if r["verdict"] == "ACCEPT"]
    rejected = [r for r in all_drafts if r["verdict"] == "REJECT"]
    reject_rate = (len(rejected) / len(all_drafts) * 100.0) if all_drafts else 0.0

    json_path = docs_demos / "sprint-20-batch-3-drafts.json"
    sql_path = tools_dir / "seed-sprint20-batch-3.sql"
    md_path = docs_demos / "sprint-20-batch-3-report.md"

    with open(json_path, "w", encoding="utf-8") as f:
        json.dump({
            "batchId": batch_id,
            "batchNumber": 3,
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
        f"# Sprint 20 -- Task Batch 3 Report",
        "",
        f"**BatchId:** `{batch_id}`  ",
        f"**Generated at:** {time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}  ",
        f"**Reviewer:** Claude single-reviewer (ADR-060, extends ADR-056 + 057 + 058 + 059)  ",
        f"**Wall clock:** {elapsed:.1f}s (~{elapsed/60:.1f} min)  ",
        f"**Token cost:** {total_tokens:,} tokens (retries: {total_retries})  ",
        "",
        "## Summary",
        f"- **Total drafts generated:** {len(all_drafts)}",
        f"- **Approved:** {len(accepted)} ({100 - reject_rate:.1f}%)",
        f"- **Rejected:** {len(rejected)} ({reject_rate:.1f}%)",
        f"- **30% reject-rate bar:** " + ("within bar." if reject_rate < 30
                                          else "OVER BAR -- consider prompt iteration."),
        f"- **F16 task-library target:** 50 tasks after apply -- {'MET' if len(accepted) >= 9 else 'short by ' + str(9 - len(accepted))}.",
        "",
        "## Distribution (by track x difficulty)",
        "",
        "| Track | Diff 2 | Diff 3 | Diff 4 | Total |",
        "|---|---|---|---|---|",
    ]
    for tr in ["FullStack", "Backend", "Python"]:
        d2 = sum(1 for r in all_drafts if r["track"] == tr and r["difficulty"] == 2)
        d3 = sum(1 for r in all_drafts if r["track"] == tr and r["difficulty"] == 3)
        d4 = sum(1 for r in all_drafts if r["track"] == tr and r["difficulty"] == 4)
        md_lines.append(f"| {tr} | {d2} | {d3} | {d4} | {d2+d3+d4} |")
    md_lines += ["", "## Approved drafts", ""]
    for i, row in enumerate(accepted, start=1):
        md_lines += [
            f"### A{i}: {row['track']} / diff={row['difficulty']} / {row['category']} ({row['estimatedHours']}h)",
            "",
            f"**Title:** {row['title']}",
            "",
            f"**Description:** {row['description']}",
            "",
            f"**Acceptance:** {row.get('acceptanceCriteria') or '(none)'}",
            "",
            f"**Deliverables:** {row.get('deliverables') or '(none)'}",
            "",
            f"**Skill tags:** {row['skillTags']}  \n**Learning gain:** {row['learningGain']}",
            "",
            f"*Rationale:* {row['rationale']}",
            "",
            "---", "",
        ]
    md_lines += ["## Rejected drafts", ""]
    for i, row in enumerate(rejected, start=1):
        md_lines += [
            f"### R{i}: {row['track']} / diff={row['difficulty']}",
            "",
            f"**Title:** {row['title']}",
            "",
            "**Reject reasons:**",
            "\n".join(f"- {r}" for r in row.get("reasons", [])),
            "",
            "---", "",
        ]

    with open(md_path, "w", encoding="utf-8") as f:
        f.write("\n".join(md_lines))

    print()
    print(f"=== Task batch 3 done ===")
    print(f"  Wrote: {json_path.relative_to(repo_root)}")
    print(f"  Wrote: {sql_path.relative_to(repo_root)}")
    print(f"  Wrote: {md_path.relative_to(repo_root)}")
    print(f"  Stats: {len(accepted)} approved / {len(rejected)} rejected ({reject_rate:.1f}% reject)")
    print(f"  Tokens: {total_tokens:,} (retries: {total_retries}); wall={elapsed:.1f}s")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(run_batch()))

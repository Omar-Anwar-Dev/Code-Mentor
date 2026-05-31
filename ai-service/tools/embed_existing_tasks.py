"""S19 owner-action helper — one-shot embedding back-population for Tasks.

After S18-T2 backfill + S18-T7 + S19-T8 SQL inserts, the 41 active
Tasks have NULL `EmbeddingJson` because the seed SQL writes the row
directly (bypassing `EmbedEntityJob<Task>`). This tool fixes that in
one pass:

1. SELECT every active Task with `EmbeddingJson IS NULL`.
2. For each task:
   a. Build the embedding text (same recipe as
      :code:`EmbedEntityJob.BuildTaskEmbeddingText` —
      title + first 800 chars of description + skill tags joined).
   b. POST :code:`/api/embed` → 1536-float vector.
   c. UPDATE `Tasks.EmbeddingJson` with the serialised vector.
   d. POST :code:`/api/task-embeddings/upsert` to seed the AI service
      in-memory cache.
3. Final :code:`/api/task-embeddings/diagnostics` report.

Idempotent: re-running on tasks that already have `EmbeddingJson`
populated is a no-op (the SELECT filter skips them). Safe to interrupt
mid-batch and resume.

Usage (from project root):

    .venv/Scripts/python ai-service/tools/embed_existing_tasks.py

Cost: ~$0.05 for 41 tasks on `text-embedding-3-small` (1536 dims at
$0.02 / 1M input tokens, ~1k tokens per task avg).
"""
from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys
from typing import Any

import httpx

try:
    import pyodbc  # type: ignore[import-not-found]
except ImportError:  # pragma: no cover
    pyodbc = None  # type: ignore[assignment]


DEFAULT_BASE_URL = "http://localhost:8001"
# ODBC Driver 17 wants yes/no (not True/False) for TrustServerCertificate;
# UID/PWD (not User Id/Password) for pyodbc. Encrypt is omitted — defaults to
# "no" on local TCP which is what we want for dev.
DEFAULT_DB_CONN_STR = (
    "DRIVER={ODBC Driver 17 for SQL Server};"
    "Server=localhost,1433;Database=CodeMentor;UID=sa;PWD=CodeMentor_Dev_123!;"
    "TrustServerCertificate=yes"
)


def _parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument(
        "--base-url",
        default=os.environ.get("AI_SERVICE_BASE_URL", DEFAULT_BASE_URL),
        help=f"AI service base URL (default: {DEFAULT_BASE_URL})",
    )
    p.add_argument(
        "--db-connection",
        default=os.environ.get("BACKEND_DB_CONNECTION_STRING", DEFAULT_DB_CONN_STR),
        help="SQL Server connection string for the backend DB",
    )
    p.add_argument(
        "--dry-run",
        action="store_true",
        help="Print what would be embedded without making any AI calls or DB writes",
    )
    return p.parse_args()


def _load_pending_tasks(db_conn_str: str) -> list[dict[str, Any]]:
    if pyodbc is None:
        print(
            "pyodbc not installed. Install via `pip install pyodbc` and re-run.",
            file=sys.stderr,
        )
        sys.exit(2)

    rows: list[dict[str, Any]] = []
    with pyodbc.connect(db_conn_str, autocommit=False) as conn:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT Id, Title, Description, Difficulty, Category, Track,
                   ExpectedLanguage, EstimatedHours, PrerequisitesJson,
                   SkillTagsJson, LearningGainJson
            FROM Tasks
            WHERE IsActive = 1 AND EmbeddingJson IS NULL
            """
        )
        for row in cur.fetchall():
            rows.append({
                "Id": str(row[0]),
                "Title": row[1],
                "Description": row[2] or "",
                "Difficulty": int(row[3]),
                "Category": row[4],
                "Track": row[5],
                "ExpectedLanguage": row[6],
                "EstimatedHours": int(row[7]),
                "PrerequisitesJson": row[8] or "[]",
                "SkillTagsJson": row[9],
                "LearningGainJson": row[10] or "{}",
            })
    return rows


def _build_embed_text(task: dict[str, Any]) -> str:
    """Mirror of backend EmbedEntityJob.BuildTaskEmbeddingText.

    title + first 800 chars of description + "\\n\\n[Skills]: <joined>"
    """
    desc = (task["Description"] or "")[:800]
    base = f"{task['Title']}\n\n{desc}"
    tags_text = ""
    if task["SkillTagsJson"]:
        try:
            parsed = json.loads(task["SkillTagsJson"])
            if isinstance(parsed, list):
                skills = [
                    str(t.get("skill", ""))
                    for t in parsed
                    if isinstance(t, dict) and t.get("skill")
                ]
                if skills:
                    tags_text = f"\n\n[Skills]: {', '.join(skills)}"
        except json.JSONDecodeError:
            pass
    return base + tags_text


def _build_skill_tags(json_str: str | None) -> list[dict[str, float]]:
    if not json_str:
        return [{"skill": "correctness", "weight": 1.0}]
    try:
        parsed = json.loads(json_str)
        if isinstance(parsed, list) and parsed:
            cleaned = [
                {"skill": str(t["skill"]), "weight": float(t["weight"])}
                for t in parsed
                if isinstance(t, dict) and "skill" in t and "weight" in t
            ]
            if cleaned:
                return cleaned
    except (json.JSONDecodeError, KeyError, TypeError):
        pass
    return [{"skill": "correctness", "weight": 1.0}]


def _build_learning_gain(json_str: str | None) -> dict[str, float]:
    if not json_str:
        return {}
    try:
        parsed = json.loads(json_str)
        if isinstance(parsed, dict):
            return {str(k): float(v) for k, v in parsed.items()}
    except (json.JSONDecodeError, ValueError):
        pass
    return {}


def _build_prereqs(json_str: str | None) -> list[str]:
    if not json_str:
        return []
    try:
        parsed = json.loads(json_str)
        if isinstance(parsed, list):
            return [str(p) for p in parsed if isinstance(p, str)]
    except json.JSONDecodeError:
        pass
    return []


async def _embed_one(
    client: httpx.AsyncClient,
    base_url: str,
    task: dict[str, Any],
) -> tuple[bool, list[float] | None, str]:
    """Call /api/embed → return (success, vector, error-message)."""
    text = _build_embed_text(task)
    payload = {"text": text, "sourceId": task["Id"]}
    try:
        resp = await client.post(
            f"{base_url}/api/embed", json=payload, timeout=60,
        )
    except httpx.HTTPError as exc:
        return False, None, f"transport: {exc}"

    if resp.status_code != 200:
        return False, None, f"HTTP {resp.status_code}: {resp.text[:200]}"
    body = resp.json()
    vector = body.get("vector")
    if not isinstance(vector, list) or not vector:
        return False, None, f"missing 'vector' in response: {body}"
    return True, vector, ""


async def _upsert_cache(
    client: httpx.AsyncClient,
    base_url: str,
    task: dict[str, Any],
    vector: list[float],
) -> tuple[bool, str]:
    description = task["Description"] or ""
    summary = description[:800].rstrip() + ("..." if len(description) > 800 else "")
    payload = {
        "taskId": task["Id"],
        "vector": vector,
        "title": task["Title"],
        "descriptionSummary": summary if summary else task["Title"],
        "skillTags": _build_skill_tags(task["SkillTagsJson"]),
        "learningGain": _build_learning_gain(task["LearningGainJson"]),
        "difficulty": task["Difficulty"],
        "prerequisites": _build_prereqs(task["PrerequisitesJson"]),
        "track": task["Track"],
        "expectedLanguage": task["ExpectedLanguage"],
        "category": task["Category"],
        "estimatedHours": task["EstimatedHours"],
    }
    try:
        resp = await client.post(
            f"{base_url}/api/task-embeddings/upsert", json=payload, timeout=30,
        )
    except httpx.HTTPError as exc:
        return False, f"transport: {exc}"
    if resp.status_code != 200:
        return False, f"HTTP {resp.status_code}: {resp.text[:200]}"
    return True, f"cacheSize={resp.json().get('cacheSize')}"


def _update_embedding_json(
    db_conn_str: str, task_id: str, vector: list[float],
) -> tuple[bool, str]:
    serialised = json.dumps(vector)
    try:
        with pyodbc.connect(db_conn_str, autocommit=True) as conn:
            cur = conn.cursor()
            cur.execute(
                "UPDATE Tasks SET EmbeddingJson = ?, UpdatedAt = SYSUTCDATETIME() WHERE Id = ?",
                serialised, task_id,
            )
            return True, f"rowcount={cur.rowcount}"
    except Exception as exc:  # pragma: no cover — defensive
        return False, f"DB UPDATE failed: {exc}"


async def _main() -> int:
    args = _parse_args()
    base_url: str = args.base_url.rstrip("/")
    print(f"AI service:  {base_url}")
    print(f"DB:          {args.db_connection.split(';')[0]}...")
    print()

    print("Loading tasks missing EmbeddingJson...", flush=True)
    try:
        tasks = _load_pending_tasks(args.db_connection)
    except Exception as exc:
        print(f"DB load failed: {exc}", file=sys.stderr)
        return 2
    print(f"Found {len(tasks)} tasks needing embeddings.")

    if not tasks:
        print("Nothing to do. The cache may still be empty — run "
              "backfill_task_embeddings.py to repopulate from existing rows.")
        return 0

    if args.dry_run:
        print("[dry-run] would embed + cache these tasks:")
        for t in tasks:
            print(f"  - {t['Id']} ({t['Track']}) {t['Title'][:60]}")
        return 0

    print()
    print("Embedding + caching...")
    ok_count = 0
    fail_count = 0
    async with httpx.AsyncClient() as client:
        for t in tasks:
            # Step 1: get vector from AI service.
            success, vector, error = await _embed_one(client, base_url, t)
            if not success or vector is None:
                print(f"  [embed-XX] {t['Id']} ({t['Track']}): {error}")
                fail_count += 1
                continue

            # Step 2: persist vector to DB.
            db_ok, db_info = _update_embedding_json(args.db_connection, t["Id"], vector)
            if not db_ok:
                print(f"  [db-XX]    {t['Id']} ({t['Track']}): {db_info}")
                fail_count += 1
                continue

            # Step 3: seed AI cache.
            cache_ok, cache_info = await _upsert_cache(client, base_url, t, vector)
            tag = "[OK]" if cache_ok else "[cache-XX]"
            print(f"  {tag} {t['Id']} ({t['Track']}): "
                  f"dims={len(vector)} | db {db_info} | {cache_info}")
            if cache_ok:
                ok_count += 1
            else:
                fail_count += 1

    print()
    print(f"Done: {ok_count} embedded + cached, {fail_count} failed.")

    print()
    print("Final cache diagnostics:")
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(
                f"{base_url}/api/task-embeddings/diagnostics", timeout=10,
            )
            print(f"  {resp.status_code}: {resp.text}")
        except httpx.HTTPError as exc:
            print(f"  diagnostics failed: {exc}")

    return 0 if fail_count == 0 else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(_main()))

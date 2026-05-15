"""S19-T1 / F16: one-shot task-embeddings backfill tool.

After a fresh AI-service rebuild the in-memory ``task_embeddings_cache``
is empty. The Hangfire ``EmbedEntityJob<Task>`` (S18-T6) seeds it on
every Task approve, but at cold-start there's nothing to seed from.

This tool reads every active Task that has a non-null ``EmbeddingJson``
from the backend DB, posts each to ``POST /api/task-embeddings/upsert``,
and reports the resulting cache size. Run it once after any of:

- ai-service Docker image rebuild
- ai-service container restart (vector cache lost)
- owner-applied seed SQL adding new approved tasks

Usage (from project root, with the ai-service venv activated, while
the AI service is up on http://localhost:8001):

    .venv/Scripts/python ai-service/tools/backfill_task_embeddings.py

Environment:
- ``AI_SERVICE_BASE_URL`` (default ``http://localhost:8001``)
- ``BACKEND_DB_CONNECTION_STRING`` — must match the running backend's
  SQL Server connection. The tool falls back to the standard local-dev
  string used by ``docker-compose up`` if not set.

The tool is idempotent — re-running overwrites entries in place.
"""
from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys
from pathlib import Path
from typing import Any

import httpx

try:
    import pyodbc  # type: ignore[import-not-found]
except ImportError:  # pragma: no cover — graceful degrade for venvs without pyodbc
    pyodbc = None  # type: ignore[assignment]

HERE = Path(__file__).resolve().parent

DEFAULT_BASE_URL = "http://localhost:8001"
# ODBC Driver 17 wants yes/no (not True/False); UID/PWD for pyodbc.
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
        help="Print what would be uploaded without actually hitting the AI service",
    )
    return p.parse_args()


def _load_tasks(db_conn_str: str) -> list[dict[str, Any]]:
    if pyodbc is None:
        print(
            "pyodbc not installed in this venv. Install it via "
            "`pip install pyodbc` and re-run.",
            file=sys.stderr,
        )
        sys.exit(2)

    rows: list[dict[str, Any]] = []
    with pyodbc.connect(db_conn_str, autocommit=True) as conn:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT Id, Title, Description, Difficulty, Category, Track,
                   ExpectedLanguage, EstimatedHours, PrerequisitesJson,
                   SkillTagsJson, LearningGainJson, EmbeddingJson
            FROM Tasks
            WHERE IsActive = 1 AND EmbeddingJson IS NOT NULL
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
                "EmbeddingJson": row[11],
            })
    return rows


def _build_payload(task: dict[str, Any]) -> dict[str, Any]:
    try:
        vector = json.loads(task["EmbeddingJson"])
        if not isinstance(vector, list):
            raise ValueError("EmbeddingJson is not a JSON array")
    except (json.JSONDecodeError, ValueError) as exc:
        raise ValueError(f"Bad EmbeddingJson on task {task['Id']}: {exc}") from exc

    description = task["Description"] or ""
    summary = description[:800].rstrip() + ("..." if len(description) > 800 else "")

    try:
        skill_tags_raw = json.loads(task["SkillTagsJson"]) if task["SkillTagsJson"] else []
        if not isinstance(skill_tags_raw, list) or not skill_tags_raw:
            skill_tags = [{"skill": "correctness", "weight": 1.0}]
        else:
            skill_tags = [
                {"skill": str(t["skill"]), "weight": float(t["weight"])}
                for t in skill_tags_raw
                if "skill" in t and "weight" in t
            ] or [{"skill": "correctness", "weight": 1.0}]
    except (json.JSONDecodeError, KeyError, TypeError):
        skill_tags = [{"skill": "correctness", "weight": 1.0}]

    try:
        learning_gain = json.loads(task["LearningGainJson"]) if task["LearningGainJson"] else {}
        if not isinstance(learning_gain, dict):
            learning_gain = {}
    except json.JSONDecodeError:
        learning_gain = {}

    try:
        prereqs = json.loads(task["PrerequisitesJson"]) if task["PrerequisitesJson"] else []
        if not isinstance(prereqs, list):
            prereqs = []
    except json.JSONDecodeError:
        prereqs = []

    return {
        "taskId": task["Id"],
        "vector": vector,
        "title": task["Title"],
        "descriptionSummary": summary,
        "skillTags": skill_tags,
        "learningGain": learning_gain,
        "difficulty": task["Difficulty"],
        "prerequisites": prereqs,
        "track": task["Track"],
        "expectedLanguage": task["ExpectedLanguage"],
        "category": task["Category"],
        "estimatedHours": task["EstimatedHours"],
    }


async def _upload_one(
    client: httpx.AsyncClient, base_url: str, payload: dict[str, Any]
) -> tuple[bool, str]:
    try:
        resp = await client.post(f"{base_url}/api/task-embeddings/upsert", json=payload, timeout=30)
        if resp.status_code == 200:
            return True, f"cacheSize={resp.json().get('cacheSize')}"
        return False, f"HTTP {resp.status_code}: {resp.text[:200]}"
    except httpx.HTTPError as exc:
        return False, f"transport: {exc}"


async def _main() -> int:
    args = _parse_args()
    base_url: str = args.base_url.rstrip("/")
    print(f"Backfill target: {base_url}")
    print(f"DB:              {args.db_connection.split(';')[0]}...")
    print()

    print("Loading tasks from DB...", flush=True)
    try:
        tasks = _load_tasks(args.db_connection)
    except Exception as exc:
        print(f"DB load failed: {exc}", file=sys.stderr)
        return 2
    print(f"Loaded {len(tasks)} active tasks with EmbeddingJson populated.")

    if not tasks:
        print("No tasks to backfill. Exiting.")
        return 0

    if args.dry_run:
        print("[dry-run] would POST these task IDs:")
        for t in tasks:
            print(f"  - {t['Id']} ({t['Track']}) {t['Title'][:60]}")
        return 0

    print()
    print(f"Posting to {base_url}/api/task-embeddings/upsert...")
    ok_count = 0
    fail_count = 0
    async with httpx.AsyncClient() as client:
        for t in tasks:
            try:
                payload = _build_payload(t)
            except ValueError as exc:
                print(f"  [SKIP] {t['Id']}: {exc}")
                fail_count += 1
                continue
            success, info = await _upload_one(client, base_url, payload)
            tag = "[OK]" if success else "[XX]"
            print(f"  {tag} {t['Id']} ({t['Track']}): {info}")
            if success:
                ok_count += 1
            else:
                fail_count += 1

    print()
    print(f"Done: {ok_count} uploaded, {fail_count} failed.")

    # Verify the cache state via diagnostics.
    print()
    print("Final cache diagnostics:")
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(f"{base_url}/api/task-embeddings/diagnostics", timeout=10)
            print(f"  {resp.status_code}: {resp.text}")
        except httpx.HTTPError as exc:
            print(f"  diagnostics failed: {exc}")

    return 0 if fail_count == 0 else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(_main()))

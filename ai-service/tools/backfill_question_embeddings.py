"""S16 post-T11 follow-up: backfill ``Questions.EmbeddingJson`` for all
rows where it is still NULL.

After OpenAI dashboard grants access to ``text-embedding-3-small``, the
60 manual seed questions and the 57 AI-generated questions all need
their vector populated so F16's path generator (S19/S20) can run
cosine-similarity retrieval. This is a one-shot — subsequent approves
embed automatically via ``EmbedEntityJob``.

Flow:
1. Dump candidate rows to JSON via ``docker exec sqlcmd ... FOR JSON``.
2. For each row, call ``POST /api/embed`` with the same text shape the
   ``EmbedEntityJob`` uses (``content`` + optional ``[Code snippet (lang)]: snippet``).
3. Write a transactional SQL file with one ``UPDATE Questions SET EmbeddingJson``
   per row.
4. Apply the SQL file via ``docker exec sqlcmd -i``.
5. Signal ``POST /api/embeddings/reload`` once at the end.

Usage:
    .venv/Scripts/python ai-service/tools/backfill_question_embeddings.py
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
import time
from pathlib import Path
from typing import Optional

import httpx

REPO_ROOT = Path(__file__).resolve().parents[2]
AI_SERVICE = "http://localhost:8001"
DB_CONTAINER = "codementor-mssql"
DB_NAME = "CodeMentor"


def read_sa_password() -> str:
    env = REPO_ROOT / ".env"
    for line in env.read_text(encoding="utf-8").splitlines():
        if line.startswith("MSSQL_SA_PASSWORD="):
            return line.split("=", 1)[1].strip().strip('"').strip("'")
    raise RuntimeError("MSSQL_SA_PASSWORD not found in .env")


def sqlcmd(query: str, password: str, *, capture_out_file: Optional[str] = None) -> str:
    """Run a one-shot sqlcmd via docker exec; return stdout."""
    args = [
        "docker", "exec", DB_CONTAINER,
        "/opt/mssql-tools18/bin/sqlcmd",
        "-S", "localhost", "-U", "sa", "-P", password, "-C",
        "-d", DB_NAME,
    ]
    if capture_out_file:
        args += ["-o", capture_out_file, "-y", "0", "-Y", "0"]  # unlimited col widths
    args += ["-Q", query]
    result = subprocess.run(args, capture_output=True, text=True, check=False)
    if result.returncode != 0:
        raise RuntimeError(f"sqlcmd failed: {result.stderr}")
    return result.stdout


def dump_candidate_rows(password: str) -> list[dict]:
    """Return Questions rows that need embedding, as a list of dicts.

    Approach: write ``FOR JSON`` output to a file inside the container
    with UTF-8 encoding (sqlcmd ``-f 65001``), then ``docker cp`` it out
    and parse. This avoids column-width truncation that bites us when
    reading via stdout for snippets > 256 chars.
    """
    container_path = "/tmp/backfill-candidates.json"
    result = subprocess.run(
        [
            "docker", "exec", DB_CONTAINER,
            "/opt/mssql-tools18/bin/sqlcmd",
            "-S", "localhost", "-U", "sa", "-P", password, "-C",
            "-d", DB_NAME,
            "-f", "65001",            # output codepage = UTF-8
            "-o", container_path,
            "-y", "0", "-Y", "0",     # unlimited column widths (excludes -h, -W)
            "-Q",
            "SET NOCOUNT ON; "
            "SELECT CAST(Id AS NVARCHAR(40)) AS Id, Content, ISNULL(CodeSnippet, '') AS CodeSnippet, ISNULL(CodeLanguage, '') AS CodeLanguage "
            "FROM Questions WHERE EmbeddingJson IS NULL AND IsActive = 1 "
            "ORDER BY Id "
            "FOR JSON PATH;",
        ],
        capture_output=True, text=True, check=False,
    )
    if result.returncode != 0:
        raise RuntimeError(f"sqlcmd failed: {result.stderr}")
    host_path = Path(tempfile.gettempdir()) / "backfill-candidates.json"
    subprocess.run(
        ["docker", "cp", f"{DB_CONTAINER}:{container_path}", str(host_path)],
        check=True,
    )
    raw_bytes = host_path.read_bytes()
    # Strip a UTF-8 BOM if present.
    if raw_bytes.startswith(b"\xef\xbb\xbf"):
        raw_bytes = raw_bytes[3:]
    raw_text = raw_bytes.decode("utf-8", errors="replace")
    payload = "".join(line.rstrip("\r\n") for line in raw_text.splitlines() if line.strip())
    if not payload.startswith("["):
        idx = payload.find("[")
        if idx == -1:
            raise RuntimeError(f"No JSON array in sqlcmd output: {payload[:200]!r}")
        payload = payload[idx:]
    rows = json.loads(payload)
    if not isinstance(rows, list):
        raise RuntimeError(f"Expected JSON list; got {type(rows).__name__}")
    for r in rows:
        if r.get("CodeSnippet") == "":
            r["CodeSnippet"] = None
        if r.get("CodeLanguage") == "":
            r["CodeLanguage"] = None
    return rows


def build_embedding_text(content: str, snippet: Optional[str], lang: Optional[str]) -> str:
    """Same shape as ``EmbedEntityJob.BuildEmbeddingText`` in the BE."""
    if not snippet or not snippet.strip():
        return content
    return f"{content}\n\n[Code snippet ({lang or 'code'})]:\n{snippet}"


def embed(text: str, source_id: str, client: httpx.Client) -> list[float]:
    """Embed with retry-on-503. OpenAI free tier rate-limits the embeddings
    endpoint at ~150 RPM — pause + retry up to 4 times with exponential
    backoff before giving up on a row."""
    delay = 1.0
    for attempt in range(5):
        resp = client.post(
            f"{AI_SERVICE}/api/embed",
            json={"text": text, "sourceId": source_id},
            timeout=30.0,
        )
        if resp.status_code == 200:
            return resp.json()["vector"]
        if resp.status_code == 503 and attempt < 4:
            time.sleep(delay)
            delay = min(delay * 2, 16.0)
            continue
        resp.raise_for_status()
    raise RuntimeError("embed: exhausted retries on 503")


def sql_escape(s: str) -> str:
    return "N'" + s.replace("'", "''") + "'"


def main() -> int:
    pwd = read_sa_password()

    print("[1/5] Querying candidate rows...", flush=True)
    rows = dump_candidate_rows(pwd)
    print(f"      Found {len(rows)} rows to embed.")

    if not rows:
        print("Nothing to do.")
        return 0

    print(f"[2/5] Embedding via {AI_SERVICE}/api/embed (sequential — ~1s per call)...")
    updates: list[str] = []
    failures: list[tuple[str, str]] = []
    started = time.monotonic()
    with httpx.Client() as client:
        for i, row in enumerate(rows, start=1):
            qid = row["Id"]
            text = build_embedding_text(row["Content"], row.get("CodeSnippet"), row.get("CodeLanguage"))
            try:
                vector = embed(text, source_id=qid, client=client)
            except Exception as exc:
                failures.append((qid, str(exc)))
                print(f"      [{i:>3}/{len(rows)}] FAIL id={qid[:8]}... -> {exc}", file=sys.stderr)
                continue

            vec_json = json.dumps(vector, separators=(",", ":"))
            updates.append(
                f"UPDATE Questions SET EmbeddingJson = {sql_escape(vec_json)} WHERE Id = '{qid}';"
            )
            if i % 10 == 0 or i == len(rows):
                elapsed = time.monotonic() - started
                rate = i / elapsed if elapsed > 0 else 0
                print(f"      [{i:>3}/{len(rows)}] embedded ({rate:.1f}/s)")

    if failures:
        print(f"      {len(failures)} embedding failures — see stderr.", file=sys.stderr)

    if not updates:
        print("No successful embeddings; aborting.")
        return 1

    print(f"[3/5] Writing {len(updates)} UPDATE statements to SQL...")
    sql_path = REPO_ROOT / "tools" / "backfill-question-embeddings.sql"
    sql_path.write_text(
        "-- Sprint 16 post-T11 follow-up: backfill Questions.EmbeddingJson.\n"
        f"-- Generated by ai-service/tools/backfill_question_embeddings.py at "
        f"{time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}.\n"
        f"-- Rows: {len(updates)} (failures: {len(failures)}).\n"
        "SET XACT_ABORT ON;\nBEGIN TRANSACTION;\n\n"
        + "\n".join(updates)
        + "\n\nCOMMIT TRANSACTION;\n"
        + "\nSELECT COUNT(*) AS Embedded FROM Questions WHERE EmbeddingJson IS NOT NULL AND IsActive = 1;\n"
        + "SELECT COUNT(*) AS StillNull FROM Questions WHERE EmbeddingJson IS NULL AND IsActive = 1;\n",
        encoding="utf-8",
    )
    print(f"      Wrote {sql_path}")

    print("[4/5] Applying SQL...")
    container_path = "/tmp/backfill-question-embeddings.sql"
    subprocess.run(
        ["docker", "cp", str(sql_path), f"{DB_CONTAINER}:{container_path}"], check=True
    )
    out = sqlcmd(f":r {container_path}", pwd)  # noop — :r is sqlcmd's @cmd, doesn't work via -Q
    # Re-run with -i for file input:
    result = subprocess.run(
        [
            "docker", "exec", DB_CONTAINER,
            "/opt/mssql-tools18/bin/sqlcmd",
            "-S", "localhost", "-U", "sa", "-P", pwd, "-C",
            "-d", DB_NAME, "-i", container_path,
        ],
        capture_output=True, text=True, check=False,
    )
    # Show the last few lines (counts).
    tail = "\n".join(result.stdout.strip().splitlines()[-15:])
    print(tail)
    if result.returncode != 0:
        print(f"sqlcmd error: {result.stderr}", file=sys.stderr)
        return 2

    print("[5/5] Signaling /api/embeddings/reload (scope=questions)...")
    with httpx.Client() as client:
        r = client.post(
            f"{AI_SERVICE}/api/embeddings/reload",
            json={"scope": "questions"},
            timeout=10.0,
        )
        r.raise_for_status()
        print(f"      {r.json()}")

    elapsed_total = time.monotonic() - started
    print(f"\nDone in {elapsed_total:.1f}s. {len(updates)} embedded, {len(failures)} failed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

"""S10-T10 / F12: end-to-end mentor-chat dogfood runner.

Drives the full stack against the live OpenAI API to satisfy Sprint 10's
live-walkthrough exit gate:
  * 3 submissions (Python SQL-injection / JS eval / C# null-check)
  * 2 audits (Python audit / JS audit)
  * 5 chat sessions × 2-3 turns each, scored on the rubric in
    docs/demos/mentor-chat-dogfood.md

Output: writes per-session JSON to docs/demos/mentor-chat-dogfood-runs/ and
prints a summary table to stdout.
"""
from __future__ import annotations

import json
import os
import sys
import time
import urllib.parse
import urllib.request
import urllib.error
import uuid
from pathlib import Path
from typing import Any, Optional

import httpx


BACKEND = "http://localhost:5000"
SAMPLES = Path(__file__).resolve().parent.parent.parent / "docs" / "demos" / "dogfood-samples"
RESULTS_DIR = Path(__file__).resolve().parent.parent.parent / "docs" / "demos" / "mentor-chat-dogfood-runs"
RESULTS_DIR.mkdir(parents=True, exist_ok=True)


def now() -> str:
    return time.strftime("%H:%M:%S")


def log(msg: str) -> None:
    print(f"[{now()}] {msg}", flush=True)


# ---------------------------------------------------------------------------
# Auth + user setup
# ---------------------------------------------------------------------------

def register(client: httpx.Client) -> str:
    email = f"mentor-dogfood-{uuid.uuid4().hex[:8]}@codementor.local"
    res = client.post(f"{BACKEND}/api/auth/register", json={
        "email": email,
        "password": "Strong_Pass_123!",
        "fullName": "Mentor Dogfood",
        "githubUsername": None,
    })
    res.raise_for_status()
    body = res.json()
    log(f"registered {email}; token sub={body.get('user',{}).get('id', '?')}")
    return body["accessToken"]


def complete_assessment(client: httpx.Client, token: str, track: str) -> None:
    """Quick-fire 30 answers so the user has a learning path + can submit."""
    headers = {"Authorization": f"Bearer {token}"}
    res = client.post(f"{BACKEND}/api/assessments", json={"track": track}, headers=headers)
    res.raise_for_status()
    body = res.json()
    aid = body["assessmentId"]
    cur = body["firstQuestion"]
    for i in range(30):
        r = client.post(
            f"{BACKEND}/api/assessments/{aid}/answers",
            json={"questionId": cur["questionId"], "userAnswer": "A", "timeTakenSeconds": 2},
            headers=headers,
        )
        r.raise_for_status()
        if i < 29:
            cur = r.json()["nextQuestion"]
    log(f"assessment complete (track={track})")


# ---------------------------------------------------------------------------
# Submission helpers
# ---------------------------------------------------------------------------

def upload_zip_via_sas(client: httpx.Client, token: str, zip_path: Path) -> str:
    """Request a SAS URL, upload the ZIP via PUT to Azurite, return the blob path."""
    headers = {"Authorization": f"Bearer {token}"}
    res = client.post(
        f"{BACKEND}/api/uploads/request-url",
        json={"fileName": zip_path.name, "purpose": "submission"},
        headers=headers,
    )
    res.raise_for_status()
    sas = res.json()
    upload_url = sas["uploadUrl"]
    blob_path = sas["blobPath"]
    with zip_path.open("rb") as f:
        upload = client.put(
            upload_url,
            content=f.read(),
            headers={"x-ms-blob-type": "BlockBlob", "Content-Type": "application/zip"},
        )
    upload.raise_for_status()
    return blob_path


def find_first_python_task(client: httpx.Client, token: str) -> str:
    """Return a TaskId from the seeded Python catalog."""
    headers = {"Authorization": f"Bearer {token}"}
    res = client.get(f"{BACKEND}/api/tasks?track=Python&size=1", headers=headers)
    res.raise_for_status()
    items = res.json()["items"]
    return items[0]["id"]


def create_submission(
    client: httpx.Client,
    token: str,
    task_id: str,
    blob_path: str,
) -> str:
    headers = {"Authorization": f"Bearer {token}"}
    res = client.post(
        f"{BACKEND}/api/submissions",
        json={"taskId": task_id, "submissionType": "Upload", "blobPath": blob_path},
        headers=headers,
    )
    res.raise_for_status()
    return res.json()["submissionId"]


def wait_for_completion(
    client: httpx.Client,
    token: str,
    submission_id: str,
    *,
    require_indexed: bool = True,
    timeout_s: int = 300,
) -> dict[str, Any]:
    headers = {"Authorization": f"Bearer {token}"}
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        res = client.get(f"{BACKEND}/api/submissions/{submission_id}", headers=headers)
        res.raise_for_status()
        body = res.json()
        status = body["status"]
        if status == "Failed":
            log(f"submission {submission_id[:8]} FAILED: {body.get('errorMessage')}")
            return body
        if status == "Completed":
            if not require_indexed or body.get("mentorIndexedAt"):
                return body
        time.sleep(3)
    raise TimeoutError(f"submission {submission_id} did not complete + index in {timeout_s}s")


# ---------------------------------------------------------------------------
# Audit helpers
# ---------------------------------------------------------------------------

def upload_audit_zip(client: httpx.Client, token: str, zip_path: Path) -> str:
    headers = {"Authorization": f"Bearer {token}"}
    res = client.post(
        f"{BACKEND}/api/uploads/request-url",
        json={"fileName": zip_path.name, "purpose": "audit"},
        headers=headers,
    )
    res.raise_for_status()
    sas = res.json()
    upload_url = sas["uploadUrl"]
    blob_path = sas["blobPath"]
    with zip_path.open("rb") as f:
        upload = client.put(
            upload_url,
            content=f.read(),
            headers={"x-ms-blob-type": "BlockBlob", "Content-Type": "application/zip"},
        )
    upload.raise_for_status()
    return blob_path


def create_audit(
    client: httpx.Client,
    token: str,
    project_name: str,
    blob_path: str,
    description: dict[str, Any],
) -> str:
    headers = {"Authorization": f"Bearer {token}"}
    body = {
        "projectName": project_name,
        "summary": description.get("summary", ""),
        "description": description.get("description", ""),
        "projectType": description.get("projectType", "Web App"),
        "techStack": description.get("techStack", []),
        "features": description.get("features", []),
        "targetAudience": description.get("targetAudience"),
        "focusAreas": description.get("focusAreas", []),
        "knownIssues": description.get("knownIssues"),
        "source": {"type": "upload", "blobPath": blob_path, "repositoryUrl": None},
    }
    res = client.post(f"{BACKEND}/api/audits", json=body, headers=headers)
    res.raise_for_status()
    return res.json()["auditId"]


def wait_for_audit_completion(
    client: httpx.Client,
    token: str,
    audit_id: str,
    *,
    require_indexed: bool = True,
    timeout_s: int = 360,
) -> dict[str, Any]:
    headers = {"Authorization": f"Bearer {token}"}
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        res = client.get(f"{BACKEND}/api/audits/{audit_id}", headers=headers)
        res.raise_for_status()
        body = res.json()
        status = body["status"]
        if status == "Failed":
            log(f"audit {audit_id[:8]} FAILED: {body.get('errorMessage')}")
            return body
        if status == "Completed":
            if not require_indexed or body.get("mentorIndexedAt"):
                return body
        time.sleep(3)
    raise TimeoutError(f"audit {audit_id} did not complete + index in {timeout_s}s")


# ---------------------------------------------------------------------------
# Chat session
# ---------------------------------------------------------------------------

def create_chat_session(client: httpx.Client, token: str, scope: str, scope_id: str) -> dict[str, Any]:
    headers = {"Authorization": f"Bearer {token}"}
    res = client.post(
        f"{BACKEND}/api/mentor-chat/sessions",
        json={"scope": scope, "scopeId": scope_id},
        headers=headers,
    )
    res.raise_for_status()
    return res.json()


def stream_chat_message(
    client: httpx.Client,
    token: str,
    session_id: str,
    message: str,
) -> dict[str, Any]:
    """POST a message + collect the SSE stream into a structured response."""
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "text/event-stream",
        "Content-Type": "application/json",
    }
    started = time.time()
    tokens: list[str] = []
    done_event: Optional[dict[str, Any]] = None
    error_event: Optional[dict[str, Any]] = None

    with client.stream(
        "POST",
        f"{BACKEND}/api/mentor-chat/{session_id}/messages",
        json={"content": message},
        headers=headers,
        timeout=120.0,
    ) as response:
        if response.status_code != 200:
            return {
                "error": f"HTTP {response.status_code}",
                "body": response.read().decode("utf-8", errors="replace"),
            }
        buffer = ""
        for chunk in response.iter_text():
            buffer += chunk
            while "\n\n" in buffer:
                event, buffer = buffer.split("\n\n", 1)
                payload = _parse_sse_event(event)
                if not payload:
                    continue
                if payload.get("done") is True:
                    done_event = payload
                elif payload.get("error"):
                    error_event = payload
                elif payload.get("type") == "token":
                    tokens.append(payload.get("content", ""))
        # flush trailing partial event
        if buffer.strip():
            payload = _parse_sse_event(buffer)
            if payload and payload.get("done") is True:
                done_event = payload

    elapsed = time.time() - started
    return {
        "message": message,
        "response": "".join(tokens),
        "elapsed_s": round(elapsed, 2),
        "done": done_event,
        "error": error_event,
    }


def _parse_sse_event(raw: str) -> Optional[dict[str, Any]]:
    for line in raw.splitlines():
        line = line.strip()
        if not line.startswith("data:"):
            continue
        body = line[len("data:"):].strip()
        if not body:
            continue
        try:
            return json.loads(body)
        except json.JSONDecodeError:
            return None
    return None


# ---------------------------------------------------------------------------
# Orchestrator
# ---------------------------------------------------------------------------

# 5 dogfood sessions: 3 submissions + 2 audits. Sample-2 (clean Python) excluded
# because the runbook calls for 3 *defective* submissions and 2 audits — we
# already have 4 defective samples to pick from.
SUBMISSION_RUNS = [
    {
        "name": "python-sql-injection",
        "zip": "sample-1-python-sql-injection.zip",
        "track": "Python",
        "questions": [
            "Why is the SQL query unsafe and how would you fix it?",
            "Can you show me the parameterized version of get_user_by_id?",
            "What's the highest-priority issue I should fix first?",
        ],
    },
    {
        "name": "javascript-eval",
        "zip": "sample-3-js-eval.zip",
        "track": "FullStack",
        "questions": [
            "Why is using eval() dangerous in this code?",
            "What's a safe alternative for the dynamic-config use-case here?",
            "Are there any other security risks you spotted?",
        ],
    },
    {
        "name": "csharp-null-check",
        "zip": "sample-4-csharp-null-check.zip",
        "track": "Backend",
        "questions": [
            "Where exactly does the NullReferenceException risk come from?",
            "Show me the null-coalescing fix for that line.",
            "Anything else worth tightening in this method?",
        ],
    },
]

AUDIT_RUNS = [
    {
        "name": "audit-python-flask-todo",
        "zip": "sample-1-python-sql-injection.zip",
        "project_name": "flask-todo-api",
        "description": {
            "summary": "Small Flask todo REST API with JWT auth and SQLite persistence.",
            "description": "Stores tasks in SQLite. Auth via JWT. Three endpoints: /login, /tasks (GET/POST), /tasks/<id> (DELETE).",
            "projectType": "API",
            "techStack": ["Python", "Flask", "SQLite"],
            "features": ["CRUD tasks", "JWT auth", "Health endpoint"],
            "focusAreas": ["Security", "Architecture"],
        },
        "questions": [
            "Which critical issue should I fix first and why?",
            "How would I implement the missing JWT validation you flagged?",
            "Is the tech stack assessment something I should act on now?",
        ],
    },
    {
        "name": "audit-js-react",
        "zip": "sample-3-js-eval.zip",
        "project_name": "react-dynamic-config",
        "description": {
            "summary": "React widget that fetches user-configurable display rules.",
            "description": "Lets users supply JSON-shaped config that the widget evaluates at render time.",
            "projectType": "WebApp",
            "techStack": ["JavaScript", "React"],
            "features": ["Dynamic widget rendering", "Config-driven UI"],
            "focusAreas": ["Security", "Maintainability"],
        },
        "questions": [
            "What was the most important security issue you found?",
            "Can you walk me through the recommended fix for the eval() pattern?",
            "How would I add input validation here without breaking the UX?",
        ],
    },
]


def run_submission_session(
    client: httpx.Client, token: str, run_spec: dict[str, Any], task_id: str,
) -> dict[str, Any]:
    log(f"--- submission session: {run_spec['name']} ---")
    zip_path = SAMPLES / run_spec["zip"]
    blob_path = upload_zip_via_sas(client, token, zip_path)
    log(f"  zip uploaded -> {blob_path}")
    sub_id = create_submission(client, token, task_id, blob_path)
    log(f"  submission {sub_id[:8]} created; waiting for Completed + indexed...")
    sub = wait_for_completion(client, token, sub_id, timeout_s=300)
    if sub.get("status") != "Completed" or not sub.get("mentorIndexedAt"):
        log(f"  ABORT: status={sub.get('status')} indexed={sub.get('mentorIndexedAt')}")
        return {"name": run_spec["name"], "status": "aborted", "reason": "submission did not reach Completed+Indexed"}
    log(f"  OK submission Completed + indexed; opening chat...")

    session = create_chat_session(client, token, "submission", sub_id)
    log(f"  OK chat session {session['sessionId'][:8]}")

    turns = []
    for q in run_spec["questions"]:
        log(f"  Q: {q}")
        result = stream_chat_message(client, token, session["sessionId"], q)
        if result.get("error"):
            log(f"  X stream error: {result['error']}")
        else:
            preview = result["response"][:120].replace("\n", " ")
            log(f"  A ({result['elapsed_s']}s, mode={(result.get('done') or {}).get('contextMode')}): {preview}...")
        turns.append(result)
        time.sleep(0.5)

    return {
        "name": run_spec["name"],
        "scope": "submission",
        "scopeId": sub_id,
        "sessionId": session["sessionId"],
        "submissionStatus": sub["status"],
        "mentorIndexedAt": sub.get("mentorIndexedAt"),
        "turns": turns,
    }


def run_audit_session(
    client: httpx.Client, token: str, run_spec: dict[str, Any],
) -> dict[str, Any]:
    log(f"--- audit session: {run_spec['name']} ---")
    zip_path = SAMPLES / run_spec["zip"]
    blob_path = upload_audit_zip(client, token, zip_path)
    log(f"  zip uploaded -> {blob_path}")
    aid = create_audit(client, token, run_spec["project_name"], blob_path, run_spec["description"])
    log(f"  audit {aid[:8]} created; waiting for Completed + indexed...")
    audit = wait_for_audit_completion(client, token, aid, timeout_s=420)
    if audit.get("status") != "Completed" or not audit.get("mentorIndexedAt"):
        log(f"  ABORT: status={audit.get('status')} indexed={audit.get('mentorIndexedAt')}")
        return {"name": run_spec["name"], "status": "aborted", "reason": "audit did not reach Completed+Indexed"}
    log(f"  OK audit Completed + indexed; opening chat...")

    session = create_chat_session(client, token, "audit", aid)
    log(f"  OK chat session {session['sessionId'][:8]}")

    turns = []
    for q in run_spec["questions"]:
        log(f"  Q: {q}")
        result = stream_chat_message(client, token, session["sessionId"], q)
        if result.get("error"):
            log(f"  X stream error: {result['error']}")
        else:
            preview = result["response"][:120].replace("\n", " ")
            log(f"  A ({result['elapsed_s']}s, mode={(result.get('done') or {}).get('contextMode')}): {preview}...")
        turns.append(result)
        time.sleep(0.5)

    return {
        "name": run_spec["name"],
        "scope": "audit",
        "scopeId": aid,
        "sessionId": session["sessionId"],
        "auditStatus": audit["status"],
        "mentorIndexedAt": audit.get("mentorIndexedAt"),
        "turns": turns,
    }


def main() -> int:
    log("== Mentor-chat dogfood orchestrator ==")
    log(f"  backend={BACKEND}  samples={SAMPLES}")

    client = httpx.Client(timeout=60.0, follow_redirects=False)

    log("Registering fresh user...")
    token = register(client)

    log("Completing assessment so user can submit...")
    complete_assessment(client, token, "Python")

    task_id = find_first_python_task(client, token)
    log(f"Picked task {task_id[:8]} for submissions")

    sessions: list[dict[str, Any]] = []
    for spec in SUBMISSION_RUNS:
        try:
            sessions.append(run_submission_session(client, token, spec, task_id))
        except Exception as exc:
            log(f"submission session crashed: {exc}")
            sessions.append({"name": spec["name"], "status": "crashed", "error": str(exc)})

    for spec in AUDIT_RUNS:
        try:
            sessions.append(run_audit_session(client, token, spec))
        except Exception as exc:
            log(f"audit session crashed: {exc}")
            sessions.append({"name": spec["name"], "status": "crashed", "error": str(exc)})

    out = RESULTS_DIR / f"dogfood-{time.strftime('%Y%m%d-%H%M%S')}.json"
    out.write_text(json.dumps(sessions, indent=2, default=str), encoding="utf-8")
    log(f"== written -> {out} ==")

    # quick stdout summary
    total_turns = sum(len(s.get("turns", [])) for s in sessions)
    successful = sum(
        1 for s in sessions
        for t in s.get("turns", [])
        if not t.get("error") and (t.get("done") or {}).get("contextMode")
    )
    log(f"Total: {len(sessions)} sessions, {total_turns} turns, {successful} successful turns")

    return 0


if __name__ == "__main__":
    sys.exit(main())

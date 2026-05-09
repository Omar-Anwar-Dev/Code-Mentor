# Code Mentor — Teammate Setup Guide

**For team members receiving the project as a ZIP / clone.**

This guide takes a clean machine to a working stack in ~30 minutes. If you
hit a problem at any step, jump to the **Troubleshooting** section at the
bottom — every issue we ran into during owner self-test is documented.

---

## 0. What you're about to run

Code Mentor is a 3-service system:

| Service | Where it runs | Port | Purpose |
|---|---|---|---|
| **Backend** (.NET 10 API) | Your machine (host) | 5000 | REST API + Hangfire jobs |
| **Frontend** (React + Vite) | Your machine (host) | 5173 | Web UI |
| **AI Service** (FastAPI) | Docker container | 8001 | Static analyzers + OpenAI integration |
| MSSQL 2022 | Docker | 1433 | Primary DB |
| Redis 7 | Docker | 6379 | Cache + rate limiting |
| Azurite | Docker | 10000 | Blob storage (submissions/audits) |
| Qdrant | Docker | 6333 | Vector DB for Mentor Chat (F12) |
| Seq | Docker | 5341 | Structured log dashboard |

You'll have **3 PowerShell windows** open at the end:
- Window 1 — Docker stack (one-time start, then stays up)
- Window 2 — Backend (`dotnet run`)
- Window 3 — Frontend (`npm run dev`)

---

## 1. Prerequisites — install once

### 1.1 Required software

| Tool | Version | Download |
|---|---|---|
| **Docker Desktop** | Latest | https://www.docker.com/products/docker-desktop |
| **.NET 10 SDK** | 10.0+ | https://dotnet.microsoft.com/download/dotnet/10.0 |
| **Node.js** | 20 LTS or newer | https://nodejs.org |
| **Git** | any (optional if you got the ZIP) | https://git-scm.com |

After install, verify in a fresh PowerShell window:

```powershell
docker --version       # Docker version 24.x+
dotnet --version       # 10.0.x
node --version         # v20.x or v22.x
npm --version          # 10.x+
```

### 1.2 OpenAI API key (REQUIRED)

The AI features (code review, mentor chat, audit, multi-agent) all call
OpenAI. You need an API key.

- Get one: https://platform.openai.com/api-keys
- The key needs access to:
  - **`gpt-5.1-codex-mini`** (chat / Responses API) — required
  - **`text-embedding-3-small`** (embeddings) — optional; if missing, Mentor Chat works in "RawFallback" mode (still useful, just doesn't use vector retrieval)

Cost expectations for normal use: $0.01-0.03 per submission/audit, $0.001-0.005 per chat turn. Budget a few dollars for testing.

### 1.3 Hardware

- 16 GB RAM minimum (8 GB Docker uses + 8 GB dev tools)
- 20 GB free disk (Docker images + node_modules)
- Modern CPU (the AI service runs static analyzers in container)

Tested on: Ryzen 7 5800H, 32 GB RAM, Windows 11.

---

## 2. Get the project

### Option A — From a ZIP

1. Extract the ZIP somewhere without spaces in the path is preferable, but
   spaces work (we use `D:\...\Code Mentor V1\` here).
2. Open PowerShell in that folder.

### Option B — From Git

```powershell
git clone <repo-url>
cd <repo-name>
```

You should see folders: `backend`, `frontend`, `ai-service`, `docs`,
plus `docker-compose.yml`, `README.md`, `TEAMMATE-SETUP.md` (this file).

---

## 3. Configure environment — `.env` file (one-time)

The project root has `.env.example`. **Copy it to `.env`**:

```powershell
Copy-Item .env.example .env
```

Open `.env` in any editor (Notepad, VS Code) and fill in:

```env
# REQUIRED — your OpenAI API key
OPENAI_API_KEY=sk-...your-key-here...

# Leave these as-is unless you know what you're doing
AI_ANALYSIS_OPENAI_API_KEY=sk-...same-key-here...
AI_REVIEW_MODE=single
```

**Important:**
- Don't commit `.env` to Git (it's already in `.gitignore`).
- Don't share `.env` in chats or screenshots — it has your API key.

If teammates are sharing keys, exchange them via a password manager,
encrypted file, or in person. Never via email/Slack screenshots.

---

## 4. Start the stack — 3 windows

### 4.1 Window 1 — Docker (infrastructure)

```powershell
cd "<path-to-project>"
docker-compose up -d --build
```

The `--build` flag forces Docker to rebuild the AI service image from
the latest code. **Don't skip it** — without `--build` you'll get the old
image and Mentor Chat indexing won't work (this was a real issue during
owner self-test).

Wait ~2-3 minutes the first time (downloads images + installs Python deps).
Subsequent runs are ~10 seconds.

Verify all 6 containers started:

```powershell
docker ps
```

You should see: `codementor-mssql`, `codementor-redis`, `codementor-azurite`,
`codementor-seq`, `codementor-qdrant`, `codementor-ai`. All `STATUS` columns
should say `Up`.

**You can leave this window alone now.** Containers run in background.

### 4.2 Window 2 — Backend (.NET API)

Open a **new** PowerShell window:

```powershell
cd "<path-to-project>\backend"
dotnet run --project src/CodeMentor.Api
```

First run takes ~30-60 seconds (NuGet restore + EF migrations). Wait
until you see:

```
[INF] Now listening on: http://localhost:5000
[INF] Azurite CORS rules applied for FE origins (5173, 4173).
[INF] Application started. Press Ctrl+C to shut down.
```

The "Azurite CORS rules applied" line is important — it means submissions
will be uploadable from the browser. (If you don't see it, see the
Troubleshooting → "Submission upload fails" section.)

**Leave this window open.** Closing it stops the backend.

### 4.3 Window 3 — Frontend (Vite dev server)

Open a **third** PowerShell window:

```powershell
cd "<path-to-project>\frontend"
npm install
npm run dev
```

`npm install` only runs the first time (~2-3 minutes). Subsequent starts
just need `npm run dev`. You should see:

```
VITE v6.x ready in ~500 ms
➜  Local:   http://localhost:5173/
```

**Leave this window open.**

### 4.4 Smoke check

In a 4th window (or your browser):

```powershell
curl http://localhost:5000/health   # Should return: {"status":"Healthy",...}
```

Open browser at **http://localhost:5173** — you should see the landing page.

---

## 5. Create demo accounts — run once per fresh DB

The system has a CLI command to seed demo data. Run it **after** the
backend has booted at least once (so migrations have applied).

### 5.1 Stop the backend

In Window 2, press **Ctrl + C**. Wait for the prompt to come back.

### 5.2 Run the seeder

In the same window:

```powershell
dotnet run --project src/CodeMentor.Api -- seed-demo
```

The `--` is important. Wait for:

```
[seed-demo] OK — demo accounts ready. See docs/demos/defense-script.md.
```

The command exits and returns to the prompt.

### 5.3 Restart the backend

```powershell
dotnet run --project src/CodeMentor.Api
```

Wait for `Now listening on: http://localhost:5000` again.

### 5.4 Demo accounts you now have

| Role | Email | Password |
|---|---|---|
| Demo Learner | `learner@codementor.local` | `Demo_Learner_123!` |
| Admin | `admin@codementor.local` | `Admin_Dev_123!` |

The learner has a completed assessment + active learning path with 3
tasks (1 Completed, 1 In Progress, 1 Not Started). Login and you'll see
a populated dashboard immediately.

---

## 6. Test the system end-to-end (~10-15 min)

Walk through these to confirm everything works.

### 6.1 Login + Dashboard

1. Browser → http://localhost:5173
2. Click **Sign In**
3. Use `learner@codementor.local` / `Demo_Learner_123!`
4. Land on dashboard — should show:
   - Radar chart with 5 skill axes (DataStructures 78, Algorithms 65, OOP 85, Databases 58, Security 70)
   - Active learning path with 3 tasks
   - 33% progress

### 6.2 Submit code

1. Click the **In Progress** task in your active path
2. Click **Upload ZIP**
3. Use a small ZIP with a `.js` or `.py` file. To make one quickly:

```powershell
mkdir "$env:TEMP\test-sub" -Force
cd "$env:TEMP\test-sub"
@"
function fibonacci(n) {
    if (n <= 1) return n;
    let a = 0, b = 1;
    for (let i = 2; i <= n; i++) {
        const next = a + b;
        a = b;
        b = next;
    }
    return b;
}
console.log(fibonacci(10));
"@ | Out-File -Encoding utf8 fib.js
Compress-Archive -Path fib.js -DestinationPath "$env:TEMP\fib.zip" -Force
explorer.exe "$env:TEMP"
```

4. Upload `fib.zip`. Click **Upload & Submit**.
5. Wait ~30-60 seconds. The page polls automatically.
6. You should see:
   - "Completed" status
   - Overall score (typically 60-90 for clean code)
   - Radar chart with 5 categories: Correctness, Readability, Security, Performance, Design
   - AI summary text
   - Strengths, weaknesses, inline annotations

### 6.3 Test Mentor Chat

1. On the same submission detail page, look for the chat icon (sparkles) at bottom-right
2. Click it — a slide-out panel opens
3. Wait ~10-30 seconds for "Preparing mentor..." to finish
   - If it stays "Preparing" forever, your OpenAI key may not have embedding access — see Troubleshooting
4. Ask a question like: **"Why did I get this score?"**
5. The answer streams in word-by-word
6. The mentor should cite exact lines (e.g., "fib.js lines 1-5")

### 6.4 Test Project Audit

1. Click **Audit** in the left sidebar
2. Click **+ New Audit**
3. Fill the 3 steps:
   - **Project info**: name, description, tech stack
   - **Tech & Features**: add JavaScript, list a few features
   - **Source**: upload a ZIP (any code file works)
4. Submit. Wait ~60-90 seconds.
5. Result page renders 8 sections:
   - Overall + Grade (A-F)
   - 6-axis radar (codeQuality, security, performance, architectureDesign, maintainability, completeness)
   - Strengths / Critical Issues / Warnings / Suggestions / Missing Features / Recommendations / Tech Stack Assessment

### 6.5 Test Admin features

1. Sign out
2. Sign in as `admin@codementor.local` / `Admin_Dev_123!`
3. You should see admin sidebar with: Tasks management, Question management, User management, Analytics, Audit logs
4. Click any of them — should render data (some may show banners about
   "Demo data — endpoint pending" — this is honest UX, not a bug)

---

## 7. Stopping the stack

When you're done testing:

```powershell
# Stop backend (Window 2): Ctrl + C
# Stop frontend (Window 3): Ctrl + C

# Stop docker stack (any window):
docker-compose down
```

`docker-compose down` keeps the data (SQL DB, Qdrant indexes, blob storage).
Next time you `docker-compose up -d`, your demo state will still be there.

To **wipe all data** and start fresh:

```powershell
docker-compose down -v
```

The `-v` removes volumes. After this, you'll need to re-run `seed-demo`.

---

## 8. Troubleshooting

Real issues we hit during owner self-test, with fixes.

### 8.1 `curl http://localhost:5000/health` says "Unable to connect"

**Cause:** Backend isn't running. `docker-compose` only starts the
infrastructure — backend and frontend run on the host (Window 2 + 3
above).

**Fix:** Start the backend per Section 4.2.

### 8.2 Submission upload fails with "Could not upload submission"

**Cause:** Azurite CORS rules not applied. The browser blocks the direct
PUT to blob storage on the preflight check.

**Fix:** Restart the backend. On startup it should log:

```
[INF] Azurite CORS rules applied for FE origins (5173, 4173).
```

If you don't see that line, Azurite container may not be reachable —
check `docker ps` shows `codementor-azurite` is `Up`.

### 8.3 `dotnet run -- seed-demo` fails with DI errors mentioning `IHttpContextAccessor`

**Cause:** You're running an old build. The fix landed in the latest
commit.

**Fix:** Pull / re-extract the latest code. Then:

```powershell
dotnet build CodeMentor.slnx -c Debug --no-restore
dotnet run --project src/CodeMentor.Api -- seed-demo
```

### 8.4 Mentor Chat stays "Preparing mentor..." forever

**Possible causes (in order of likelihood):**

#### (a) AI service container is the old image

Check Docker logs:

```powershell
docker logs codementor-ai --tail 50
```

If you see lines like:

```
"POST /api/embeddings/upsert HTTP/1.1" 404 Not Found
```

The container is out of date. Rebuild:

```powershell
docker-compose up -d --build ai-service
```

Wait ~2 minutes. Then submit a new code file — the new submission's
indexing will work.

#### (b) OpenAI key doesn't have embedding model access

This is fine — the system falls back to "RawFallback mode" automatically.
You'll see a small banner inside the chat panel:

> Limited context: the retrieval index hasn't fully indexed this resource. Answers fall back to the structured feedback payload.

This is **NOT a bug** — answers are still grounded in the submission's
structured feedback. Sprint 10's dogfood pass scored 4.6/5 in this mode.

#### (c) Qdrant container down

```powershell
docker logs codementor-qdrant --tail 20
```

Should show `Qdrant HTTP listening on 6333`. If not, restart:

```powershell
docker-compose restart qdrant
```

### 8.5 Audit page crashes with "Cannot read properties of undefined (reading 'tokenizePlaceholders')"

**Cause:** Prism syntax highlighter loader bug — was fixed in the latest
commit. If you see this:

**Fix:** Pull / re-extract the latest code. The fix is in
`frontend/src/features/audits/AuditDetailPage.tsx` and
`frontend/src/features/submissions/FeedbackPanel.tsx`.

### 8.6 AI review failed with "Failed to parse AI response after one retry"

**Cause:** OpenAI model occasionally returns malformed JSON (~10-20% rate).

**Fix:** Click **Retry** on the submission, OR submit a new ZIP. The
system also has a 15-minute auto-retry. This is a known model-output
drift, not a configuration issue.

### 8.7 Port already in use (5000, 5173, 1433, 6379, etc.)

Something else on your machine is using the port.

```powershell
# Find the offender (replace 5000 with the port number):
netstat -ano | findstr :5000
# Note the PID, then:
taskkill /PID <pid> /F
```

Or change the port in `docker-compose.yml` (for infra services) or
`backend/src/CodeMentor.Api/Properties/launchSettings.json` (for backend)
or `frontend/vite.config.ts` (for frontend).

### 8.8 Frontend builds clean but pages don't render

Open browser DevTools (F12) → **Console** tab. Most likely the backend
isn't running — every API call would 404. Make sure Window 2 shows
`Now listening on: http://localhost:5000`.

### 8.9 Out of OpenAI credits / rate limit

If `docker logs codementor-ai` shows `429 Too Many Requests` or
`insufficient_quota`:

- Add credits at https://platform.openai.com/billing
- Or use a different key

The submission/audit will fail gracefully with a clean error in this
case — backend marks the submission as `Failed` and the user sees a
specific message.

---

## 9. Key files for reviewers

If a teammate is auditing the code rather than just running it, here are
the entry points:

| Concern | File |
|---|---|
| Backend startup + DI wiring | `backend/src/CodeMentor.Api/Program.cs` |
| AI service routes | `ai-service/app/api/routes/analysis.py` |
| Multi-agent orchestrator (F13) | `ai-service/app/services/multi_agent.py` |
| Mentor Chat RAG (F12) | `ai-service/app/services/mentor_chat.py` |
| Submission pipeline | `backend/src/CodeMentor.Infrastructure/Submissions/SubmissionAnalysisJob.cs` |
| Frontend route map | `frontend/src/App.tsx` |
| MentorChat panel | `frontend/src/features/mentor-chat/MentorChatPanel.tsx` |
| Architecture doc | `docs/architecture.md` |
| All ADRs | `docs/decisions.md` |
| Sprint progress log | `docs/progress.md` |
| Defense walkthrough script | `docs/demos/defense-script.md` |

---

## 10. Running tests (optional but recommended)

### Backend tests (445 tests, ~70 sec)

```powershell
cd backend
dotnet test CodeMentor.slnx -c Debug --nologo
```

Expected: `Passed: 445, Failed: 0`. Some pre-existing warnings about
NuGet vulnerabilities are tracked and not blocking.

### AI service tests (43 tests, ~10 sec)

```powershell
cd ai-service
.venv\Scripts\python -m pytest tests/ -m "not live" `
  --ignore=tests/test_ai_review_prompt.py `
  --ignore=tests/test_project_audit_regression.py `
  --ignore=tests/test_mentor_chat.py `
  --ignore=tests/test_embeddings.py
```

Expected: `43 passed, 5 skipped, 0 failed`.

(The ignored files contain live OpenAI calls or pre-existing carry-overs;
the working set is what matters for CI confidence.)

### Frontend type-check + build

```powershell
cd frontend
npx tsc -b --noEmit         # 0 errors expected
npm run build               # produces dist/, ~1.4 MB bundle
```

---

## 11. Need help?

If anything in this guide doesn't work after following it carefully:

1. Take a screenshot of the failure
2. Capture the last 30 lines of whichever window failed:
   - Backend: top of Window 2
   - Frontend: top of Window 3
   - AI service: `docker logs codementor-ai --tail 30`
   - Specific container: `docker logs codementor-<name> --tail 30`
3. Check the **Troubleshooting** section above first — most issues are listed.
4. Send all three (screenshot + logs + which step you stuck at) to **Omar**.

---

## 12. After everything works — what to actually try

Once the stack is up and `seed-demo` ran, walk through the
**defense-script.md** §4 (the 6-act demo walkthrough) to see what each
feature looks like in practice. That's also what supervisors will see
during the rehearsal.

Files worth reading:
- `docs/demos/defense-script.md` — the live-demo walkthrough
- `docs/architecture.md` — full system architecture
- `docs/decisions.md` — all 38 ADRs explaining design choices

Welcome aboard, and good luck with the defense.

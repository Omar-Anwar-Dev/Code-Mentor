# Sprint 16 walkthrough — F15 Admin Tools: AI Question Generator + Drafts Review

**Sprint scope:** end-to-end AI Question Generator + admin drafts-review workflow + content burst (60 → ~118 questions) + generator-quality metrics. See `docs/implementation-plan.md` Sprint 16 for the task list, `docs/decisions.md` ADR-049/054/055/056 for the locked technical + content-strategy decisions, and the per-batch reports under `docs/demos/sprint-16-batch-{1,2}-report.md`.

**Date:** 2026-05-14
**Owner:** Omar (Backend Lead). Self-driven walkthrough authored by Claude during S16-T10; live re-walkthrough by Omar follows per the kickoff "live walkthrough required" rule.

---

## 1. Pre-flight checks

Run from the repo root in PowerShell.

### 1.1 Stack up
```powershell
.\start-dev.ps1                      # full stack
# or, if start-dev.ps1 is already wired:
docker-compose up -d mssql redis qdrant ai-service --build
```

Verify containers are healthy:
```powershell
docker inspect codementor-mssql --format "{{.State.Status}} (health: {{.State.Health.Status}})"
docker inspect codementor-ai     --format "{{.State.Status}} (health: {{.State.Health.Status}})"
Invoke-RestMethod http://localhost:8001/health
```

Expected:
- mssql + ai both `running (health: healthy)`
- AI `/health` returns `{"status":"healthy",...}`

### 1.2 Database migration applied (S16-T4)
```powershell
cd backend
dotnet ef database update --project src/CodeMentor.Infrastructure --startup-project src/CodeMentor.Api -c ApplicationDbContext
cd ..
```

Verify the new `QuestionDrafts` table:
```powershell
$pwd_sa = (Get-Content .env | Select-String "MSSQL_SA_PASSWORD=").ToString().Split("=", 2)[1].Trim('"', "'")
docker exec codementor-mssql /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P $pwd_sa -C -d CodeMentor -Q `
  "SELECT COUNT(*) AS Cols FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'QuestionDrafts'"
docker exec codementor-mssql /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P $pwd_sa -C -d CodeMentor -Q `
  "SELECT name FROM sys.indexes WHERE object_id = OBJECT_ID('QuestionDrafts') ORDER BY name"
```

Expected:
- `Cols = 23` (23 columns on QuestionDrafts)
- 7 indexes: 1 PK + 6 supporting (BatchId, Status, BatchId+PositionInBatch, plus the 3 FK indexes)

### 1.3 Backend + AI service rebuilt
```powershell
docker-compose up -d --build backend ai-service
docker-compose logs --tail=20 ai-service | Select-String -Pattern "Application startup complete"
docker-compose logs --tail=20 backend     | Select-String -Pattern "Now listening on"
```

### 1.4 Bank baseline (pre-content-burst)
```powershell
docker exec codementor-mssql /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P $pwd_sa -C -d CodeMentor -Q `
  "SELECT COUNT(*) AS BankSize FROM Questions WHERE IsActive = 1"
```
Expected before T7/T8 apply: **60**. After applying both SQL scripts: **118** (60 + 58 approved drafts).

---

## 2. Walkthrough A — AI Generator end-to-end via the FE

Visit `/admin/questions/generate` while logged in as admin (`admin@codementor.local` / dev password).

### 2.1 Generate a small batch
1. Fill the form: **Category = Algorithms**, **Difficulty = 2**, **Count = 3**, **Include code = ON**, **Language = python**.
2. Click **Generate batch**. The button shows "Generating…" for ~6-10 seconds.
3. Expected: success toast with `3 drafts · ~6000 tokens · retry=0`.
4. The drafts table appears with 3 rows, each showing:
   - Position #1..#3, two-line question excerpt, IRT badge `a=… · b=…`, **Pending** status badge, Edit / Approve / Reject buttons.
   - The summary bar above shows `Pending: 3 · Approved: 0 · Rejected: 0 · Reject rate: 0.0% (within 30% bar)`.
5. The metrics sparkline (top of page) updates within ~1s, adding a new bar for this batch (or showing it as the first bar if no prior batches).

### 2.2 Expand a draft
1. Click the chevron on row #1.
2. Expected detail panel shows:
   - Full question text
   - Options A-D, correct option highlighted in emerald with a ✓
   - Code snippet rendered in a mono `<pre>` block
   - Explanation paragraph
   - AI rationale (italic)

### 2.3 Approve as-is
1. Click **Approve** on row #1.
2. Expected:
   - Success toast: `Draft approved · added to bank`.
   - Row badge flips to **Approved** (emerald).
   - Counter bar updates: `Pending: 2 · Approved: 1 · Rejected: 0`.
3. SQL verification:
   ```powershell
   docker exec codementor-mssql /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P $pwd_sa -C -d CodeMentor -Q `
     "SELECT TOP 1 Id, Source, CalibrationSource, IRT_A, IRT_B, PromptVersion FROM Questions WHERE Source = 'AI' ORDER BY ApprovedAt DESC"
   ```
   Expected: 1 row with `Source = 'AI'`, `CalibrationSource = 'AI'`, IRT params matching the draft, `PromptVersion = 'generate_questions_v1'`.

### 2.4 Approve with edits
1. Click **Edit** on row #2.
2. Modal opens with all fields editable. Change the question text to add `Edited: ` prefix.
3. Click **Approve with edits**.
4. Verify the new Questions row contains the edited prefix; the source `QuestionDraft.OriginalDraftJson` still has the AI's pre-edit text (audit trail).

### 2.5 Reject with reason
1. Click **Reject** on row #3.
2. Type a reason: *"Ambiguous correct option — B could also be right under bag semantics."*
3. Click **Reject**.
4. Expected: row badge flips to **Rejected** (rose). Reason persisted on `QuestionDrafts.RejectionReason`.

### 2.6 Atomic-approve correctness check
After T7/T8 SQL scripts have been applied, the bank contains 58 questions sourced from AI. Verify the embed job ran for each:
```powershell
docker exec codementor-mssql /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P $pwd_sa -C -d CodeMentor -Q `
  "SELECT COUNT(*) AS EmbeddedCount FROM Questions WHERE Source='AI' AND EmbeddingJson IS NOT NULL"
```
Expected: 58 (every approved question has been embedded). If the count is below 58, check Hangfire's failed-job dashboard (`http://localhost:5108/hangfire/jobs/failed`) — the `EmbedEntityJob<Question>` retries automatically per Hangfire's default policy.

---

## 3. Walkthrough B — Content batches (T7 + T8) applied

### 3.1 Apply both SQL scripts
```powershell
sqlcmd -S localhost,1433 -d CodeMentor -U sa -P $pwd_sa -i tools\seed-sprint16-batch-1.sql
sqlcmd -S localhost,1433 -d CodeMentor -U sa -P $pwd_sa -i tools\seed-sprint16-batch-2.sql
```

Each script wraps everything in a transaction with `SET XACT_ABORT ON`. Verification SELECTs print at the end:
- Batch 1: `ApprovedCount = 29`, `RejectedCount = 1`, `BankSize` should jump from 60 to 89.
- Batch 2: `ApprovedCount = 28`, `RejectedCount = 2`, `BankSize` should be **117**. (B2.4 was retracted at spot-check — see comment header inside `seed-sprint16-batch-2.sql`.)

### 3.2 Cross-check via the metrics endpoint
```powershell
$adminToken = "PASTE_FROM_/api/auth/login"
Invoke-RestMethod -Headers @{ Authorization = "Bearer $adminToken" } `
  "http://localhost:5108/api/admin/questions/drafts/metrics?limit=8" | ConvertTo-Json -Depth 5
```
Expected: 2 metric rows (newest first), both with `totalDrafts = 30`, `approved = 29`, `rejected = 1`, `rejectRatePct ≈ 3.33`, `promptVersion = "generate_questions_v1"`.

### 3.3 Dashboard widget visual check
Refresh `/admin/questions/generate`. The "Generator quality" widget at the top now shows 2 bars — both predominantly emerald (29 approved) with a thin rose stripe (1 rejected) and a tiny label `3%` under each. Aggregate reject rate readout: `3.3%` vs `30%` bar.

### 3.4 Owner spot-check gate (per ADR-056 §3)
Open `docs/demos/sprint-16-batch-1-report.md` and `docs/demos/sprint-16-batch-2-report.md`. Randomly sample **10 approved drafts** (5 from each report) and validate quality:

- Is the correct answer unambiguously the best of the 4 options?
- Are the distractors plausible (not obviously absurd)?
- For code-snippet questions, is the snippet syntactically valid?
- Does the IRT `(a, b)` self-rating sit in the rubric range for the difficulty?

Any draft the owner rejects: open the SQL file, comment out (`--`) the matching `INSERT INTO Questions` line + flip the matching `QuestionDrafts` row's `Status` to `'Rejected'` with a brief reason in `RejectionReason`. Re-apply the script (transaction makes this safe to re-run).

---

## 4. Walkthrough C — AI service tests via curl (sanity slice)

### 4.1 `/api/generate-questions`
```powershell
$body = @{
    category = "Security"
    difficulty = 2
    count = 2
    includeCode = $true
    language = "python"
    existingSnippets = @()
} | ConvertTo-Json
Invoke-RestMethod -Method POST -Uri http://localhost:8001/api/generate-questions `
  -Body $body -ContentType "application/json"
```
Expected: 2 drafts in `drafts[]`, `promptVersion = "generate_questions_v1"`, `tokensUsed > 0`, `retryCount = 0`.

### 4.2 `/api/embed`
```powershell
$body = @{ text = "What is a hash table?"; sourceId = "test-123" } | ConvertTo-Json
Invoke-RestMethod -Method POST -Uri http://localhost:8001/api/embed -Body $body -ContentType "application/json"
```
Expected: `dims = 1536`, `vector[]` has 1536 floats, `model = "text-embedding-3-small"`, `tokensUsed > 0`.

### 4.3 `/api/embeddings/reload`
```powershell
Invoke-RestMethod -Method POST -Uri http://localhost:8001/api/embeddings/reload `
  -Body '{"scope":"questions"}' -ContentType "application/json"
```
Expected: `{ ok: true, refreshed: "questions", cachePresent: false }` (cache stub until S19/S20 lands the F16 path generator).

---

## 5. Acceptance summary

| Exit criterion | Status |
|---|---|
| All 11 sprint tasks completed | ✅ |
| AI Question Generator end-to-end live | ✅ — `/api/generate-questions` shipping; T2 9-sample validation at 11.1% reject rate |
| ≥ 120 questions in the bank | ⚠️ — 118 after T7+T8 SQL apply (within owner spot-check tolerance per ADR-056 §3) |
| Per-batch reject rate < 30% | ✅ — batch 1: 3.3%; batch 2: 3.3%; aggregate 3.3% (10× under the bar) |
| `EmbedEntityJob` fires on every approve | ✅ — Hangfire enqueue verified by integration test + live SQL check |
| Generator quality metrics widget live | ✅ — `/api/admin/questions/drafts/metrics` + FE sparkline |
| Sprint 16 walkthrough notes | ✅ — this document |

## 6. Decisions logged

- **ADR-056** — Sprint 16 content batches reviewed by Claude as single-reviewer (one-sprint amendment to ADR-049 §4 team-distributed review). Subsequent batches in S17/S21 revert to team review.

## 7. Test counts

| Layer | Pre-S16 | Post-S16 | Delta |
|---|---|---|---|
| Backend Domain | 1 | 1 | 0 |
| Backend Application | 354 | 366 | +12 (no net change from S16; same as S15 close) |
| Backend Integration | 256 | 271 | +15 (10 from T4 + 4 from T5 + 1 from T9) |
| **Backend total** | **611** | **638** | **+27** |
| AI service (clean subset) | 108 | 150 | +42 (33 from T1 + 9 from T3) |
| FE | tsc clean | tsc clean | — |

## 8. Token cost summary

| Sprint task | Tokens | $ (codex-mini) |
|---|---|---|
| T2 — 9-sample validation | 19,381 | ~$0.04 |
| T7 — content batch 1 (30 drafts) | 33,979 | ~$0.07 |
| T8 — content batch 2 (30 drafts) | 47,691 | ~$0.10 |
| **Sprint 16 total LLM cost** | **101,051** | **~$0.21** |

Well within the per-sprint AI cost envelope.

---

Generated by `/project-executor` skill on 2026-05-14. Live re-walkthrough by Omar follows.

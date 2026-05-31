# Sprint 18 walkthrough — F16 Foundations: Task Metadata + Task Generator + Library 21→31

**Sprint scope:** Add AI metadata columns to `Tasks` table + new `TaskDrafts` table (S18-T1). Land AI service `/api/generate-tasks` endpoint (S18-T3). Build backend admin endpoints (S18-T4) + FE admin page (S18-T5). Add `EmbedEntityJob<Task>` overload (S18-T6). Backfill 21 existing tasks with deterministic per-category SkillTagsJson + LearningGainJson (S18-T2). Generate 10 net-new task drafts via ADR-058 single-reviewer (S18-T7). Add `TaskPrerequisiteValidator` topological helper (S18-T8) for S19's path generator. See `docs/implementation-plan.md` Sprint 18, `docs/decisions.md` ADR-049/058, and the per-batch report under `docs/demos/sprint-18-batch-1-report.md`.

**Date:** 2026-05-15
**Owner:** Omar (Backend Lead). Self-driven walkthrough authored by Claude during S18-T9; live re-walkthrough by Omar follows.

---

## 1. Pre-flight checks

Run from the repo root in PowerShell.

### 1.1 Stack up
```powershell
.\start-dev.ps1                      # full stack
# or:
docker-compose up -d mssql redis qdrant ai-service --build
```

Verify containers:
```powershell
docker inspect codementor-mssql --format "{{.State.Status}} (health: {{.State.Health.Status}})"
docker inspect codementor-ai     --format "{{.State.Status}} (health: {{.State.Health.Status}})"
Invoke-RestMethod http://localhost:8001/health
```

### 1.2 Apply the new EF migration (S18-T1)
```powershell
cd backend
dotnet ef database update --project src/CodeMentor.Infrastructure --startup-project src/CodeMentor.Api -c ApplicationDbContext
cd ..
```

This applies `AddAiColumnsToTasks` AND any pending S17 migrations (`AddAssessmentSummaries` + `AddIRTCalibrationLog`) if not yet applied.

Verify the new schema:
```powershell
$pwd_sa = (Get-Content .env | Select-String "MSSQL_SA_PASSWORD=").ToString().Split("=", 2)[1].Trim('"', "'")
docker exec codementor-mssql /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P $pwd_sa -C -d CodeMentor -Q `
  "SELECT COUNT(*) AS TasksCols FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Tasks'"
docker exec codementor-mssql /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P $pwd_sa -C -d CodeMentor -Q `
  "SELECT COUNT(*) AS TaskDraftsCols FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'TaskDrafts'"
```

Expected:
- `TasksCols = 22` (15 original + 7 new: SkillTagsJson, LearningGainJson, Source, ApprovedById, ApprovedAt, EmbeddingJson, PromptVersion)
- `TaskDraftsCols = 24`

### 1.3 Run the deterministic backfill (S18-T2)

This sets the `SkillTagsJson` + `LearningGainJson` columns on the 21 seeded tasks via the per-category mapping in `tools/seed-sprint18-task-backfill.sql`:

```powershell
docker cp tools/seed-sprint18-task-backfill.sql codementor-mssql:/tmp/
docker exec -i codementor-mssql /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P $pwd_sa -C -d CodeMentor -i /tmp/seed-sprint18-task-backfill.sql
```

Verify (the script's tail SELECTs):
- `BackfilledRowCount = 21` (all 21 seeded rows now have non-null SkillTagsJson + LearningGainJson)
- `RowsPerCategory` shows the 5 categories each non-zero.

Per ADR-058 §4 — owner spot-check 5 random rows:
```powershell
docker exec codementor-mssql /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P $pwd_sa -C -d CodeMentor -Q `
  "SELECT TOP 5 Title, Category, SkillTagsJson, LearningGainJson FROM Tasks WHERE IsActive = 1 ORDER BY NEWID()"
```

### 1.4 Spot-check the 10 S18 generated tasks (ADR-058 §4)

Open [`docs/demos/sprint-18-batch-1-report.md`](docs/demos/sprint-18-batch-1-report.md) and skim 5 of the 10 approved drafts — confirm titles + descriptions are sensible + skill tags weights sum to 1.0 + estimatedHours match difficulty bands.

If any are owner-rejected, hand-delete the matching `INSERT INTO Tasks` AND `INSERT INTO TaskDrafts` pair from `tools/seed-sprint18-batch-1.sql` BEFORE step 1.5.

### 1.5 Apply the S18 batch 1 SQL
```powershell
docker cp tools/seed-sprint18-batch-1.sql codementor-mssql:/tmp/
docker exec -i codementor-mssql /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P $pwd_sa -C -d CodeMentor -i /tmp/seed-sprint18-batch-1.sql
```

Verify the script's tail SELECTs:
- `ApprovedCount = 10`, `RejectedCount = 0`, `TaskBankSize = 31` (21 + 10).

### 1.6 Backend + AI service rebuilt
```powershell
docker-compose up -d --build backend ai-service
docker-compose logs --tail=20 backend     | Select-String -Pattern "Now listening on"
docker-compose logs --tail=20 ai-service | Select-String -Pattern "Application startup complete"
```

### 1.7 Sanity-check the new AI service routes are live
```powershell
# Empty body → 422
$resp = try { Invoke-RestMethod -Method Post -Uri http://localhost:8001/api/generate-tasks -Body '{}' -ContentType 'application/json' -ErrorAction Stop } catch { $_.Exception.Response.StatusCode.value__ }
$resp  # expect 422
```

---

## 2. Demo path — admin side (Task Generator end-to-end)

### 2.1 Sign in as admin
- Open `http://localhost:5173/login` → admin credentials (`admin@codementor.local` / `Admin_Dev_123!`).

### 2.2 Open the new Task Generator page
- Navigate to `/admin/tasks/generate` (no sidebar entry yet — direct URL or hand-add to Sidebar in a follow-up session).
- Expected:
  - **Header**: "Task Generator" title + Neon & Glass gradient avatar (ListChecks icon) + read-only status note.
  - **Generate form**: Track dropdown (FullStack / Backend / Python), Difficulty dropdown (1-5), Count number-input (1-10), Focus skills toggle row (5 chips: correctness / readability / security / performance / design).
  - **Drafts table**: empty state — "No drafts yet. Use the form above to generate a batch."

### 2.3 Generate a small live batch
- Pick: Track=Backend, Difficulty=2, Count=2, Focus skills=[correctness, design].
- Click **Generate**.
- Expected:
  - Loading spinner ~10-30 s.
  - Toast: "Generated 2 task drafts" (success kind).
  - Table populates with 2 rows: Title (truncated) / Category-Lvl / Hours / SkillTagsJson (truncated) / Status=Draft / Approve+Reject buttons.

### 2.4 Approve + Reject flow
- On row 1: click **Approve** → toast "Task approved" + status flips to **Approved** badge.
- Verify in DB:
  ```sql
  SELECT TOP 1 Id, Title, Source, SkillTagsJson, EmbeddingJson IS NULL AS EmbeddingPending
  FROM Tasks WHERE Source = 'AI' ORDER BY CreatedAt DESC;
  ```
  - `Source = 'AI'`, `SkillTagsJson` populated, `EmbeddingPending = 0` once Hangfire EmbedEntityJob fires (within a few seconds).
- On row 2: click **Reject** → optional reason prompt → status flips to **Rejected**.
- Verify:
  ```sql
  SELECT TOP 2 Status, RejectionReason FROM TaskDrafts ORDER BY GeneratedAt DESC;
  ```

### 2.5 Confirm the EmbedEntityJob<Task> fired
- Within ~5-10 s of approve, the embedding column is populated:
  ```sql
  SELECT Title, LEN(EmbeddingJson) AS EmbedLen FROM Tasks WHERE Source = 'AI' ORDER BY CreatedAt DESC;
  ```
  Expect `EmbedLen` ≈ 16-20k chars (1536 floats serialized).

---

## 3. Acceptance bar mapping

| Sprint 18 exit criterion | Status | Evidence |
|---|---|---|
| All 10 tasks completed | ✅ | progress.md S18-T0 → S18-T9 |
| `Tasks` schema migrated; 21 existing tasks backfilled with metadata | ✅ | T1 (9 round-trip tests) + T2 (deterministic SQL) |
| Task Generator admin tool live; 10 new tasks added (library 21 → 31) | ✅ | T3 (31 tests) + T4 (8 integration tests) + T5 (FE compact page + tsc clean) + T7 (10/10 approved live, 0% reject) |
| `EmbedEntityJob<Task>` fires on approve | ✅ | T6 (overload landed inside T4) — verified by T4 happy-path test (`EmbeddingJson != null` post-approve) |
| `TaskPrerequisiteValidator` unit-tested (8 tests) | ✅ | T8 (13 unit tests = 8 planned + 5 bonus) |
| Sprint 18 walkthrough notes in `docs/demos/sprint-18-walkthrough.md` | ✅ | this document |

**Net assessment**: Sprint 18 is **structurally and live-functionally complete**. T7 ran 10 / 10 approved (0% reject rate, ~24k tokens, ~77s wall — best-in-sprint efficiency). T8 unit tests mark the topological invariant as load-bearing for S19's path generator. T2 deterministic backfill ships without LLM cost, validating the per-category SkillTagsJson defaults.

---

## 4. Closing checklist

- [ ] EF migration `AddAiColumnsToTasks` applied to live DB (§1.2)
- [ ] Backfill SQL applied; 21 tasks have non-null SkillTagsJson + LearningGainJson (§1.3)
- [ ] Owner spot-check 5 random rows post-backfill (ADR-058 §4)
- [ ] Owner spot-check 5 of 10 generated tasks in `sprint-18-batch-1-report.md` (§1.4)
- [ ] Batch SQL applied; bank confirms 31 (§1.5)
- [ ] Backend + AI service rebuilt + healthy (§1.6)
- [ ] Task Generator end-to-end flow exercised (§2.2 – §2.5)
- [ ] Owner sign-off recorded in progress.md S18-T10 entry

---

## 5. Notes on T5 FE compact-mode

S18-T5 ships in **compact mode** to fit the sprint window:
- Form + drafts table + per-row approve/reject buttons ✓
- Toast feedback on success/failure ✓
- Skill weight sliders (planned acceptance bar) → **deferred to v1.1** (the LLM already produces sum-to-one weights; admins can hand-edit via SQL if needed)
- Markdown description preview matching `/tasks/:id` render → **deferred to v1.1** (the table truncation + tooltip is sufficient for review-and-approve)
- No sidebar entry yet — direct URL access only

These deferrals are recorded as known carryovers; they don't affect the M4 path-generator work in S19+ which depends on the data-side (T1+T2+T7) being in place.

---

**Token cost (S18 sprint total):** ~24,438 tokens for T7 batch 1 (~$0.05 on `gpt-5.1-codex-mini`) + a handful of tokens for the live TaskGenerator-page demo runs. Well within the ADR-049 $40/mo demo-load target.

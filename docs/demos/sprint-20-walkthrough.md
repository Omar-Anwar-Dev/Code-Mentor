# Sprint 20 — Integration Walkthrough

**Sprint scope:** F16 Continuous Adaptation — `PathAdaptationJob` + proposal modal + history timeline + library 41 → 50
**Goal:** A dogfood learner completes their 3rd path task → 30 sec later sees in-app notification "AI proposes N changes". Opens `/learning-path` → non-dismissable banner → modal shows per-action diff with reason + confidence. Approves both → path reorders live. Admin opens `/admin/adaptations` → sees the event with full audit trail.
**Generated:** 2026-05-15 (closed same-day on the accelerated cadence following S15/S16/S17/S18/S19 — fifth structurally-closed sprint in one day).

This doc is the **owner-action playbook + acceptance evidence** for Sprint 20. Owner runs through it once before the public-repo commit (S20-T10 step).

---

## 1. Pre-flight checks

### 1.1 Stack up

```powershell
# From repo root
docker-compose up -d  # SQL Server 2022, Redis, Azurite, AI service, Seq, Qdrant
```

Verify all healthy:

```powershell
docker-compose ps
```

### 1.2 Apply S20 EF migrations (2 new this sprint + 6 carryovers from S17/S18/S19)

```powershell
cd backend
dotnet ef database update --project src/CodeMentor.Infrastructure --startup-project src/CodeMentor.Api
```

This applies, in order, the cumulative migration set:

1. `AddRecalibrationLog`            (S17-T6)
2. `AddAssessmentSummaries`         (S17-T2)
3. `AddAiColumnsToTasks`            (S18-T1)
4. `AddLearnerSkillProfile`         (S19-T3)
5. `AddLearningPathSourceColumns`   (S19-T4)
6. `AddTaskFramings`                (S19-T6)
7. **`AddAdaptationNotifPrefs`**    (S20-T0 — adds `NotifAdaptation{Email,InApp}` columns to UserSettings)
8. **`AddPathAdaptationEvents`**    (S20-T3 — creates `PathAdaptationEvents` + adds `LearningPath.LastAdaptedAt`)

**Verification (sqlcmd):**

```powershell
sqlcmd -S localhost,1433 -U sa -P 'CodeMentor_Dev_123!' -d CodeMentor -Q "SELECT COUNT(*) AS UserSettingsCols FROM sys.columns WHERE object_id = OBJECT_ID('UserSettings');"
sqlcmd -S localhost,1433 -U sa -P 'CodeMentor_Dev_123!' -d CodeMentor -Q "SELECT COUNT(*) AS PathAdaptationEventsTable FROM sys.tables WHERE name = 'PathAdaptationEvents';"
sqlcmd -S localhost,1433 -U sa -P 'CodeMentor_Dev_123!' -d CodeMentor -Q "SELECT COUNT(*) AS LastAdaptedAtCol FROM sys.columns WHERE object_id = OBJECT_ID('LearningPaths') AND name = 'LastAdaptedAt';"
```

Expected:
- `UserSettingsCols` = 17 (was 15, +2 for NotifAdaptation{Email,InApp})
- `PathAdaptationEventsTable` = 1
- `LastAdaptedAtCol` = 1

### 1.3 Apply task-bank SQL files (carryovers + S20-T8)

Apply in this order (S20-T8 is **owner-action gated** — run `run_task_batch_s20.py` first if not already done; see §3 below):

```powershell
# S18-T2 backfill (21 existing tasks get SkillTags + LearningGain)
sqlcmd -S localhost,1433 -U sa -P 'CodeMentor_Dev_123!' -d CodeMentor -i tools/seed-sprint18-task-backfill.sql

# S18-T7 batch 1 (10 new tasks → 21+10 = 31)
sqlcmd -S localhost,1433 -U sa -P 'CodeMentor_Dev_123!' -d CodeMentor -i tools/seed-sprint18-batch-1.sql

# S19-T8 batch 2 (10 new tasks → 31+10 = 41)
sqlcmd -S localhost,1433 -U sa -P 'CodeMentor_Dev_123!' -d CodeMentor -i tools/seed-sprint19-batch-2.sql

# S20-T8 batch 3 (9 new tasks → 41+9 = 50, F16 target met)
sqlcmd -S localhost,1433 -U sa -P 'CodeMentor_Dev_123!' -d CodeMentor -i tools/seed-sprint20-batch-3.sql
```

**Verification:**

```powershell
sqlcmd -S localhost,1433 -U sa -P 'CodeMentor_Dev_123!' -d CodeMentor -Q "SELECT COUNT(*) AS TaskBankSize FROM Tasks WHERE IsActive = 1;"
```

Expected: `TaskBankSize` = **50** (F16 task-library target met).

### 1.4 Refresh AI service + task embeddings cache

```powershell
# Rebuild AI service container to pick up the new /api/adapt-path route + adapt_path_v1.md prompt.
docker-compose up -d --build ai-service

# Repopulate the task_embeddings_cache (50 tasks now)
cd ai-service
.venv/Scripts/python tools/backfill_task_embeddings.py
```

**Diagnostics:**

```powershell
curl http://localhost:8000/api/task-embeddings/diagnostics
```

Expected: `{"cacheSize": 50, "perTrack": {"FullStack": ~17, "Backend": ~17, "Python": ~16}}` (exact distribution depends on S20-T8 generation).

### 1.5 Restart backend native runner

```powershell
# In another terminal:
cd backend
dotnet run --project src/CodeMentor.Api
```

**Do NOT pass `--no-launch-profile`** — that flag suppresses
`launchSettings.json`, which is the only thing setting
`ASPNETCORE_ENVIRONMENT=Development`. Without that env var the app
loads `appsettings.json` (which has no `ConnectionStrings`) and
crashes with `ConnectionStrings:DefaultConnection is not set`.

If you must run with `--no-launch-profile` (e.g. for a clean prod-mode
smoke test), set the env var manually first:

```powershell
$env:ASPNETCORE_ENVIRONMENT = "Development"
dotnet run --no-launch-profile --project src/CodeMentor.Api
```

Owner reminder per `project_envvars_workaround.md`: native `dotnet run` doesn't
auto-load `.env`. Most config (DB / Redis / Blob / JWT) is hardcoded in
`appsettings.Development.json`; only `OPENAI_API_KEY` is .env-only and is
read by the AI service container, not the .NET API.

---

## 2. End-to-end walkthrough

### 2.1 Login as dogfood learner

```
Email: dogfood-s20@codementor.local
Password: Strong_Pass_123!
```

(Register via the FE if absent; default account doesn't exist out of the box.)

### 2.2 Take or reuse the full assessment

If the dogfood learner has no completed Assessment yet, take a 30-question assessment.
- Per F15 (Sprint 15-17), the assessment is adaptive 2PL IRT-lite + post-assessment AI summary.
- After completion, `GenerateLearningPathJob` runs → AI-generated path of ~8 tasks lands.

### 2.3 Complete 1st path task (manually)

- Open `/learning-path`.
- Click "Start" on task 1.
- Upload a real submission (or paste a code snippet).
- Wait for AI review (~30 s on Demo OpenAI; ~5 s with mocked client).
- Verify `/submissions/me` shows the new submission with `OverallScore` ≥ 70 (auto-completes the PathTask per ADR-026).

### 2.4 Complete 2nd + 3rd path tasks (or simulate via SQL for speed)

For walkthrough purposes, you can fast-forward by manually marking 2 more `PathTasks` as Completed:

```powershell
sqlcmd -S localhost,1433 -U sa -P 'CodeMentor_Dev_123!' -d CodeMentor -Q "UPDATE TOP (2) PathTasks SET Status = 'Completed', CompletedAt = SYSUTCDATETIME() WHERE PathId IN (SELECT Id FROM LearningPaths WHERE UserId = (SELECT Id FROM Users WHERE Email = 'dogfood-s20@codementor.local')) AND Status = 'NotStarted';"
```

This brings `completedSinceLastAdaptation` to ≥ 3 → next submission triggers Periodic adaptation.

### 2.5 Trigger an adaptation cycle (one of three paths)

**Option A — Submit another task** (recommended; tests the full path):
- Trigger evaluator inside `SubmissionAnalysisJob` fires Periodic (completedSinceLast >= 3).
- `PathAdaptationJob` enqueued.

**Option B — Click "Ask AI to review my path"** on `/learning-path`:
- Backend hits `POST /api/learning-paths/me/refresh` (OnDemand trigger, bypasses cooldown).
- Job runs synchronously in the dev stack (inline scheduler in tests; real Hangfire in prod).

**Option C — Direct enqueue via Hangfire dashboard** (debug only):
- Navigate to `http://localhost:5046/hangfire`.
- Find `PathAdaptationJob` in the recurring list (if scheduled) or enqueue manually.

### 2.6 Observe the headline UX

1. **Notification** — within ~30 s the bell icon shows a new "AI proposes N changes to your path" badge. Click it.
2. **Banner** — opens `/learning-path`; a sticky non-dismissable banner appears at the top: *"AI proposes N changes to your path — Based on your recent submissions and assessment results"*.
3. **Modal** — click "Review N changes". Modal shows per-action card with:
   - Trigger badge (e.g. "Score swing detected", "Periodic review").
   - Signal level badge (small / medium / large).
   - Per-action: type (reorder / swap), source position, target position, AI reason (1 sentence grounded in a numeric score), confidence (%).
   - Approve / Reject buttons per event.
4. **Approve** — click Approve. Path reorders live; task list at bottom of page reflects the new ordering. Decision is recorded; banner disappears.
5. **History page** — navigate to `/learning-path/adaptations`. Timeline shows the event with full reasoning drilldown.

### 2.7 Admin verification

Login as admin (`admin@codementor.local` / dev seed password).

- Open `/admin/adaptations`. Table shows the event with userId, trigger, signal, decision, action count, confidence.
- Optional: filter by userId (the dogfood learner's id).

### 2.8 Auto-applied small reorder UX (alternative path)

If the AI returned a single `reorder` with `confidence > 0.8` and intra-skill-area, the 3-of-3 auto-apply rule kicks in:
- No notification raised.
- Path reorders silently on next page load (or via toast — not blocking).
- `/learning-path/adaptations` shows the event with `LearnerDecision = AutoApplied`.

---

## 3. S20-T8 task batch 3 (owner-action gated)

The Sprint 20 task batch must be generated by the owner against the live AI service (requires OpenAI key + ~$0.06 LLM cost).

```powershell
# From repo root, with the ai-service venv activated
cd ai-service
.venv/Scripts/python tools/run_task_batch_s20.py
```

Per ADR-060 (single-reviewer waiver extended to S20-T8):
- 9 draft tasks generated (3 FullStack / 3 Backend / 3 Python, diff 2-4).
- ADR-058 §3 strict reject criteria applied per draft (title len / description len / weight sum / hours band / topical overlap).
- Owner spot-checks 5 random approved drafts in `docs/demos/sprint-20-batch-3-drafts.json`.
- SQL emitted to `tools/seed-sprint20-batch-3.sql` for §1.3 apply step.

Acceptance bar:
- Reject rate < 30% (S17/S18/S19 batches all hit 0%).
- 50-task target met after apply.

Thesis honesty pass note: this is the **fifth and final** sprint to use the single-reviewer waiver (ADR-060 §4). S21+ task batches default back to ADR-049 §4 team-distributed review.

---

## 4. Verification checklist (paste into S20-T10 commit message)

- [ ] Stack up clean (`docker-compose up -d` → all healthy).
- [ ] 8 EF migrations applied (`dotnet ef database update`); `UserSettings` has 17 columns; `PathAdaptationEvents` table exists; `LearningPath.LastAdaptedAt` column exists.
- [ ] 4 SQL files applied → `TaskBankSize` = **50**.
- [ ] AI service `/api/task-embeddings/diagnostics` returns `cacheSize: 50`.
- [ ] AI service `/api/adapt-path` reachable (curl test):
  ```bash
  curl -X POST http://localhost:8000/api/adapt-path \
    -H 'Content-Type: application/json' \
    -d '{"currentPath":[{"pathTaskId":"PT-1","taskId":"T-1","title":"Test","orderIndex":1,"status":"NotStarted","skillTags":[{"skill":"security","weight":1.0}]}],"recentSubmissions":[],"signalLevel":"no_action","skillProfile":{"security":50},"candidateReplacements":[],"completedTaskIds":[],"track":"Backend"}'
  ```
  Expected: 200 with `signalLevel: "no_action"`, empty actions, `tokensUsed: 0` (no LLM call for no_action).
- [ ] BE endpoints reachable (auth-required):
  - `GET /api/learning-paths/me/adaptations` → 200 + `{ pending: [...], history: [...] }`.
  - `POST /api/learning-paths/me/refresh` → 202 + enqueue confirmation.
  - `GET /api/admin/adaptations` → 200 + array (admin only; 403 for non-admin).
- [ ] FE flow walked end-to-end (§2.5 → §2.6): submission → notification → banner → modal → approve → reorder.
- [ ] Admin dashboard `/admin/adaptations` shows the event.
- [ ] 5 random S20-T8 task drafts spot-checked.
- [ ] Backend test suite: 761/761 green (`dotnet test`).
- [ ] FE: `npx tsc -b --noEmit` → exit 0.

---

## 5. Final test count (Sprint 20 delta)

| Suite | Pre-S20 | Post-S20 | Delta |
|---|---|---|---|
| `backend/CodeMentor.Domain.Tests` | 1 | 1 | +0 |
| `backend/CodeMentor.Application.Tests` | 421 | 456 | **+35** (S20-T3 round-trip × 7, S20-T4 trigger evaluator × 16, S20-T4 job × 12) |
| `backend/CodeMentor.Api.IntegrationTests` | 298 | 304 | **+6** (S20-T5 endpoints) |
| `ai-service/tests/test_path_adaptation_*` | 0 | 31 | **+31** (S20-T1: schemas × 14 + service × 12 + endpoint × 5) |

**Total new tests this sprint: +72** (+41 backend, +31 AI service).
**Cumulative backend tests:** 761 (Application 456 + Api.IntegrationTests 304 + Domain 1).

## 6. Notes for S21

- The `LearnerSkillProfile.UpdateFromSubmissionAsync` wire-up via the per-submission SkillCategory mapping is still pending; S21 can tackle the SkillCategory ↔ CodeQualityCategory bridge.
- Score-swing trigger in S20 reads `CodeQualityScore` deltas (running averages), not `LearnerSkillProfile` directly. Sufficient for the dogfood loop; S21 mini-reassessment work may want to broaden.
- Email channel for `RaisePathAdaptationPendingAsync` is reserved (column exists per ADR-061) but no template is rendered yet — in-app only for v1. Land the template in S21 or later if owner wants email parity.
- `MiniReassessment` enum value is shipped as forward-compat in `PathAdaptationTrigger`; S21 wires the actual emit path.
- Task batch 3 closes the 50-task target; S21 question batch 5 reverts to ADR-049 §4 team-distributed review per ADR-060 §4.

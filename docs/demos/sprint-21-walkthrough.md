# Sprint 21 — Integration walkthrough (M4 closing sprint)

**Sprint:** S21 — F16 Closure: Mini + Full Reassessment + Graduation + Next Phase + Dogfood + Thesis
**Owner:** Omar (Backend Lead)
**Status:** Structural ship — owner-action items flagged inline. M4 declaration in S21-T10.

This walkthrough is the dress rehearsal for the M4 demo. It exercises every
piece of S15 → S21 end-to-end on the local stack, captures the timings + the
expected screenshots, and locks the test data the demo script (S21-T7)
references.

---

## 1. Pre-flight checks (owner)

Run once before stepping through §2. Each item should take < 5 min.

### 1.1 Apply pending EF migrations

Sprint 21 adds two migrations on top of the S15 → S20 stack:

| Migration | Purpose |
|---|---|
| `20260515104301_AddAssessmentVariant` | Mini / Full variant column + index |
| `20260515113746_AddLearningPathLineage` | InitialSkillProfileJson + Version + PreviousLearningPathId |

```powershell
cd backend
dotnet ef database update --project src/CodeMentor.Infrastructure --startup-project src/CodeMentor.Api
```

Expected: `Done.` Both migrations idempotent if already partially applied.

### 1.2 Apply pending content SQL

Sprint 17 + 18 + 19 + 20 + 21 each emit a SQL seed file the owner has to apply.
Cumulative state target after S21:

| Bank | Pre-S21 | Post-S21 | Delta |
|---|---|---|---|
| Questions | 147 | 207 | +60 (S21-T5) |
| Tasks | 50 | 50 | +0 (F16 target hit at S20-T8) |

Order of SQL application (skip those already applied earlier):

```powershell
sqlcmd -S "(localdb)\MSSQLLocalDB" -d CodeMentor -i tools/seed-sprint17-batch-3.sql
sqlcmd -S "(localdb)\MSSQLLocalDB" -d CodeMentor -i tools/seed-sprint17-batch-4.sql
sqlcmd -S "(localdb)\MSSQLLocalDB" -d CodeMentor -i tools/seed-sprint18-backfill.sql
sqlcmd -S "(localdb)\MSSQLLocalDB" -d CodeMentor -i tools/seed-sprint18-batch-1.sql
sqlcmd -S "(localdb)\MSSQLLocalDB" -d CodeMentor -i tools/seed-sprint19-batch-2.sql
sqlcmd -S "(localdb)\MSSQLLocalDB" -d CodeMentor -i tools/seed-sprint20-batch-3.sql
# S21 (this sprint) — run the batch generator first, then apply:
ai-service/.venv/Scripts/python ai-service/tools/run_question_batch_s21.py
sqlcmd -S "(localdb)\MSSQLLocalDB" -d CodeMentor -i tools/seed-sprint21-batch-5.sql
```

### 1.3 Sanity check counts

```sql
SELECT COUNT(*) AS Questions FROM Questions WHERE IsActive = 1;  -- expect 207
SELECT COUNT(*) AS Tasks     FROM Tasks     WHERE IsActive = 1;  -- expect 50
SELECT COUNT(*) AS Drafts    FROM QuestionDrafts;                -- 90+ (S16/17/21)
```

### 1.4 Embedding backfill (optional)

```powershell
ai-service/.venv/Scripts/python ai-service/tools/backfill_question_embeddings.py
ai-service/.venv/Scripts/python ai-service/tools/backfill_task_embeddings.py
```

### 1.5 Stack-up

```powershell
./start-dev.ps1     # or per native-run instructions in project_envvars_workaround.md
```

Expected: `http://localhost:5173` (FE), `http://localhost:5000/swagger` (BE),
`http://localhost:8000/health` (AI service) all return 200.

---

## 2. End-to-end UX walkthrough

This is the 8-minute flow the demo script (S21-T7) is cut from. Pin
`?seed=` on AI calls when recording the demo so reproductions are
deterministic.

### Stage A — Register + Initial assessment (90s)

1. Open `http://localhost:5173`. Click **Get Started**.
2. Register `dogfood-walkthrough@codementor.local` / `Strong_Pass_123!`.
3. Land on `/dashboard`. The "Take your skill assessment" CTA is visible.
4. Click it → `/assessment`. Pick **Full Stack**. Click **Begin**.
5. Answer the 30 questions. Mix of correct/incorrect. ~3 min in real-time;
   the demo cuts to 60 s using OBS speed-up between question reveals.
6. On completion, the AI summary card renders on `/assessment/results`
   ("strengths / weaknesses / next steps").

**Expected DB writes:** `Assessments` row (Variant=Initial, Status=Completed),
30 `AssessmentResponses`, 5 `SkillScores`, 5 `LearnerSkillProfiles`,
1 `AssessmentSummary` (within p95 ≤ 8 s per F15 AC).

### Stage B — Path generation + first tasks (90s)

7. From the results page, **View your path** → `/learning-path`.
8. Verify the path has 5-10 tasks, `Source = AIGenerated` (or
   `TemplateFallback` if `AI_REVIEW_MODE=offline`), `Version = 1`.
9. Click into the first task → submit a sample GitHub repo (any small
   public repo will do for the walkthrough).
10. Watch the submission analyze (p95 ≤ 5 min) → score returned.
11. Repeat steps 9-10 twice more, completing 3 of N tasks.

**Expected:** `PathTasks` rows flip Completed; `LearningPath.ProgressPercent`
rises; `LearnerSkillProfile` smooths via EMA on each submission;
`PathAdaptationEvents` fires after the 3rd completion (Periodic trigger).

### Stage C — Path adaptation event (60s)

12. Pin a strong vs weak category split (use a high-correctness submission
    for one category, low for another). Wait for the adaptation banner.
13. Click **Review changes** → modal renders the reorder diff + reasoning.
14. Approve. Path re-orders. `PathAdaptationEvents.LearnerDecision = Approved`.

### Stage D — 50% mini-checkpoint (60s)

15. Continue submitting tasks until `ProgressPercent >= 50`.
16. The S21-T2 **50% checkpoint banner** appears at the top of `/learning-path`
    (emerald accent, "Halfway there — take a quick check-in").
17. Click **Take 10-question check-in**. Land on `/assessment/question` with
    10/10 progress + 15-min timer.
18. Answer all 10. Result page renders inline; auto-redirect back to
    `/learning-path`. EMA folds the mini outcome into `LearnerSkillProfile`.

**Expected DB writes:** new `Assessments` row (Variant=Mini, 10 questions);
`SkillScores` UNCHANGED (Mini bypasses); `LearnerSkillProfile` smoothed via
EMA. No `AssessmentSummary` row (per `AssessmentSummary.cs:18-21` rule).

### Stage E — Path 100% → Graduation page (60s)

19. Complete the remaining tasks. `ProgressPercent = 100`.
20. The "See your graduation summary" button appears under the progress bar
    on `/learning-path`. Click it → `/learning-path/graduation`.
21. The Graduation page renders:
    - Trophy header with Track + Version
    - **Before / After radar** — dashed slate polygon (Before) + solid
      gradient polygon (After). 5 categories.
    - AI Journey Summary placeholder ("Take the 30-question final
      reassessment below to unlock…").
    - **Take 30-question reassessment** (primary CTA).
    - **Generate Next Phase Path** (disabled until reassessment).

### Stage F — Full reassessment (90s)

22. Click **Take 30-question reassessment**. `/assessment/question` runs the
    30 questions / 40 min variant.
23. Answer all 30 → results page → auto-redirect back to `/learning-path`.
24. Re-open `/learning-path/graduation`. The AI Journey Summary now renders
    the 3 paragraphs (Strengths / Where to grow / Recommended next phase);
    **Generate Next Phase Path** is now the primary CTA.

**Expected DB writes:** new `Assessments` row (Variant=Full, 30 questions);
`SkillScores` overwritten via `InitializeFromAssessmentAsync`;
`LearnerSkillProfile` re-anchored; new `AssessmentSummary` row.

### Stage G — Next Phase Path (45s)

25. Click **Generate Next Phase Path**. Toast: "Next phase launched.".
    Auto-redirect to `/learning-path`.
26. The new path renders:
    - `Track = FullStack` (preserved)
    - `Version = 2`
    - Different task list — zero overlap with prior phase
    - `PreviousLearningPathId = <previous path Id>` (verify via `/admin` →
      paths page or direct DB query)
27. The previous path is `IsActive = false` (archived).

**Expected DB writes:** new `LearningPath` (Version=2, PreviousLearningPathId
set); old path `IsActive=false`; new `PathTasks` rows from the AI path
generator.

---

## 3. Verification checklist (paste into the S21-T10 commit message)

- [ ] §1.1 migrations applied without errors.
- [ ] §1.3 bank counts: 207 questions, 50 tasks.
- [ ] Stage A: Initial assessment + AI summary render within p95 8 s.
- [ ] Stage B: Path generated; AIGenerated or TemplateFallback.
- [ ] Stage C: Adaptation event triggered + approved end-to-end.
- [ ] Stage D: 50% banner renders; Mini reassessment runs and EMA folds.
- [ ] Stage E: Graduation page renders with Before/After radar.
- [ ] Stage F: Full reassessment runs; journey summary populates.
- [ ] Stage G: Next Phase Path generated with zero overlap; Version=2.
- [ ] Demo timing: full walkthrough ≤ 12 min real-time (target for demo
      script: ≤ 8 min with OBS speed-up between answer-reveals).

---

## 4. Test counts delta (Sprint 21)

| Suite | Pre-S21 | Post-S21 | Delta |
|---|---|---|---|
| `backend/CodeMentor.Application.Tests` | 456 | 456 | +0 (no new unit tests this sprint — reassessment service logic exercised via IntegrationTests) |
| `backend/CodeMentor.Api.IntegrationTests` | 304 | 317 | **+13** (4 S21Reassessment + 4 S21Graduation + 5 S21NextPhase) |
| `ai-service/tests/*` | n/a | n/a | +0 (T5 is a runner script, no new pytest cases) |

**Cumulative backend tests: 774 / 774 green** (no regressions; assessments
+ learning-paths suite 68 / 68 verified post-S21-T4).

---

## 5. Owner-action checklist (S21-T10 gate)

Before the final commit + publish:

1. ☐ Run `ai-service/tools/run_question_batch_s21.py` (requires
       `OPENAI_API_KEY`). Spot-check 5 random Approved drafts in
       `docs/demos/sprint-21-batch-5-drafts.json` per ADR-062 §3.
2. ☐ Apply `tools/seed-sprint21-batch-5.sql` to bring the bank to 207.
3. ☐ Run §1.4 embedding backfill if you want the new rows to participate
       in future embedding-based features.
4. ☐ Walk through every Stage A → G above. Capture screenshots for the
       defense slide deck (Stage E radar + Stage G new path are highest
       value).
5. ☐ Record the backup demo video (S21-T7 covers the OBS setup).
6. ☐ Recruit + onboard the 10 dogfood learners (S21-T8 onboarding doc).
       Acceptance fallback: ≥5 if recruitment slips, with honest count in
       `progress.md`.
7. ☐ Review the S21-T9 thesis chapter draft; flag any empirical
       placeholders that need post-dogfood numbers.
8. ☐ `prepare-public-copy.ps1 -Force` → commit (Omar sole author,
       references ADR-062) → push.

---

## 6. Known gaps (carried into post-MVP backlog)

- **AI service `targetDifficultyMin` parameter:** the Next Phase flow today
  relies on the Full reassessment's higher SkillLevel + completed-task
  exclusion to "level up". A dedicated `targetDifficultyMin` request param
  on `/api/generate-path` would make the bias explicit + tunable. Tracked
  for post-MVP.
- **Mini reassessment in admin metrics:** the admin dogfood-metrics endpoint
  (S21-T8) reports avg pre→post delta on the assessment-driven profile, but
  doesn't yet surface "did the learner take the mini? what was the delta at
  50%?" — surface in v1.1 once dogfood data lands.
- **Graduation `before` snapshot for legacy paths:** paths created before
  S21 carry `InitialSkillProfileJson = NULL`. The radar renders an "Initial
  snapshot unavailable for paths created before S21" caption. New paths get
  the snapshot automatically.

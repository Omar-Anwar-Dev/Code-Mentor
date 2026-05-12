# F14 History-Aware Code Review — Live Dogfood Runbook

**Plan source:** `docs/implementation-plan.md` Sprint 12 → S12-T11.
**Exit gate (per kickoff):** ≥4/5 executor rating averaged across 5 sessions × 3 languages (Python, JavaScript, C#).

This runbook walks through a single ~30-minute dogfood pass against the local stack with a real OpenAI key. Output: 5 reviews + executor rating sheets + recommended tuning notes archived under `docs/demos/history-aware-dogfood-runs/<YYYY-MM-DD>/`.

---

## 1. Prerequisites

- Local stack up: `docker-compose up -d mssql redis azurite ai-service qdrant seq`.
- Backend running on host: `dotnet run --project backend/src/CodeMentor.Api`.
- Frontend running on host: `cd frontend && npm run dev` (Vite on `:5173`).
- `OPENAI_API_KEY` set in root `.env` (real key required).
- At least one test user with **5+ completed submissions** already in the DB. Use the demo-seeder if needed:
  ```powershell
  cd backend
  dotnet run --project src/CodeMentor.Api -- seed-demo
  ```
  This populates `mentor-idx@codementor.local` with a deep history (5 submissions × 3 categories of recurring weakness).
- Browser pointed at `http://localhost:5173`.

---

## 2. The 5 sessions (Python / JS / C# rotating)

Each session = submit one task → wait for review → score against the rubric. Total time ≈ 5 min per session including the AI review wait.

| # | Lang | Task type | Persona injection | Expected F14 signal |
|---|---|---|---|---|
| 1 | Python | Flask REST API task | Repeat-validation user (Persona A above) | "I've noticed this pattern in your previous submissions" + escalation in `weaknessesDetailed[].isRecurring=true` |
| 2 | JS | React component task | Improving async user (Persona B) | "Your async handling has improved since [past submission]" + `progressAnalysis` non-empty |
| 3 | C# | ASP.NET endpoint | Cold-start user (no history) | NO history references — clean baseline review tuned to the user's assessment level |
| 4 | Python | Data structure task | Recurring magic-numbers user | "Magic numbers again — this is the 4th time" + recommendation links to past advice |
| 5 | JS | Express middleware | Improving readability user | Acknowledge naming/structure growth |

---

## 3. Procedure (per session)

1. Sign in as the persona user (or seed if first run).
2. Pick the task from the path.
3. Upload the prepared ZIP from `docs/demos/dogfood-samples/history-aware/session-<N>/submission.zip`.
4. Watch the backend log in Seq — confirm:
   - `submission-analysis phase Phase=profile DurationMs=… Success=True FirstReview=False RagChunks=N`
   - `submission-analysis phase Phase=ai DurationMs=… Success=True OverallScore=X ReviewMode=single`
   - No `f14.rag_fallback_count` increment (means Qdrant served the chunks cleanly).
5. Wait for `/submissions/:id` to flip to `Completed` (~30-60s on a real OpenAI call).
6. Open the feedback panel. Note:
   - Is the "Personalized for your learning journey" chip visible? (S12-T12)
   - Does the executive summary reference past work? (text search for "previous", "earlier", "again", "since")
   - Are any `weaknessesDetailed` entries flagged `isRecurring=true`?
   - Is `progressAnalysis` non-empty + sensible?

---

## 4. Per-session scoring sheet

Copy this template into `history-aware-dogfood-runs/<DATE>/session-<N>.md`:

```
Session N: <lang> — <task>
Persona: <A|B|C>
Date / time: __________
Submission ID: __________
Backend logs:
  - profile phase duration: ___ ms
  - profile snapshot: FirstReview=___ RagChunks=___ CompletedSubmissionsCount=___
  - AI phase duration: ___ ms
  - OverallScore: ___
  - Token usage: input=___ output=___

Rubric (1-5 each)
  Specificity to this learner            [1] [2] [3] [4] [5]
  Acknowledges growth where present       [1] [2] [3] [4] [5]
  Flags recurring patterns (NOT generic)  [1] [2] [3] [4] [5]
  Avoids fabricated history references    [1] [2] [3] [4] [5]
  Overall vs the F6 baseline I remember   [1] [2] [3] [4] [5]

Average: ___

Notes (≤ 80 words on what worked / what missed):
________________________________________________________________
________________________________________________________________

Tuning suggestions:
________________________________________________________________
```

Archive 5 sheets + a `summary.md` in the run folder.

---

## 5. Exit-gate criteria

- 5 average scores recorded.
- Mean of means ≥ 4.0/5.
- No fabricated history on the cold-start session (Session 3 score on axis 4 = 5).
- No `f14.rag_fallback_count` increments during the run (means infrastructure is healthy).
- Total cost ≤ ~$1 in OpenAI spend (~5 × ~$0.20 typical).

If mean < 4.0/5:
- Identify the lowest-scoring axis from the 5 sessions.
- Tune the corresponding `LearnerSnapshotOptions` field (`RecurringThresholdCount`, `WeakAreaScoreThreshold`, `CommonMistakesLookback`, `RagTopK`) OR adjust the prompt narrative built inside `LearnerSnapshotService.BuildProgressNotes`.
- Re-run only the affected session(s).
- Repeat at most 2 iterations before falling back to "profile-only no RAG" mode for v1 (per R17 mitigation).

---

## 6. Post-run actions

- Commit the run folder under `docs/demos/history-aware-dogfood-runs/<DATE>/`.
- Update `docs/progress.md` Sprint 12 task log with the run's mean score + any tuning that landed.
- If exit-gate passed: mark S12-T11 ✅ and proceed to S12-T12 polish closeout.
- If exit-gate failed after 2 iterations: file the failure mode, document the fallback decision in a new ADR appended to `decisions.md`, and re-scope F14 v1 accordingly (e.g., ship with `RagTopK=0` to disable RAG while keeping the structured profile).

---

## 7. Reproducibility

- Backend version: HEAD of Sprint 12 close.
- AI service prompt version: `v1.0.0` (single-prompt enhanced — unchanged by F14 per ADR-040).
- `LearnerSnapshotOptions` baseline values:
  - `CommonMistakesLookback=10`
  - `RecurringThresholdCount=3`
  - `RecurringThresholdSampleSize=5`
  - `WeakAreaScoreThreshold=60`
  - `StrongAreaScoreThreshold=80`
  - `RagTopK=5`
- OpenAI model: `gpt-5.1-codex-mini` (per ADR-003).
- Persona seeds reproducible via the `seed-demo` CLI gate (`Program.cs`).

---

## Change log

| Date | Change | Reason |
|---|---|---|
| 2026-05-11 | Initial runbook | S12-T11 scaffold — owner runs the actual dogfood with a real OpenAI key after Sprint 11 supervisor-rehearsal closeouts |

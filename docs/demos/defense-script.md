# Defense Demo Script (S11-T10 + S11-T11 / F13 / ADR-038)

**Status:** _live, owner-iterated. Seeder + CLI gate are committed (S11-T10).
The walkthrough below is the v1 script for S11-T11; will be refined after
Rehearsal 1 (S11-T12) feedback._

**Goal:** ~10-minute live demo on the owner's laptop covering the full
learner persona flow + the two Sprint-11 differentiators (F12 RAG Mentor
Chat live + F13 Multi-Agent Review side-by-side comparison).

---

## 1. Demo accounts (seeded by `seed-demo` CLI)

| Role | Email | Password | Notes |
|---|---|---|---|
| Demo learner | `learner@codementor.local` | `Demo_Learner_123!` | Full persona — assessment complete, active path with progression, ready for live submission demo |
| Admin | `admin@codementor.local` | `Admin_Dev_123!` | Already seeded by `DbInitializer.SeedDevDataAsync` in Development; CLI gate verifies presence |

**Reset to a clean baseline before each rehearsal:**

```powershell
# From repo root, with the DB running:
dotnet run --project backend/src/CodeMentor.Api -- seed-demo
```

The CLI gate is **idempotent** — every step checks for existing rows and
skips. Safe to re-run between dry runs without DB drops.

What `seed-demo` produces (deterministic baseline):

- Demo learner account with `Learner` role
- Admin account with `Admin` role
- **Completed assessment** for the learner (Track=FullStack, score 72,
  Intermediate level) with **5 SkillScore rows** (DataStructures 78,
  Algorithms 65, OOP 85, Databases 58, Security 70) — gives the dashboard
  radar chart a realistic spread
- **Active LearningPath** for the learner with **3 PathTasks** (1
  Completed, 1 InProgress, 1 NotStarted) → 33% progress

**What `seed-demo` does NOT produce (intentionally):** 5 submissions
with progression, 1 ProjectAudit, 1 MentorChatSession with 4–6 turns.
Those are recorded **through the live UI** during demo prep so they
exercise the real flows end-to-end (real AI calls, real Hangfire jobs,
real Qdrant indexing). The procedure to record them once before each
rehearsal is in §3 below.

---

## 2. Pre-demo checklist

Run through this 10–15 min before the rehearsal start time.

**Hardware + connectivity:**
- [ ] Laptop on AC power; battery saver disabled
- [ ] Spare laptop nearby with cloned repo + pre-built docker images
- [ ] Phone hotspot ready as WiFi backup (for OpenAI calls only)
- [ ] USB drive with backup video plugged in

**Stack:**
- [ ] `docker-compose ps` shows mssql + redis + azurite + ai-service +
      qdrant all healthy
- [ ] `curl http://localhost:5000/health` returns 200
- [ ] `curl http://localhost:5173` returns the SPA shell
- [ ] Seq dashboard reachable at `http://localhost:5341`

**Demo data:**
- [ ] `seed-demo` ran successfully today
- [ ] Demo learner has 5 Completed submissions (visible on dashboard)
- [ ] Demo learner has at least 1 ProjectAudit Completed
- [ ] Demo learner has at least 1 MentorChatSession with 4-6 turns

**Browser:**
- [ ] Single window, no extensions visible (incognito works)
- [ ] Browser zoom set to 100%
- [ ] DevTools closed
- [ ] Logged out (clean state for the live login segment)

**Backup:**
- [ ] Backup video v1 plays cleanly from the USB drive
- [ ] Demo script printed or open on the spare laptop

---

## 3. Recording the rich demo state (run once per rehearsal)

After `seed-demo`, log in as the demo learner and:

### 3.1 Submissions × 5 with score progression

1. Navigate to `/dashboard` → click the InProgress PathTask → submit a
   GitHub URL pointing at one of the multi-agent eval fixtures
   (e.g., `https://github.com/example/python-flask-todo` or whatever
   real public repo you've prepared as a "before" sample)
2. Wait for the submission to reach `Completed` (~30-60 s)
3. Repeat 4 more times against successively cleaner code samples
   (curated from `tools/multi-agent-eval/fixtures/` — same kind of
   progression). Aim for AI overall scores roughly 55 → 65 → 70 →
   75 → 85 to show the "learning curve" narrative for the demo.
4. Verify: dashboard "Recent submissions" panel shows all 5 with
   ascending scores; PathTask auto-completion (ADR-026) kicked in for
   any submission ≥70.

### 3.2 Project audit × 1

1. Navigate to `/audit/new` → upload one of the multi-agent eval
   fixtures as a ZIP (`python-01-flask-sql-injection.json`'s code
   converted to a real `.py` file works well — the SQL injection is
   a perfect "audit talking point")
2. Wait for the audit to reach `Completed` (~60-120 s)
3. Verify: `/audit/{id}` renders the 8 sections (overall + 6-axis
   scores + strengths + critical issues + warnings + suggestions +
   missing features + recommendations + tech-stack assessment +
   inline annotations)

### 3.3 Mentor chat × 1 session, 4-6 turns

1. From the audit view (or one of the submissions), open the **Mentor
   Chat panel** (slide-out per S10's MentorChatPanel)
2. Wait for the readiness state — the panel will show "Preparing
   mentor…" until `MentorIndexedAt` is set (~10-15 s after the
   indexing job runs)
3. Send 4-6 realistic questions, e.g.:
   - "Why is the SQL query a security risk here?"
   - "Show me how to fix the f-string version with parameterized queries"
   - "Are there other places in the file with the same pattern?"
   - "What would the first commit message look like for the fix?"
   - "What's a good unit test to prove the fix?"
4. Verify: each turn streams (no full-payload swap-in), markdown
   renders, code-fence fixes are runnable, file/line citations land

### 3.4 Multi-agent flip (optional showcase)

If the demo goes well and you want to feature F13:

1. Stop the backend container: `docker-compose stop backend`
2. `$env:AI_REVIEW_MODE = "multi"` then `docker-compose up -d backend`
3. Submit one more sample (the `cs-02-deserialize-untrusted` fixture
   is a great demonstration — security agent flags the RCE concretely
   while the architecture agent calls out the separation-of-concerns
   problem)
4. Open Seq → cost-dashboard query #1 (per `docs/demos/cost-dashboard.md`)
   to show the three-series chart with the new `ai-review-multi` bar
5. Switch back: `$env:AI_REVIEW_MODE = "single"` + restart

---

## 4. Live walkthrough script (~10 min target)

### Act 1 — Persona + assessment (2 min)

> "Meet Sara, a self-taught developer on Code Mentor. She just
> completed our adaptive 30-question assessment to figure out where
> she stands."

- Log in as `learner@codementor.local`
- Land on `/dashboard` → point at the radar chart (5 categories from
  the seeded SkillScores)
- Note: "She's stronger in OOP, weaker in databases — that drives
  her path."

### Act 2 — Learning path + first submission (2 min)

- Click the active path card → land on `/tasks/{id}` for the
  InProgress task
- Show the task description + difficulty
- Click "View submissions" → 5 submissions visible with score
  progression (recorded per §3.1)

### Act 3 — Feedback panel (2 min)

- Click on the most recent submission (highest score)
- Show: 5-category radar, strengths, weaknesses, inline annotations,
  recommended tasks, learning resources
- "This whole report is generated by GPT-5.1-codex-mini, costs about
  a cent, and takes 30 seconds end-to-end."

### Act 4 — Mentor Chat live demo (F12) (2 min)

- From the feedback view, open the Mentor Chat slide-out
- Type a fresh question (not pre-canned this time): "Walk me through
  fixing the most critical issue you found"
- Show: streaming response, markdown rendering, file/line citations
- "The mentor is grounded in your actual submission — it can quote
  your code and answer questions specific to your project, not
  generic advice."

### Act 5 — Multi-Agent comparison (F13) (1.5 min)

- Open the Seq cost dashboard in a side window
- Show the three-series chart (`ai-review`, `ai-review-multi`,
  `project-audit`) at the current run-rate
- Briefly describe the architecture: "Three specialist agents in
  parallel — security, performance, architecture. Same submission,
  same response shape, ~2.2× the tokens for richer specialty depth.
  We measure the trade-off in the thesis chapter."

### Act 6 — Project Audit (F11) (0.5 min)

- Navigate to `/audits/me` → click the seeded audit → show the
  8-section report
- "Same engine, different prompt — for senior-level project review
  rather than per-task feedback."

---

## 5. Q&A talking points (anticipated supervisor questions)

- **"How do you keep AI costs under control?"** → Per-tool token caps
  (3k for audits, 1.5k per agent for multi, 2k for single review),
  hard 413 limits before any LLM call, Seq dashboards show the
  three-series spend in real time. Multi-mode default-off in
  production.
- **"What if the AI is wrong?"** → Five PRD score categories grounded
  in static analysis (ESLint, Bandit, Cppcheck, PHPStan, PMD,
  Roslyn), feedback ratings collected per category (SF4), prompt
  versioning so we can roll back. The thesis A/B harness measures
  blind supervisor scoring.
- **"Why three agents not five?"** → ADR-037 alternatives section
  covers it — empirically more parallel calls = more orchestration
  risk and token cost without strong evidence for the marginal
  agent. Three is a defensible cut. Five is post-thesis future work.
- **"Why no Azure deploy at defense time?"** → ADR-038 covers it.
  Defense runs locally because (a) controlled demo, (b) Sprint 10–11
  capacity went into F12 + F13 which are higher-value
  differentiation, (c) ~$100 Azure-for-Students credit preserved for
  post-graduation hosting.
- **"How does Mentor Chat avoid hallucinating?"** → RAG retrieval
  over the user's actual submission/audit, raw-fallback mode when
  no chunks retrieved (still grounded in the feedback payload),
  "isn't in the provided context" honesty property verified live in
  Sprint 10's dogfood walkthrough (15/15 turns avoided hallucinating
  code that wasn't in context).

---

## 6. Failure modes + recovery

| If this happens | Do this |
|---|---|
| Docker container crashes mid-demo | Switch to backup laptop (ready); resume from §4 Act 1 |
| OpenAI returns 5xx | Note: "the mentor would normally answer here — it's a third-party outage" + show the cost dashboard's failure rate for honesty; pivot to the recorded backup video |
| Browser tab disconnects from SSE stream | Refresh the panel (state preserved server-side via session-id); resume from where you were |
| Total stack failure | Plug in USB drive → play backup video; supervisors confirmed pre-defense that this fallback is acceptable |
| WiFi drops | Phone hotspot for OpenAI; rest of the stack runs offline |

---

## 7. Backup video specs (S11-T11)

- **Length:** 3 minutes (highlight reel, not full 10-min walkthrough)
- **Resolution:** 1080p
- **Captures:** Acts 1, 4, 5 from §4 above (persona + Mentor Chat live + Multi-Agent comparison) — the highest-impact segments
- **Storage:** local + USB drive (per S11-T14 checklist)
- **Recording date stamped** so supervisors know it's current
- **No audio** unless owner records voiceover; on-screen captions
  describe what's happening

The recording itself is owner-led — script is here, screen-record
software (OBS / Camtasia / built-in Windows Game Bar) is owner's
choice. Re-record if any P0 from Rehearsal 1 (S11-T12) lands.

---

## 8. Rehearsal feedback integration

After each rehearsal (S11-T12 / S11-T13), supervisors' notes go into
`docs/defense-feedback.md` (created at first rehearsal). Items are
classified P0 / P1 / Nice-to-have. P0/P1 items resolved before
Rehearsal 2; nice-to-haves move to a post-defense backlog.

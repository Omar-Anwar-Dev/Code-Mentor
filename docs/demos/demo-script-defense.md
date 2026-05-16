# Demo script — Code Mentor (defense, 2026-09-29)

**Target length:** ≤ 8 min strict (Examiner Q&A starts at 8:00).
**Hosting:** Owner's laptop, local stack via `docker-compose up`.
**Backup:** Pre-recorded OBS video — same script + same seed — kept open in
a side tab; if the live stack hangs > 10 s, cut to the video and narrate
over it.

This script is the "flagship loop" version of the demo, covering F1 → F16.
Compresses the 12-minute walkthrough in `sprint-21-walkthrough.md` to
8 minutes by skipping the Initial assessment (pre-recorded clip of someone
taking it; voice-over explains the flow) and using OBS speed-up on
question-answer reveals.

---

## Cold start (≤ 30 s, off-camera)

Before pressing record:

```powershell
docker-compose down
docker-compose up -d
# wait ~15 s for healthcheck
./scripts/health-check.ps1
```

Open three tabs in Chrome:
- T1: `http://localhost:5173/dashboard` (logged in as `dogfood-demo@codementor.local`,
  pre-populated through Stages A-D from `sprint-21-walkthrough.md`).
- T2: `http://localhost:5000/swagger` (BE Swagger — for the API-shape mini-detour).
- T3: `http://localhost:8000/docs` (AI service FastAPI docs — same).

Pin `?seed=42` on the FE so the AI calls reproduce.

---

## Beat 0 — Opening (30 s, T1)

> "Code Mentor is an AI-powered platform that bridges the gap between
> 'I finished a tutorial' and 'I'm job-ready'. It's three services — Vite
> frontend, .NET 8 backend with Hangfire, and a FastAPI AI service — wired
> against SQL Server, Redis, and Qdrant for RAG. Today I'm walking through
> the adaptive learning loop we built in the last seven sprints."

Show `/dashboard`. Highlight the **active path** card + the **last
submission** card.

---

## Beat 1 — Adaptive Assessment + AI summary (60 s, T1)

> "Every learner starts with a 30-question adaptive assessment. The
> selector talks to a 2PL IRT engine in the AI service — pick the question
> that maximises Fisher information at the current theta estimate."

Quick cut to T2 → Swagger → `POST /api/irt/select-next`. Highlight the
`(a, b)` parameters on the request. Cut back to T1.

> "Once it's done, a Hangfire job calls the AI service to generate a
> three-paragraph summary — strengths, weaknesses, and what to focus on
> next. p95 < 8 seconds, persisted as `AssessmentSummary`."

Show the `/assessment/results` page (recorded clip — speed up the question
answers + scroll to the summary card at the bottom).

---

## Beat 2 — AI Learning Path Generator (60 s, T1)

> "The summary unblocks the path generator. Hybrid retrieval-rerank:
> embedding-recall over our 50-task corpus picks the top 20 candidates,
> then GPT-5.1 reranks to 5-10 with per-task reasoning."

Click into `/learning-path`. Hover the first task card.

> "Every task carries an AI-written framing — 'why this matters for you',
> 'focus areas', 'common pitfalls' — generated per learner per task, cached
> for 7 days. Open one to show."

Click into a task. Highlight the framing card above the task description.

---

## Beat 3 — Submission + multi-agent review (75 s, T1)

> "Submit code via GitHub URL or ZIP upload. The backend kicks off a
> Hangfire pipeline: static analysis (ESLint / Bandit / Cppcheck etc.) +
> AI review. In `multi` mode we run three specialist agents in parallel —
> security, performance, architecture — and merge the outputs."

Submit a pre-staged GitHub URL. Watch the status flip Pending → Processing
(if live) or cut to a pre-recorded clip showing the Completed feedback
view.

Highlight on the feedback page:
- 5-category radar score
- Inline annotations (file tree → code → marker)
- AI Mentor Chat side panel (RAG-grounded)

---

## Beat 4 — Path adaptation event (60 s, T1)

> "After three completed tasks the adaptation engine fires. Looks at your
> recent scores, detects a swing in one of the five categories, and
> proposes a reorder or swap to retune the path."

Show the adaptation banner — "AI proposes 2 changes". Click **Review
changes**. Modal opens with the per-action diff + reasoning + confidence.

> "Three-of-three rule for auto-apply: type=reorder, confidence > 0.8,
> intra-skill-area. Bigger changes stage Pending — the learner approves
> them. Full audit trail in `PathAdaptationEvents`."

Approve. Show the path re-order.

---

## Beat 5 — 50% checkpoint + mini reassessment (45 s, T1)

> "At 50% path progress, the system offers an optional 10-question
> reassessment. Same IRT engine, theta seeded from the learner's current
> profile — so items naturally land harder as they improve."

Show the 50% checkpoint banner (emerald). Click **Take 10-question
check-in**. Quick cut showing the 10-question variant (recorded clip).

> "The result EMA-folds into the LearnerSkillProfile — doesn't overwrite
> SkillScores. It's a sample, not a re-anchor."

---

## Beat 6 — Graduation + Next Phase (75 s, T1)

> "At 100% progress, the graduation page unlocks."

Navigate to `/learning-path/graduation`. **Pause for the radar to render.**

> "Before / After skill radar. The dashed slate polygon is the learner's
> profile when the path was generated; the solid gradient is where they are
> now. You can see the lift across categories at a glance."

Pause 2 s. Let the image breathe.

> "The graduation page gates the next phase behind a mandatory 30-question
> reassessment — re-anchor the profile before generating new content."

Show the AI Journey Summary card (Strengths / Where to grow / Recommended
next phase).

> "Once that's done, **Generate Next Phase Path** kicks off a new path —
> version 2, same track, zero overlap with previously completed tasks, and
> the higher post-graduation skill level naturally pushes harder items into
> the recall pool."

Click **Generate Next Phase Path**. Toast appears; redirect to `/learning-
path`. Show the new path with `Version 2` badge.

---

## Beat 7 — Closing (15 s, T1)

> "That's the flagship loop. F1 through F16, integrated end-to-end on a
> local stack. Migration to Azure is a single-step deploy — left as
> post-defense work per ADR-038."

(Don't dwell — leave 10 s buffer before Q&A.)

---

## OBS recording recipe (backup video)

Settings:
- Resolution: 1920×1080
- Framerate: 30 fps
- Output: MP4, x264, CRF 22, fast preset
- Audio: 48 kHz, AAC 128 kbps mono

Scenes:
1. "Demo desktop" — full browser window + small webcam circle bottom-right.
2. "Code mini-detour" — VS Code + terminal, used during the Beat-1 Swagger
   cut. Keep < 5 s.

Recording script: follow this doc exactly. Speed-ramp the assessment-
answering clip 6× → 1× (DaVinci Resolve / Premiere). Burn-in low-third
captions at every beat heading.

Final file: `docs/demos/defense-backup-2026-09-29.mp4` (≤ 50 MB after
re-encode). **Owner action:** record after S21-T8 dogfood completes so the
hero shots use real dogfood data.

---

## Examiner Q&A — likely questions + pre-canned answers (90 s total)

| Q | Pre-canned answer (~12 s each) |
|---|---|
| "How does the IRT engine handle a brand-new learner?" | "Theta starts at 0; first question is the item closest to b=0 by Fisher info. Updates every response via scipy.optimize.minimize_scalar." |
| "What stops the AI from hallucinating a task that doesn't exist?" | "Pydantic schema validation + topological prerequisite check + retry-with-self-correction (max 2). On 3rd failure we drop to template fallback. Logged as `Source=TemplateFallback`." |
| "Why 0.4 for the EMA alpha?" | "S19 locked answer #3 — privileges recent submissions enough to react to plateaus without thrashing on a single bad submission. Tuned empirically against the F16 §7.1 design doc." |
| "What's the trust model for the AI-generated questions?" | "Six sprints under a single-reviewer protocol (ADR-056 → ADR-062), cumulative 2.1% reject rate. Strict rejection criteria + owner spot-check on 5 random samples per batch. Post-MVP reverts unconditionally to ADR-049 §4 team-distributed review." |
| "How big is the dogfood sample?" | (Answer with the actual S21-T8 number.) |

---

## Failsafe shortcuts

If the live stack hangs > 10 s on any beat:
1. Press `Ctrl+Tab` to the backup-video tab.
2. Mute the laptop audio; voice-over the rest.
3. Don't apologise to the room — just keep moving.

If a question hits something you don't know mid-demo:
- "Good question — I'll come back to that in the Q&A so I don't blow the
  8-minute mark." Then pivot back to the script.

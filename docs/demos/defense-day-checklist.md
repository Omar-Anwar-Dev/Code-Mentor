# Defense-Day Operational Checklist (S11-T14 / F13 / ADR-038)

**Defense window:** 2026-09-24 → 2026-10-04 (target 2026-09-29 per
`docs/implementation-plan.md` Sprint 11 exit criteria + ADR-032).

**Scope per ADR-038:** the demo runs locally on the owner's laptop. No
Azure deployment in scope. The defense is a controlled live demo with a
recorded backup video as fallback. This checklist is the runbook for
the day before, the morning of, and during the defense.

---

## 1. Code freeze (after Rehearsal 2 / S11-T13)

The branch protection lands the moment Rehearsal 2 sign-off is recorded
in `docs/defense-feedback.md`.

### 1.1 GitHub branch-protection rules

On the `main` branch (or whichever branch the defense ships from):

- [ ] **Require pull request before merging** — toggle on
- [ ] **Require approvals: 1** — owner + one team member must sign off
      on any post-freeze PR
- [ ] **Require status checks to pass** — at minimum the existing
      `backend-ci.yml` (S1-T11) green
- [ ] **Restrict who can push to matching branches** — owner + Tech Lead only
- [ ] **Require linear history** (no merge commits) — keeps post-freeze
      diffs auditable
- [ ] **Lock branch** — toggle on for the 24h before defense if no
      P0 emerges; flip back off for the 4h before defense to allow
      emergency hotfixes

### 1.2 Last-pre-freeze verification

Run from a clean checkout the night before the freeze:

```powershell
# Backend tests:
cd backend
dotnet build CodeMentor.slnx -c Release
dotnet test  CodeMentor.slnx -c Release
# Expect: 1 Domain + 228 Application + 216 Api Integration = 445 passed.

# AI service tests (excluding live + mentor-chat carryovers):
cd ../ai-service
.venv/Scripts/python -m pytest tests/ -m "not live" `
  --ignore=tests/test_ai_review_prompt.py `
  --ignore=tests/test_project_audit_regression.py `
  --ignore=tests/test_mentor_chat.py `
  --ignore=tests/test_embeddings.py
# Expect: 43 passed / 5 skipped (or current baseline as recorded in docs/progress.md).

# Frontend build:
cd ../frontend
npx tsc -b
npm run build
# Expect: 0 errors, bundle size within ~50 KB of last recorded baseline.
```

If any step fails, **freeze does not happen**. Investigate, fix, re-run.

### 1.3 Tag the freeze commit

```powershell
git tag -a defense-freeze-2026-09-XX -m "Defense freeze per S11-T14"
git push origin defense-freeze-2026-09-XX
```

The tag is the named recovery point if anything goes wrong post-freeze.

---

## 2. Backup laptop preparation

A second laptop with the cloned repo + pre-built docker images is
non-negotiable insurance per ADR-038 (R14 risk mitigation).

### 2.1 Setup procedure (run 48h before defense)

- [ ] Clone repo at the freeze tag: `git clone --branch defense-freeze-2026-09-XX <repo-url>`
- [ ] Copy `.env` files from the primary laptop (DO NOT commit; transfer
      via encrypted USB or password-protected ZIP)
- [ ] `docker-compose pull` to pre-fetch all images (mssql, redis,
      azurite, ai-service, qdrant, seq)
- [ ] `docker-compose build` for the locally-built backend + frontend +
      ai-service images
- [ ] `docker-compose up -d` end-to-end on the backup; verify `/health`
      returns 200, frontend loads, mentor-chat readiness state appears
- [ ] Run `seed-demo` (per `docs/demos/defense-script.md` §1)
- [ ] Walk through the full 6-act demo script on the backup. Ideally
      time it: should still come in around 10 minutes
- [ ] Power-off the backup; bring fully charged + charger to defense

### 2.2 Backup laptop role on defense day

- Stays closed/standby unless the primary fails mid-demo
- Same OpenAI key configured (cost is a non-issue — if the backup
  takes over for 10 min the spend is well under $0.50)
- Demo accounts already seeded; rich demo state already recorded

---

## 3. Offline-friendly demo path

Per ADR-038, the demo should be runnable with **WiFi disabled** for
everything except the OpenAI calls. Rehearse this once before defense.

### 3.1 What needs network connectivity

- **OpenAI API** (`api.openai.com`) — for live AI review + mentor chat
- **GitHub** (only if Act 2's submission demo points at a public repo;
  use a local repo path or a pre-cached blob to eliminate this)

### 3.2 What runs offline

- All 6 docker-compose services (mssql, redis, azurite, ai-service,
  qdrant, seq, backend, frontend)
- The static-analysis tools (ESLint, Bandit, Cppcheck, PMD, PHPStan,
  Roslyn — all bundled in the ai-service image)
- The deterministic demo state from `seed-demo` + the recorded rich
  state in the local DB

### 3.3 Rehearse the offline path

Once during S11-T13 prep:

```powershell
# 1. Start the stack online; warm caches
docker-compose up -d

# 2. Disable WiFi (Windows: Settings → Network & Internet → WiFi → Off)

# 3. Walk through Acts 1, 2, 3 of the demo script. These should work
#    fully offline — just the AI Review + Mentor Chat segments will
#    surface "service unavailable" or "OpenAI 5xx" errors.

# 4. Re-enable WiFi for the AI segments, OR use the phone hotspot
#    (only ~$0.05 of OpenAI traffic over the full demo).
```

The recovery story for "WiFi drops mid-demo" is: phone hotspot. The
OpenAI calls are the only thing that legitimately need internet.

---

## 4. Recorded backup video (S11-T11)

Owner-recorded, stored in two places:

- [ ] `docs/demos/backup-video-v1.mp4` (local repo, NOT committed —
      add to `.gitignore` if not already, or store in `.local/` folder)
- [ ] USB drive (encrypted preferred, plugged in throughout defense)

The video plays as the absolute-last-resort fallback if both laptops fail.

### 4.1 Video specs (from `defense-script.md` §7)

- Length: 3 minutes
- Resolution: 1080p
- Captures: Acts 1, 4, 5 (Persona + Mentor Chat live + Multi-Agent
  comparison) — the highest-impact segments
- Recording date stamped in filename: `backup-video-2026-09-DD.mp4`
- Re-record after any P0/P1 from Rehearsal 1

### 4.2 Pre-defense video verification

The morning of defense:

- [ ] Plug USB drive into the primary laptop; play the video at 1080p
- [ ] Plug USB drive into the backup laptop; play it again
- [ ] Confirm audio is fine (or that the silent version works with
      captions if no voiceover)

---

## 5. Day-of supervisor contact list

Filled by owner from team contact info.

| Role | Name | Phone | Email | Notes |
|---|---|---|---|---|
| Primary supervisor | Dr. Mostafa Elgendy | _(filled)_ | _(filled)_ | First call if defense slot moves |
| Co-supervisor | Eng. Fatma Ebrahim | _(filled)_ | _(filled)_ | |
| TA | Eng. Doaa Mohamed | _(filled)_ | _(filled)_ | |
| Faculty admin | _(filled)_ | _(filled)_ | _(filled)_ | Defense-room bookings |

---

## 6. The day of — minute-by-minute

### 6.1 90 minutes before defense

- [ ] Both laptops fully charged, AC adapters in bag
- [ ] Phone fully charged (hotspot backup)
- [ ] USB drive with backup video in the bag (not in the laptop yet —
      wait for primary laptop check)

### 6.2 60 minutes before defense

- [ ] Walk into the defense room (or the room nearest it). Plug in
      primary laptop. Boot.
- [ ] `docker-compose up -d` — wait for all services healthy
- [ ] Run pre-demo checklist from `defense-script.md` §2
- [ ] Refresh demo state if needed: `seed-demo` + record fresh
      submissions/audit/mentor-chat per §3 of `defense-script.md`
- [ ] Open browser to `/login`; log out (clean state)

### 6.3 15 minutes before defense

- [ ] Phone on silent / DND
- [ ] WiFi connected; phone hotspot also paired in case of drop
- [ ] Backup laptop powered on, on standby (lid closed but not asleep)
- [ ] Backup video played once on primary to confirm it loads

### 6.4 During defense

- [ ] Stick to the 6-act script in `defense-script.md` §4
- [ ] If something fails: `defense-script.md` §6 failure-mode table
- [ ] Q&A: lean on `defense-script.md` §5 talking points; if a question
      is outside scope, "that's a great question for the post-defense
      continuation work, captured in the Future Work appendix" is fine
      — supervisors know about Future Work from the synced docs

### 6.5 After defense

- [ ] Capture supervisor feedback in `docs/defense-feedback.md` while it's fresh
- [ ] If sign-off received, note in `docs/progress.md` Sprint 11 status
- [ ] Optionally start the Post-Defense Azure slot per ADR-038
      (PD-T1..PD-T11) the next morning

---

## 7. What we explicitly are NOT doing on defense day

For the avoidance of doubt + per ADR-038:

- **Not deploying anything to Azure** — that's the Post-Defense slot
- **Not enabling `AI_REVIEW_MODE=multi` by default** — multi mode is
  shown briefly in Act 5 via a controlled flip + flip-back; default is
  `single` per ADR-037 cost-containment
- **Not updating any prompts mid-defense** — the prompt-version
  tracking via `AIAnalysisResults.PromptVersion` requires a controlled
  release, not a live tweak
- **Not running k6 load test during defense** — that's a
  pre-rehearsal dry run only (S11-T8 owner carryover)
- **Not invoking the multi-agent path on every demo submission** —
  cost would blow up. The single-mode path covers Acts 2-4; multi mode
  is one flip in Act 5 only.

---

## 8. Post-defense cleanup

When the team chooses to continue, the Post-Defense Azure slot kicks
in (PD-T1..PD-T11 in `project_details.md` Future Work appendix). Until
that decision, the defense-freeze tag is the canonical recovery point
and no production work happens.
